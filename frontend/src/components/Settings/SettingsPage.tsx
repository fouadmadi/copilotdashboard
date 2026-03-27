import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import type { Settings, ModelInfo, AuthStatus } from '../../types';
import { fetchSettings, saveSettings, fetchModels } from '../../api/settings';
import { fetchAuthStatus, startLogin, cancelLogin } from '../../api/auth';

const FALLBACK_MODELS: ModelInfo[] = [
  { id: 'gpt-4o', name: 'gpt-4o', supportsVision: true, supportsReasoning: false },
  { id: 'gpt-4o-mini', name: 'gpt-4o-mini', supportsVision: true, supportsReasoning: false },
  { id: 'gpt-5', name: 'gpt-5', supportsVision: true, supportsReasoning: false },
  { id: 'o1-mini', name: 'o1-mini', supportsVision: false, supportsReasoning: true },
  { id: 'o1-preview', name: 'o1-preview', supportsVision: false, supportsReasoning: true },
  { id: 'claude-sonnet-4.5', name: 'claude-sonnet-4.5', supportsVision: true, supportsReasoning: false },
  { id: 'claude-sonnet-4', name: 'claude-sonnet-4', supportsVision: true, supportsReasoning: false },
];

export function SettingsPage() {
  const [githubToken, setGithubToken] = useState('');
  const [model, setModel] = useState('gpt-4o');
  const [models, setModels] = useState<ModelInfo[]>(FALLBACK_MODELS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Auth state
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginInProgress, setLoginInProgress] = useState(false);
  const [deviceCode, setDeviceCode] = useState<string | null>(null);
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkAuth = useCallback(async () => {
    try {
      const status = await fetchAuthStatus();
      setAuthStatus(status);
      return status.isAuthenticated;
    } catch {
      setAuthStatus({ isAuthenticated: false, statusMessage: 'Failed to check auth status' });
      return false;
    }
  }, []);

  useEffect(() => {
    Promise.all([
      fetchSettings()
        .then((s: Settings) => {
          setGithubToken(s.githubToken ?? '');
          setModel(s.model ?? 'gpt-4o');
        })
        .catch(() => {}),
      checkAuth().finally(() => setAuthLoading(false)),
      fetchModels()
        .then((m) => { if (m.length > 0) setModels(m); })
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [checkAuth]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleLogin = async () => {
    setLoginInProgress(true);
    setDeviceCode(null);
    setVerificationUrl(null);

    try {
      const resp = await startLogin();
      setDeviceCode(resp.userCode);
      setVerificationUrl(resp.verificationUrl);

      // Copy code to clipboard for convenience
      try { await navigator.clipboard.writeText(resp.userCode); } catch {}

      // Open the verification URL in a new tab
      window.open(resp.verificationUrl, '_blank');

      // Poll auth status every 3 seconds until authenticated
      pollRef.current = setInterval(async () => {
        const isAuth = await checkAuth();
        if (isAuth) {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setLoginInProgress(false);
          setDeviceCode(null);
          setVerificationUrl(null);
          toast.success('Logged in to GitHub Copilot!');
          // Refresh model list now that we're authenticated
          fetchModels()
            .then((m) => { if (m.length > 0) setModels(m); })
            .catch(() => {});
        }
      }, 3000);
    } catch (err) {
      setLoginInProgress(false);
      toast.error('Failed to start login flow');
    }
  };

  const handleCancelLogin = async () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    setLoginInProgress(false);
    setDeviceCode(null);
    setVerificationUrl(null);
    try { await cancelLogin(); } catch {}
  };

  const handleCopyCode = async () => {
    if (deviceCode) {
      try {
        await navigator.clipboard.writeText(deviceCode);
        toast.success('Code copied!');
      } catch {
        toast.error('Failed to copy');
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSettings({ githubToken, model });
      toast.success('Settings saved!');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="settings-loading">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="settings-page">
      <h1 className="settings-heading">Settings</h1>

      {/* Auth status card */}
      <div className="settings-card">
        <h2 className="settings-section-title">GitHub Copilot Authentication</h2>

        {authLoading ? (
          <p className="settings-help">Checking authentication…</p>
        ) : authStatus?.isAuthenticated ? (
          <div className="auth-status auth-status-ok">
            <span className="auth-status-icon">✅</span>
            <div>
              <strong>Authenticated</strong>
              {authStatus.login && <span> as <code>{authStatus.login}</code></span>}
              {authStatus.authType && (
                <span className="auth-type-badge">{authStatus.authType}</span>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="auth-status auth-status-error">
              <span className="auth-status-icon">⚠️</span>
              <div>
                <strong>Not authenticated</strong>
                {authStatus?.statusMessage && (
                  <p className="auth-error-msg">{authStatus.statusMessage}</p>
                )}
              </div>
            </div>

            {deviceCode && verificationUrl ? (
              <div className="device-flow-box">
                <p>
                  Open{' '}
                  <a href={verificationUrl} target="_blank" rel="noopener noreferrer">
                    {verificationUrl}
                  </a>{' '}
                  and enter this code:
                </p>
                <div className="device-code">{deviceCode}</div>
                <p className="device-flow-hint">Waiting for authorization…</p>
              </div>
            ) : (
              <button
                className="btn btn-primary"
                onClick={handleLogin}
                disabled={loginInProgress}
                style={{ marginTop: '12px' }}
              >
                {loginInProgress ? 'Starting login…' : '🔑 Login with GitHub'}
              </button>
            )}
          </>
        )}
      </div>

      {/* Manual token card */}
      <div className="settings-card">
        <h2 className="settings-section-title">Manual Token (Optional)</h2>
        <p className="settings-help">
          If you prefer not to use the browser login above, you can paste a
          fine-grained personal access token with the{' '}
          <strong>Copilot Requests</strong> permission from{' '}
          <a
            href="https://github.com/settings/tokens?type=beta"
            target="_blank"
            rel="noopener noreferrer"
          >
            github.com/settings/tokens
          </a>
          .
        </p>
        <label className="form-label">GitHub Token</label>
        <input
          className="form-input"
          type="password"
          placeholder="github_pat_…"
          value={githubToken}
          onChange={(e) => setGithubToken(e.target.value)}
          autoComplete="off"
        />
      </div>

      {/* Model card */}
      <div className="settings-card">
        <h2 className="settings-section-title">AI Model</h2>
        <p className="settings-help">
          Select the model GitHub Copilot will use to process tasks. Available
          models depend on your GitHub Copilot subscription.
        </p>
        <label className="form-label">Model</label>
        <select
          className="form-select"
          value={model}
          onChange={(e) => setModel(e.target.value)}
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
              {m.supportsVision && m.supportsReasoning
                ? ' (vision + reasoning)'
                : m.supportsVision
                  ? ' (vision)'
                  : m.supportsReasoning
                    ? ' (reasoning)'
                    : ''}
            </option>
          ))}
        </select>
      </div>

      <button
        className="btn btn-primary settings-save-btn"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Saving…' : 'Save Settings'}
      </button>
    </div>
  );
}
