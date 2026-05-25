import apiClient from '../utils/api';

export interface PublicUser {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string | null;
  bio?: string | null;
  role: string;
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user: PublicUser;
}

export interface RegisterPayload {
  email: string;
  username: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export const authApi = {
  register(data: RegisterPayload) {
    return apiClient.post<any, AuthResponse>('/auth/register', data);
  },
  login(data: LoginPayload) {
    return apiClient.post<any, AuthResponse>('/auth/login', data);
  },
  me() {
    return apiClient.get<any, PublicUser>('/auth/me');
  },
  updateProfile(data: { username?: string; avatarUrl?: string; bio?: string }) {
    return apiClient.patch<any, PublicUser>('/auth/profile', data);
  },
  changePassword(data: { oldPassword: string; newPassword: string }) {
    return apiClient.patch<any, void>('/auth/password', data);
  },
};
