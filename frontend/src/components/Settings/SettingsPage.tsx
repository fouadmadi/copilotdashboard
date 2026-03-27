import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import type { Settings, ModelInfo } from '../../types';
import { fetchSettings, saveSettings, fetchModels } from '../../api/settings';

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
  const [modelsLoading, setModelsLoading] = useState(true);
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

    fetchModels()
      .then((m) => {
        if (m.length > 0) setModels(m);
      })
      .catch(() => {
        // use fallback model list
      })
      .finally(() => setModelsLoading(false));
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
        <h2 className="settings-section-title">GitHub Authentication</h2>
        <p className="settings-help">
          The app uses the{' '}
          <a
            href="https://www.npmjs.com/package/@github/copilot-sdk"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub Copilot SDK
          </a>{' '}
          to process tasks. If you're logged in via the GitHub CLI (
          <code>gh auth login</code>), authentication is automatic and this
          field can be left blank. Otherwise, provide a GitHub personal access
          token from{' '}
          <a
            href="https://github.com/settings/tokens"
            target="_blank"
            rel="noopener noreferrer"
          >
            github.com/settings/tokens
          </a>
          .
        </p>
        <label className="form-label">GitHub Token (optional)</label>
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
          Select the model GitHub Copilot will use to process tasks. Available
          models depend on your GitHub Copilot subscription.
          {modelsLoading && ' Loading models…'}
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
