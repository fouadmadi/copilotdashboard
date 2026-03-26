'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const { getTasks, saveTask, getTask, deleteTask } = require('../services/storage');
const { broadcast } = require('../services/copilotWorker');

const router = express.Router();

// Store images in memory and encode as base64.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

function makeTask(fields) {
  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    title: fields.title || '',
    description: fields.description || '',
    status: fields.status || 'new',
    priority: fields.priority || 'medium',
    tags: Array.isArray(fields.tags) ? fields.tags : [],
    context: [],
    copilotResult: null,
    createdAt: now,
    updatedAt: now,
    activatedAt: null,
    completedAt: null,
  };
}

// GET /api/tasks
router.get('/', (req, res) => {
  try {
    res.json(getTasks());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks
router.post('/', (req, res) => {
  try {
    const task = makeTask(req.body);
    saveTask(task);
    broadcast({ type: 'TASK_CREATED', task });
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tasks/:id
router.get('/:id', (req, res) => {
  const task = getTask(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

// PUT /api/tasks/:id
router.put('/:id', (req, res) => {
  try {
    const existing = getTask(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Task not found' });

    const now = new Date().toISOString();
    const updated = {
      ...existing,
      ...req.body,
      id: existing.id,
      context: existing.context, // context managed via dedicated endpoints
      createdAt: existing.createdAt,
      updatedAt: now,
    };

    saveTask(updated);
    broadcast({ type: 'TASK_UPDATED', task: updated });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/tasks/:id/status
router.patch('/:id/status', (req, res) => {
  try {
    const task = getTask(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const { status } = req.body;
    if (!['new', 'active', 'done'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be new, active, or done.' });
    }

    const now = new Date().toISOString();
    const updated = {
      ...task,
      status,
      updatedAt: now,
      activatedAt: status === 'active' ? (task.activatedAt || now) : task.activatedAt,
      completedAt: status === 'done' ? (task.completedAt || now) : task.completedAt,
      // Reset copilotResult when re-activating so worker picks it up again.
      copilotResult: status === 'active' ? null : task.copilotResult,
    };

    saveTask(updated);
    broadcast({ type: 'TASK_UPDATED', task: updated });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', (req, res) => {
  try {
    const task = getTask(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    deleteTask(req.params.id);
    broadcast({ type: 'TASK_DELETED', taskId: req.params.id });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks/:id/context
router.post('/:id/context', upload.single('image'), (req, res) => {
  try {
    const task = getTask(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const now = new Date().toISOString();
    let contextItem;

    if (req.file) {
      // Image upload
      const base64 = req.file.buffer.toString('base64');
      contextItem = {
        id: uuidv4(),
        type: 'image',
        content: `data:${req.file.mimetype};base64,${base64}`,
        filename: req.file.originalname,
        createdAt: now,
      };
    } else {
      const { type, content } = req.body;
      if (!['text', 'link'].includes(type)) {
        return res.status(400).json({ error: 'type must be text, link, or supply an image file.' });
      }
      if (!content) {
        return res.status(400).json({ error: 'content is required.' });
      }
      contextItem = { id: uuidv4(), type, content, createdAt: now };
    }

    const updated = {
      ...task,
      context: [...task.context, contextItem],
      updatedAt: now,
    };

    saveTask(updated);
    broadcast({ type: 'TASK_UPDATED', task: updated });
    res.status(201).json(contextItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tasks/:id/context/:contextId
router.delete('/:id/context/:contextId', (req, res) => {
  try {
    const task = getTask(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const before = task.context.length;
    const updated = {
      ...task,
      context: task.context.filter((c) => c.id !== req.params.contextId),
      updatedAt: new Date().toISOString(),
    };

    if (updated.context.length === before) {
      return res.status(404).json({ error: 'Context item not found' });
    }

    saveTask(updated);
    broadcast({ type: 'TASK_UPDATED', task: updated });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
