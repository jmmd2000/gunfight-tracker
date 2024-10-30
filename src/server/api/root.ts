import { userRouter } from "~/server/api/routers/user";
import { teamsRouter } from "~/server/api/routers/teams";
import { userteamsRouter } from "~/server/api/routers/userteam";
import { createTRPCRouter } from "~/server/api/trpc";
import { teamrequestsRouter } from "~/server/api/routers/teamrequests";
import { matchesRouter } from "~/server/api/routers/match";
import { mapRouter } from "~/server/api/routers/map";
import { mapStatsRouter } from "~/server/api/routers/mapstats";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  user: userRouter,
  team: teamsRouter,
  userteam: userteamsRouter,
  teamrequest: teamrequestsRouter,
  match: matchesRouter,
  map: mapRouter,
  mapStats: mapStatsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
