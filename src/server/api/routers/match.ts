import { Match, User, type Team } from "~/types";
import { z } from "zod";

import {
  createTRPCRouter,
  privateProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { Prisma, PrismaClient } from "@prisma/client";
import { DefaultArgs } from "@prisma/client/runtime/library";
import { calculateRatio } from "~/helpers/calculateRatio";

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

      //- TODO: implement updating total rounds won/lost

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

// async function updateTeamKills(
//   team: Team,
//   totalTeamKills: number,
//   totalTeamDeaths: number,
//   oldTotalTeamKills: number,
//   oldTotalTeamDeaths: number,
//   ctx: {
//     db: PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>;
//     currentUser: string | null;
//   },
// ) {
//   if (
//     oldTotalTeamKills !== totalTeamKills ||
//     oldTotalTeamDeaths !== totalTeamDeaths
//   ) {
//     const newTotalKills =
//       team.total_kills! - oldTotalTeamKills + totalTeamKills;
//     const newTotalDeaths =
//       team.total_deaths! - oldTotalTeamDeaths + totalTeamDeaths;
//     const newKd =
//       newTotalDeaths > 0
//         ? Math.round((newTotalKills / newTotalDeaths) * 100) / 100
//         : newTotalKills;

//     const m1totalKills = team.memberOneTotalKills - oldTotalTeamKills + totalTeamKills;

//     await ctx.db.team.update({
//       where: {
//         id: team.id,
//       },
//       data: {
//         total_kills: newTotalKills,
//         total_deaths: newTotalDeaths,
//         kd: newKd,
//       },
//     });
//   }
// }
