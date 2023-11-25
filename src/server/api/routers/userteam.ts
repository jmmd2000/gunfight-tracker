import { type Team } from "~/types";
import { z } from "zod";

import {
  createTRPCRouter,
  privateProcedure,
  publicProcedure,
} from "~/server/api/trpc";

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
});
