import axios from 'axios';
import type { Settings } from '../types';

const api = axios.create({ baseURL: '/api' });

export const fetchSettings = (): Promise<Settings> =>
  api.get<Settings>('/settings').then((r) => r.data);

export const saveSettings = (data: Settings): Promise<Settings> =>
  api.post<Settings>('/settings', data).then((r) => r.data);
