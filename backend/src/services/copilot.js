'use strict';

const axios = require('axios');

const GITHUB_MODELS_URL = 'https://models.inference.ai.azure.com';

/**
 * Build a prompt from the task and its context items.
 */
function buildPrompt(task) {
  const lines = [
    `You are a software engineering assistant. Analyze the following task and provide actionable guidance, suggestions, or a solution.`,
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
 * Call the GitHub Models (OpenAI-compatible) API and return the assistant reply.
 * @param {object} task - Full task object
 * @param {object} settings - { githubToken, model }
 * @returns {Promise<string>}
 */
async function processTask(task, settings) {
  const { githubToken, model = 'gpt-4o' } = settings;

  if (!githubToken) {
    throw new Error('GitHub token is not configured. Please add your token in Settings.');
  }

  const prompt = buildPrompt(task);

  const response = await axios.post(
    `${GITHUB_MODELS_URL}/chat/completions`,
    {
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2048,
      temperature: 0.3,
    },
    {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 120000,
    }
  );

  const choice = response.data.choices && response.data.choices[0];
  if (!choice || !choice.message) {
    throw new Error('Unexpected response structure from GitHub Models API.');
  }

  return choice.message.content.trim();
}

module.exports = { processTask };
