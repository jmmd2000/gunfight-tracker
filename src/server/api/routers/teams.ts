import { type Team } from "~/types";
import { z } from "zod";

import {
  createTRPCRouter,
  privateProcedure,
  publicProcedure,
} from "~/server/api/trpc";

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
