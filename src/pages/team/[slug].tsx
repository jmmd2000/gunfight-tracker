/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
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
  Settings,
  XCircle,
  PlusSquare,
} from "lucide-react";
import { useRouter } from "next/router";
import { useState, useEffect, ReactNode } from "react";
import { PuffLoader, ScaleLoader } from "react-spinners";
import { Match, type Team, type User } from "~/types";
import { api } from "~/utils/api";
import { useUser } from "@clerk/nextjs";
import * as z from "zod";
import { FieldError, set, useForm } from "react-hook-form";
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
import { calculateRatio } from "~/server/api/routers/match";
import { Switch } from "@/components/ui/switch";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useToastEffect } from "~/hooks/useToastEffect";

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
  // const userID = user.user!.id;
  let userID = "";
  if (user.user) {
    userID = user.user.id;
  }

  let matches: Match[] = [];

  //take team?.matches and reverse the order
  if (team?.matches) {
    matches = team?.matches.reverse();
  }

  return (
    <div>
      {team && (
        <div>
          {/* {user.user?.id === team?.created_by_google_id && (
            <div>
              <TeamSettingsDialog
                team={team}
                joinerPermission={team?.allowJoinerToAddMatches}
              />
            </div>
          )} */}
          <StatTable team={team} userID={userID} />
          {team.members.length !== 2 &&
            userID === team.created_by_google_id && (
              <div className="m-8 flex justify-center">
                <div className="flex items-center justify-center gap-4">
                  <h1 className="text-xl font-semibold text-gray-300">
                    Need a full team to add matches...
                  </h1>
                </div>
              </div>
            )}
          {team.members.length === 2 &&
            (userID === team.created_by_google_id ||
              team.allowJoinerToAddMatches) && (
              <NewMatchDialog teamID={team.id} users={users}>
                <Button size="sm" className=" bg-blue-700">
                  <PlusSquare />
                </Button>
              </NewMatchDialog>
            )}
          {team?.matches !== undefined && (
            <div className="m-8 flex flex-col gap-3">
              {matches.map((match) => (
                <MatchCard match={match} users={users} key={match.id} />
              ))}
            </div>
          )}
        </div>
      )}
      {!team && <div>Error fetching team</div>}
      <ToastContainer
        toastStyle={{
          // same as bg-gray-700 bg-opacity-10
          background: "rgba(55, 65, 81, 0.1)",
          color: "#D2D2D3",
          borderRadius: "0.375rem",
          backdropFilter: "blur(16px)",
          border: "1px solid #3f3f46",
        }}
        progressStyle={{
          borderRadius: "0.375rem",
        }}
        position="top-right"
      />
    </div>
  );
}

const StatTable = (props: { team: Team; userID: string }) => {
  const { team, userID } = props;
  return (
    <>
      {team && (
        <div className="mt-4">
          <div className="flex items-center gap-4">
            <h1 className="mb-4 ml-8 mt-4 text-2xl font-semibold text-gray-300">
              {team.name}
            </h1>
            {userID === team?.created_by_google_id && (
              <TeamSettingsDialog
                team={team}
                joinerPermission={team?.allowJoinerToAddMatches}
              />
            )}
          </div>

          <div className="mx-8 my-4 grid grid-cols-11 grid-rows-2 border border-zinc-900 bg-zinc-800 bg-opacity-10 bg-clip-padding p-2 text-center text-zinc-200 shadow-lg backdrop-blur-lg backdrop-filter">
            <p className="text-xs text-zinc-400">W/L</p>
            <p className="text-xs text-zinc-400">W/L Last 10</p>
            <p className="text-xs text-zinc-400">Played</p>
            <p className="text-xs text-zinc-400">Won</p>
            <p className="text-xs text-zinc-400">Lost</p>
            <p className="text-xs text-zinc-400">K/D</p>
            <p className="text-xs text-zinc-400">K/D Last 10</p>
            <p className="text-xs text-zinc-400">Kills</p>
            <p className="text-xs text-zinc-400">Deaths</p>
            <p className="text-xs text-zinc-400">rounds won</p>
            <p className="text-xs text-zinc-400">rounds lost</p>
            <p>{team.wl}</p>
            <p>{team.wl_10}</p>
            <p>{team.matches_won + team.matches_lost}</p>
            <p>{team.matches_won}</p>
            <p>{team.matches_lost}</p>
            <p>{team.kd}</p>
            <p>{team.kd_10}</p>
            <p>{team.total_kills}</p>
            <p>{team.total_deaths}</p>
            <p>{team.rounds_won}</p>
            <p>{team.rounds_lost}</p>
          </div>
        </div>
      )}
    </>
  );
};

// //- TODO: implement this
// const UserStatCard = (props: { user: User }) => {
//   return <div></div>;
// };

//! This component is all over the place, needs to be refactored
const TeamSettingsDialog = (props: {
  team: Team;
  joinerPermission: boolean;
}) => {
  const [friendcode, setFriendcode] = useState("");
  const [newTeamName, setNewTeamName] = useState("");
  const [memberRemoving, setMemberRemoving] = useState(false);
  const [memberRemoved, setMemberRemoved] = useState(false);
  const [teamDeleting, setTeamDeleting] = useState(false);
  const [teamDeleted, setTeamDeleted] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const router = useRouter();

  const { data, isLoading, isError, refetch } =
    api.user.getByFriendcode.useQuery(friendcode, {
      enabled: false,
    });

  const {
    data: teamNameAvailable,
    isLoading: checkingTeamName,
    isError: errorCheckingName,
    refetch: checkTeamName,
  } = api.team.checkName.useQuery(newTeamName, {
    enabled: false,
  });

  const { mutate: createTeamRequest } = api.teamrequest.create.useMutation();
  const { mutate: updateJoinerPermission } =
    api.team.updateJoinerPermission.useMutation();
  const {
    mutate: removeMember,
    isLoading: removingMember,
    error: cantRemoveMember,
  } = api.userteam.delete.useMutation();
  const { mutate: updateTeamName } = api.team.updateName.useMutation();
  const {
    mutate: deleteTeam,
    isLoading: deletingTeam,
    error: cantDeleteTeam,
  } = api.team.delete.useMutation();

  const handleFriendcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFriendcode(e.target.value);
  };

  const handleTeamNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewTeamName(e.target.value);
  };

  const handleDeleteTeam = () => {
    if (confirm("Are you sure you want to delete this team?")) {
      setTeamDeleting(true);
      deleteTeam(props.team.id, {
        onSuccess: () => {
          setTeamDeleting(false);
          setTeamDeleted(true);
          setDialogOpen(false);
          // void router.push("/teams");
        },
        onError: (error) => {
          setTeamDeleting(false);
          setTeamDeleted(false);
          setDialogOpen(false);
          toast.error("Error deleting team.", {
            progressStyle: {
              backgroundColor: "#DC2626",
            },
          });
        },
      });
    }
  };

  const handleSubmit = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (data && props.team.id) {
      createTeamRequest(
        {
          toUserGoogleID: data.google_id,
          teamID: props.team.id,
        },
        {
          onSuccess: () => {
            toast.success("Team request sent!");
          },
          onError: (error) => {
            console.log("error", error);
            toast.error("Error sending team request.", {
              progressStyle: {
                backgroundColor: "#DC2626",
              },
            });
          },
        },
      );
    }
  };

  const handleUpdateTeamName = () => {
    if (props.team.id) {
      updateTeamName(
        {
          teamId: props.team.id,
          newName: newTeamName,
        },
        {
          onSuccess: () => {
            void router.push(`/team/${newTeamName}`);
            toast.success("Team name updated!");
          },
          onError: (error) => {
            console.log("error", error);
            toast.error("Error updating name.", {
              progressStyle: {
                backgroundColor: "#DC2626",
              },
            });
          },
        },
      );
    }
  };

  const handleUpdateJoinerPermission = (checked: boolean) => {
    if (props.team.id) {
      updateJoinerPermission(
        {
          teamId: props.team.id,
          allowJoinerToAddMatches: checked,
        },
        {
          onSuccess: () => {
            toast.success("Member permissions updated!");
          },
          onError: (error) => {
            console.log("error", error);
            toast.error("Error updating member permissions.", {
              progressStyle: {
                backgroundColor: "#DC2626",
              },
            });
          },
        },
      );
    }
  };

  const handleRemovePlayer = () => {
    if (
      confirm(
        "Are you sure you want to remove this team member?\nThis will remove all matches in this team that they participated in.",
      )
    ) {
      removeMember(
        {
          teamId: props.team.id,
          memberId: props.team.members[1]!.user.google_id,
        },
        {
          onError: (error) => {
            console.log("error", error);
            toast.error("Error removing team member.", {
              progressStyle: {
                backgroundColor: "#DC2626",
              },
            });
          },
        },
      );
    }
  };

  // Manages toast for deleting team and removing member

  useEffect(() => {
    console.log("teamDeleting", teamDeleting);
  }, [teamDeleting]);

  useToastEffect(
    teamDeleting,
    teamDeleted,
    !!cantDeleteTeam,
    "deleting-team",
    "Deleting team...",
    "Team deleted!",
  );

  useToastEffect(
    removingMember,
    memberRemoved,
    !!cantRemoveMember,
    "removing-member",
    "Removing team member...",
    "Team member removed!",
  );

  // This checks if a user with the given friendcode exists
  useEffect(() => {
    if (friendcode.length === 0) return;
    const checkFriendcode = async () => {
      await refetch();
    };
    void checkFriendcode();
  }, [friendcode, refetch]);

  // This checks if the team name is available
  useEffect(() => {
    if (newTeamName.length === 0 || newTeamName === "New Team") return;
    const checkName = async () => {
      await checkTeamName();
    };
    void checkName();
  }, [newTeamName, checkTeamName]);

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        {/* <Button size="sm"> */}
        <div className=" text-zinc-500 transition-colors hover:cursor-pointer hover:text-zinc-200">
          <Settings />
        </div>

        {/* </Button> */}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Team settings</DialogTitle>
        </DialogHeader>
        {/* //* START OF NEW TEAM NAME INPUT */}
        <div className="grid gap-2 py-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="name">Team name</Label>
            <Input
              id="name"
              className="col-span-3"
              placeholder="New team name..."
              onBlur={handleTeamNameChange}
            />
          </div>
          <div className="flex w-full flex-col items-center justify-center">
            {teamNameAvailable !== undefined &&
              !teamNameAvailable.name_available &&
              newTeamName !== "" && (
                <div className="flex items-center gap-2">
                  <XCircle color="#ef4444" />
                  <DialogDescription className="text-red-500">
                    Team name already exists
                  </DialogDescription>
                </div>
              )}
            {teamNameAvailable !== undefined &&
              teamNameAvailable.name_available &&
              newTeamName !== "" && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 color="#22c55e" />
                  <DialogDescription className="text-green-500">
                    Team name available!
                  </DialogDescription>
                </div>
              )}
          </div>
          <div className="flex justify-end">
            <Button
              variant="secondary"
              disabled={checkingTeamName || !teamNameAvailable?.name_available}
              onClick={handleUpdateTeamName}
            >
              Update name
            </Button>
          </div>
        </div>

        {/* //* START OF NEW TEAM MEMBER INPUT */}
        {props.team.members.length === 2 && (
          <div className="flex items-end gap-1 py-4">
            <div className="w-[90%]">
              <Label htmlFor="friendcode">Remove team member</Label>
              <div className="m-auto  rounded-md border border-zinc-700 bg-zinc-950/40 p-2">
                <p className="font-semibold text-zinc-400">
                  {props.team.members[1]?.user.username}
                </p>
              </div>
            </div>
            <button
              className="flex h-[42px] w-[10%] items-center justify-center rounded-md bg-red-500 text-zinc-50 transition-all hover:bg-red-700"
              onClick={handleRemovePlayer}
            >
              {!!memberRemoving && <PuffLoader size={20} />}

              {!memberRemoving && <Trash2 size={20} />}
            </button>
          </div>
        )}
        {props.team.members.length === 1 && (
          <div className="grid gap-2 py-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="friendcode">Add team member</Label>
              <Input
                id="friendcode"
                className="col-span-3"
                onBlur={handleFriendcodeChange}
                placeholder="Via friendcode, e.g. resident-gold-mink..."
              />
            </div>
            <div className="flex flex-col items-center">
              {data?.google_id === undefined && friendcode !== "" && (
                <div className="flex items-center gap-2">
                  <XCircle color="#ef4444" />
                  <DialogDescription className="text-red-500">
                    User not found
                  </DialogDescription>
                </div>
              )}
              {data?.google_id !== undefined && friendcode !== "" && (
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
            <div className="flex justify-end">
              <Button
                variant="secondary"
                disabled={isLoading || data?.google_id === undefined}
                onClick={handleSubmit}
              >
                Add member
              </Button>
            </div>
          </div>
        )}

        {/* //* START OF PERMISSIONS SWITCH */}
        <div className="grid gap-2 py-4">
          <div className="flex flex-row items-center justify-between rounded-lg p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Member two permissions</Label>
              <DialogDescription>
                Allow member two to add matches?
              </DialogDescription>
            </div>
            <Switch
              // checked={props.joinerPermission}
              onCheckedChange={handleUpdateJoinerPermission}
              defaultChecked={props.joinerPermission}
            />
          </div>
        </div>
        {/* //* START OF TEAM DELETE */}
        <div className="grid gap-2 py-4">
          <div className="flex flex-row items-center justify-between rounded-lg p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Delete Team</Label>
              <DialogDescription>This cannot be undone.</DialogDescription>
            </div>
            <Button
              variant="destructive"
              className="border-2 border-transparent hover:border-red-700 hover:bg-transparent"
              onClick={handleDeleteTeam}
            >
              {!!teamDeleting && <PuffLoader size={20} />}

              {!teamDeleting && "Delete Team"}
            </Button>
          </div>
        </div>
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

const NewMatchDialog = (props: {
  teamID: number;
  users: User[];
  editMatch?: Match;
  children: ReactNode;
}) => {
  const { teamID, users, children, editMatch } = props;
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add new match</DialogTitle>
        </DialogHeader>
        <MatchForm
          users={users}
          teamID={teamID}
          editMatch={editMatch}
          openToggle={{
            open: dialogOpen,
            setOpen: setDialogOpen,
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

const MatchFormSchema = z
  .object({
    // Usually the form values come in as strings, but if the input
    // is left blank as 0, it comes in as a number. So need this hacky
    // workaround to make sure the values are always strings, so they can be converted.
    mapId: z
      .union([z.string(), z.number()])
      .transform((val) =>
        parseInt(typeof val === "number" ? val.toString() : val, 10),
      )
      .refine((val) => !isNaN(val) && val > 0, {
        message: "Must be a valid map",
      }),

    rounds_won: z
      .union([z.string(), z.number()])
      .transform((val) =>
        parseInt(typeof val === "number" ? val.toString() : val, 10),
      )
      .refine((val) => !isNaN(val) && val >= 0 && val <= 6, {
        message: "Rounds won must be a number between 0 and 6",
      }),

    rounds_lost: z
      .union([z.string(), z.number()])
      .transform((val) =>
        parseInt(typeof val === "number" ? val.toString() : val, 10),
      )
      .refine((val) => !isNaN(val) && val >= 0 && val <= 6, {
        message: "Rounds lost must be a number between 0 and 6",
      }),

    memberOneKills: z
      .union([z.string(), z.number()])
      .transform((val) =>
        parseInt(typeof val === "number" ? val.toString() : val, 10),
      )
      .refine((val) => !isNaN(val) && val >= 0, {
        message: "Kills must be a non-negative number",
      }),

    memberOneDeaths: z
      .union([z.string(), z.number()])
      .transform((val) =>
        parseInt(typeof val === "number" ? val.toString() : val, 10),
      )
      .refine((val) => !isNaN(val) && val >= 0, {
        message: "Deaths must be a non-negative number",
      }),

    memberTwoKills: z
      .union([z.string(), z.number()])
      .transform((val) =>
        parseInt(typeof val === "number" ? val.toString() : val, 10),
      )
      .refine((val) => !isNaN(val) && val >= 0, {
        message: "Kills must be a non-negative number",
      }),

    memberTwoDeaths: z
      .union([z.string(), z.number()])
      .transform((val) =>
        parseInt(typeof val === "number" ? val.toString() : val, 10),
      )
      .refine((val) => !isNaN(val) && val >= 0, {
        message: "Deaths must be a non-negative number",
      }),
  })
  .superRefine((data, context) => {
    if (data.rounds_won + data.rounds_lost > 11) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "The sum of rounds won and rounds lost must not exceed 11",
        path: ["rounds_sum"],
      });
    }
  });

function MatchForm(props: {
  teamID: number;
  editMatch?: Match;
  users: User[];
  openToggle: { open: boolean; setOpen: (open: boolean) => void };
}) {
  const { teamID, editMatch, users, openToggle } = props;

  console.log("editMatch", editMatch);

  // const users = team.members.map((ut) => ut.user) as unknown as User[];
  const { data: maps, isLoading, isError } = api.map.getAll.useQuery();
  const { mutate: createMatch } = api.match.create.useMutation();
  const { mutate: updateMatch } = api.match.update.useMutation();
  const { mutate: deleteMatch } = api.match.delete.useMutation();

  const form = useForm<z.infer<typeof MatchFormSchema>>({
    resolver: zodResolver(MatchFormSchema),
    defaultValues: {
      mapId: editMatch?.mapId ?? 1,
      rounds_won: editMatch?.rounds_won ?? 0,
      rounds_lost: editMatch?.rounds_lost ?? 0,
      memberOneKills: editMatch?.memberOneKills ?? 0,
      memberOneDeaths: editMatch?.memberOneDeaths ?? 0,
      memberTwoKills: editMatch?.memberTwoKills ?? 0,
      memberTwoDeaths: editMatch?.memberTwoDeaths ?? 0,
    },
    mode: "onChange",
  });

  function onSubmit(values: z.infer<typeof MatchFormSchema>) {
    if (editMatch) {
      const result = values.rounds_won > values.rounds_lost ? "win" : "loss";
      console.log("values", values);
      updateMatch(
        {
          matchId: editMatch.id,
          mapId: values.mapId,
          rounds_won: values.rounds_won,
          rounds_lost: values.rounds_lost,
          memberOneKills: values.memberOneKills,
          memberOneDeaths: values.memberOneDeaths,
          memberTwoKills: values.memberTwoKills,
          memberTwoDeaths: values.memberTwoDeaths,
          result: result,
          teamId: teamID,
          memberOneGoogleId: users[0]!.google_id,
          memberTwoGoogleId: users[1]!.google_id,
        },
        {
          onSuccess: () => {
            toast.success("Match updated!");
            openToggle.setOpen(false);
          },
          onError: (error) => {
            console.log("error", error);
            toast.error("Error updating match.", {
              progressStyle: {
                backgroundColor: "#DC2626",
              },
            });
          },
        },
      );
    } else {
      const result = values.rounds_won > values.rounds_lost ? "win" : "loss";
      console.log("values", values);
      createMatch(
        {
          mapId: values.mapId,
          rounds_won: values.rounds_won,
          rounds_lost: values.rounds_lost,
          memberOneKills: values.memberOneKills,
          memberOneDeaths: values.memberOneDeaths,
          memberTwoKills: values.memberTwoKills,
          memberTwoDeaths: values.memberTwoDeaths,
          result: result,
          teamId: teamID,
          memberOneGoogleId: users[0]!.google_id,
          memberTwoGoogleId: users[1]!.google_id,
        },
        {
          onSuccess: () => {
            toast.success("Match added!");
            openToggle.setOpen(false);
          },
          onError: (error) => {
            console.log("error", error);
            toast.error("Error adding match.", {
              progressStyle: {
                backgroundColor: "#DC2626",
              },
            });
          },
        },
      );
    }
  }

  const handleDelete = () => {
    if (editMatch && confirm("Are you sure you want to delete this match?")) {
      deleteMatch(editMatch.id, {
        onSuccess: () => {
          toast.success("Match deleted!");
          openToggle.setOpen(false);
        },
        onError: (error) => {
          console.log("error", error);
          toast.error("Error deleting match.", {
            progressStyle: {
              backgroundColor: "#DC2626",
            },
          });
        },
      });
    }
  };

  //? This is a hacky workaround to get the error message to display
  //? Zod dynamically adds the field error to the formState.errors object
  //? Typescript doesn't understand, so we ignore the error
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const roundSumError = form.formState.errors.rounds_sum;
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-8">
        {roundSumError && (
          <p className="text-sm text-red-500">{roundSumError.message}</p>
        )}
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
                    defaultValue={editMatch?.rounds_won ?? 0}
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
                    defaultValue={editMatch?.rounds_lost ?? 0}
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
                <Select
                  onValueChange={field.onChange}
                  defaultValue={editMatch?.mapId.toString()}
                >
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
                        defaultValue={editMatch?.memberOneKills ?? 0}
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
                        defaultValue={editMatch?.memberOneDeaths ?? 0}
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
                        defaultValue={editMatch?.memberTwoKills ?? 0}
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
                        defaultValue={editMatch?.memberTwoDeaths ?? 0}
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
        <div className="flex justify-end">
          {!editMatch && (
            <Button
              type="submit"
              variant="secondary"
              disabled={form.formState.isSubmitting || !form.formState.isValid}
            >
              Submit
            </Button>
          )}

          {!!editMatch && (
            <div className="flex gap-2">
              <Button
                type="submit"
                className="bg-blue-700 hover:bg-blue-800"
                disabled={
                  form.formState.isSubmitting || !form.formState.isValid
                }
              >
                Update
              </Button>
              <Button
                className="bg-red-700 hover:bg-red-800"
                disabled={
                  form.formState.isSubmitting || !form.formState.isValid
                }
                onClick={handleDelete}
              >
                Delete
              </Button>
            </div>
          )}
        </div>
      </form>
    </Form>
  );
}

export const MatchCard = (props: { match: Match; users: User[] }) => {
  const { match, users } = props;
  // const { data: map, isLoading, isError } = api.map.getByID.useQuery(
  //   match.mapId
  // );

  const gradientEnd =
    match?.result === "win" ? "to-green-600/80" : "to-red-600/80";

  return (
    <div
      className={`flex items-center justify-center gap-4 rounded-md border border-zinc-700 bg-opacity-10 bg-gradient-to-r from-zinc-700/10 from-40% via-zinc-700/10 ${gradientEnd} backdrop-filter" m-2 h-24 overflow-hidden bg-clip-padding p-2 shadow-lg backdrop-blur-lg `}
    >
      <div className="flex items-start">
        <img
          src={match.map.map_image_url}
          alt={`Image of ${match.map.name}`}
          className="absolute left-40 top-1/2 z-0 max-w-[350px] -translate-x-1/2 -translate-y-1/2 transform"
        />
        <div className="w-[350px]"></div>

        <div className="w-[200px]">
          <h1 className="text-xl font-semibold text-zinc-300">
            {match.map.name}
          </h1>
          <p className="z-10 text-sm font-medium text-zinc-500">
            {new Date(match?.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="flex gap-4">
        <MatchCardPlayerStats
          username={users[0]?.username}
          kills={match?.memberOneKills}
          deaths={match?.memberOneDeaths}
        />
        <div className="h-[70px] border border-l-zinc-700"></div>
        <MatchCardPlayerStats
          username={users[1]?.username}
          kills={match?.memberTwoKills}
          deaths={match?.memberTwoDeaths}
        />
      </div>

      {/* <div className="flex w-[150px] items-center justify-center gap-4"> */}
      <NewMatchDialog teamID={match.teamId} users={users} editMatch={match}>
        <Button
          size="sm"
          className="m-auto border border-zinc-700 hover:bg-zinc-950"
        >
          <Pencil />
        </Button>
      </NewMatchDialog>

      {/* <Button size="sm" className="border border-zinc-700 hover:bg-zinc-950">
          <Trash2 />
        </Button>
      </div> */}

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

const MatchCardPlayerStats = (props: {
  username: string | undefined;
  kills: number;
  deaths: number;
}) => {
  const { username, kills, deaths } = props;
  return (
    <div className="flex flex-col items-center justify-evenly gap-4">
      <p className="text-xs font-semibold text-zinc-400">{username}</p>
      <div className="grid grid-cols-2">
        <div className="flex flex-col items-center gap-1">
          <p className="text-[9px] font-semibold text-zinc-200">Kills</p>
          <p className="text-lg font-semibold text-zinc-200">{kills}</p>
        </div>
        <div className="flex flex-col items-center gap-1">
          <p className="text-[9px] font-semibold text-zinc-200">Deaths</p>
          <p className="text-lg font-semibold text-zinc-200">{deaths}</p>
        </div>
        {/* <div className="flex flex-col items-center gap-1">
          <p className="text-[9px] font-semibold text-zinc-200">K/D</p>
          <p className="text-lg font-semibold text-zinc-200">
            {Math.round((kills / deaths) * 100) / 100}
          </p>
        </div> */}
      </div>
      {/* <p className="text-xl font-semibold text-zinc-200">
        {kills} - {deaths}
      </p>
      <p className="text-sm font-medium text-zinc-300">
        {Math.round((kills / deaths) * 100) / 100}
      </p> */}
    </div>
  );
};
