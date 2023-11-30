export interface User {
  id: number;
  google_id: string;
  username: string;
  first_name: string;
  last_name: string;
  avatar_url: string;
  friendcode: string;
  created_at: Date;
  updated_at: Date;
  kd: number;
  wl: number;
  matches_played: number;
  matches_won: number;
  matches_lost: number;
  kills: number;
  deaths: number;
  kd_10?: number;
  wl_10?: number;
  rounds_won: number;
  rounds_lost: number;
  sentRequests?: TeamRequest[];
  receivedRequests?: TeamRequest[];
  teams?: UserTeam[];
  admin: boolean;
  best_map: Map;
  best_map_id: number;
  created_teams: Team[];
}

export interface Team {
  id: number;
  name: string;
  created_at: Date;
  members: UserTeam[];
  requests?: TeamRequest[];
  kd: number;
  wl: number;
  matches?: Match[];
  matches_won: number;
  matches_lost: number;
  kd_10?: number;
  wl_10?: number;
  rounds_won: number;
  rounds_lost: number;
  total_kills: number;
  total_deaths: number;
  memberOneTotalKills: number;
  memberOneTotalDeaths: number;
  memberTwoTotalKills: number;
  memberTwoTotalDeaths: number;
  created_by: User;
  created_by_google_id: string;
  best_map: Map;
  best_map_id: number;
  allowJoinerToAddMatches: boolean;
}

export interface UserTeam {
  user_google_id: string;
  team_id: number;
  user: User;
  team: Team;
}

export interface TeamRequest {
  id: number;
  fromUserGoogleId: string;
  toUserGoogleId: string;
  teamId: number;
  fromUser: User;
  toUser: User;
  team: Team;
  status: "pending" | "accepted" | "rejected";
}

export interface Map {
  id: number;
  name: string;
  map_image_url: string;
  matches: Match[];
  best_teams: Team[];
  best_users: User[];
}

export interface Match {
  id: number;
  teamId: number;
  team: Team;
  mapId: number;
  map: Map;
  created_at: Date;
  result: "win" | "loss";
  rounds_won: number;
  rounds_lost: number;
  memberOneGoogleId: string;
  memberTwoGoogleId: string;
  memberOneKills: number;
  memberOneDeaths: number;
  memberTwoKills: number;
  memberTwoDeaths: number;
}
