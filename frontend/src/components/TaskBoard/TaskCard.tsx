import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '../../types';
import { PriorityBadge } from '../common/Badge';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const isProcessing = task.status === 'active';
  const isDone = task.status === 'done';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`task-card ${isProcessing ? 'task-card-active' : ''} ${isDragging ? 'task-card-dragging' : ''}`}
      {...attributes}
      {...listeners}
      onClick={onClick}
    >
      {/* Processing pulse */}
      {isProcessing && <div className="task-card-pulse" />}

      <div className="task-card-header">
        <span className="task-card-title">{task.title}</span>
        {isDone && task.copilotResult && (
          <span className="task-card-done-icon" title="Copilot result available">
            ✅
          </span>
        )}
      </div>

      {task.description && (
        <p className="task-card-description">{task.description}</p>
      )}

      <div className="task-card-footer">
        <PriorityBadge priority={task.priority} />
        {task.tags.length > 0 && (
          <div className="task-card-tags">
            {task.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="tag-chip">
                {tag}
              </span>
            ))}
          </div>
        )}
        {task.context.length > 0 && (
          <span className="task-card-context-count" title="Context items">
            📎 {task.context.length}
          </span>
        )}
      </div>
    </div>
  );
}
