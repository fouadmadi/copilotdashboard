import React from 'react';
import type { TaskPriority, TaskStatus } from '../../types';

interface PriorityBadgeProps {
  priority: TaskPriority;
}

interface StatusBadgeProps {
  status: TaskStatus;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  return (
    <span className={`badge badge-priority badge-priority-${priority}`}>
      {priority}
    </span>
  );
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`badge badge-status badge-status-${status}`}>
      {status}
    </span>
  );
}

// Keep default export for backward compatibility but named exports are preferred
const Badge: React.FC<PriorityBadgeProps> = ({ priority }) => (
  <PriorityBadge priority={priority} />
);
export default Badge;
