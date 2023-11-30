import { api } from "~/utils/api";

export default function StatsPage() {
  const { data, isLoading, isError } = api.user.getCurrent.useQuery();
  return (
    <div>
      <h1>Stats</h1>
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
      )}
    </div>
  );
}
