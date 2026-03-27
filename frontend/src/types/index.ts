export type TaskStatus = 'new' | 'active' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';
export type ContextItemType = 'text' | 'link' | 'image';

export interface ContextItem {
  id: string;
  type: ContextItemType;
  content: string;
  filename?: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  tags: string[];
  context: ContextItem[];
  copilotResult: string | null;
  createdAt: string;
  updatedAt: string;
  activatedAt: string | null;
  completedAt: string | null;
}

export interface AuthStatus {
  isAuthenticated: boolean;
  authType?: string;
  login?: string;
  host?: string;
  statusMessage?: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  supportsVision: boolean;
  supportsReasoning: boolean;
}

export interface Settings {
  githubToken: string;
  model: string;
}

export type WSMessage =
  | { type: 'TASK_UPDATED'; task: Task }
  | { type: 'TASK_CREATED'; task: Task }
  | { type: 'TASK_DELETED'; taskId: string }
  | { type: 'COPILOT_PROCESSING'; taskId: string }
  | { type: 'COPILOT_COMPLETED'; taskId: string; result: string }
  | { type: 'COPILOT_ERROR'; taskId: string; error: string };
