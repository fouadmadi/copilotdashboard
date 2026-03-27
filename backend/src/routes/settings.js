'use strict';

const express = require('express');
const { getSettings, saveSettings } = require('../services/storage');
const { restartClient, listModels } = require('../services/copilot');

const router = express.Router();

function maskToken(token) {
  if (!token || token.length < 8) return token ? '***' : '';
  return token.slice(0, 4) + '****' + token.slice(-4);
}

// GET /api/settings/models — dynamically list available Copilot models
router.get('/models', async (req, res) => {
  try {
    const settings = getSettings();
    const models = await listModels(settings);
    res.json(models);
  } catch (err) {
    console.error('[Settings] Failed to list models:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/settings
router.get('/', (req, res) => {
  try {
    const settings = getSettings();
    res.json({
      githubToken: maskToken(settings.githubToken),
      model: settings.model || 'gpt-4o',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings
router.post('/', async (req, res) => {
  try {
    const { githubToken, model } = req.body;
    const update = {};

    if (githubToken !== undefined) {
      if (typeof githubToken !== 'string') {
        return res.status(400).json({ error: 'githubToken must be a string.' });
      }
      update.githubToken = githubToken;
    }

    if (model !== undefined) {
      if (typeof model !== 'string' || !model.trim()) {
        return res.status(400).json({ error: 'model must be a non-empty string.' });
      }
      update.model = model.trim();
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided.' });
    }

    const saved = saveSettings(update);

    // Restart the Copilot client so it picks up new token/settings
    if (update.githubToken !== undefined) {
      await restartClient();
    }

    res.json({
      githubToken: maskToken(saved.githubToken),
      model: saved.model,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
