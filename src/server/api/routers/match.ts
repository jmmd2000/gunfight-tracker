import { Match, type Team } from "~/types";
import { z } from "zod";

import {
  createTRPCRouter,
  privateProcedure,
  publicProcedure,
} from "~/server/api/trpc";

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
      const currentUser = ctx.currentUser;

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

      const team = await ctx.db.team.findUnique({
        where: {
          id: input.teamId,
        },
        include: {
          matches: true,
        },
      });

      //* Calculate new team stats
      const totalMatches = team!.matches_won! + team!.matches_lost! + 1;
      console.log("totalMatches", totalMatches);
      const totalKills =
        (team!.total_kills ?? 0) + input.memberOneKills + input.memberTwoKills;
      const totalDeaths =
        (team!.total_deaths ?? 0) +
        input.memberOneDeaths +
        input.memberTwoDeaths;
      const kd = Math.round((totalKills / totalDeaths) * 100) / 100;
      let matches_won = team!.matches_won ?? 0;
      let matches_lost = team!.matches_lost ?? 0;

      if (input.result === "win") {
        matches_won += 1;
      } else if (input.result === "loss") {
        matches_lost += 1;
      }
      console.log("matches_lost", matches_lost);
      console.log("matches_won", matches_won);
      const wl =
        matches_lost > 0
          ? Math.round((matches_won / matches_lost) * 100) / 100
          : matches_won;
      const teamMatches = [...(team!.matches ?? []), match];
      teamMatches.push(match);

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

      //* Calculate new user stats
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

      // * Member One
      const memberOneTotalKills =
        (memberOne!.kills ?? 0) + input.memberOneKills;
      const memberOneTotalDeaths =
        (memberOne!.deaths ?? 0) + input.memberOneDeaths;
      const memberOneKd =
        Math.round((memberOneTotalKills / memberOneTotalDeaths) * 100) / 100;
      const memberOneMatchesWon =
        input.result === "won"
          ? (memberOne!.matches_won ?? 0) + 1
          : memberOne!.matches_won ?? 0;
      const memberOneMatchesLost =
        input.result === "lost"
          ? (memberOne!.matches_lost ?? 0) + 1
          : memberOne!.matches_lost ?? 0;
      const memberOneMatchesPlayed = (memberOne!.matches_played ?? 0) + 1;
      const memberOneWl =
        Math.round((memberOneMatchesWon / memberOneMatchesLost) * 100) / 100;

      // * Member Two
      const memberTwoTotalKills =
        (memberTwo!.kills ?? 0) + input.memberTwoKills;
      const memberTwoTotalDeaths =
        (memberTwo!.deaths ?? 0) + input.memberTwoDeaths;
      const memberTwoKd =
        Math.round((memberTwoTotalKills / memberTwoTotalDeaths) * 100) / 100;
      const memberTwoMatchesWon =
        input.result === "won"
          ? (memberTwo!.matches_won ?? 0) + 1
          : memberTwo!.matches_won ?? 0;
      const memberTwoMatchesLost =
        input.result === "lost"
          ? (memberTwo!.matches_lost ?? 0) + 1
          : memberTwo!.matches_lost ?? 0;
      const memberTwoMatchesPlayed = (memberTwo!.matches_played ?? 0) + 1;
      const memberTwoWl =
        Math.round((memberTwoMatchesWon / memberTwoMatchesLost) * 100) / 100;

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

      return match;
    }),
  getAll: publicProcedure.query(async ({ ctx }) => {
    const matches = (await ctx.db.match.findMany()) as unknown as Match[];
    return matches;
  }),
  // getAllWithMember: privateProcedure.query(async ({ ctx }) => {
  //   const currentUser = ctx.currentUser;

  //   const teams = (await ctx.db.match.findMany({
  //     where: {
  //       members: {
  //         some: {
  //           user_google_Id: currentUser,
  //         },
  //       },
  //     },
  //     include: {
  //       members: {
  //         include: {
  //           user: true,
  //         },
  //       },
  //     },
  //   })) as unknown as Team[];

  //   console.log(teams);

  //   return teams;
  // }),
  // getByName: privateProcedure
  //   .input(z.string())
  //   .query(async ({ input, ctx }) => {
  //     const team = (await ctx.db.team.findUnique({
  //       where: { name: input },
  //       include: {
  //         members: {
  //           include: {
  //             user: true,
  //           },
  //         },
  //       },
  //     })) as unknown as Team;

  //     return team;
  //   }),
  // getByID: privateProcedure.input(z.number()).query(async ({ input, ctx }) => {
  //   const team = (await ctx.db.team.findUnique({
  //     where: { id: input },
  //     include: {
  //       members: {
  //         include: {
  //           user: true,
  //         },
  //       },
  //     },
  //   })) as unknown as Team;

  //   return team;
  // }),
  // checkName: privateProcedure
  //   .input(z.string())
  //   .query(async ({ input, ctx }) => {
  //     const currentUser = ctx.currentUser;

  //     const team = await ctx.db.team.findUnique({
  //       where: { name: input },
  //     });

  //     if (team) {
  //       return {
  //         name_available: false,
  //       };
  //     }

  //     return {
  //       name_available: true,
  //     };
  //   }),
});
