/* eslint-disable react/no-unescaped-entities */
import { type Team } from "~/types";
import { api } from "~/utils/api";
import { CheckCircle2, Plus, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PuffLoader } from "react-spinners";
import Link from "next/link";
import "react-toastify/dist/ReactToastify.css";
import { useToastEffect } from "~/hooks/useToastEffect";
import { set } from "zod";
import { useRouter } from "next/router";

export default function TeamsPage() {
  const { data, isLoading, isError, refetch } =
    api.team.getAllWithMember.useQuery(undefined);

  return (
    <div>
      <h1 className="p-8 text-2xl font-semibold text-gray-300">Teams</h1>
      <div>
        {/* {isLoading && <div>Loading...</div>}
        {isError && <div>Failed to load teams</div>} */}
        {data && <TeamGrid teams={data} refetchTeams={refetch} new_button />}
      </div>
    </div>
  );
}

const TeamCard = (props: {
  team?: Team;
  new_button: boolean;
  refetchTeams?: () => void;
}) => {
  const { team, new_button, refetchTeams } = props;
  return (
    <>
      {!!new_button && (
        <div className="flex h-64 w-56 flex-col items-center justify-center rounded-md border border-dashed border-zinc-700 bg-opacity-40 bg-clip-padding shadow-lg backdrop-blur-xl backdrop-filter transition-all hover:cursor-pointer hover:border-solid hover:shadow-xl">
          <h1 className="text-2xl font-semibold text-gray-300">Create Team</h1>
          <NewTeamDialog refetchTeams={refetchTeams} />
        </div>
      )}
      {team && (
        <>
          {!new_button && (
            <Link href={`/team/${team?.name}`}>
              <div className="flex h-64 w-56 flex-col items-center justify-end rounded-md border border-zinc-700 bg-opacity-40 bg-clip-padding text-gray-300 shadow-lg backdrop-blur-xl backdrop-filter hover:cursor-pointer hover:shadow-xl">
                <div className="m-auto flex flex-col justify-evenly text-center">
                  <h1 className="text-2xl font-semibold">{team?.name}</h1>
                  {team?.members.map((member) => (
                    <p
                      className="text-sm text-zinc-600"
                      key={member.user_google_id}
                    >
                      {member.user.username}
                    </p>
                  ))}
                </div>
                <div className="grid w-full grid-cols-3 grid-rows-2 gap-2 bg-zinc-900 bg-opacity-20 p-4 text-center text-xs text-zinc-300">
                  <p>K/D</p>
                  <p>W/L</p>
                  <p>Matches</p>
                  <p>{team?.kd ?? "-"}</p>
                  <p>{team?.wl ?? "-"}</p>
                  <p>{team.matches_lost + team.matches_won}</p>
                </div>
              </div>
            </Link>
          )}
        </>
      )}
    </>
  );
};

export const TeamGrid = (props: {
  teams: Team[];
  new_button?: boolean;
  refetchTeams: () => void;
}) => {
  return (
    <div className="mx-8 grid grid-cols-1 justify-items-center gap-4 sm:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 ">
      {props.teams.map((team) => (
        <TeamCard team={team} new_button={false} key={team.id} />
      ))}
      {props.new_button && (
        <TeamCard new_button={true} refetchTeams={props.refetchTeams} />
      )}
    </div>
  );
};

const NewTeamDialog = (props: { refetchTeams?: () => void }) => {
  const [newTeamName, setNewTeamName] = useState("");
  // const [teamNameAvailable, setTeamNameAvailable] = useState(false);
  const [createdTeam, setCreatedTeam] = useState(false);
  // const [creatingTeam, setCreatingTeam] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const router = useRouter();

  const { data, isError, refetch } = api.team.checkName.useQuery(newTeamName, {
    enabled: false,
  });

  const {
    mutate: createTeam,
    isLoading: creatingTeam,
    isError: cantCreateTeam,
  } = api.team.create.useMutation();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewTeamName(e.target.value);
  };

  const handleSubmit = (e: React.MouseEvent<HTMLButtonElement>) => {
    // setCreatingTeam(true);
    e.preventDefault();
    createTeam(
      { name: newTeamName },
      {
        onSuccess: (data) => {
          // toast.success(`Team ${data!.name} created!`);
          setCreatedTeam(true);
          // setCreatingTeam(false);
          setDialogOpen(false);
          props.refetchTeams!();
        },
        onError: (error) => {
          // toast.error(error.message);
          setCreatedTeam(false);
          // setCreatingTeam(false);
        },
      },
    );
  };

  // This checks if the team name is available
  useEffect(() => {
    if (newTeamName.length === 0 || newTeamName === "New Team") return;
    const checkName = async () => {
      await refetch();
    };
    void checkName();
  }, [newTeamName, refetch]);

  useToastEffect(
    creatingTeam,
    createdTeam,
    !!cantCreateTeam,
    "creating-team",
    "Creating team...",
    "Team created!",
    "Error creating team.",
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="mt-4 rounded-full bg-zinc-600 bg-opacity-40 bg-clip-padding px-3 py-3 text-sm font-semibold text-gray-200 shadow-lg backdrop-blur-xl backdrop-filter transition-all hover:bg-zinc-950 ">
          <Plus />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create new team</DialogTitle>
        </DialogHeader>

        <div className="grid gap-2 py-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="name">Team name</Label>
            <Input id="name" className="col-span-3" onBlur={handleChange} />
          </div>
          <div className="flex w-full flex-col items-center justify-center">
            {/* {data !== undefined && creatingTeam && (
              <ScaleLoader color="#2563eb" height={25} />
            )} */}
            {data !== undefined &&
              !data.name_available &&
              newTeamName !== "" && (
                <div className="flex items-center gap-2">
                  <XCircle color="#ef4444" />
                  <DialogDescription className="text-red-500">
                    Team name already exists
                  </DialogDescription>
                </div>
              )}
            {data !== undefined &&
              data.name_available &&
              newTeamName !== "" && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 color="#22c55e" />
                  <DialogDescription className="text-green-500">
                    Team name available!
                  </DialogDescription>
                </div>
              )}
          </div>
        </div>
        <DialogFooter>
          <Button
            // type="submit"
            variant="secondary"
            disabled={creatingTeam || !data?.name_available}
            onClick={handleSubmit}
          >
            {!!creatingTeam && <PuffLoader size={20} />}

            {!creatingTeam && "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
