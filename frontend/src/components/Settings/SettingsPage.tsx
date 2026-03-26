import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import type { Settings } from '../../types';
import { fetchSettings, saveSettings } from '../../api/settings';

const MODEL_OPTIONS = [
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4-turbo',
  'o1-mini',
  'o1-preview',
  'claude-3-5-sonnet',
  'mistral-large',
];

export function SettingsPage() {
  const [githubToken, setGithubToken] = useState('');
  const [model, setModel] = useState('gpt-4o');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings()
      .then((s: Settings) => {
        setGithubToken(s.githubToken ?? '');
        setModel(s.model ?? 'gpt-4o');
      })
      .catch(() => {
        // settings not yet saved – use defaults
      })
      .finally(() => setLoading(false));
  }, []);

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

      <div className="settings-card">
        <h2 className="settings-section-title">GitHub Copilot Token</h2>
        <p className="settings-help">
          Provide a GitHub personal access token (PAT) with Copilot access. You
          can create one at{' '}
          <a
            href="https://github.com/settings/tokens"
            target="_blank"
            rel="noopener noreferrer"
          >
            github.com/settings/tokens
          </a>
          . The token needs the <code>copilot</code> scope enabled.
        </p>
        <label className="form-label">GitHub Token</label>
        <input
          className="form-input"
          type="password"
          placeholder="ghp_…"
          value={githubToken}
          onChange={(e) => setGithubToken(e.target.value)}
          autoComplete="off"
        />
      </div>

      <div className="settings-card">
        <h2 className="settings-section-title">AI Model</h2>
        <p className="settings-help">
          Select the model Copilot will use to process tasks.
        </p>
        <label className="form-label">Model</label>
        <select
          className="form-select"
          value={model}
          onChange={(e) => setModel(e.target.value)}
        >
          {MODEL_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {m}
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
