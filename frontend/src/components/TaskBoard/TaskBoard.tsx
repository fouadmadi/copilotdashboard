import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { Task, TaskStatus } from '../../types';
import { TaskColumn } from './TaskColumn';
import { TaskModal } from '../TaskModal/TaskModal';
import { useTasks } from '../../hooks/useTasks';

const COLUMNS: { status: TaskStatus; title: string }[] = [
  { status: 'new', title: 'New' },
  { status: 'active', title: 'Active' },
  { status: 'done', title: 'Done' },
];

export function TaskBoard() {
  const {
    tasks,
    loading,
    createTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
    addContext,
    removeContext,
  } = useTasks();

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const taskId = active.id as string;
    const newStatus = over.id as TaskStatus;
    const task = tasks.find((t) => t.id === taskId);
    if (task && task.status !== newStatus) {
      void updateTaskStatus(taskId, newStatus);
    }
  };

  const handleAddTask = async (status: TaskStatus) => {
    const title = window.prompt('Task title:');
    if (!title?.trim()) return;
    await createTask({ title: title.trim(), status });
  };

  const tasksByStatus = (status: TaskStatus) =>
    tasks.filter((t) => t.status === status);

  const hasProcessing = tasks.some((t) => t.status === 'active');

  if (loading) {
    return (
      <div className="board-loading">
        <div className="spinner" />
        <span>Loading tasks…</span>
      </div>
    );
  }

  return (
    <div className="task-board">
      <div className="task-board-toolbar">
        <h1 className="task-board-heading">Task Board</h1>
        <button
          className="btn btn-primary"
          onClick={() => handleAddTask('new')}
        >
          + New Task
        </button>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="task-board-columns">
          {COLUMNS.map(({ status, title }) => (
            <TaskColumn
              key={status}
              status={status}
              title={title}
              tasks={tasksByStatus(status)}
              onTaskClick={setSelectedTask}
              onAddTask={handleAddTask}
              hasProcessing={status === 'active' && hasProcessing}
            />
          ))}
        </div>
      </DndContext>

      {selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={updateTask}
          onStatusChange={updateTaskStatus}
          onDelete={deleteTask}
          onAddContext={addContext}
          onRemoveContext={removeContext}
        />
      )}
    </div>
  );
}
