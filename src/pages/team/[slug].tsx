/* eslint-disable @next/next/no-img-element */
import { Button } from "@/components/ui/button";
import {
  DialogHeader,
  DialogFooter,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { UserTeam } from "@prisma/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  UserRoundCog,
  Pencil,
  Trash2,
  CheckCircle2,
  Plus,
  XCircle,
  PlusSquare,
} from "lucide-react";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { ScaleLoader } from "react-spinners";
import { Match, type Team, type User } from "~/types";
import { api } from "~/utils/api";
import { useUser } from "@clerk/nextjs";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parse } from "path";
import { empty } from "@prisma/client/runtime/library";

export default function TeamDetailPage() {
  const router = useRouter();
  const user = useUser();
  const teamName = router.query.slug;
  const {
    data: team,
    isLoading,
    isSuccess,
  } = api.team.getByName.useQuery(teamName as string);

  const userTeams = team?.members;
  const users = userTeams?.map((ut) => ut.user) as unknown as User[];

  return (
    <div>
      {user.user?.id === team?.created_by_google_id && (
        <div>
          {team?.members.length === 1 && (
            <TeamMembersDialog teamID={team?.id} />
          )}
          <Button size="sm" className="bg-orange-700">
            <Pencil />
          </Button>
          <Button size="sm" className="bg-red-700">
            <Trash2 />
          </Button>
        </div>
      )}
      <StatTable team={team!} />
      {/* <StatTable user={users?.[0]} />
      <StatTable user={users?.[1]} /> */}
      <NewMatchDialog team={team!} />
      {team?.matches !== undefined && (
        <div className="m-8 flex flex-col gap-3">
          {team?.matches.map((match) => (
            <MatchCard match={match} key={match.id} />
          ))}
        </div>
      )}
    </div>
  );
}

const StatTable = (props: { team: Team }) => {
  const { team } = props;
  console.log(team);
  return (
    <>
      <h1 className="mx-8 mb-4 mt-8 text-2xl font-semibold text-gray-300">
        {team?.name}
      </h1>
      <div className="mx-8 my-4 grid grid-cols-9 grid-rows-2 border border-zinc-900 bg-zinc-800 bg-opacity-10 bg-clip-padding p-2 text-center text-zinc-200 shadow-lg backdrop-blur-lg backdrop-filter">
        <p className="text-xs text-zinc-400">W/L</p>
        <p className="text-xs text-zinc-400">W/L Last 10</p>
        <p className="text-xs text-zinc-400">Played</p>
        <p className="text-xs text-zinc-400">Won</p>
        <p className="text-xs text-zinc-400">Lost</p>
        <p className="text-xs text-zinc-400">K/D</p>
        <p className="text-xs text-zinc-400">K/D Last 10</p>
        <p className="text-xs text-zinc-400">Kills</p>
        <p className="text-xs text-zinc-400">Deaths</p>
        <p>{team?.wl}</p>
        <p>{team?.wl_10}</p>
        <p>{team?.matches?.length}</p>
        <p>{team?.matches_won}</p>
        <p>{team?.matches_lost}</p>
        <p>{team?.kd}</p>
        <p>{team?.kd_10}</p>
        <p>{team?.total_kills}</p>
        <p>{team?.total_deaths}</p>
      </div>
    </>
  );
};

//- TODO: implement this
const UserStatCard = (props: { user: User }) => {
  return <div></div>;
};

const TeamMembersDialog = (props: { teamID: number | undefined }) => {
  const [friendcode, setFriendcode] = useState("");

  const { data, isLoading, isError, refetch } =
    api.user.getByFriendcode.useQuery(friendcode, {
      enabled: false,
    });

  const { mutate: createTeamRequest } = api.teamrequest.create.useMutation();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFriendcode(e.target.value);
  };

  const handleSubmit = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (data && props.teamID) {
      createTeamRequest({
        toUserGoogleID: data.google_id,
        teamID: props.teamID,
      });
    }
  };

  useEffect(() => {
    async function checkFriendcode() {
      await refetch();
    }

    if (friendcode.length > 0 && friendcode !== "") {
      void checkFriendcode();
    }
  }, [friendcode, refetch]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" className=" bg-blue-700">
          <UserRoundCog />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add team member</DialogTitle>
          <DialogDescription>
            Add a user to your team with their friendcode{" "}
            <i>(e.g. resident-gold-mink)</i>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="friendcode" className="text-right">
              Friendcode
            </Label>
            <Input
              id="friendcode"
              className="col-span-3"
              onBlur={handleChange}
            />
          </div>
          <div className="flex flex-col items-center">
            {data?.google_id === undefined && (
              <div className="flex items-center gap-2">
                <XCircle color="#ef4444" />
                <DialogDescription className="text-red-500">
                  User not found
                </DialogDescription>
              </div>
            )}
            {data?.google_id !== undefined && (
              <div className="mt-2 flex flex-col items-center gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 color="#22c55e" />
                  <DialogDescription className="text-green-500">
                    User found!
                  </DialogDescription>
                </div>
                <UserCard user={data} />
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            // type="submit"
            variant="secondary"
            disabled={isLoading || data?.google_id === undefined}
            onClick={handleSubmit}
          >
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const UserCard = (props: { user: User }) => {
  const { user } = props;
  if (user === null) {
    return <div></div>;
  }
  return (
    <div className="flex items-center gap-4 px-4 py-2 text-zinc-300">
      <img
        className="h-8 w-8 rounded-full"
        src={user.avatar_url}
        alt="user avatar"
      />
      <p>{user.username}</p>
    </div>
  );
};

const NewMatchDialog = (props: { team: Team }) => {
  const { team } = props;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" className=" bg-blue-700">
          <PlusSquare />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add new match</DialogTitle>
        </DialogHeader>
        <MatchForm team={team} />
      </DialogContent>
    </Dialog>
  );
};

const MatchFormSchema = z.object({
  mapId: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val >= 0, {
      message: "Must be a valid map",
    }),
  rounds_won: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val >= 0 && val <= 6, {
      message: "Rounds won must be a number between 0 and 6",
    }),
  rounds_lost: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val >= 0 && val <= 6, {
      message: "Rounds lost must be a number between 0 and 6",
    }),
  memberOneKills: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val >= 0, {
      message: "Member One Kills must be a non-negative number",
    }),
  memberOneDeaths: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val >= 0, {
      message: "Member One Deaths must be a non-negative number",
    }),
  memberTwoKills: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val >= 0, {
      message: "Member Two Kills must be a non-negative number",
    }),
  memberTwoDeaths: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val >= 0, {
      message: "Member Two Deaths must be a non-negative number",
    }),
});

function MatchForm(props: { team: Team }) {
  const { team } = props;
  const users = team.members.map((ut) => ut.user) as unknown as User[];
  const { data: maps, isLoading, isError } = api.map.getAll.useQuery();
  const { mutate: createMatch } = api.match.create.useMutation();

  const form = useForm<z.infer<typeof MatchFormSchema>>({
    resolver: zodResolver(MatchFormSchema),
  });

  console.log("form", form.formState.errors);

  function onSubmit(values: z.infer<typeof MatchFormSchema>) {
    const result = values.rounds_won > values.rounds_lost ? "win" : "loss";
    createMatch({
      mapId: values.mapId,
      rounds_won: values.rounds_won,
      rounds_lost: values.rounds_lost,
      memberOneKills: values.memberOneKills,
      memberOneDeaths: values.memberOneDeaths,
      memberTwoKills: values.memberTwoKills,
      memberTwoDeaths: values.memberTwoDeaths,
      result: result,
      teamId: team.id,
      memberOneGoogleId: users[0]!.google_id,
      memberTwoGoogleId: users[1]!.google_id,
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-8">
        <div className="flex items-center justify-center gap-4">
          <FormField
            control={form.control}
            name="rounds_won"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    max={6}
                    className="max-w-[75px] border-zinc-700 bg-transparent text-3xl text-zinc-200"
                    {...field}
                  />
                </FormControl>
                <FormLabel>rounds won</FormLabel>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="rounds_lost"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    max={6}
                    className="max-w-[75px] border-zinc-700 bg-transparent text-3xl text-zinc-200"
                    {...field}
                  />
                </FormControl>
                <FormLabel>rounds lost</FormLabel>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="mapId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Map</FormLabel>
              <FormControl>
                <Select onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a map" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {maps?.map((map) => (
                      <SelectItem key={map.id} value={map.id.toString()}>
                        {map.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-2">
            <FormLabel>{users[0]?.username}</FormLabel>
            <div className="flex items-center justify-evenly gap-1">
              <FormField
                control={form.control}
                name="memberOneKills"
                render={({ field }) => (
                  <FormItem className="flex flex-col items-center">
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        className="max-w-[65px] border-zinc-700 bg-transparent text-xl text-zinc-200"
                        {...field}
                      />
                    </FormControl>
                    <FormLabel>kills</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="memberOneDeaths"
                render={({ field }) => (
                  <FormItem className="flex flex-col items-center">
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        className="max-w-[65px] border-zinc-700 bg-transparent text-xl text-zinc-200"
                        {...field}
                      />
                    </FormControl>
                    <FormLabel>deaths</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <FormLabel>{users[1]?.username}</FormLabel>
            <div className="flex items-center justify-evenly gap-1">
              <FormField
                control={form.control}
                name="memberTwoKills"
                render={({ field }) => (
                  <FormItem className="flex flex-col items-center">
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        className="max-w-[65px] border-zinc-700 bg-transparent text-xl text-zinc-200"
                        {...field}
                      />
                    </FormControl>
                    <FormLabel>kills</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="memberTwoDeaths"
                render={({ field }) => (
                  <FormItem className="flex flex-col items-center">
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        className="max-w-[65px] border-zinc-700 bg-transparent text-xl text-zinc-200"
                        {...field}
                      />
                    </FormControl>
                    <FormLabel>deaths</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>
        <Button
          type="submit"
          variant="secondary"
          disabled={Object.keys(form.formState.errors).length > 0}
        >
          Submit
        </Button>
      </form>
    </Form>
  );
}

export const MatchCard = (props: { match: Match }) => {
  const { match } = props;
  // const { data: map, isLoading, isError } = api.map.getByID.useQuery(
  //   match.mapId
  // );

  const gradientEnd =
    match?.result === "win" ? "to-green-600/80" : "to-red-600/80";
  console.log(match);

  return (
    <div
      className={`flex items-center justify-center gap-2 rounded-md border border-zinc-700 bg-opacity-10 bg-gradient-to-r from-zinc-700/10 from-40% via-zinc-700/10 ${gradientEnd} backdrop-filter" overflow-hidden bg-clip-padding p-4 shadow-lg backdrop-blur-lg `}
    >
      <div className="flex flex-col items-start">
        <img
          src={match.map.map_image_url}
          alt={`Image of ${match.map.name}`}
          className="absolute left-40 top-1/2 z-0 max-w-[350px] -translate-x-1/2 -translate-y-1/2 transform"
        />

        <div className="ml-[350px] ">
          <h1 className="text-xl font-semibold text-zinc-300">
            {match.map.name}
          </h1>
          <p className="z-10 text-sm font-medium text-zinc-500">
            {new Date(match?.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="ml-auto">
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-center gap-2">
            <p className="text-xl font-semibold text-zinc-200">
              {match?.memberOneKills} - {match?.memberOneDeaths}
            </p>
            <p className="text-sm font-medium text-zinc-300">
              {Math.round(
                (match?.memberOneKills / match?.memberOneDeaths) * 100,
              ) / 100}
            </p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <p className="text-xl font-semibold text-zinc-200">
              {match?.memberTwoKills} - {match?.memberTwoDeaths}
            </p>
            <p className="text-sm font-medium text-zinc-300">
              {Math.round(
                (match?.memberTwoKills / match?.memberTwoDeaths) * 100,
              ) / 100}
            </p>
          </div>
        </div>
      </div>

      <div className="ml-auto flex flex-col items-end">
        <p className="text-xl font-semibold text-zinc-200">
          {match?.rounds_won} - {match?.rounds_lost}
        </p>
        <p className="text-sm font-medium text-zinc-300">
          {match?.result === "win" ? "Win" : "Loss"}
        </p>
      </div>
    </div>
  );
};
