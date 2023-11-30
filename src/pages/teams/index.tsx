/* eslint-disable react/no-unescaped-entities */
import { Team } from "~/types";
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
import { ScaleLoader } from "react-spinners";
import Link from "next/link";

export default function TeamsPage() {
  const { data, isLoading, isError } =
    api.team.getAllWithMember.useQuery(undefined);

  // console.log(data);
  return (
    <div>
      <h1 className="p-8 text-2xl font-semibold text-gray-300">Teams</h1>
      <div>
        {isLoading && <div>Loading...</div>}
        {isError && <div>Failed to load teams</div>}
        {data && <TeamGrid teams={data} />}
      </div>
    </div>
  );
}

const TeamCard = (props: { team?: Team; new_button: boolean }) => {
  const { team, new_button } = props;
  console.log(new_button, team);
  return (
    <>
      {!!new_button && (
        <div className="flex h-64 w-56 flex-col items-center justify-center rounded-md border border-dashed border-zinc-700 bg-opacity-40 bg-clip-padding shadow-lg backdrop-blur-xl backdrop-filter transition-all hover:cursor-pointer hover:border-solid hover:shadow-xl">
          <h1 className="text-2xl font-semibold text-gray-300">Create Team</h1>
          <NewTeamDialog />
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

const TeamGrid = (props: { teams: Team[] }) => {
  return (
    <div className="mx-8 grid grid-cols-5 gap-4">
      {props.teams.map((team) => (
        <TeamCard team={team} new_button={false} key={team.id} />
      ))}
      <TeamCard new_button={true} />
    </div>
  );
};

const NewTeamDialog = () => {
  const [newTeamName, setNewTeamName] = useState("");
  // const [teamNameAvailable, setTeamNameAvailable] = useState(false);

  const { data, isLoading, isError, refetch } = api.team.checkName.useQuery(
    newTeamName,
    {
      enabled: false,
    },
  );

  const { mutate: createTeam } = api.team.create.useMutation();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewTeamName(e.target.value);
  };

  const handleSubmit = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    createTeam({ name: newTeamName });
  };

  useEffect(() => {
    // console.log(newTeamName);
    // console.log(data);
    async function checkName() {
      await refetch();
    }

    if (
      newTeamName.length > 0 &&
      newTeamName !== "" &&
      newTeamName !== "New Team"
    ) {
      void checkName();
    }
  }, [newTeamName, refetch]);

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
            {data !== undefined && isLoading && (
              <ScaleLoader color="#2563eb" height={25} />
            )}
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
            disabled={isLoading || !data?.name_available}
            onClick={handleSubmit}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
