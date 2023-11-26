import { z } from "zod";
import {
  uniqueNamesGenerator,
  Config,
  adjectives,
  colors,
  animals,
} from "unique-names-generator";

import {
  createTRPCRouter,
  privateProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { User } from "~/types";

export const userRouter = createTRPCRouter({
  create: privateProcedure
    .input(
      z.object({
        first_name: z.string().or(z.null()),
        last_name: z.string().or(z.null()),
        avatar_url: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const currentUser = ctx.currentUser;

      // Check if a user with this google_id already exists
      const existingUser = await ctx.db.user.findUnique({
        where: { google_id: currentUser },
      });

      if (existingUser) {
        return existingUser;
      }

      // Check if a user with this friendcode already exists
      let friendCode;
      while (true) {
        const fc = uniqueNamesGenerator({
          dictionaries: [adjectives, colors, animals],
          separator: "-",
          length: 3,
        });

        const friendCodeExists = await ctx.db.user.findUnique({
          where: { friendcode: fc },
        });

        if (!friendCodeExists) {
          friendCode = fc;
          break;
        }
      }

      const username = uniqueNamesGenerator({
        dictionaries: [adjectives, colors, animals],
        separator: "",
        length: 2,
        style: "capital",
      });

      const user = await ctx.db.user.create({
        data: {
          google_id: currentUser,
          first_name: input.first_name,
          last_name: input.last_name,
          username: username,
          avatar_url: input.avatar_url,
          friendcode: friendCode,
          created_at: new Date(),
          updated_at: new Date(),
          admin: false,
        },
      });

      return user;
    }),
  getAll: publicProcedure.query(async ({ ctx }) => {
    const users = await ctx.db.user.findMany();
    return users;
  }),
  getByFriendcode: privateProcedure
    .input(z.string())
    .query(async ({ input, ctx }) => {
      const user = await ctx.db.user.findUnique({
        where: { friendcode: input },
      });

      return user as unknown as User;
    }),
});
