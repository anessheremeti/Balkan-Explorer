export interface BaseUser {
  id?: string;
  full_name: string;
  email: string;
  password: string;
}

export interface SignupUser extends BaseUser {
  fullName: string;
}

export interface AuthResponse {
  id: string;
  email: string;
}