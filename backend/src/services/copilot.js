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
 * Check whether a token string looks like a real (non-masked) token.
 */
function isRealToken(token) {
  return typeof token === 'string' && token.length > 0 && !token.includes('****');
}

/**
 * Get or create a shared CopilotClient instance.
 * @param {object} settings - { githubToken, model }
 */
async function getClient(settings) {
  const { githubToken } = settings;

  // Build client options
  const opts = {};
  if (isRealToken(githubToken)) {
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

/**
 * Check authentication status.
 * First checks if we have a stored token and validates it against the GitHub API.
 * Falls back to the SDK's built-in auth check.
 * @param {object} settings - { githubToken }
 * @returns {Promise<{ isAuthenticated: boolean, login?: string, authType?: string, statusMessage?: string }>}
 */
async function getAuthStatus(settings) {
  try {
    const { githubToken } = settings;

    // If we have a real stored token, validate it directly against GitHub
    if (isRealToken(githubToken)) {
      const resp = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${githubToken}` },
      });
      if (resp.ok) {
        const user = await resp.json();
        return {
          isAuthenticated: true,
          login: user.login,
          authType: 'token',
          statusMessage: `Authenticated as ${user.login}`,
        };
      }
      return {
        isAuthenticated: false,
        statusMessage: 'Stored token is invalid or expired. Please log in again.',
      };
    }

    // No stored token — try the SDK's auth (keychain/gh CLI)
    const client = await getClient(settings);
    return await client.getAuthStatus();
  } catch (err) {
    return {
      isAuthenticated: false,
      statusMessage: err.message,
    };
  }
}

// GitHub OAuth device flow constants (from the Copilot CLI's own OAuth App)
const OAUTH_CLIENT_ID = 'Ov23ctDVkRmgkPke0Mmm';
const OAUTH_SCOPES = 'read:user,read:org,repo,gist';
const DEVICE_CODE_URL = 'https://github.com/login/device/code';
const ACCESS_TOKEN_URL = 'https://github.com/login/oauth/access_token';

/**
 * Start a GitHub OAuth device flow login.
 * Returns the user_code and verification_uri for the user to authorize,
 * plus a `done` promise that resolves with the access_token once authorized.
 */
async function startLogin() {
  console.log('[Auth] Starting OAuth device flow...');

  // Step 1: Request a device code
  const codeResp = await fetch(DEVICE_CODE_URL, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: OAUTH_CLIENT_ID,
      scope: OAUTH_SCOPES,
    }),
  });

  if (!codeResp.ok) {
    const body = await codeResp.text();
    throw new Error(`Device code request failed: ${codeResp.status} ${codeResp.statusText} - ${body}`);
  }

  const codeData = await codeResp.json();
  const { device_code, user_code, verification_uri, interval = 5, expires_in = 900 } = codeData;

  console.log(`[Auth] Device code received. User code: ${user_code}, expires in ${expires_in}s, poll interval: ${interval}s`);

  // Step 2: Poll for the access token in the background
  const done = new Promise((resolve) => {
    const pollInterval = Math.max(interval, 5) * 1000;
    const deadline = Date.now() + expires_in * 1000;
    let timer;
    let pollCount = 0;

    async function poll() {
      pollCount++;
      const remaining = Math.round((deadline - Date.now()) / 1000);

      if (Date.now() > deadline) {
        clearInterval(timer);
        console.log(`[Auth] Device code expired after ${pollCount} polls`);
        resolve(null);
        return;
      }

      try {
        console.log(`[Auth] Poll #${pollCount} (${remaining}s remaining)...`);

        const tokenResp = await fetch(ACCESS_TOKEN_URL, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client_id: OAUTH_CLIENT_ID,
            device_code,
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          }),
        });

        const tokenData = await tokenResp.json();
        console.log(`[Auth] Poll #${pollCount} response: ${tokenData.error || 'token received!'}`);

        if (tokenData.access_token) {
          clearInterval(timer);
          const tokenPreview = tokenData.access_token.substring(0, 8) + '...';
          console.log(`[Auth] ✅ Device flow authorized! Token: ${tokenPreview}, type: ${tokenData.token_type}, scope: ${tokenData.scope}`);

          // Store the token in settings and restart the client
          const { getSettings, saveSettings } = require('./storage');
          const settings = getSettings();
          settings.githubToken = tokenData.access_token;
          saveSettings(settings);
          console.log('[Auth] Token saved to settings');

          await restartClient();
          console.log('[Auth] Client restarted with new token');

          resolve(tokenData.access_token);
          return;
        }

        if (tokenData.error === 'slow_down') {
          // GitHub is asking us to slow down — increase interval
          console.log('[Auth] GitHub requested slow_down, increasing poll interval');
          clearInterval(timer);
          timer = setInterval(poll, pollInterval + 5000);
        } else if (tokenData.error && tokenData.error !== 'authorization_pending') {
          clearInterval(timer);
          console.log(`[Auth] ❌ Device flow terminal error: ${tokenData.error} - ${tokenData.error_description || ''}`);
          resolve(null);
        }
      } catch (err) {
        console.error(`[Auth] Poll #${pollCount} network error:`, err.message);
      }
    }

    timer = setInterval(poll, pollInterval);
    // Run first poll immediately instead of waiting
    poll();
  });

  return {
    userCode: user_code,
    verificationUrl: verification_uri,
    done,
  };
}

module.exports = { processTask, stopClient, restartClient, listModels, getAuthStatus, startLogin };
