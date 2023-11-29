import { Match, User, type Team } from "~/types";
import { z } from "zod";

import {
  createTRPCRouter,
  privateProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { Prisma, PrismaClient } from "@prisma/client";
import { DefaultArgs } from "@prisma/client/runtime/library";

export const matchesRouter = createTRPCRouter({
  create: privateProcedure
    .input(
      z.object({
        teamId: z.number(),
        mapId: z.number(),
        result: z.string(),
        rounds_won: z.number(),
        rounds_lost: z.number(),
        memberOneGoogleId: z.string(),
        memberTwoGoogleId: z.string(),
        memberOneKills: z.number(),
        memberOneDeaths: z.number(),
        memberTwoKills: z.number(),
        memberTwoDeaths: z.number(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      console.log("create", input);

      //* Create new match
      const match = await ctx.db.match.create({
        data: {
          teamId: input.teamId,
          mapId: input.mapId,
          result: input.result,
          rounds_won: input.rounds_won,
          rounds_lost: input.rounds_lost,
          memberOneGoogleId: input.memberOneGoogleId,
          memberTwoGoogleId: input.memberTwoGoogleId,
          memberOneKills: input.memberOneKills,
          memberOneDeaths: input.memberOneDeaths,
          memberTwoKills: input.memberTwoKills,
          memberTwoDeaths: input.memberTwoDeaths,
        },
      });

      //* Get team
      const team = await ctx.db.team.findUnique({
        where: {
          id: input.teamId,
        },
        include: {
          matches: true,
        },
      });

      //* Calculate new team stats

      // Total kills, deaths and kd
      const totalKills =
        (team!.total_kills ?? 0) + input.memberOneKills + input.memberTwoKills;
      const totalDeaths =
        (team!.total_deaths ?? 0) +
        input.memberOneDeaths +
        input.memberTwoDeaths;
      const kd =
        totalDeaths > 0
          ? Math.round((totalKills / totalDeaths) * 100) / 100
          : totalKills;

      // Update matches won and lost based on result
      let matches_won = team!.matches_won ?? 0;
      let matches_lost = team!.matches_lost ?? 0;
      if (input.result === "win") {
        matches_won += 1;
      } else if (input.result === "loss") {
        matches_lost += 1;
      }

      // Calculate win/loss ratio
      const wl =
        matches_lost > 0
          ? Math.round((matches_won / matches_lost) * 100) / 100
          : matches_won;

      // Add match to team
      const teamMatches = [...(team!.matches ?? []), match];
      teamMatches.push(match);

      //* Update team with new stats
      const updatedTeam = await ctx.db.team.update({
        where: {
          id: input.teamId,
        },
        data: {
          total_kills: totalKills,
          total_deaths: totalDeaths,
          matches: {
            connect: {
              id: match.id,
            },
          },
          kd: kd,
          matches_won: matches_won,
          matches_lost: matches_lost,
          wl: wl,
        },
      });
      // console.log("--------------------");
      // console.log("Team stats");
      // console.log("--------------------");
      // console.log("team", team);
      // console.log("totalKills", totalKills);
      // console.log("totalDeaths", totalDeaths);
      // console.log("kd", kd);
      // console.log("matches_won", matches_won);
      // console.log("matches_lost", matches_lost);
      // console.log("wl", wl);
      // console.log("teamMatches", teamMatches);
      // console.log("updatedTeam", updatedTeam);

      //* Calculate new user stats
      //- TODO: Extract this into a function

      // Get member one
      const memberOne = await ctx.db.user.findUnique({
        where: {
          google_id: input.memberOneGoogleId,
        },
      });

      // Get member two
      const memberTwo = await ctx.db.user.findUnique({
        where: {
          google_id: input.memberTwoGoogleId,
        },
      });

      // * Member One
      // Total kills, deaths and kd
      const memberOneTotalKills =
        (memberOne!.kills ?? 0) + input.memberOneKills;
      const memberOneTotalDeaths =
        (memberOne!.deaths ?? 0) + input.memberOneDeaths;
      const memberOneKd =
        memberOneTotalDeaths > 0
          ? Math.round((memberOneTotalKills / memberOneTotalDeaths) * 100) / 100
          : memberOneTotalKills;

      // Update matches won and lost based on result
      let memberOneMatchesWon = team!.matches_won ?? 0;
      let memberOneMatchesLost = team!.matches_lost ?? 0;
      if (input.result === "win") {
        memberOneMatchesWon += 1;
      } else if (input.result === "loss") {
        memberOneMatchesLost += 1;
      }

      // Calculate win/loss ratio and matches played
      const memberOneMatchesPlayed = (memberOne!.matches_played ?? 0) + 1;
      const memberOneWl =
        matches_lost > 0
          ? Math.round((memberOneMatchesWon / memberOneMatchesLost) * 100) / 100
          : memberOneMatchesWon;

      // * Member Two
      // Total kills, deaths and kd
      const memberTwoTotalKills =
        (memberTwo!.kills ?? 0) + input.memberTwoKills;
      const memberTwoTotalDeaths =
        (memberTwo!.deaths ?? 0) + input.memberTwoDeaths;
      const memberTwoKd =
        memberTwoTotalDeaths > 0
          ? Math.round((memberTwoTotalKills / memberTwoTotalDeaths) * 100) / 100
          : memberTwoTotalKills;

      // Update matches won and lost based on result
      let memberTwoMatchesWon = team!.matches_won ?? 0;
      let memberTwoMatchesLost = team!.matches_lost ?? 0;
      if (input.result === "win") {
        memberTwoMatchesWon += 1;
      } else if (input.result === "loss") {
        memberTwoMatchesLost += 1;
      }

      // Calculate win/loss ratio and matches played
      const memberTwoMatchesPlayed = (memberTwo!.matches_played ?? 0) + 1;
      const memberTwoWl =
        matches_lost > 0
          ? Math.round((memberTwoMatchesWon / memberTwoMatchesLost) * 100) / 100
          : memberTwoMatchesWon;

      //* Update member one and two with new stats
      const updatedMemberOne = await ctx.db.user.update({
        where: {
          google_id: input.memberOneGoogleId,
        },
        data: {
          kills: memberOneTotalKills,
          deaths: memberOneTotalDeaths,
          kd: memberOneKd,
          matches_won: memberOneMatchesWon,
          matches_lost: memberOneMatchesLost,
          matches_played: memberOneMatchesPlayed,
          wl: memberOneWl,
        },
      });

      const updatedMemberTwo = await ctx.db.user.update({
        where: {
          google_id: input.memberTwoGoogleId,
        },
        data: {
          kills: memberTwoTotalKills,
          deaths: memberTwoTotalDeaths,
          kd: memberTwoKd,
          matches_won: memberTwoMatchesWon,
          matches_lost: memberTwoMatchesLost,
          matches_played: memberTwoMatchesPlayed,
          wl: memberTwoWl,
        },
      });
      // console.log(" ");
      // console.log("--------------------");
      // console.log("MemberOne stats");
      // console.log("--------------------");
      // console.log("memberOne", memberOne);
      // console.log("memberOneTotalKills", memberOneTotalKills);
      // console.log("memberOneTotalDeaths", memberOneTotalDeaths);
      // console.log("memberOneKd", memberOneKd);
      // console.log("memberOneMatchesWon", memberOneMatchesWon);
      // console.log("memberOneMatchesLost", memberOneMatchesLost);
      // console.log("memberOneMatchesPlayed", memberOneMatchesPlayed);
      // console.log("memberOneWl", memberOneWl);
      // console.log("updatedMemberOne", updatedMemberOne);
      // console.log(" ");
      // console.log("--------------------");
      // console.log("MemberTwo stats");
      // console.log("--------------------");
      // console.log("memberTwo", memberTwo);
      // console.log("memberTwoTotalKills", memberTwoTotalKills);
      // console.log("memberTwoTotalDeaths", memberTwoTotalDeaths);
      // console.log("memberTwoKd", memberTwoKd);
      // console.log("memberTwoMatchesWon", memberTwoMatchesWon);
      // console.log("memberTwoMatchesLost", memberTwoMatchesLost);
      // console.log("memberTwoMatchesPlayed", memberTwoMatchesPlayed);
      // console.log("memberTwoWl", memberTwoWl);
      // console.log("updatedMemberTwo", updatedMemberTwo);

      return match;
    }),
  update: privateProcedure
    .input(
      z.object({
        matchId: z.number(),
        teamId: z.number(),
        mapId: z.number(),
        result: z.string(),
        rounds_won: z.number(),
        rounds_lost: z.number(),
        memberOneGoogleId: z.string(),
        memberTwoGoogleId: z.string(),
        memberOneKills: z.number(),
        memberOneDeaths: z.number(),
        memberTwoKills: z.number(),
        memberTwoDeaths: z.number(),
      }),
    )

    .mutation(async ({ input, ctx }) => {
      console.log("update", input);

      //* Update certain things depending on what data changed
      const oldMatch = await ctx.db.match.findUnique({
        where: {
          id: input.matchId,
        },
      });

      const team = await ctx.db.team.findUnique({
        where: {
          id: input.teamId,
        },
      });

      const memberOne = await ctx.db.user.findUnique({
        where: {
          google_id: input.memberOneGoogleId,
        },
      });

      const memberTwo = await ctx.db.user.findUnique({
        where: {
          google_id: input.memberTwoGoogleId,
        },
      });

      //- TODO: implement updating total rounds won/lost

      //* If result changed
      await updateFromResultChange(
        oldMatch!.result,
        input.result,
        team as Team,
        memberOne as unknown as User,
        memberTwo as unknown as User,
        ctx,
      );

      //* If member one kills or deaths changed
      const updatedM1 = await updateFromMember(
        memberOne as unknown as User,
        input.memberOneKills,
        input.memberOneDeaths,
        oldMatch!.memberOneKills,
        oldMatch!.memberOneDeaths,
        ctx,
      );

      console.log("--------------------");
      console.log("Updated member one");
      console.log("--------------------");
      console.log("updatedM1", updatedM1);

      //* If member two kills or deaths changed
      const updatedM2 = await updateFromMember(
        memberTwo as unknown as User,
        input.memberTwoKills,
        input.memberTwoDeaths,
        oldMatch!.memberTwoKills,
        oldMatch!.memberTwoDeaths,
        ctx,
      );

      console.log("--------------------");
      console.log("Updated member two");
      console.log("--------------------");
      console.log("updatedM2", updatedM2);

      //* If total team kills or deaths changed
      await updateTeamKills(
        team as Team,
        input.memberOneKills + input.memberTwoKills,
        input.memberOneDeaths + input.memberTwoDeaths,
        oldMatch!.memberOneKills + oldMatch!.memberTwoKills,
        oldMatch!.memberOneDeaths + oldMatch!.memberTwoDeaths,
        ctx,
      );

      //* Update match
      const updatedMatch = await ctx.db.match.update({
        where: {
          id: input.matchId,
        },
        data: {
          result: input.result,
          rounds_won: input.rounds_won,
          rounds_lost: input.rounds_lost,
          mapId: input.mapId,
          memberOneKills: input.memberOneKills,
          memberOneDeaths: input.memberOneDeaths,
          memberTwoKills: input.memberTwoKills,
          memberTwoDeaths: input.memberTwoDeaths,
        },
      });

      console.log("--------------------");
      console.log("Updated match");
      console.log("--------------------");
      console.log("updatedMatch", updatedMatch);

      return updatedMatch;
    }),
  getAll: publicProcedure.query(async ({ ctx }) => {
    const matches = (await ctx.db.match.findMany()) as unknown as Match[];
    return matches;
  }),
});

async function updateFromResultChange(
  oldResult: string,
  newResult: string,
  team: Team,
  memberOne: User,
  memberTwo: User,
  ctx: {
    db: PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>;
    currentUser: string | null;
  },
) {
  if (oldResult !== newResult) {
    if (newResult === "win") {
      // Calculate new win/loss. If 1 or more matches lost, calculate new win/loss ratio, or else just return matches won
      const newTeamWL =
        team.matches_lost! >= 1
          ? Math.round(
              ((team.matches_won! + 1) / (team.matches_lost! - 1)) * 100,
            ) / 100
          : team.matches_won;

      const newMemberOneWL =
        memberOne.matches_lost! >= 1
          ? Math.round(
              ((memberOne.matches_won! + 1) / (memberOne.matches_lost! - 1)) *
                100,
            ) / 100
          : memberOne.matches_won;

      const newMemberTwoWL =
        memberTwo.matches_lost! >= 1
          ? Math.round(
              ((memberTwo.matches_won! + 1) / (memberTwo.matches_lost! - 1)) *
                100,
            ) / 100
          : memberTwo.matches_won;

      // Update the team
      await ctx.db.team.update({
        where: {
          id: team.id,
        },
        data: {
          matches_won: {
            increment: 1,
          },
          matches_lost: {
            decrement: 1,
          },
          wl: newTeamWL,
        },
      });

      // Update member one
      await ctx.db.user.update({
        where: {
          google_id: memberOne.google_id,
        },
        data: {
          matches_won: {
            increment: 1,
          },
          matches_lost: {
            decrement: 1,
          },
          wl: newMemberOneWL,
        },
      });

      // Update member two
      await ctx.db.user.update({
        where: {
          google_id: memberTwo.google_id,
        },
        data: {
          matches_won: {
            increment: 1,
          },
          matches_lost: {
            decrement: 1,
          },
          wl: newMemberTwoWL,
        },
      });
    } else if (newResult === "loss") {
      // Calculate new win/loss. If 1 or more matches lost, calculate new win/loss ratio, or else just return matches won
      const newTeamWL =
        team.matches_lost! >= 0
          ? Math.round(
              ((team.matches_won! - 1) / (team.matches_lost! + 1)) * 100,
            ) / 100
          : team.matches_won;

      const newMemberOneWL =
        memberOne.matches_lost! >= 0
          ? Math.round(
              ((memberOne.matches_won! - 1) / (memberOne.matches_lost! + 1)) *
                100,
            ) / 100
          : memberOne.matches_won;

      const newMemberTwoWL =
        memberTwo.matches_lost! >= 0
          ? Math.round(
              ((memberTwo.matches_won! - 1) / (memberTwo.matches_lost! + 1)) *
                100,
            ) / 100
          : memberTwo.matches_won;

      // Update the team
      await ctx.db.team.update({
        where: {
          id: team.id,
        },
        data: {
          matches_won: {
            decrement: 1,
          },
          matches_lost: {
            increment: 1,
          },
          wl: newTeamWL,
        },
      });

      // Update member one
      await ctx.db.user.update({
        where: {
          google_id: memberOne.google_id,
        },
        data: {
          matches_won: {
            decrement: 1,
          },
          matches_lost: {
            increment: 1,
          },
          wl: newMemberOneWL,
        },
      });

      // Update member two
      await ctx.db.user.update({
        where: {
          google_id: memberTwo.google_id,
        },
        data: {
          matches_won: {
            decrement: 1,
          },
          matches_lost: {
            increment: 1,
          },
          wl: newMemberTwoWL,
        },
      });
    }
  }
}

async function updateFromMember(
  member: User,
  newKills: number,
  newDeaths: number,
  oldKills: number,
  oldDeaths: number,
  ctx: {
    db: PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>;
    currentUser: string | null;
  },
) {
  const oldKd = member.kd ?? 0;
  const oldTotalKills = member.kills ?? 0;
  const oldTotalDeaths = member.deaths ?? 0;

  if (newKills !== oldKills || newDeaths !== oldDeaths) {
    const newTotalKills = oldTotalKills - oldKills + newKills;
    const newTotalDeaths = oldTotalDeaths - oldDeaths + newDeaths;
    // const newKd = Math.round((newTotalKills / newTotalDeaths) * 100) / 100;
    const newKd =
      newTotalDeaths > 0
        ? Math.round((newTotalKills / newTotalDeaths) * 100) / 100
        : newTotalKills;

    const updatedUser = await ctx.db.user.update({
      where: {
        google_id: member.google_id,
      },
      data: {
        kills: newTotalKills,
        deaths: newTotalDeaths,
        kd: newKd,
      },
    });

    return updatedUser;
  }
}

async function updateTeamKills(
  team: Team,
  totalTeamKills: number,
  totalTeamDeaths: number,
  oldTotalTeamKills: number,
  oldTotalTeamDeaths: number,
  ctx: {
    db: PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>;
    currentUser: string | null;
  },
) {
  if (
    oldTotalTeamKills !== totalTeamKills ||
    oldTotalTeamDeaths !== totalTeamDeaths
  ) {
    const newTotalKills =
      team.total_kills! - oldTotalTeamKills + totalTeamKills;
    const newTotalDeaths =
      team.total_deaths! - oldTotalTeamDeaths + totalTeamDeaths;
    const newKd =
      newTotalDeaths > 0
        ? Math.round((newTotalKills / newTotalDeaths) * 100) / 100
        : newTotalKills;

    await ctx.db.team.update({
      where: {
        id: team.id,
      },
      data: {
        total_kills: newTotalKills,
        total_deaths: newTotalDeaths,
        kd: newKd,
      },
    });
  }
}
