import axios from 'axios';
import type { AuthStatus } from '../types';

const api = axios.create({ baseURL: '/api' });

export const fetchAuthStatus = (): Promise<AuthStatus> =>
  api.get<AuthStatus>('/auth/status').then((r) => r.data);

export interface LoginResponse {
  userCode: string;
  verificationUrl: string;
  inProgress: boolean;
}

export const startLogin = (): Promise<LoginResponse> =>
  api.post<LoginResponse>('/auth/login').then((r) => r.data);

export const cancelLogin = (): Promise<void> =>
  api.post('/auth/cancel').then(() => {});
