import { type User, type Team } from "~/types";
import { z } from "zod";
import { type Prisma, PrismaClient } from "@prisma/client";
import { type DefaultArgs } from "@prisma/client/runtime/library";

import {
  createTRPCRouter,
  privateProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { calculateRatio } from "~/helpers/calculateRatio";

export const teamsRouter = createTRPCRouter({
  create: privateProcedure
    .input(
      z.object({
        name: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const currentUser = ctx.currentUser;

      const team = await ctx.db.team.create({
        data: {
          name: input.name,
          created_at: new Date(),
          created_by_google_id: currentUser,
        },
      });

      const createdTeam = await ctx.db.team.findUnique({
        where: { name: input.name },
      });

      const teamID = createdTeam!.id;

      const userTeam = await ctx.db.userTeam.create({
        data: {
          user_google_Id: currentUser,
          teamId: teamID,
        },
      });

      return createdTeam;
    }),
  getAll: publicProcedure.query(async ({ ctx }) => {
    const teams = (await ctx.db.team.findMany()) as unknown as Team[];
    return teams;
  }),
  getAllWithMember: privateProcedure.query(async ({ ctx }) => {
    const currentUser = ctx.currentUser;

    const teams = (await ctx.db.team.findMany({
      where: {
        members: {
          some: {
            user_google_Id: currentUser,
          },
        },
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    })) as unknown as Team[];

    console.log(teams);

    return teams;
  }),
  getByName: privateProcedure
    .input(z.string())
    .query(async ({ input, ctx }) => {
      const team = (await ctx.db.team.findUnique({
        where: { name: input },
        include: {
          members: {
            include: {
              user: true,
            },
          },
          matches: {
            include: {
              map: true,
            },
            orderBy: {
              created_at: "desc",
            },
          },
        },
      })) as unknown as Team;

      return team;
    }),
  getByID: privateProcedure.input(z.number()).query(async ({ input, ctx }) => {
    const team = (await ctx.db.team.findUnique({
      where: { id: input },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    })) as unknown as Team;

    return team;
  }),
  checkName: privateProcedure
    .input(z.string())
    .query(async ({ input, ctx }) => {
      const currentUser = ctx.currentUser;

      const team = await ctx.db.team.findUnique({
        where: { name: input },
      });

      if (team) {
        return {
          name_available: false,
        };
      }

      return {
        name_available: true,
      };
    }),
  updateName: privateProcedure
    .input(
      z.object({
        teamId: z.number(),
        newName: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const currentUser = ctx.currentUser;

      const team = await ctx.db.team.findUnique({
        where: { id: input.teamId },
      });

      // if (team!.created_by_google_id !== currentUser) {
      //   return {
      //     success: false,
      //     message: "You are not the admin of this team.",
      //   };
      // }

      if (team?.name !== input.newName) {
        const updatedTeam = await ctx.db.team.update({
          where: { id: input.teamId },
          data: {
            name: input.newName,
          },
        });

        return updatedTeam;
      }

      return {
        success: true,
        message: "Successfully updated team name.",
      };
    }),
  updateJoinerPermission: privateProcedure
    .input(
      z.object({
        teamId: z.number(),
        allowJoinerToAddMatches: z.boolean(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const team = await ctx.db.team.findUnique({
        where: { id: input.teamId },
      });

      // if (team!.created_by_google_id !== currentUser) {
      //   return {
      //     success: false,
      //     message: "You are not the admin of this team.",
      //   };
      // }

      if (team?.allowJoinerToAddMatches !== input.allowJoinerToAddMatches) {
        const updatedTeam = await ctx.db.team.update({
          where: { id: input.teamId },
          data: {
            allowJoinerToAddMatches: input.allowJoinerToAddMatches,
          },
        });

        return updatedTeam;
      }

      // return {
      //   success: true,
      //   message: "Successfully updated permission.",
      // };
    }),
  delete: privateProcedure
    .input(z.number())
    .mutation(async ({ input, ctx }) => {
      const currentUser = ctx.currentUser;

      const team = await ctx.db.team.findUnique({
        where: { id: input },
        include: {
          members: {
            include: {
              user: true,
            },
          },
          matches: {
            include: {
              map: true,
            },
          },
        },
      });

      // if (team!.created_by_google_id !== currentUser) {
      //   return {
      //     success: false,
      //     message: "You are not the admin of this team.",
      //   };
      // }

      const matches = team!.matches;
      let m1Kills = 0;
      let m2Kills = 0;
      let m1Deaths = 0;
      let m2Deaths = 0;
      let rounds_won = 0;
      let rounds_lost = 0;
      let matches_played = 0;
      let wins = 0;
      let losses = 0;

      for (const match of matches) {
        m1Kills += match.memberOneKills;
        m2Kills += match.memberTwoKills;
        m1Deaths += match.memberOneDeaths;
        m2Deaths += match.memberTwoDeaths;
        rounds_won += match.rounds_won;
        rounds_lost += match.rounds_lost;
        matches_played += 1;

        if (match.result === "win") {
          wins += 1;
        } else {
          losses += 1;
        }

        await ctx.db.match.delete({
          where: { id: match.id },
        });
      }

      const memberOne = await ctx.db.user.findUnique({
        where: { google_id: team!.members[0]!.user_google_Id },
      });

      if (memberOne) {
        await updateMemberStats(
          memberOne as User,
          m1Kills,
          m1Deaths,
          rounds_won,
          rounds_lost,
          matches_played,
          wins,
          losses,
          ctx,
        );
      }

      if (team!.members[1]) {
        const memberTwo = await ctx.db.user.findUnique({
          where: { google_id: team!.members[1]!.user_google_Id },
        });

        if (memberTwo) {
          await updateMemberStats(
            memberTwo as User,
            m2Kills,
            m2Deaths,
            rounds_won,
            rounds_lost,
            matches_played,
            wins,
            losses,
            ctx,
          );
        }
      }

      const userTeams = await ctx.db.userTeam.deleteMany({
        where: { teamId: input },
      });

      const teamRequests = await ctx.db.teamRequest.deleteMany({
        where: { teamId: input },
      });

      const deletedTeam = await ctx.db.team.delete({
        where: { id: input },
      });

      return deletedTeam;
    }),
});

async function updateMemberStats(
  member: User,
  kills: number,
  deaths: number,
  rounds_won: number,
  rounds_lost: number,
  matches_played: number,
  wins: number,
  losses: number,
  ctx: {
    db: PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>;
    currentUser: string | null;
  },
) {
  const newKills = member.kills - kills;
  const newDeaths = member.deaths - deaths;
  const newKd = calculateRatio(newKills, newDeaths);

  const newRoundsWon = member.rounds_won - rounds_won;
  const newRoundsLost = member.rounds_lost - rounds_lost;

  const newMatchesPlayed = member.matches_played - matches_played;
  const newWins = member.matches_won - wins;
  const newLosses = member.matches_lost - losses;
  const newWL = calculateRatio(newWins, newLosses);
  //- TODO: incorporate best map calcs into this
  const matches = await ctx.db.match.findMany({
    where: {
      OR: [
        {
          memberOneGoogleId: member.google_id,
        },
        {
          memberTwoGoogleId: member.google_id,
        },
      ],
    },
  });

  let kd_10 = 0;
  let wl_10 = 0;

  if (matches) {
    if (matches.length >= 10) {
      const last_ten_matches = matches.slice(-10);
      let kills = 0;
      let deaths = 0;
      let wins = 0;
      let losses = 0;

      for (const match of last_ten_matches) {
        if (match.memberOneGoogleId === member.google_id) {
          kills += match.memberOneKills;
          deaths += match.memberOneDeaths;
        } else if (match.memberTwoGoogleId === member.google_id) {
          kills += match.memberTwoKills;
          deaths += match.memberTwoDeaths;
        }

        if (match.result === "win") {
          wins++;
        } else {
          losses++;
        }
      }

      kd_10 = calculateRatio(kills, deaths);
      wl_10 = calculateRatio(wins, losses);
    }
  }

  await ctx.db.user.update({
    where: {
      google_id: member.google_id,
    },
    data: {
      kills: newKills,
      deaths: newDeaths,
      rounds_won: newRoundsWon,
      rounds_lost: newRoundsLost,
      matches_played: newMatchesPlayed,
      matches_won: newWins,
      matches_lost: newLosses,
      kd: newKd,
      kd_10: kd_10,
      wl: newWL,
      wl_10: wl_10,
    },
  });
}
