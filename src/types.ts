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
  kd?: number;
  wl?: number;
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
  kd?: number;
  wl?: number;
  matches?: Match[];
  created_by: User;
  created_by_google_id: string;
  best_map: Map;
  best_map_id: number;
}

export interface UserTeam {
  user_google_id: string;
  team_id: number;
  user: User;
  team: Team;
}

export interface TeamRequest {
  id: number;
  fromUserGoogleID: string;
  toUserGoogleID: string;
  teamID: number;
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
  team_id: number;
  team: Team;
  map_id: number;
  map: Map;
  created_at: Date;
  result: "win" | "loss";
  rounds_won: number;
  rounds_lost: number;
  member_one_google_id: string;
  member_two_google_id: string;
  member_one_kills: number;
  member_two_kills: number;
  member_one_deaths: number;
  member_two_deaths: number;
}
