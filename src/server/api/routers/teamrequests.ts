import { TeamRequest, type Team } from "~/types";
import { z } from "zod";

import {
  createTRPCRouter,
  privateProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const teamrequestsRouter = createTRPCRouter({
  create: privateProcedure
    .input(
      z.object({
        teamID: z.number(),
        toUserGoogleID: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const currentUser = ctx.currentUser;

      const request = await ctx.db.teamRequest.create({
        data: {
          teamId: input.teamID,
          fromUserGoogleId: currentUser,
          toUserGoogleId: input.toUserGoogleID,
        },
      });

      return request;
    }),
  getAll: publicProcedure.query(async ({ ctx }) => {
    const teams = (await ctx.db.team.findMany()) as unknown as Team[];
    return teams;
  }),
  getAllWithMember: privateProcedure.query(async ({ ctx }) => {
    const currentUser = ctx.currentUser;

    const requests = await ctx.db.teamRequest.findMany({
      where: {
        toUserGoogleId: currentUser,
      },
      include: {
        team: {
          include: {
            members: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    // console.log(requests);

    return requests as unknown as TeamRequest[];
  }),
  accept: privateProcedure
    .input(
      z.object({
        teamID: z.number(),
        fromUserGoogleId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const currentUser = ctx.currentUser;

      // const request = await ctx.db.teamRequest.delete({
      //   where: {
      //     fromUserGoogleId_toUserGoogleId_teamId: {
      //       fromUserGoogleId: input.fromUserGoogleId,
      //       toUserGoogleId: currentUser,
      //       teamId: input.teamID,
      //     },
      //   },
      // });

      const userTeams = await ctx.db.userTeam.findMany({
        where: {
          teamId: input.teamID,
        },
      });

      if (userTeams.length > 2) {
        throw new Error("Team is full");
      } else {
        const request = await ctx.db.teamRequest.update({
          where: {
            fromUserGoogleId_toUserGoogleId_teamId: {
              fromUserGoogleId: input.fromUserGoogleId,
              toUserGoogleId: currentUser,
              teamId: input.teamID,
            },
          },
          data: {
            status: "accepted",
          },
        });

        const userTeam = await ctx.db.userTeam.create({
          data: {
            user_google_Id: currentUser,
            teamId: input.teamID,
          },
        });

        return request;
      }
    }),
  decline: privateProcedure
    .input(
      z.object({
        teamID: z.number(),
        fromUserGoogleId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const currentUser = ctx.currentUser;

      const request = await ctx.db.teamRequest.update({
        where: {
          fromUserGoogleId_toUserGoogleId_teamId: {
            fromUserGoogleId: input.fromUserGoogleId,
            toUserGoogleId: currentUser,
            teamId: input.teamID,
          },
        },
        data: {
          status: "rejected",
        },
      });

      return request;
    }),
  delete: privateProcedure
    .input(
      z.object({
        toUserGoogleID: z.string(),
        teamID: z.number(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const currentUser = ctx.currentUser;

      const request = await ctx.db.teamRequest.delete({
        where: {
          fromUserGoogleId_toUserGoogleId_teamId: {
            fromUserGoogleId: currentUser,
            toUserGoogleId: input.toUserGoogleID,
            teamId: input.teamID,
          },
        },
      });

      return request;
    }),
});
