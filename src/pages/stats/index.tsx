import { useState } from "react";
import { toast } from "react-toastify";
import { api } from "~/utils/api";
import { Clipboard, ClipboardCheck } from "lucide-react";
import { TeamGrid } from "~/pages/teams/index";
import { User } from "~/types";

export default function StatsPage() {
  const { data, isLoading, isError } = api.user.getCurrent.useQuery();
  const {
    data: teams,
    isLoading: teamsLoading,
    isError: cantLoadTeams,
    refetch,
  } = api.team.getAllWithMember.useQuery(undefined);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center lg:flex-row lg:gap-4 lg:p-8">
        {data && (
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold text-zinc-300">
              {data.username}
            </h1>
            <ClickToCopyText
              text={data.friendcode}
              className="text-sm text-zinc-500"
            />
            <p className="text-xs text-zinc-500">
              <b>Profile created:</b>{" "}
              {new Date(data.created_at).toLocaleDateString("en-GB", {
                year: "2-digit",
                month: "2-digit",
                day: "2-digit",
              }) +
                " - " +
                new Date(data.created_at).toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
            </p>
            <p className="text-xs text-zinc-500">
              <b>Last activity:</b>{" "}
              {new Date(data.updated_at).toLocaleDateString("en-GB", {
                year: "2-digit",
                month: "2-digit",
                day: "2-digit",
              }) +
                " - " +
                new Date(data.updated_at).toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
            </p>
          </div>
        )}
        <UserStatTable user={data!} />

        {/* <h1>Stats</h1>
      {isLoading && <p>Loading...</p>}
      {isError && <p>Something went wrong</p>}
      {data && (
        <div className="text-zinc-200">
          <p>Username: {data.username}</p>
          <p>Friendcode: {data.friendcode}</p>
          <p>created_at: {data.created_at.toLocaleString()}</p>
          <p>updated_at: {data.updated_at.toLocaleString()}</p>
          <p>kd: {data.kd}</p>
          <p>wl: {data.wl}</p>
          <p>matches_played: {data.matches_played}</p>
          <p>matches_won: {data.matches_won}</p>
          <p>matches_lost: {data.matches_lost}</p>
          <p>kills: {data.kills}</p>
          <p>deaths: {data.deaths}</p>
          <p>kd_10: {data.kd_10}</p>
          <p>wl_10: {data.wl_10}</p>
          <p>rounds_won: {data.rounds_won}</p>
          <p>rounds_lost: {data.rounds_lost}</p>
        </div>
      )} */}
      </div>
      <h1 className="mx-8 text-2xl font-bold text-zinc-300">Teams</h1>
      {teams && <TeamGrid teams={teams} refetchTeams={refetch} />}
    </div>
  );
}

//- TODO: allow user to change name

const UserStatTable = (props: { user: User }) => {
  const { user } = props;
  return (
    <div className="glass mx-8 my-4 grid w-full grid-cols-2 p-2 text-center text-zinc-200 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-11 ">
      <div>
        <p className="bg-zinc-900 p-1 text-xs text-zinc-400">Played</p>
        <p>{user.matches_played}</p>
      </div>
      <div>
        <p className="bg-zinc-900 p-1 text-xs text-zinc-400">Won</p>
        <p>{user.matches_won}</p>
      </div>
      <div>
        <p className="bg-zinc-900 p-1 text-xs text-zinc-400">Lost</p>
        <p>{user.matches_lost}</p>
      </div>
      <div>
        <p className="bg-zinc-900 p-1 text-xs text-zinc-400">Kills</p>
        <p>{user.kills}</p>
      </div>
      <div>
        <p className="bg-zinc-900 p-1 text-xs text-zinc-400">Deaths</p>
        <p>{user.deaths}</p>
      </div>
      <div>
        <p className="bg-zinc-900 p-1 text-xs text-zinc-400">W/L</p>
        <p>{user.wl}</p>
      </div>
      <div>
        <p className="bg-zinc-900 p-1 text-xs text-zinc-400">W/L Last 10</p>
        <p>{user.wl_10 ?? "-"}</p>
      </div>
      <div>
        <p className="bg-zinc-900 p-1 text-xs text-zinc-400">K/D</p>
        <p>{user.kd}</p>
      </div>
      <div>
        <p className="bg-zinc-900 p-1 text-xs text-zinc-400">K/D Last 10</p>
        <p>{user.kd_10 ?? "-"}</p>
      </div>
      <div>
        <p className="bg-zinc-900 p-1 text-xs text-zinc-400">Rounds won</p>
        <p>{user.rounds_won}</p>
      </div>
      <div>
        <p className="bg-zinc-900 p-1 text-xs text-zinc-400">Rounds lost</p>
        <p>{user.rounds_lost}</p>
      </div>
    </div>
  );
};

const ClickToCopyText = (props: { text: string; className?: string }) => {
  const [copied, setCopied] = useState(false);
  const { text, className } = props;
  const copyToClipboard = () => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(true);
        setTimeout(() => {
          setCopied(false);
        }, 2000);
        toast.info("Copied to clipboard!", {
          autoClose: 2000,
          closeOnClick: true,
          position: "bottom-center",
          style: {
            width: "max-content",
            background: "rgba(55, 65, 81, 0.1)",
            color: "#D2D2D3",
            borderRadius: "0.375rem",
            backdropFilter: "blur(16px)",
            border: "1px solid #3f3f46",
          },
          toastId: "clipboard",
        });
      },
      (err) => {
        console.error("Could not copy text: ", err);
      },
    );
  };

  return (
    <div className="flex items-center gap-1">
      <p
        onClick={copyToClipboard}
        className={`cursor-pointer font-semibold ${className}`}
      >
        {text}
      </p>
      {!!copied && (
        <ClipboardCheck
          className=" cursor-pointer text-green-500"
          size={15}
          onClick={copyToClipboard}
        />
      )}
      {!copied && (
        <Clipboard className={`cursor-pointer ${className}`} size={15} />
      )}
    </div>
  );
};
