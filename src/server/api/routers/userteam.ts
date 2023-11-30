import { type Team } from "~/types";
import { z } from "zod";

import {
  createTRPCRouter,
  privateProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { calculateRatio } from "./match";

export const userteamsRouter = createTRPCRouter({
  // getAll: publicProcedure.query(async ({ ctx }) => {
  //   const teams = (await ctx.db.team.findMany()) as Team[];
  //   return teams;
  // }),
  getAllWithMember: privateProcedure.query(async ({ ctx }) => {
    const currentUser = ctx.currentUser;

    const teams = await ctx.db.team.findMany({
      where: {
        members: {
          some: {
            user_google_Id: currentUser,
          },
        },
      },
      include: {
        members: true,
      },
    });

    return teams;
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
  delete: privateProcedure
    .input(
      z.object({
        teamId: z.number(),
        memberId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const currentUser = ctx.currentUser;

      const team = await ctx.db.team.findUnique({
        where: { id: input.teamId },
        include: {
          members: true,
        },
      });

      const matches = await ctx.db.match.findMany({
        where: {
          teamId: input.teamId,
          memberTwoGoogleId: input.memberId,
        },
      });

      const memberOne = await ctx.db.user.findUnique({
        where: {
          google_id: team?.members[0]?.user_google_Id,
        },
      });

      const memberTwo = await ctx.db.user.findUnique({
        where: {
          google_id: input.memberId,
        },
      });

      let m1Kills = 0;
      let m1Deaths = 0;
      let m2Kills = 0;
      let m2Deaths = 0;
      let wins = 0;
      let losses = 0;
      let rounds_won = 0;
      let rounds_lost = 0;

      if (matches) {
        for (const match of matches) {
          if (match.result === "win") {
            wins++;
          } else {
            losses++;
          }

          m1Kills += match.memberOneKills;
          m1Deaths += match.memberOneDeaths;
          m2Kills += match.memberTwoKills;
          m2Deaths += match.memberTwoDeaths;
          rounds_won += match.rounds_won;
          rounds_lost += match.rounds_lost;
          await ctx.db.match.delete({
            where: {
              id: match.id,
            },
          });
        }
      }

      if (memberOne) {
        const updatedKills = memberOne?.kills - m1Kills;
        const updatedDeaths = memberOne?.deaths - m1Deaths;
        const updatedMatchesPlayed =
          memberOne?.matches_played - (wins + losses);
        const updatedMatchesWon = memberOne?.matches_won - wins;
        const updatedMatchesLost = memberOne?.matches_lost - losses;
        const updatedWL = calculateRatio(updatedMatchesWon, updatedMatchesLost);
        const updatedKD = calculateRatio(updatedKills, updatedDeaths);

        const last_ten_matches = await ctx.db.match.findMany({
          where: {
            memberOneGoogleId: team?.members[0]?.user_google_Id,
          },
          take: 10,
          orderBy: {
            created_at: "desc",
          },
        });

        let m1Kills10 = 0;
        let m1Deaths10 = 0;
        let m1Wins10 = 0;
        let m1Losses10 = 0;

        for (const match of last_ten_matches) {
          if (match.result === "win") {
            m1Wins10++;
          } else {
            m1Losses10++;
          }

          m1Kills10 += match.memberOneKills;
          m1Deaths10 += match.memberOneDeaths;
        }

        const wl_10 = calculateRatio(m1Wins10, m1Losses10);
        const kd_10 = calculateRatio(m1Kills10, m1Deaths10);

        const updatedMemberOne = await ctx.db.user.update({
          where: {
            google_id: memberOne?.google_id,
          },
          data: {
            matches_won: updatedMatchesWon,
            matches_lost: updatedMatchesLost,
            matches_played: updatedMatchesPlayed,
            kills: updatedKills,
            deaths: updatedDeaths,
            kd: updatedKD,
            wl: updatedWL,
            kd_10: kd_10,
            wl_10: wl_10,
            rounds_won: memberOne?.rounds_won - rounds_won,
            rounds_lost: memberOne?.rounds_lost - rounds_lost,
          },
        });
      }

      if (memberTwo) {
        const updatedKills = memberTwo?.kills - m2Kills;
        const updatedDeaths = memberTwo?.deaths - m2Deaths;
        const updatedMatchesPlayed =
          memberTwo?.matches_played - (wins + losses);
        const updatedMatchesWon = memberTwo?.matches_won - wins;
        const updatedMatchesLost = memberTwo?.matches_lost - losses;
        const updatedWL = calculateRatio(updatedMatchesWon, updatedMatchesLost);
        const updatedKD = calculateRatio(updatedKills, updatedDeaths);

        const last_ten_matches = await ctx.db.match.findMany({
          where: {
            memberTwoGoogleId: input.memberId,
          },
          take: 10,
          orderBy: {
            created_at: "desc",
          },
        });

        let m2Kills10 = 0;
        let m2Deaths10 = 0;
        let m2Wins10 = 0;
        let m2Losses10 = 0;

        for (const match of last_ten_matches) {
          if (match.result === "win") {
            m2Wins10++;
          } else {
            m2Losses10++;
          }

          m2Kills10 += match.memberTwoKills;
          m2Deaths10 += match.memberTwoDeaths;
        }

        const wl_10 = calculateRatio(m2Wins10, m2Losses10);
        const kd_10 = calculateRatio(m2Kills10, m2Deaths10);

        const updatedMemberTwo = await ctx.db.user.update({
          where: {
            google_id: memberTwo?.google_id,
          },
          data: {
            matches_won: updatedMatchesWon,
            matches_lost: updatedMatchesLost,
            matches_played: updatedMatchesPlayed,
            kills: updatedKills,
            deaths: updatedDeaths,
            kd: updatedKD,
            wl: updatedWL,
            kd_10: kd_10,
            wl_10: wl_10,
            rounds_won: memberTwo?.rounds_won - rounds_won,
            rounds_lost: memberTwo?.rounds_lost - rounds_lost,
          },
        });
      }

      if (team) {
        const updatedTeam = await ctx.db.team.update({
          where: {
            id: team?.id,
          },
          data: {
            matches_won: team?.matches_won - wins,
            matches_lost: team?.matches_lost - losses,
            memberOneTotalKills: team?.memberOneTotalKills - m1Kills,
            memberOneTotalDeaths: team?.memberOneTotalDeaths - m1Deaths,
            memberTwoTotalKills: team?.memberTwoTotalKills - m2Kills,
            memberTwoTotalDeaths: team?.memberTwoTotalDeaths - m2Deaths,
            total_kills: team?.total_kills - (m1Kills + m2Kills),
            total_deaths: team?.total_deaths - (m1Deaths + m2Deaths),
            kd_10: 0,
            wl_10: 0,
            kd: 0,
            wl: 0,
            rounds_won: team?.rounds_won - rounds_won,
            rounds_lost: team?.rounds_lost - rounds_lost,
            // kd_10:
            //   team?.total_kills -
            //   m1Kills +
            //   m2Kills /
            //   team?.total_deaths -
            //   m1Deaths +
            //   m2Deaths,
            // wl_10:
            // rounds_won: team?.rounds_won - rounds_won,
            // rounds_lost: team?.rounds_lost - rounds_lost,
          },
        });
      }

      // if (team!.created_by_google_id !== currentUser) {
      //   throw new Error("You are not the owner of this team");
      // }

      const userTeam = await ctx.db.userTeam.delete({
        where: {
          user_google_Id_teamId: {
            teamId: input.teamId,
            user_google_Id: input.memberId,
          },
        },
      });

      return team;
    }),
});
