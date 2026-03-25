import { useDroppable } from '@dnd-kit/core';
import type { Task, TaskStatus } from '../../types';
import { TaskCard } from './TaskCard';

interface TaskColumnProps {
  status: TaskStatus;
  title: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onAddTask: (status: TaskStatus) => void;
  hasProcessing?: boolean;
}

const COLUMN_COLORS: Record<TaskStatus, string> = {
  new: '#0078d4',
  active: '#ff8c00',
  done: '#107c10',
};

export function TaskColumn({
  status,
  title,
  tasks,
  onTaskClick,
  onAddTask,
  hasProcessing = false,
}: TaskColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id: status });

  return (
    <div className={`task-column ${isOver ? 'task-column-over' : ''}`}>
      <div
        className="task-column-header"
        style={{ borderTopColor: COLUMN_COLORS[status] }}
      >
        <div className="task-column-header-left">
          <span
            className="task-column-dot"
            style={{ backgroundColor: COLUMN_COLORS[status] }}
          />
          <span className="task-column-title">{title}</span>
          {hasProcessing && (
            <span className="task-column-spinner" title="Copilot processing">⟳</span>
          )}
        </div>
        <div className="task-column-header-right">
          <span className="task-column-count">{tasks.length}</span>
          <button
            className="task-column-add-btn"
            onClick={() => onAddTask(status)}
            aria-label={`Add task to ${title}`}
          >
            +
          </button>
        </div>
      </div>

      <div ref={setNodeRef} className="task-column-body">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
        ))}
        {tasks.length === 0 && (
          <div className="task-column-empty">Drop tasks here</div>
        )}
      </div>
    </div>
  );
}
