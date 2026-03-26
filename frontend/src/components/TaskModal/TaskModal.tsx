import { useState, useEffect } from 'react';
import type { Task, TaskPriority, TaskStatus, ContextItemType } from '../../types';
import { Modal } from '../common/Modal';
import { PriorityBadge, StatusBadge } from '../common/Badge';
import { ContextList } from './ContextList';
import { AddContextForm } from './AddContextForm';

interface TaskModalProps {
  task: Task | null;
  onClose: () => void;
  onUpdate: (
    id: string,
    data: Partial<Pick<Task, 'title' | 'description' | 'priority' | 'tags'>>
  ) => Promise<void>;
  onStatusChange: (id: string, status: TaskStatus) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddContext: (
    taskId: string,
    data: { type: ContextItemType; content: string; filename?: string }
  ) => Promise<void>;
  onRemoveContext: (taskId: string, contextId: string) => Promise<void>;
}

export function TaskModal({
  task,
  onClose,
  onUpdate,
  onStatusChange,
  onDelete,
  onAddContext,
  onRemoveContext,
}: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [tagsInput, setTagsInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setPriority(task.priority);
      setTagsInput(task.tags.join(', '));
    }
  }, [task]);

  if (!task) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(task.id, {
        title,
        description,
        priority,
        tags: tagsInput
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this task?')) return;
    setDeleting(true);
    try {
      await onDelete(task.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  const nextStatus = (): TaskStatus | null => {
    if (task.status === 'new') return 'active';
    if (task.status === 'active') return 'done';
    return null;
  };

  const prevStatus = (): TaskStatus | null => {
    if (task.status === 'active') return 'new';
    if (task.status === 'done') return 'active';
    return null;
  };

  return (
    <Modal isOpen={true} onClose={onClose}>
      <div className="task-modal">
        {/* Header */}
        <div className="task-modal-header">
          <input
            className="task-modal-title-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
          />
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Badges row */}
        <div className="task-modal-meta">
          <StatusBadge status={task.status} />
          <PriorityBadge priority={priority} />
        </div>

        {/* Body */}
        <div className="task-modal-body">
          {/* Description */}
          <label className="form-label">Description</label>
          <textarea
            className="form-textarea"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the task..."
          />

          {/* Priority */}
          <label className="form-label">Priority</label>
          <select
            className="form-select"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>

          {/* Tags */}
          <label className="form-label">Tags (comma-separated)</label>
          <input
            className="form-input"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="e.g. frontend, bug, urgent"
          />

          {/* Context */}
          <div className="task-modal-section">
            <h3 className="section-title">Context ({task.context.length})</h3>
            <ContextList
              items={task.context}
              onRemove={(ctxId) => onRemoveContext(task.id, ctxId)}
            />
            <AddContextForm
              onAdd={(data) => onAddContext(task.id, data)}
            />
          </div>

          {/* Copilot Result */}
          {task.status === 'done' && task.copilotResult && (
            <div className="task-modal-section copilot-result-section">
              <h3 className="section-title">✅ Copilot Result</h3>
              <pre className="copilot-result-pre">{task.copilotResult}</pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="task-modal-footer">
          <div className="task-modal-footer-left">
            {prevStatus() && (
              <button
                className="btn btn-secondary"
                onClick={() => onStatusChange(task.id, prevStatus()!)}
              >
                ← Move to {prevStatus()}
              </button>
            )}
            {nextStatus() && (
              <button
                className="btn btn-secondary"
                onClick={() => onStatusChange(task.id, nextStatus()!)}
              >
                Move to {nextStatus()} →
              </button>
            )}
          </div>
          <div className="task-modal-footer-right">
            <button
              className="btn btn-danger"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
