import { Match, User, type Team, type MapStats } from "~/types";
import { z } from "zod";

import {
  createTRPCRouter,
  privateProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { Prisma, PrismaClient } from "@prisma/client";
import { DefaultArgs } from "@prisma/client/runtime/library";
import { calculateRatio } from "~/helpers/calculateRatio";
import { currentUser } from "@clerk/nextjs";

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

      // Track the stats for the team and members for the specific maps
      await modifyMapStats(
        match as Match,
        input.mapId,
        "create",
        ctx,
        undefined,
        input.teamId,
      );
      await modifyMapStats(
        match as Match,
        input.mapId,
        "create",
        ctx,
        undefined,
        undefined,
        input.memberOneGoogleId,
      );
      await modifyMapStats(
        match as Match,
        input.mapId,
        "create",
        ctx,
        undefined,
        undefined,
        input.memberTwoGoogleId,
      );

      //* Get team
      const team = await ctx.db.team.findUnique({
        where: {
          id: input.teamId,
        },
        include: {
          matches: true,
        },
      });

      let team_wl_10 = 0;
      let team_kd_10 = 0;

      if (team?.matches) {
        if (team.matches.length >= 10) {
          const last_ten_matches = team.matches.slice(-10);
          let kills = 0;
          let deaths = 0;
          let wins = 0;
          let losses = 0;

          for (const match of last_ten_matches) {
            if (match.result === "win") {
              wins++;
            } else {
              losses++;
            }

            kills += match.memberOneKills + match.memberTwoKills;
            deaths += match.memberOneDeaths + match.memberTwoDeaths;
          }

          team_wl_10 = calculateRatio(wins, losses);
          team_kd_10 = calculateRatio(kills, deaths);
        }
      }

      //* Calculate new team stats

      // Total kills, deaths and kd
      const totalKills =
        (team!.total_kills ?? 0) + input.memberOneKills + input.memberTwoKills;
      const totalDeaths =
        (team!.total_deaths ?? 0) +
        input.memberOneDeaths +
        input.memberTwoDeaths;
      const kd = calculateRatio(totalKills, totalDeaths);

      // Update matches won and lost based on result
      let matches_won = team!.matches_won ?? 0;
      let matches_lost = team!.matches_lost ?? 0;
      if (input.result === "win") {
        matches_won += 1;
      } else if (input.result === "loss") {
        matches_lost += 1;
      }

      // Calculate win/loss ratio
      const wl = calculateRatio(matches_won, matches_lost);

      const memberOneTotalKillsTeam =
        team!.memberOneTotalKills + input.memberOneKills;
      const memberOneTotalDeathsTeam =
        team!.memberOneTotalDeaths + input.memberOneDeaths;
      const memberTwoTotalKillsTeam =
        team!.memberTwoTotalKills + input.memberTwoKills;
      const memberTwoTotalDeathsTeam =
        team!.memberTwoTotalDeaths + input.memberTwoDeaths;

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
          memberOneTotalKills: memberOneTotalKillsTeam,
          memberOneTotalDeaths: memberOneTotalDeathsTeam,
          memberTwoTotalKills: memberTwoTotalKillsTeam,
          memberTwoTotalDeaths: memberTwoTotalDeathsTeam,
          matches: {
            connect: {
              id: match.id,
            },
          },
          kd: kd,
          matches_won: matches_won,
          matches_lost: matches_lost,
          wl: wl,
          wl_10: team_wl_10,
          kd_10: team_kd_10,
          rounds_won: team!.rounds_won + input.rounds_won,
          rounds_lost: team!.rounds_lost + input.rounds_lost,
        },
      });

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

      const memberOneMatches = await ctx.db.match.findMany({
        where: {
          memberOneGoogleId: input.memberOneGoogleId,
        },
      });

      const memberTwoMatches = await ctx.db.match.findMany({
        where: {
          memberTwoGoogleId: input.memberTwoGoogleId,
        },
      });

      let m1WL_10 = 0;
      let m2WL_10 = 0;
      let m1KD_10 = 0;
      let m2KD_10 = 0;

      if (memberOneMatches.length >= 10) {
        const last_ten_matches = memberOneMatches.slice(-10);
        let wins = 0;
        let losses = 0;
        let kills = 0;
        let deaths = 0;

        for (const match of last_ten_matches) {
          if (match.result === "win") {
            wins++;
          } else {
            losses++;
          }

          kills += match.memberOneKills;
          deaths += match.memberOneDeaths;
        }

        m1WL_10 = calculateRatio(wins, losses);
        m1KD_10 = calculateRatio(kills, deaths);
      }

      if (memberTwoMatches.length >= 10) {
        const last_ten_matches = memberTwoMatches.slice(-10);
        let wins = 0;
        let losses = 0;
        let kills = 0;
        let deaths = 0;

        for (const match of last_ten_matches) {
          if (match.result === "win") {
            wins++;
          } else {
            losses++;
          }

          kills += match.memberTwoKills;
          deaths += match.memberTwoDeaths;
        }

        m2WL_10 = calculateRatio(wins, losses);
        m2KD_10 = calculateRatio(kills, deaths);
      }

      // * Member One
      // Total kills, deaths and kd
      const memberOneTotalKills =
        (memberOne!.kills ?? 0) + input.memberOneKills;
      const memberOneTotalDeaths =
        (memberOne!.deaths ?? 0) + input.memberOneDeaths;
      const memberOneKd = calculateRatio(
        memberOneTotalKills,
        memberOneTotalDeaths,
      );

      // Update matches won and lost based on result
      let memberOneMatchesWon = memberOne!.matches_won ?? 0;
      let memberOneMatchesLost = memberOne!.matches_lost ?? 0;
      if (input.result === "win") {
        memberOneMatchesWon += 1;
      } else if (input.result === "loss") {
        memberOneMatchesLost += 1;
      }

      // Calculate win/loss ratio and matches played
      const memberOneMatchesPlayed = (memberOne!.matches_played ?? 0) + 1;
      const memberOneWl = calculateRatio(
        memberOneMatchesWon,
        memberOneMatchesLost,
      );

      // * Member Two
      // Total kills, deaths and kd
      const memberTwoTotalKills =
        (memberTwo!.kills ?? 0) + input.memberTwoKills;
      const memberTwoTotalDeaths =
        (memberTwo!.deaths ?? 0) + input.memberTwoDeaths;
      const memberTwoKd = calculateRatio(
        memberTwoTotalKills,
        memberTwoTotalDeaths,
      );

      // Update matches won and lost based on result
      let memberTwoMatchesWon = memberTwo!.matches_won ?? 0;
      let memberTwoMatchesLost = memberTwo!.matches_lost ?? 0;
      if (input.result === "win") {
        memberTwoMatchesWon += 1;
      } else if (input.result === "loss") {
        memberTwoMatchesLost += 1;
      }

      // Calculate win/loss ratio and matches played
      const memberTwoMatchesPlayed = (memberTwo!.matches_played ?? 0) + 1;
      const memberTwoWl = calculateRatio(
        memberTwoMatchesWon,
        memberTwoMatchesLost,
      );

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
          kd_10: m1KD_10,
          wl_10: m1WL_10,
          rounds_won: memberOne!.rounds_won + input.rounds_won,
          rounds_lost: memberOne!.rounds_lost + input.rounds_lost,
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
          kd_10: m2KD_10,
          wl_10: m2WL_10,
          rounds_won: memberTwo!.rounds_won + input.rounds_won,
          rounds_lost: memberTwo!.rounds_lost + input.rounds_lost,
        },
      });

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

      //* If result changed
      await updateFromResultChange(
        oldMatch!.result,
        input.result,
        team as unknown as Team,
        memberOne as unknown as User,
        memberTwo as unknown as User,
        ctx,
      );

      //* If member one kills or deaths changed
      const updatedM1 = await updateFromMember(
        input.memberOneGoogleId,
        memberOne as unknown as User,
        input.memberOneKills,
        input.memberOneDeaths,
        oldMatch!.memberOneKills,
        oldMatch!.memberOneDeaths,
        ctx,
      );

      console.log("updatedM1", updatedM1);

      //* If member two kills or deaths changed
      const updatedM2 = await updateFromMember(
        input.memberOneGoogleId,
        memberTwo as unknown as User,
        input.memberTwoKills,
        input.memberTwoDeaths,
        oldMatch!.memberTwoKills,
        oldMatch!.memberTwoDeaths,
        ctx,
      );

      console.log("updatedM2", updatedM2);

      //* If total team kills or deaths changed
      await updateTeamKills(
        team as unknown as Team,
        {
          m1: input.memberOneKills,
          m2: input.memberTwoKills,
        },
        {
          m1: input.memberOneDeaths,
          m2: input.memberTwoDeaths,
        },
        {
          m1: oldMatch!.memberOneKills,
          m2: oldMatch!.memberTwoKills,
        },
        {
          m1: oldMatch!.memberOneDeaths,
          m2: oldMatch!.memberTwoDeaths,
        },
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

      // Track the stats for the team and members for the specific maps
      await modifyMapStats(
        updatedMatch as Match,
        input.mapId,
        "update",
        ctx,
        oldMatch as Match,
        input.teamId,
      );
      await modifyMapStats(
        updatedMatch as Match,
        input.mapId,
        "update",
        ctx,
        oldMatch as Match,
        undefined,
        input.memberOneGoogleId,
      );
      await modifyMapStats(
        updatedMatch as Match,
        input.mapId,
        "update",
        ctx,
        oldMatch as Match,
        undefined,
        input.memberTwoGoogleId,
      );

      return updatedMatch;
    }),
  delete: privateProcedure
    .input(z.number())
    .mutation(async ({ input, ctx }) => {
      //- TODO: A lot of this logic can be extracted into functions
      const match = await ctx.db.match.findUnique({
        where: {
          id: input,
        },
      });

      const team = await ctx.db.team.findUnique({
        where: {
          id: match!.teamId,
        },
        include: {
          matches: true,
        },
      });

      const memberOne = await ctx.db.user.findUnique({
        where: {
          google_id: match!.memberOneGoogleId,
        },
      });

      const memberTwo = await ctx.db.user.findUnique({
        where: {
          google_id: match!.memberTwoGoogleId,
        },
      });

      const m2Matches = await ctx.db.match.findMany({
        where: {
          memberTwoGoogleId: match!.memberTwoGoogleId,
        },
      });

      const m1Matches = await ctx.db.match.findMany({
        where: {
          memberOneGoogleId: match!.memberOneGoogleId,
        },
      });

      //* Update team stats
      const totalKills =
        team!.total_kills - match!.memberOneKills - match!.memberTwoKills;
      const totalDeaths =
        team!.total_deaths - match!.memberOneDeaths - match!.memberTwoDeaths;
      const kd = calculateRatio(totalKills, totalDeaths);
      // Update matches won and lost based on result
      let matches_won = team!.matches_won;
      let matches_lost = team!.matches_lost;
      if (match!.result === "win") {
        matches_won -= 1;
      } else if (match!.result === "loss") {
        matches_lost -= 1;
      }

      // Calculate win/loss ratio
      const wl = calculateRatio(matches_won, matches_lost);

      let team_wl_10 = 0;
      let team_kd_10 = 0;

      if (team && team.matches) {
        if (team.matches.length >= 11) {
          const last_ten_matches = team.matches.slice(-11);
          const removeMatch = last_ten_matches.findIndex(
            (i) => i.id === match!.id,
          );
          if (removeMatch !== -1) {
            last_ten_matches.splice(removeMatch, 1);
          }

          let kills = 0;
          let deaths = 0;
          let wins = 0;
          let losses = 0;

          for (const match of last_ten_matches) {
            if (match.result === "win") {
              wins++;
            } else {
              losses++;
            }

            kills += match.memberOneKills + match.memberTwoKills;
            deaths += match.memberOneDeaths + match.memberTwoDeaths;
          }

          team_wl_10 = calculateRatio(wins, losses);
          team_kd_10 = calculateRatio(kills, deaths);
        }
      }

      const memberOneTotalKillsTeam =
        team!.memberOneTotalKills - match!.memberOneKills;
      const memberOneTotalDeathsTeam =
        team!.memberOneTotalDeaths - match!.memberOneDeaths;
      const memberTwoTotalKillsTeam =
        team!.memberTwoTotalKills - match!.memberTwoKills;
      const memberTwoTotalDeathsTeam =
        team!.memberTwoTotalDeaths - match!.memberTwoDeaths;

      //* Update team with new stats
      const updatedTeam = await ctx.db.team.update({
        where: {
          id: match!.teamId,
        },
        data: {
          total_kills: totalKills,
          total_deaths: totalDeaths,
          memberOneTotalKills: memberOneTotalKillsTeam,
          memberOneTotalDeaths: memberOneTotalDeathsTeam,
          memberTwoTotalKills: memberTwoTotalKillsTeam,
          memberTwoTotalDeaths: memberTwoTotalDeathsTeam,
          kd: kd,
          matches_won: matches_won,
          matches_lost: matches_lost,
          wl: wl,
          wl_10: team_wl_10,
          kd_10: team_kd_10,
          rounds_won: team!.rounds_won - match!.rounds_won,
          rounds_lost: team!.rounds_lost - match!.rounds_lost,
        },
      });

      //* Update member one and two stats
      const memberOneTotalKills = memberOne!.kills - match!.memberOneKills;
      const memberOneTotalDeaths = memberOne!.deaths - match!.memberOneDeaths;
      const memberOneKd = calculateRatio(
        memberOneTotalKills,
        memberOneTotalDeaths,
      );

      // Update matches won and lost based on result
      let memberOneMatchesWon = memberOne!.matches_won;
      let memberOneMatchesLost = memberOne!.matches_lost;
      if (match!.result === "win") {
        memberOneMatchesWon -= 1;
      } else if (match!.result === "loss") {
        memberOneMatchesLost -= 1;
      }

      // Calculate win/loss ratio and matches played
      const memberOneMatchesPlayed = memberOne!.matches_played - 1;
      const memberOneWl = calculateRatio(
        memberOneMatchesWon,
        memberOneMatchesLost,
      );

      let m1WL_10 = 0;
      let m1KD_10 = 0;

      if (m1Matches.length >= 10) {
        const last_ten_matches = m1Matches.slice(-10);
        let wins = 0;
        let losses = 0;
        let kills = 0;
        let deaths = 0;

        for (const match of last_ten_matches) {
          if (match.result === "win") {
            wins++;
          } else {
            losses++;
          }

          kills += match.memberOneKills;
          deaths += match.memberOneDeaths;
        }

        m1WL_10 = calculateRatio(wins, losses);
        m1KD_10 = calculateRatio(kills, deaths);
      }

      const memberTwoTotalKills = memberTwo!.kills - match!.memberTwoKills;
      const memberTwoTotalDeaths = memberTwo!.deaths - match!.memberTwoDeaths;
      const memberTwoKd = calculateRatio(
        memberTwoTotalKills,
        memberTwoTotalDeaths,
      );

      // Update matches won and lost based on result
      let memberTwoMatchesWon = memberTwo!.matches_won;
      let memberTwoMatchesLost = memberTwo!.matches_lost;
      if (match!.result === "win") {
        memberTwoMatchesWon -= 1;
      } else if (match!.result === "loss") {
        memberTwoMatchesLost -= 1;
      }

      // Calculate win/loss ratio and matches played
      const memberTwoMatchesPlayed = memberTwo!.matches_played - 1;
      const memberTwoWl = calculateRatio(
        memberTwoMatchesWon,
        memberTwoMatchesLost,
      );

      let m2WL_10 = 0;
      let m2KD_10 = 0;

      if (m2Matches.length >= 10) {
        const last_ten_matches = m2Matches.slice(-10);
        let wins = 0;
        let losses = 0;
        let kills = 0;
        let deaths = 0;

        for (const match of last_ten_matches) {
          if (match.result === "win") {
            wins++;
          } else {
            losses++;
          }

          kills += match.memberTwoKills;
          deaths += match.memberTwoDeaths;
        }

        m2WL_10 = calculateRatio(wins, losses);
        m2KD_10 = calculateRatio(kills, deaths);
      }

      //* Update member one and two with new stats
      console.log(
        memberOne!.rounds_lost,
        memberTwo!.rounds_lost,
        team!.rounds_lost,
        match!.rounds_lost,
      );
      //! Figure out the rounds won/rounds lost discrepancy
      //! maybe console log all win and loss values
      const updatedMemberOne = await ctx.db.user.update({
        where: {
          google_id: match!.memberOneGoogleId,
        },
        data: {
          kills: memberOneTotalKills,
          deaths: memberOneTotalDeaths,
          kd: memberOneKd,
          matches_won: memberOneMatchesWon,
          matches_lost: memberOneMatchesLost,
          matches_played: memberOneMatchesPlayed,
          wl: memberOneWl,
          kd_10: m1KD_10,
          wl_10: m1WL_10,
          rounds_won: memberOne!.rounds_won - match!.rounds_won,
          rounds_lost: memberOne!.rounds_lost - match!.rounds_lost,
        },
      });

      const updatedMemberTwo = await ctx.db.user.update({
        where: {
          google_id: match!.memberTwoGoogleId,
        },
        data: {
          kills: memberTwoTotalKills,
          deaths: memberTwoTotalDeaths,
          kd: memberTwoKd,
          matches_won: memberTwoMatchesWon,
          matches_lost: memberTwoMatchesLost,
          matches_played: memberTwoMatchesPlayed,
          wl: memberTwoWl,
          kd_10: m2KD_10,
          wl_10: m2WL_10,
          rounds_won: memberTwo!.rounds_won - match!.rounds_won,
          rounds_lost: memberTwo!.rounds_lost - match!.rounds_lost,
        },
      });

      // Track the stats for the team and members for the specific maps
      // await modifyMapStats(
      //   match as Match,
      //   match!.mapId,
      //   "delete",
      //   ctx,
      //   undefined,
      //   match!.teamId,
      // );
      // await modifyMapStats(
      //   match as Match,
      //   match!.mapId,
      //   "delete",
      //   ctx,
      //   undefined,
      //   undefined,
      //   match!.memberOneGoogleId,
      // );
      // await modifyMapStats(
      //   match as Match,
      //   match!.mapId,
      //   "delete",
      //   ctx,
      //   undefined,
      //   undefined,
      //   match!.memberTwoGoogleId,
      // );

      // if (team?.matches.length === 1) {
      //   await modifyMapStats(
      //     match as Match,
      //     match!.mapId,
      //     "delete",
      //     ctx,
      //     undefined,
      //     match!.teamId,
      //   );
      // } else {
      //   await modifyMapStats(
      //     match as Match,
      //     match!.mapId,
      //     "update",
      //     ctx,
      //     undefined,
      //     match!.teamId,
      //   );
      // }

      // if (m1Matches.length === 1) {
      //   await modifyMapStats(
      //     match as Match,
      //     match!.mapId,
      //     "delete",
      //     ctx,
      //     undefined,
      //     undefined,
      //     match!.memberOneGoogleId,
      //   );
      // } else {
      //   await modifyMapStats(
      //     match as Match,
      //     match!.mapId,
      //     "update",
      //     ctx,
      //     undefined,
      //     undefined,
      //     match!.memberOneGoogleId,
      //   );
      // }

      // if (m2Matches.length === 1) {
      //   await modifyMapStats(
      //     match as Match,
      //     match!.mapId,
      //     "delete",
      //     ctx,
      //     undefined,
      //     undefined,
      //     match!.memberTwoGoogleId,
      //   );
      // } else {
      //   await modifyMapStats(
      //     match as Match,
      //     match!.mapId,
      //     "update",
      //     ctx,
      //     undefined,
      //     undefined,
      //     match!.memberTwoGoogleId,
      //   );
      // }

      //* Delete match
      const deletedMatch = await ctx.db.match.delete({
        where: {
          id: input,
        },
      });

      return deletedMatch;
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
        team.matches_lost > 1
          ? Math.round(
              ((team.matches_won + 1) / (team.matches_lost - 1)) * 100,
            ) / 100
          : team.matches_won;
      console.log("newTeamWL", newTeamWL);
      console.log("team.matches_lost", team.matches_lost);
      console.log("team.matches_won", team.matches_won);
      console.log("team.matches_lost - 1", team.matches_lost - 1);
      console.log("team.matches_won + 1", team.matches_won + 1);
      console.log(
        "((team.matches_won + 1) / (team.matches_lost - 1)) * 100",
        ((team.matches_won + 1) / (team.matches_lost - 1)) * 100,
      );

      let m1WL_10 = 0;
      let m2WL_10 = 0;
      let teamWL_10 = 0;

      const memberOneMatches = await ctx.db.match.findMany({
        where: {
          memberOneGoogleId: memberOne.google_id,
        },
      });

      const memberTwoMatches = await ctx.db.match.findMany({
        where: {
          memberTwoGoogleId: memberTwo.google_id,
        },
      });

      if (team.matches) {
        if (team.matches.length >= 10) {
          const last_ten_matches = team.matches.slice(-10);
          let wins = 0;
          let losses = 0;

          for (const match of last_ten_matches) {
            if (match.result === "win") {
              wins++;
            } else {
              losses++;
            }
          }

          teamWL_10 = calculateRatio(wins, losses);
        }
      }

      if (memberOneMatches.length >= 10) {
        const last_ten_matches = memberOneMatches.slice(-10);
        let wins = 0;
        let losses = 0;

        for (const match of last_ten_matches) {
          if (match.result === "win") {
            wins++;
          } else {
            losses++;
          }
        }

        m1WL_10 = calculateRatio(wins, losses);
      }

      if (memberTwoMatches.length >= 10) {
        const last_ten_matches = memberTwoMatches.slice(-10);
        let wins = 0;
        let losses = 0;

        for (const match of last_ten_matches) {
          if (match.result === "win") {
            wins++;
          } else {
            losses++;
          }
        }

        m2WL_10 = calculateRatio(wins, losses);
      }

      const newMemberOneWL =
        memberOne.matches_lost > 1
          ? Math.round(
              ((memberOne.matches_won + 1) / (memberOne.matches_lost - 1)) *
                100,
            ) / 100
          : memberOne.matches_won;

      const newMemberTwoWL =
        memberTwo.matches_lost > 1
          ? Math.round(
              ((memberTwo.matches_won + 1) / (memberTwo.matches_lost - 1)) *
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
          wl_10: teamWL_10,
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
          wl_10: m1WL_10,
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
          wl_10: m2WL_10,
        },
      });
    } else if (newResult === "loss") {
      // Calculate new win/loss. If 1 or more matches lost, calculate new win/loss ratio, or else just return matches won
      const newTeamWL =
        team.matches_lost >= 0
          ? Math.round(
              ((team.matches_won - 1) / (team.matches_lost + 1)) * 100,
            ) / 100
          : team.matches_won;

      let m1WL_10 = 0;
      let m2WL_10 = 0;
      let teamWL_10 = 0;

      const memberOneMatches = await ctx.db.match.findMany({
        where: {
          memberOneGoogleId: memberOne.google_id,
        },
      });

      const memberTwoMatches = await ctx.db.match.findMany({
        where: {
          memberTwoGoogleId: memberTwo.google_id,
        },
      });

      if (team.matches) {
        if (team.matches.length >= 10) {
          const last_ten_matches = team.matches.slice(-10);
          let wins = 0;
          let losses = 0;

          for (const match of last_ten_matches) {
            if (match.result === "win") {
              wins++;
            } else {
              losses++;
            }
          }

          teamWL_10 = calculateRatio(wins, losses);
        }
      }

      if (memberOneMatches.length >= 10) {
        const last_ten_matches = memberOneMatches.slice(-10);
        let wins = 0;
        let losses = 0;

        for (const match of last_ten_matches) {
          if (match.result === "win") {
            wins++;
          } else {
            losses++;
          }
        }

        m1WL_10 = calculateRatio(wins, losses);
      }

      if (memberTwoMatches.length >= 10) {
        const last_ten_matches = memberTwoMatches.slice(-10);
        let wins = 0;
        let losses = 0;

        for (const match of last_ten_matches) {
          if (match.result === "win") {
            wins++;
          } else {
            losses++;
          }
        }

        m2WL_10 = calculateRatio(wins, losses);
      }

      const newMemberOneWL =
        memberOne.matches_lost >= 0
          ? Math.round(
              ((memberOne.matches_won - 1) / (memberOne.matches_lost + 1)) *
                100,
            ) / 100
          : memberOne.matches_won;

      const newMemberTwoWL =
        memberTwo.matches_lost >= 0
          ? Math.round(
              ((memberTwo.matches_won - 1) / (memberTwo.matches_lost + 1)) *
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
          wl_10: teamWL_10,
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
          wl_10: m1WL_10,
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
          wl_10: m2WL_10,
        },
      });
    }
  }
}

async function updateFromMember(
  memberOneGoogleId: string,
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
  const oldKd = member.kd;
  const oldTotalKills = member.kills;
  const oldTotalDeaths = member.deaths;

  if (newKills !== oldKills || newDeaths !== oldDeaths) {
    const newTotalKills = oldTotalKills - oldKills + newKills;
    const newTotalDeaths = oldTotalDeaths - oldDeaths + newDeaths;
    // const newKd = Math.round((newTotalKills / newTotalDeaths) * 100) / 100;
    const newKd = calculateRatio(newTotalKills, newTotalDeaths);
    let kd_10 = 0;
    let wl_10 = 0;

    if (memberOneGoogleId === member.google_id) {
      const last_ten_matches = await ctx.db.match.findMany({
        where: {
          memberOneGoogleId: member.google_id,
        },
        take: 10,
        orderBy: {
          created_at: "desc",
        },
      });

      console.log("last_ten_matches", last_ten_matches);

      if (last_ten_matches.length >= 10) {
        let kills = 0;
        let deaths = 0;
        let wins = 0;
        let losses = 0;

        for (const match of last_ten_matches) {
          if (match.result === "win") {
            wins++;
          } else {
            losses++;
          }

          kills += match.memberOneKills;
          deaths += match.memberOneDeaths;
        }

        kd_10 = calculateRatio(kills, deaths);
        wl_10 = calculateRatio(wins, losses);
      }
    } else {
      const last_ten_matches = await ctx.db.match.findMany({
        where: {
          memberTwoGoogleId: member.google_id,
        },
        take: 10,
        orderBy: {
          created_at: "desc",
        },
      });

      if (last_ten_matches.length >= 10) {
        let kills = 0;
        let deaths = 0;
        let wins = 0;
        let losses = 0;

        for (const match of last_ten_matches) {
          if (match.result === "win") {
            wins++;
          } else {
            losses++;
          }

          kills += match.memberOneKills;
          deaths += match.memberOneDeaths;
        }

        kd_10 = calculateRatio(kills, deaths);
        wl_10 = calculateRatio(wins, losses);
      }
    }

    const updatedUser = await ctx.db.user.update({
      where: {
        google_id: member.google_id,
      },
      data: {
        kills: newTotalKills,
        deaths: newTotalDeaths,
        kd: newKd,
        kd_10: kd_10,
        wl_10: wl_10,
      },
    });

    return updatedUser;
  }
}

async function updateTeamKills(
  team: Team,
  newKills: {
    m1: number;
    m2: number;
  },
  newDeaths: {
    m1: number;
    m2: number;
  },
  oldKills: {
    m1: number;
    m2: number;
  },
  oldDeaths: {
    m1: number;
    m2: number;
  },
  ctx: {
    db: PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>;
    currentUser: string | null;
  },
) {
  const newMatchKills = newKills.m1 + newKills.m2;
  const newMatchDeaths = newDeaths.m1 + newDeaths.m2;
  const oldMatchKills = oldKills.m1 + oldKills.m2;
  const oldMatchDeaths = oldDeaths.m1 + oldDeaths.m2;
  // (oldKills.m1 + oldKills.m2) !== (newKills.m1 + newKills.m2) ||
  //   (oldDeaths.m1 + oldDeaths.m2) !== (newDeaths.m1 + newDeaths.m2)
  if (oldMatchKills !== newMatchKills || oldMatchDeaths !== newMatchDeaths) {
    const newTotalKills = team.total_kills - oldMatchKills + newMatchKills;
    const newTotalDeaths = team.total_deaths - oldMatchDeaths + newMatchDeaths;
    const newKd = calculateRatio(newTotalKills, newTotalDeaths);

    const m1totalKills = team.memberOneTotalKills - oldKills.m1 + newKills.m1;
    const m1totalDeaths =
      team.memberOneTotalDeaths - oldDeaths.m1 + newDeaths.m1;
    const m2totalKills = team.memberTwoTotalKills - oldKills.m2 + newKills.m2;
    const m2totalDeaths =
      team.memberTwoTotalDeaths - oldDeaths.m2 + newDeaths.m2;

    let kd_10 = 0;

    if (team.matches) {
      if (team.matches.length >= 10) {
        const last_ten_matches = team.matches.slice(-10);
        let kills = 0;
        let deaths = 0;

        for (const match of last_ten_matches) {
          kills += match.memberTwoKills;
          deaths += match.memberTwoDeaths;
        }

        kd_10 = calculateRatio(kills, deaths);
      }
    }

    await ctx.db.team.update({
      where: {
        id: team.id,
      },
      data: {
        total_kills: newTotalKills,
        total_deaths: newTotalDeaths,
        memberOneTotalKills: m1totalKills,
        memberOneTotalDeaths: m1totalDeaths,
        memberTwoTotalKills: m2totalKills,
        memberTwoTotalDeaths: m2totalDeaths,
        kd: newKd,
        kd_10: kd_10,
      },
    });
  }
}

async function modifyMapStats(
  newMatch: Match,
  mapId: number,
  matchOperation: "create" | "update" | "delete",
  ctx: {
    db: PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>;
    currentUser: string | null;
  },
  oldMatch?: Match,
  teamId?: number,
  userId?: string,
) {
  switch (matchOperation) {
    case "create":
      if (teamId) {
        await createMapStats(newMatch, mapId, ctx, teamId);
      } else if (userId) {
        await createMapStats(newMatch, mapId, ctx, undefined, userId);
      }
      break;
    case "update":
      if (teamId && oldMatch) {
        await updateMapStats(newMatch, oldMatch, mapId, ctx, teamId);
      } else if (userId && oldMatch) {
        await updateMapStats(newMatch, oldMatch, mapId, ctx, undefined, userId);
      }
      break;
    case "delete":
      if (teamId && oldMatch) {
        await deleteMapStats(oldMatch, mapId, ctx, teamId);
      } else if (userId && oldMatch) {
        await deleteMapStats(oldMatch, mapId, ctx, undefined, userId);
      }
      break;
  }
}

async function createMapStats(
  newMatch: Match,
  mapId: number,
  ctx: {
    db: PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>;
    currentUser: string | null;
  },
  teamId?: number,
  userId?: string,
) {
  const {
    memberOneGoogleId,
    memberTwoGoogleId,
    rounds_won,
    rounds_lost,
    memberOneKills,
    memberTwoKills,
    memberOneDeaths,
    memberTwoDeaths,
  } = newMatch;

  console.log("newMatch", newMatch);

  // If team id is passed in
  if (teamId) {
    const mapStatsForTeam = await ctx.db.mapStats.findFirst({
      where: {
        mapId,
        teamId,
      },
    });

    if (mapStatsForTeam) {
      console.log("mapStatsForTeam", mapStatsForTeam);
      const wl = calculateRatio(
        mapStatsForTeam.matchesWon + (newMatch.result === "win" ? 1 : 0),
        mapStatsForTeam.matchesLost + (newMatch.result === "loss" ? 1 : 0),
      );

      console.log("wl", wl);
      const kd = calculateRatio(
        mapStatsForTeam.kills + memberOneKills + memberTwoKills,
        mapStatsForTeam.deaths + memberOneDeaths + memberTwoDeaths,
      );
      console.log("kd", kd);

      await ctx.db.mapStats.update({
        where: {
          id: mapStatsForTeam.id,
        },
        data: {
          matchesPlayed: mapStatsForTeam.matchesPlayed + 1,
          matchesWon:
            mapStatsForTeam.matchesWon + (newMatch.result === "win" ? 1 : 0),
          matchesLost:
            mapStatsForTeam.matchesLost + (newMatch.result === "loss" ? 1 : 0),
          roundsWon: mapStatsForTeam.roundsWon + rounds_won,
          roundsLost: mapStatsForTeam.roundsLost + rounds_lost,
          kills: mapStatsForTeam.kills + memberOneKills + memberTwoKills,
          deaths: mapStatsForTeam.deaths + memberOneDeaths + memberTwoDeaths,
          kd: kd,
          wl: wl,
        },
      });
    } else {
      const wl = calculateRatio(
        newMatch.result === "win" ? 1 : 0,
        newMatch.result === "loss" ? 1 : 0,
      );
      const kd = calculateRatio(
        memberOneKills + memberTwoKills,
        memberOneDeaths + memberTwoDeaths,
      );

      await ctx.db.mapStats.create({
        data: {
          mapId,
          teamId,
          matchesPlayed: 1,
          matchesWon: newMatch.result === "win" ? 1 : 0,
          matchesLost: newMatch.result === "loss" ? 1 : 0,
          roundsWon: rounds_won,
          roundsLost: rounds_lost,
          kills: memberOneKills + memberTwoKills,
          deaths: memberOneDeaths + memberTwoDeaths,
          wl: wl,
          kd: kd,
        },
      });
    }
    // Or if user id is passed in
  } else if (userId) {
    const mkills =
      ctx.currentUser === memberOneGoogleId ? memberOneKills : memberTwoKills;
    const mdeaths =
      ctx.currentUser === memberOneGoogleId ? memberOneDeaths : memberTwoDeaths;
    console.log("mkills", mkills);
    console.log("mdeaths", mdeaths);

    const mapStatsForUser = await ctx.db.mapStats.findFirst({
      where: {
        mapId,
        userId,
      },
    });

    if (mapStatsForUser) {
      console.log("mapStatsForUser", mapStatsForUser);
      const wl = calculateRatio(
        mapStatsForUser.matchesWon + (newMatch.result === "win" ? 1 : 0),
        mapStatsForUser.matchesLost + (newMatch.result === "loss" ? 1 : 0),
      );
      console.log("wl", wl);
      const kd = calculateRatio(
        mapStatsForUser.kills + mkills,
        mapStatsForUser.deaths + mdeaths,
      );
      console.log("kd", kd);

      await ctx.db.mapStats.update({
        where: {
          id: mapStatsForUser.id,
        },
        data: {
          matchesPlayed: mapStatsForUser.matchesPlayed + 1,
          matchesWon:
            mapStatsForUser.matchesWon + (newMatch.result === "win" ? 1 : 0),
          matchesLost:
            mapStatsForUser.matchesLost + (newMatch.result === "loss" ? 1 : 0),
          roundsWon: mapStatsForUser.roundsWon + rounds_won,
          roundsLost: mapStatsForUser.roundsLost + rounds_lost,
          kills: mapStatsForUser.kills + mkills,
          deaths: mapStatsForUser.deaths + mdeaths,
          kd: kd,
          wl: wl,
        },
      });
    } else {
      const wl = calculateRatio(
        newMatch.result === "win" ? 1 : 0,
        newMatch.result === "loss" ? 1 : 0,
      );
      const kd = calculateRatio(mkills, mdeaths);

      await ctx.db.mapStats.create({
        data: {
          mapId: mapId,
          userId: userId,
          matchesPlayed: 1,
          matchesWon: newMatch.result === "win" ? 1 : 0,
          matchesLost: newMatch.result === "loss" ? 1 : 0,
          roundsWon: rounds_won,
          roundsLost: rounds_lost,
          kills: memberOneKills + memberTwoKills,
          deaths: memberOneDeaths + memberTwoDeaths,
          wl: wl,
          kd: kd,
        },
      });
    }
  }
}

async function updateMapStats(
  newMatch: Match,
  oldMatch: Match,
  mapId: number,
  ctx: {
    db: PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>;
    currentUser: string | null;
  },
  teamId?: number,
  userId?: string,
) {
  const {
    memberOneGoogleId,
    memberTwoGoogleId,
    rounds_won,
    rounds_lost,
    memberOneKills,
    memberTwoKills,
    memberOneDeaths,
    memberTwoDeaths,
  } = newMatch;

  const {
    memberOneGoogleId: oldMemberOneGoogleId,
    memberTwoGoogleId: oldMemberTwoGoogleId,
    rounds_won: oldRoundsWon,
    rounds_lost: oldRoundsLost,
    memberOneKills: oldMemberOneKills,
    memberTwoKills: oldMemberTwoKills,
    memberOneDeaths: oldMemberOneDeaths,
    memberTwoDeaths: oldMemberTwoDeaths,
  } = oldMatch;

  if (newMatch.mapId !== oldMatch.mapId) {
    await deleteMapStats(oldMatch, oldMatch.mapId, ctx, teamId, userId);
    await createMapStats(newMatch, newMatch.mapId, ctx, teamId, userId);
  } else {
    // If team id is passed in
    if (teamId) {
      const mapStatsForTeam = await ctx.db.mapStats.findFirst({
        where: {
          mapId,
          teamId,
        },
      });

      if (mapStatsForTeam) {
        let wins = mapStatsForTeam.matchesWon;
        let losses = mapStatsForTeam.matchesLost;
        let kills = mapStatsForTeam.kills;
        let deaths = mapStatsForTeam.deaths;
        let roundsWon = mapStatsForTeam.roundsWon;
        let roundsLost = mapStatsForTeam.roundsLost;

        if (newMatch.result !== oldMatch.result) {
          if (newMatch.result === "win") {
            wins += 1;
            losses -= 1;
          } else if (newMatch.result === "loss") {
            wins -= 1;
            losses += 1;
          }
        }

        if (rounds_won !== oldRoundsWon) {
          roundsWon = roundsWon - oldRoundsWon + rounds_won;
        }

        if (rounds_lost !== oldRoundsLost) {
          roundsLost = roundsLost - oldRoundsLost + rounds_lost;
        }

        if (memberOneKills !== oldMemberOneKills) {
          kills = kills - oldMemberOneKills + memberOneKills;
        }

        if (memberTwoKills !== oldMemberTwoKills) {
          kills = kills - oldMemberTwoKills + memberTwoKills;
        }

        if (memberOneDeaths !== oldMemberOneDeaths) {
          deaths = deaths - oldMemberOneDeaths + memberOneDeaths;
        }

        if (memberTwoDeaths !== oldMemberTwoDeaths) {
          deaths = deaths - oldMemberTwoDeaths + memberTwoDeaths;
        }

        const wl = calculateRatio(wins, losses);
        const kd = calculateRatio(kills, deaths);

        await ctx.db.mapStats.update({
          where: {
            id: mapStatsForTeam.id,
          },
          data: {
            matchesWon: wins,
            matchesLost: losses,
            roundsWon: roundsWon,
            roundsLost: roundsLost,
            kills: kills,
            deaths: kills,
          },
        });
      } else {
        const wl = calculateRatio(
          newMatch.result === "win" ? 1 : 0,
          newMatch.result === "loss" ? 1 : 0,
        );
        const kd = calculateRatio(
          memberOneKills + memberTwoKills,
          memberOneDeaths + memberTwoDeaths,
        );

        await ctx.db.mapStats.create({
          data: {
            mapId,
            teamId,
            matchesPlayed: 1,
            matchesWon: newMatch.result === "win" ? 1 : 0,
            matchesLost: newMatch.result === "loss" ? 1 : 0,
            roundsWon: rounds_won,
            roundsLost: rounds_lost,
            kills: memberOneKills + memberTwoKills,
            deaths: memberOneDeaths + memberTwoDeaths,
            wl: wl,
            kd: kd,
          },
        });
      }
      // Or if user id is passed in
    } else if (userId) {
      const mkills =
        ctx.currentUser === memberOneGoogleId ? memberOneKills : memberTwoKills;
      const mdeaths =
        ctx.currentUser === memberOneGoogleId
          ? memberOneDeaths
          : memberTwoDeaths;
      const oldmkills =
        ctx.currentUser === oldMemberOneGoogleId
          ? oldMemberOneKills
          : oldMemberTwoKills;
      const oldmdeaths =
        ctx.currentUser === oldMemberOneGoogleId
          ? oldMemberOneDeaths
          : oldMemberTwoDeaths;

      const mapStatsForUser = await ctx.db.mapStats.findFirst({
        where: {
          mapId,
          userId,
        },
      });

      if (mapStatsForUser) {
        let wins = mapStatsForUser.matchesWon;
        let losses = mapStatsForUser.matchesLost;
        let kills = mapStatsForUser.kills;
        let deaths = mapStatsForUser.deaths;
        let roundsWon = mapStatsForUser.roundsWon;
        let roundsLost = mapStatsForUser.roundsLost;

        if (newMatch.result !== oldMatch.result) {
          if (newMatch.result === "win") {
            wins += 1;
            losses -= 1;
          } else if (newMatch.result === "loss") {
            wins -= 1;
            losses += 1;
          }
        }

        if (rounds_won !== oldRoundsWon) {
          roundsWon = roundsWon - oldRoundsWon + rounds_won;
        }

        if (rounds_lost !== oldRoundsLost) {
          roundsLost = roundsLost - oldRoundsLost + rounds_lost;
        }

        if (mkills !== oldmkills) {
          kills = kills - oldmkills + mkills;
        }

        if (mdeaths !== oldmdeaths) {
          deaths = deaths - oldmdeaths + mdeaths;
        }

        const wl = calculateRatio(wins, losses);
        const kd = calculateRatio(kills, deaths);

        await ctx.db.mapStats.update({
          where: {
            id: mapStatsForUser.id,
          },
          data: {
            matchesWon: wins,
            matchesLost: losses,
            roundsWon: roundsWon,
            roundsLost: roundsLost,
            kills: kills,
            deaths: deaths,
          },
        });
      } else {
        const wl = calculateRatio(
          newMatch.result === "win" ? 1 : 0,
          newMatch.result === "loss" ? 1 : 0,
        );
        const kd = calculateRatio(mkills, mdeaths);

        await ctx.db.mapStats.create({
          data: {
            mapId: mapId,
            userId: userId,
            matchesPlayed: 1,
            matchesWon: newMatch.result === "win" ? 1 : 0,
            matchesLost: newMatch.result === "loss" ? 1 : 0,
            roundsWon: rounds_won,
            roundsLost: rounds_lost,
            kills: memberOneKills + memberTwoKills,
            deaths: memberOneDeaths + memberTwoDeaths,
            wl: wl,
            kd: kd,
          },
        });
      }
    }
  }
}

async function deleteMapStats(
  match: Match,
  mapId: number,
  ctx: {
    db: PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>;
    currentUser: string | null;
  },
  teamId?: number,
  userId?: string,
) {
  const {
    memberOneGoogleId,
    memberTwoGoogleId,
    rounds_won,
    rounds_lost,
    memberOneKills,
    memberTwoKills,
    memberOneDeaths,
    memberTwoDeaths,
  } = match;

  // If team id is passed in
  if (teamId) {
    const mapStatsForTeam = await ctx.db.mapStats.findFirst({
      where: {
        mapId,
        teamId,
      },
    });

    if (mapStatsForTeam) {
      const wl = calculateRatio(
        mapStatsForTeam.matchesWon + (match.result === "win" ? -1 : 1),
        mapStatsForTeam.matchesLost + (match.result === "loss" ? -1 : 1),
      );
      const kd = calculateRatio(
        mapStatsForTeam.kills - (memberOneKills + memberTwoKills),
        mapStatsForTeam.deaths - (memberOneDeaths + memberTwoDeaths),
      );

      await ctx.db.mapStats.update({
        where: {
          id: mapStatsForTeam.id,
        },
        data: {
          matchesPlayed: mapStatsForTeam.matchesPlayed - 1,
          matchesWon:
            mapStatsForTeam.matchesWon + (match.result === "win" ? -1 : 1),
          matchesLost:
            mapStatsForTeam.matchesLost + (match.result === "loss" ? -1 : 1),
          roundsWon: mapStatsForTeam.roundsWon - rounds_won,
          roundsLost: mapStatsForTeam.roundsLost - rounds_lost,
          kills: mapStatsForTeam.kills - (memberOneKills + memberTwoKills),
          deaths: mapStatsForTeam.deaths - (memberOneDeaths + memberTwoDeaths),
        },
      });
    }
    // Or if user id is passed in
  } else if (userId) {
    const mkills =
      ctx.currentUser === memberOneGoogleId ? memberOneKills : memberTwoKills;
    const mdeaths =
      ctx.currentUser === memberOneGoogleId ? memberOneDeaths : memberTwoDeaths;

    const mapStatsForUser = await ctx.db.mapStats.findFirst({
      where: {
        mapId,
        userId,
      },
    });

    if (mapStatsForUser) {
      const wl = calculateRatio(
        mapStatsForUser.matchesWon + (match.result === "win" ? -1 : 1),
        mapStatsForUser.matchesLost + (match.result === "loss" ? -1 : 1),
      );
      const kd = calculateRatio(
        mapStatsForUser.kills - mkills,
        mapStatsForUser.deaths - mdeaths,
      );

      await ctx.db.mapStats.update({
        where: {
          id: mapStatsForUser.id,
        },
        data: {
          matchesPlayed: mapStatsForUser.matchesPlayed - 1,
          matchesWon:
            mapStatsForUser.matchesWon + (match.result === "win" ? -1 : 1),
          matchesLost:
            mapStatsForUser.matchesLost + (match.result === "loss" ? -1 : 1),
          roundsWon: mapStatsForUser.roundsWon - rounds_won,
          roundsLost: mapStatsForUser.roundsLost - rounds_lost,
          kills: mapStatsForUser.kills - mkills,
          deaths: mapStatsForUser.deaths - mdeaths,
        },
      });
    }
  }
}
