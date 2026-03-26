'use strict';

const { getTasks, getTask, saveTask, getSettings } = require('./storage');
const { processTask } = require('./copilot');

const POLL_INTERVAL_MS = 5000;

let wss = null;
let pollTimer = null;
const processingIds = new Set();

function broadcast(message) {
  if (!wss) return;
  const payload = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === 1 /* OPEN */) {
      client.send(payload);
    }
  });
}

async function runTask(task) {
  try {
    const settings = getSettings();
    const result = await processTask(task, settings);

    const fresh = getTask(task.id);
    if (!fresh) {
      console.warn(`[CopilotWorker] Task ${task.id} was deleted during processing.`);
      return;
    }

    const now = new Date().toISOString();
    const updated = {
      ...fresh,
      copilotResult: result,
      status: 'done',
      completedAt: now,
      updatedAt: now,
    };

    saveTask(updated);
    broadcast({ type: 'TASK_UPDATED', task: updated });
    broadcast({ type: 'COPILOT_COMPLETED', taskId: task.id, result });
    console.log(`[CopilotWorker] Task ${task.id} completed.`);
  } catch (err) {
    console.error(`[CopilotWorker] Error processing task ${task.id}:`, err.message);
    broadcast({ type: 'COPILOT_ERROR', taskId: task.id, error: err.message });

    // Mark task with error so it isn't retried continuously.
    try {
      const fresh = getTask(task.id);
      if (fresh) {
        const now = new Date().toISOString();
        saveTask({
          ...fresh,
          copilotResult: `Error: ${err.message}`,
          status: 'done',
          completedAt: now,
          updatedAt: now,
        });
      }
    } catch (saveErr) {
      console.error(`[CopilotWorker] Failed to save error state for task ${task.id}:`, saveErr.message);
    }
  } finally {
    processingIds.delete(task.id);
  }
}

async function processActiveTasks() {
  let tasks;
  try {
    tasks = getTasks();
  } catch (err) {
    console.error('[CopilotWorker] Failed to read tasks:', err.message);
    return;
  }

  const pending = tasks.filter(
    (t) => t.status === 'active' && !t.copilotResult && !processingIds.has(t.id)
  );

  for (const task of pending) {
    processingIds.add(task.id);

    broadcast({ type: 'COPILOT_PROCESSING', taskId: task.id });
    console.log(`[CopilotWorker] Processing task ${task.id}: "${task.title}"`);

    await runTask(task);
  }
}

function start(websocketServer) {
  wss = websocketServer;
  pollTimer = setInterval(processActiveTasks, POLL_INTERVAL_MS);
  console.log('[CopilotWorker] Started, polling every', POLL_INTERVAL_MS / 1000, 'seconds.');
}

function stop() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  console.log('[CopilotWorker] Stopped.');
}

module.exports = { start, stop, broadcast };
