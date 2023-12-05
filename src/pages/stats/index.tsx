import { useState } from "react";
import { toast } from "react-toastify";
import { api } from "~/utils/api";
import { Clipboard, ClipboardCheck } from "lucide-react";
import { set } from "zod";

export default function StatsPage() {
  const { data, isLoading, isError } = api.user.getCurrent.useQuery();
  return (
    <div className="m-8 flex gap-4">
      {data && (
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold text-zinc-300">{data.username}</h1>
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
  );
}

//- TODO: allow user to change name

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
