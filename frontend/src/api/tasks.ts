import axios from 'axios';
import type { Task, TaskStatus, TaskPriority, ContextItemType } from '../types';

const api = axios.create({ baseURL: '/api' });

export const fetchTasks = (): Promise<Task[]> =>
  api.get<Task[]>('/tasks').then((r) => r.data);

export const createTask = (data: {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  tags?: string[];
}): Promise<Task> => api.post<Task>('/tasks', data).then((r) => r.data);

export const updateTask = (
  id: string,
  data: Partial<Pick<Task, 'title' | 'description' | 'priority' | 'tags'>>
): Promise<Task> => api.patch<Task>(`/tasks/${id}`, data).then((r) => r.data);

export const updateTaskStatus = (
  id: string,
  status: TaskStatus
): Promise<Task> =>
  api.patch<Task>(`/tasks/${id}/status`, { status }).then((r) => r.data);

export const deleteTask = (id: string): Promise<void> =>
  api.delete(`/tasks/${id}`).then(() => undefined);

export const addContext = (
  taskId: string,
  data: { type: ContextItemType; content: string; filename?: string }
): Promise<Task> =>
  api.post<Task>(`/tasks/${taskId}/context`, data).then((r) => r.data);

export const removeContext = (
  taskId: string,
  contextId: string
): Promise<Task> =>
  api
    .delete<Task>(`/tasks/${taskId}/context/${contextId}`)
    .then((r) => r.data);
