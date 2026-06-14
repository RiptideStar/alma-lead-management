// Mirror of backend JSON shapes per API_CONTRACT.md

export type LeadState = "PENDING" | "REACHED_OUT";

export interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  state: LeadState;
  resume_filename: string;
  resume_content_type: string;
  resume_size_bytes: number;
  created_at: string;
  updated_at: string;
  reached_out_at: string | null;
}

export interface LeadListResponse {
  items: Lead[];
  total: number;
  skip: number;
  limit: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface ApiError {
  detail: string | Array<{ msg: string; loc: string[] }>;
}
