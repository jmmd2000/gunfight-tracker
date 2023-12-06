/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @next/next/no-img-element */
import { Button } from "@/components/ui/button";
import {
  DialogHeader,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, CheckCircle2, Settings, XCircle } from "lucide-react";
import { useRouter } from "next/router";
import { useState, useEffect, type ReactNode } from "react";
import { PuffLoader } from "react-spinners";
import { type Match, type Team, type User } from "~/types";
import { api } from "~/utils/api";
import { useUser } from "@clerk/nextjs";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { calculateRatio } from "~/helpers/calculateRatio";
import { Switch } from "@/components/ui/switch";
import "react-toastify/dist/ReactToastify.css";
import { useToastEffect } from "~/hooks/useToastEffect";
import { TeamRequestCard } from "~/components/layout";
import { toast } from "react-toastify";
import { SelectGroup } from "@radix-ui/react-select";

export default function TeamDetailPage() {
  const router = useRouter();
  const user = useUser();
  const teamName = router.query.slug;
  const {
    data: team,
    // isLoading,
    // isSuccess,
  } = api.team.getByName.useQuery(teamName as string);

  const userTeams = team?.members;
  const users = userTeams?.map((ut) => ut.user) as unknown as User[];
  // const userID = user.user!.id;
  let userID = "";
  if (user.user) {
    userID = user.user.id;
  }

  // let matches: Match[] = [];

  //take team?.matches and reverse the order
  // if (team?.matches) {
  //   matches = team?.matches.reverse();
  // }

  // useEffect(() => {
  //   if (
  //     user.user.id !== team?.created_by_google_id &&
  //     user.user.id !== team?.members[1]?.user.google_id
  //   ) {
  //     if (!toast.isActive("not-member")) {
  //       toast.info("You are not a member of this team.", {
  //         autoClose: false,
  //         closeOnClick: true,
  //         position: "bottom-center",
  //         style: {
  //           width: "max-content",
  //           background: "rgba(55, 65, 81, 0.1)",
  //           color: "#D2D2D3",
  //           borderRadius: "0.375rem",
  //           backdropFilter: "blur(16px)",
  //           border: "1px solid #3f3f46",
  //         },
  //         toastId: "not-member",
  //       });
  //     }
  //   }
  // }, []);

  return (
    <div>
      {/* {userID !== team?.created_by_google_id &&
        userID !== team?.members[1]?.user.google_id && (
          <p className="flex justify-center p-4 text-zinc-500">
            You are not a member of this team.
          </p>
        )} */}
      {team && (
        <div>
          <StatTable team={team} userID={userID} />
          {team.members.length !== 2 &&
            userID === team.created_by_google_id && (
              <div className="m-8 flex justify-center">
                <div className="flex items-center justify-center gap-4">
                  <h1 className="text-xl font-semibold text-gray-300">
                    You need a full team to add matches.
                  </h1>
                </div>
              </div>
            )}

          {team?.matches !== undefined && (
            <div className="flex flex-col gap-1 md:mx-8">
              <h1 className="ml-4 mt-4 text-xl font-semibold text-gray-300">
                Matches
              </h1>

              {team.members.length === 2 &&
                (userID === team.created_by_google_id ||
                  team.allowJoinerToAddMatches) && (
                  <div className="mt-2 flex justify-center">
                    <NewMatchDialog teamID={team.id} users={users}>
                      <Button
                        size="sm"
                        variant="default"
                        className="border border-zinc-700 hover:bg-zinc-200 hover:text-zinc-900"
                      >
                        Add new match
                      </Button>
                    </NewMatchDialog>
                  </div>
                )}
              {team?.matches.map((match) => (
                <MatchCard match={match} users={users} key={match.id} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const StatTable = (props: { team: Team; userID: string }) => {
  const { team, userID } = props;
  const bestPlayer =
    calculateRatio(team.memberOneTotalKills, team.memberOneTotalDeaths) >
    calculateRatio(team.memberTwoTotalKills, team.memberTwoTotalDeaths)
      ? team.members[0]?.user
      : team.members[1]?.user;
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

          <div className="mx-8 my-4 grid grid-cols-2 border border-zinc-900 bg-zinc-800 bg-opacity-10 bg-clip-padding p-2 text-center text-zinc-200 shadow-lg backdrop-blur-lg backdrop-filter sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12 ">
            <div>
              <p className="bg-zinc-900 p-1 text-xs text-zinc-400">Played</p>
              <p>{team.matches_won + team.matches_lost}</p>
            </div>
            <div>
              <p className="bg-zinc-900 p-1 text-xs text-zinc-400">Won</p>
              <p>{team.matches_won}</p>
            </div>
            <div>
              <p className="bg-zinc-900 p-1 text-xs text-zinc-400">Lost</p>
              <p>{team.matches_lost}</p>
            </div>
            <div>
              <p className="bg-zinc-900 p-1 text-xs text-zinc-400">Kills</p>
              <p>{team.total_kills}</p>
            </div>
            <div>
              <p className="bg-zinc-900 p-1 text-xs text-zinc-400">Deaths</p>
              <p>{team.total_deaths}</p>
            </div>
            <div>
              <p className="bg-zinc-900 p-1 text-xs text-zinc-400">W/L</p>
              <p>{team.wl}</p>
            </div>
            <div>
              <p className="bg-zinc-900 p-1 text-xs text-zinc-400">
                W/L Last 10
              </p>
              <p>{team.wl_10}</p>
            </div>
            <div>
              <p className="bg-zinc-900 p-1 text-xs text-zinc-400">K/D</p>
              <p>{team.kd}</p>
            </div>
            <div>
              <p className="bg-zinc-900 p-1 text-xs text-zinc-400">
                K/D Last 10
              </p>
              <p>{team.kd_10}</p>
            </div>
            <div>
              <p className="bg-zinc-900 p-1 text-xs text-zinc-400">
                Rounds won
              </p>
              <p>{team.rounds_won}</p>
            </div>
            <div>
              <p className="bg-zinc-900 p-1 text-xs text-zinc-400">
                Rounds lost
              </p>
              <p>{team.rounds_lost}</p>
            </div>
            <div>
              <p className="bg-zinc-900 p-1 text-xs text-zinc-400">
                Best player
              </p>
              <p className="text-[14px]">{bestPlayer?.username}</p>
            </div>
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
  // const [requestSending, setRequestSending] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const router = useRouter();

  const {
    data,
    isLoading,
    //  isError,
    refetch,
  } = api.user.getByFriendcode.useQuery(friendcode, {
    enabled: false,
  });

  const {
    data: teamNameAvailable,
    isLoading: checkingTeamName,
    // isError: errorCheckingName,
    refetch: checkTeamName,
  } = api.team.checkName.useQuery(newTeamName, {
    enabled: false,
  });

  const {
    mutate: createTeamRequest,
    isLoading: sendingTeamRequest,
    error: cantSendTeamRequest,
  } = api.teamrequest.create.useMutation();

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
          setTeamDeleted(true);
          setDialogOpen(false);
          void router.push("/teams");
        },
        onError: () => {
          setTeamDeleted(false);
          setDialogOpen(false);
          // toast.error("Error deleting team.", {
          //   progressStyle: {
          //     backgroundColor: "#DC2626",
          //   },
          // });
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
            // setRequestSending(false);
            setRequestSent(true);
          },
          onError: () => {
            // setRequestSending(false);
            setRequestSent(false);
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
            toast.success("Team name updated!", {});
          },
          onError: (error) => {
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
            toast.success("Member permissions updated!", {});
          },
          onError: (error) => {
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
          onSuccess: () => {
            // toast.success("Team member removed!");
            // void router.reload();
            setMemberRemoved(true);
            setMemberRemoving(false);
          },
          onError: () => {
            setMemberRemoved(false);
            setMemberRemoving(false);
          },
        },
      );
    }
  };

  // Manages toast for deleting team and removing member

  useToastEffect(
    deletingTeam,
    teamDeleted,
    !!cantDeleteTeam,
    "deleting-team",
    "Deleting team...",
    "Team deleted!",
    "Couldn't delete team.",
  );

  useToastEffect(
    removingMember,
    memberRemoved,
    !!cantRemoveMember,
    "removing-member",
    "Removing team member...",
    "Team member removed!",
    "Couldn't remove team member.",
  );

  useToastEffect(
    sendingTeamRequest,
    requestSent,
    !!cantSendTeamRequest,
    "sending-team-request",
    "Sending team invite...",
    "Team invite sent!",
    "Couldn't send invite.",
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
              <div className="flex items-center gap-4">
                <Label htmlFor="friendcode">Add team member</Label>
                <TeamInvitesDialog teamId={props.team.id} />
              </div>
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

const TeamInvitesDialog = (props: { teamId: number }) => {
  const {
    data: requests,
    isLoading,
    // isError,
    refetch,
  } = api.teamrequest.getAllWithTeam.useQuery(props.teamId);

  return (
    <Dialog>
      <DialogTrigger asChild onClick={() => refetch()}>
        <div className=" text-zinc-500 transition-colors hover:cursor-pointer">
          <p className="text-xs hover:text-zinc-400">View sent invites</p>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="mb-4">Sent team invites</DialogTitle>
          {isLoading && (
            <div className="flex justify-center">
              <PuffLoader color="#d4d4d8" />
            </div>
          )}
          {requests?.length === 0 && (
            <DialogDescription className="text-sm">
              No invites sent.
            </DialogDescription>
          )}
          {requests?.length !== 0 && (
            <div className="mt-8 flex flex-col gap-2">
              {requests?.map((request) => (
                <TeamRequestCard
                  key={request.id}
                  teamrequest={request}
                  revokeable
                  refetch={refetch}
                />
              ))}
            </div>
          )}
        </DialogHeader>
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

  // const users = team.members.map((ut) => ut.user) as unknown as User[];
  const {
    data: maps,
    // isLoading,
    // isError
  } = api.map.getAll.useQuery();
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
            toast.success("Match updated!", { containerId: "main" });
            openToggle.setOpen(false);
          },
          onError: (error) => {
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
            toast.success("Match added!", { containerId: "main" });
            openToggle.setOpen(false);
          },
          onError: (error) => {
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
          toast.success("Match deleted!", { containerId: "main" });
          openToggle.setOpen(false);
        },
        onError: (error) => {
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
                    <SelectGroup>
                      <SelectLabel className="bg-zinc-800 text-zinc-200">
                        Modern Warfare III
                      </SelectLabel>
                      {maps?.map(
                        (map) =>
                          map.game_name === "MW3" && (
                            <SelectItem key={map.id} value={map.id.toString()}>
                              {map.name}
                            </SelectItem>
                          ),
                      )}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel className="bg-zinc-800 text-zinc-200">
                        Modern Warfare II
                      </SelectLabel>
                      {maps?.map(
                        (map) =>
                          map.game_name === "MW2" && (
                            <SelectItem key={map.id} value={map.id.toString()}>
                              {map.name}
                            </SelectItem>
                          ),
                      )}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel className="bg-zinc-800 text-zinc-200">
                        Modern Warfare 2019
                      </SelectLabel>
                      {maps?.map(
                        (map) =>
                          map.game_name === "MW19" && (
                            <SelectItem key={map.id} value={map.id.toString()}>
                              {map.name}
                            </SelectItem>
                          ),
                      )}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel className="bg-zinc-800 text-zinc-200">
                        Cold War
                      </SelectLabel>
                      {maps?.map(
                        (map) =>
                          map.game_name === "CW" && (
                            <SelectItem key={map.id} value={map.id.toString()}>
                              {map.name}
                            </SelectItem>
                          ),
                      )}
                    </SelectGroup>
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

//- TODO: limit matches to 10 and push to a different page to view all matches

export const MatchCard = (props: { match: Match; users: User[] }) => {
  const { match, users } = props;
  // const { data: map, isLoading, isError } = api.map.getByID.useQuery(
  //   match.mapId
  // );

  const gradientEnd =
    match?.result === "win" ? "to-green-600/80" : "to-red-600/80";

  return (
    <div
      className={`flex items-center justify-center gap-4 rounded-md border border-zinc-700 bg-opacity-10 bg-gradient-to-r from-zinc-700/10 from-40% via-zinc-700/10 ${gradientEnd} backdrop-filter" h-24 overflow-hidden bg-clip-padding p-2 shadow-lg backdrop-blur-lg sm:m-2 `}
    >
      <div className="flex items-start">
        <img
          src={match.map.map_image_url}
          alt={`Image of ${match.map.name}`}
          className="absolute left-40 top-1/2 z-0 hidden max-w-[350px] -translate-x-1/2 -translate-y-1/2 transform lg:block"
        />
        <div className="hidden w-[350px] lg:block"></div>

        <div className="ml-1 w-[100px] md:ml-4 md:w-[200px] lg:m-0">
          <h1 className="text-base font-semibold text-zinc-300 lg:text-xl">
            {match.map.name}
          </h1>
          <p className="z-10 text-xs font-medium text-zinc-500 lg:text-sm">
            {new Date(match?.created_at).toLocaleDateString("en-GB", {
              year: "2-digit",
              month: "2-digit",
              day: "2-digit",
            }) +
              " - " +
              new Date(match?.created_at).toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              })}
          </p>
        </div>
      </div>

      <div className="flex gap-2 md:gap-4">
        <MatchCardPlayerStats
          username={users[0]?.username}
          kills={match?.memberOneKills}
          deaths={match?.memberOneDeaths}
        />
        <div className="hidden h-[70px] border border-l-zinc-700 sm:block"></div>
        <MatchCardPlayerStats
          username={users[1]?.username}
          kills={match?.memberTwoKills}
          deaths={match?.memberTwoDeaths}
        />
      </div>

      <NewMatchDialog teamID={match.teamId} users={users} editMatch={match}>
        <Button
          size="sm"
          className="m-auto border border-zinc-700 hover:bg-zinc-950"
        >
          <Pencil />
        </Button>
      </NewMatchDialog>

      <div className="ml-auto flex flex-col items-end">
        <p className="text-base font-semibold text-zinc-200 md:text-xl">
          {match?.rounds_won} - {match?.rounds_lost}
        </p>
        <p className="text-xs font-medium text-zinc-300 md:text-sm">
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
    <div className="flex flex-col items-center justify-evenly gap-1 md:gap-2 lg:gap-4">
      <p className="text-[9px] font-semibold text-zinc-400 md:text-xs">
        {username}
      </p>
      <div className="grid grid-cols-2">
        <div className="flex flex-col items-center md:gap-1">
          <p className="text-[8px] font-semibold text-zinc-200 md:text-[9px]">
            Kills
          </p>
          <p className="text-base font-semibold text-zinc-200 md:text-lg">
            {kills}
          </p>
        </div>
        <div className="flex flex-col items-center md:gap-1">
          <p className="text-[8px] font-semibold text-zinc-200 md:text-[9px]">
            Deaths
          </p>
          <p className="text-base font-semibold text-zinc-200 md:text-lg">
            {deaths}
          </p>
        </div>
      </div>
    </div>
  );
};
