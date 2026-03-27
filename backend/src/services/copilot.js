'use strict';

let _sdkModule = null;

/**
 * Lazy-load the ESM-only parts of @github/copilot-sdk.
 */
async function loadSdk() {
  if (!_sdkModule) {
    _sdkModule = await import('@github/copilot-sdk');
  }
  return _sdkModule;
}

let _client = null;

/**
 * Get or create a shared CopilotClient instance.
 * @param {object} settings - { githubToken, model }
 */
async function getClient(settings) {
  const { githubToken } = settings;

  // Build client options
  const opts = {};
  if (githubToken) {
    opts.githubToken = githubToken;
  } else {
    // SDK auto-detects auth from `gh auth login` when no token is provided
    opts.useLoggedInUser = true;
  }

  if (_client) {
    return _client;
  }

  const { CopilotClient } = await loadSdk();
  _client = new CopilotClient(opts);
  await _client.start();
  console.log('[Copilot] CopilotClient started.');
  return _client;
}

/**
 * Stop the shared CopilotClient (called during graceful shutdown).
 */
async function stopClient() {
  if (_client) {
    try {
      await _client.stop();
    } catch (err) {
      console.error('[Copilot] Error stopping client:', err.message);
    }
    _client = null;
    console.log('[Copilot] CopilotClient stopped.');
  }
}

/**
 * Restart the client (e.g. when settings change).
 */
async function restartClient() {
  await stopClient();
  // Client will be re-created on next getClient() call
}

/**
 * Build a prompt from the task and its context items.
 */
function buildPrompt(task) {
  const lines = [
    `Analyze the following task and provide actionable guidance, suggestions, or a solution.`,
    '',
    `## Task: ${task.title}`,
  ];

  if (task.description) {
    lines.push('', `### Description`, task.description);
  }

  if (task.priority) {
    lines.push('', `**Priority:** ${task.priority}`);
  }

  if (task.tags && task.tags.length > 0) {
    lines.push(`**Tags:** ${task.tags.join(', ')}`);
  }

  if (task.context && task.context.length > 0) {
    lines.push('', '### Context');
    for (const item of task.context) {
      if (item.type === 'text') {
        lines.push('', `**Note:** ${item.content}`);
      } else if (item.type === 'link') {
        lines.push('', `**Reference link:** ${item.content}`);
      } else if (item.type === 'image') {
        lines.push('', `*(An image was attached but cannot be rendered as text.)*`);
      }
    }
  }

  lines.push('', 'Please provide a thorough response that helps complete this task.');
  return lines.join('\n');
}

/**
 * Build image attachments from task context items.
 */
function buildImageAttachments(task) {
  if (!task.context) return [];
  return task.context
    .filter((item) => item.type === 'image' && item.content)
    .map((item) => {
      // Context images are stored as base64 data URIs (e.g. "data:image/png;base64,...")
      const match = item.content.match(/^data:(image\/[^;]+);base64,(.+)$/);
      if (match) {
        return {
          type: 'blob',
          data: match[2],
          mimeType: match[1],
        };
      }
      return null;
    })
    .filter(Boolean);
}

/**
 * Process a task using the GitHub Copilot SDK.
 * Creates a session, sends the task prompt, waits for a response, then disconnects.
 * @param {object} task - Full task object
 * @param {object} settings - { githubToken, model }
 * @returns {Promise<string>}
 */
async function processTask(task, settings) {
  const { model = 'gpt-4o' } = settings;
  const { approveAll } = await loadSdk();
  const client = await getClient(settings);

  const sessionConfig = {
    model,
    onPermissionRequest: approveAll,
    systemMessage: {
      mode: 'replace',
      content:
        'You are a software engineering assistant. ' +
        'Analyze tasks and provide actionable guidance, suggestions, or solutions. ' +
        'Be thorough but concise.',
    },
    infiniteSessions: { enabled: false },
  };

  const session = await client.createSession(sessionConfig);
  try {
    const prompt = buildPrompt(task);
    const attachments = buildImageAttachments(task);

    const sendOpts = { prompt };
    if (attachments.length > 0) {
      sendOpts.attachments = attachments;
    }

    const response = await session.sendAndWait(sendOpts, 120000);

    if (!response || !response.data || !response.data.content) {
      throw new Error('No response received from Copilot.');
    }

    return response.data.content.trim();
  } finally {
    await session.disconnect();
  }
}

/**
 * List available models from the Copilot SDK.
 * Returns an array of { id, name, capabilities } objects.
 * @param {object} settings - { githubToken }
 * @returns {Promise<Array<{ id: string, name: string, supportsVision: boolean, supportsReasoning: boolean }>>}
 */
async function listModels(settings) {
  const client = await getClient(settings);
  const models = await client.listModels();
  return models
    .filter((m) => !m.policy || m.policy.state !== 'disabled')
    .map((m) => ({
      id: m.id,
      name: m.name,
      supportsVision: m.capabilities?.supports?.vision ?? false,
      supportsReasoning: m.capabilities?.supports?.reasoningEffort ?? false,
    }));
}

module.exports = { processTask, stopClient, restartClient, listModels };
