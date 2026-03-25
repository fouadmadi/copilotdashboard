import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import type { Task, TaskStatus, TaskPriority, ContextItemType } from '../types';
import * as tasksApi from '../api/tasks';
import { useWebSocket } from './useWebSocket';

interface UseTasksReturn {
  tasks: Task[];
  loading: boolean;
  createTask: (data: {
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    tags?: string[];
  }) => Promise<Task | null>;
  updateTask: (
    id: string,
    data: Partial<Pick<Task, 'title' | 'description' | 'priority' | 'tags'>>
  ) => Promise<void>;
  updateTaskStatus: (id: string, status: TaskStatus) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addContext: (
    taskId: string,
    data: { type: ContextItemType; content: string; filename?: string }
  ) => Promise<void>;
  removeContext: (taskId: string, contextId: string) => Promise<void>;
}

export function useTasks(): UseTasksReturn {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { lastMessage } = useWebSocket();

  useEffect(() => {
    tasksApi
      .fetchTasks()
      .then(setTasks)
      .catch(() => toast.error('Failed to load tasks'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!lastMessage) return;
    switch (lastMessage.type) {
      case 'TASK_CREATED':
        setTasks((prev) =>
          prev.find((t) => t.id === lastMessage.task.id)
            ? prev
            : [...prev, lastMessage.task]
        );
        break;
      case 'TASK_UPDATED':
        setTasks((prev) =>
          prev.map((t) =>
            t.id === lastMessage.task.id ? lastMessage.task : t
          )
        );
        break;
      case 'TASK_DELETED':
        setTasks((prev) => prev.filter((t) => t.id !== lastMessage.taskId));
        break;
      case 'COPILOT_COMPLETED':
        setTasks((prev) =>
          prev.map((t) =>
            t.id === lastMessage.taskId
              ? { ...t, copilotResult: lastMessage.result }
              : t
          )
        );
        toast.success('Copilot finished a task!');
        break;
      case 'COPILOT_ERROR':
        toast.error(`Copilot error: ${lastMessage.error}`);
        break;
    }
  }, [lastMessage]);

  const createTask = useCallback(
    async (data: {
      title: string;
      description?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      tags?: string[];
    }): Promise<Task | null> => {
      try {
        const task = await tasksApi.createTask(data);
        setTasks((prev) =>
          prev.find((t) => t.id === task.id) ? prev : [...prev, task]
        );
        return task;
      } catch {
        toast.error('Failed to create task');
        return null;
      }
    },
    []
  );

  const updateTask = useCallback(
    async (
      id: string,
      data: Partial<Pick<Task, 'title' | 'description' | 'priority' | 'tags'>>
    ) => {
      try {
        const updated = await tasksApi.updateTask(id, data);
        setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      } catch {
        toast.error('Failed to update task');
      }
    },
    []
  );

  const updateTaskStatus = useCallback(
    async (id: string, status: TaskStatus) => {
      try {
        const updated = await tasksApi.updateTaskStatus(id, status);
        setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      } catch {
        toast.error('Failed to update task status');
      }
    },
    []
  );

  const deleteTask = useCallback(async (id: string) => {
    try {
      await tasksApi.deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch {
      toast.error('Failed to delete task');
    }
  }, []);

  const addContext = useCallback(
    async (
      taskId: string,
      data: { type: ContextItemType; content: string; filename?: string }
    ) => {
      try {
        const updated = await tasksApi.addContext(taskId, data);
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? updated : t))
        );
      } catch {
        toast.error('Failed to add context');
      }
    },
    []
  );

  const removeContext = useCallback(
    async (taskId: string, contextId: string) => {
      try {
        const updated = await tasksApi.removeContext(taskId, contextId);
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? updated : t))
        );
      } catch {
        toast.error('Failed to remove context');
      }
    },
    []
  );

  return {
    tasks,
    loading,
    createTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
    addContext,
    removeContext,
  };
}
