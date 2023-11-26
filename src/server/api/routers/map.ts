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

export const mapRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    const maps = await ctx.db.map.findMany();
    return maps;
  }),
});
