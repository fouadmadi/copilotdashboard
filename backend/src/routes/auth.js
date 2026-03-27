'use strict';

const express = require('express');
const { getSettings } = require('../services/storage');
const { getAuthStatus, startLogin } = require('../services/copilot');

const router = express.Router();

// Track in-progress login so we don't spawn multiple processes
let pendingLogin = null;

// GET /api/auth/status — check whether Copilot is authenticated
router.get('/status', async (req, res) => {
  try {
    const settings = getSettings();
    const status = await getAuthStatus(settings);
    console.log(`[Auth] Status check: authenticated=${status.isAuthenticated}, login=${status.login || 'n/a'}`);
    res.json(status);
  } catch (err) {
    console.error('[Auth] Status check error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login — start OAuth device-flow login
router.post('/login', async (req, res) => {
  try {
    if (pendingLogin) {
      console.log('[Auth] Login already in progress, returning existing device code');
      return res.json({
        userCode: pendingLogin.userCode,
        verificationUrl: pendingLogin.verificationUrl,
        inProgress: true,
      });
    }

    const { userCode, verificationUrl, done } = await startLogin();

    pendingLogin = { userCode, verificationUrl, done };

    // Clean up when the login process finishes (success or expiry)
    done.then((token) => {
      console.log(`[Auth] Login flow finished: ${token ? 'success' : 'failed/expired'}`);
      pendingLogin = null;
    });

    res.json({ userCode, verificationUrl, inProgress: false });
  } catch (err) {
    pendingLogin = null;
    console.error('[Auth] Login failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/cancel — cancel in-progress login so user can retry
router.post('/cancel', (req, res) => {
  if (pendingLogin) {
    console.log('[Auth] Login cancelled by user');
    pendingLogin = null;
  }
  res.json({ ok: true });
});

module.exports = router;
