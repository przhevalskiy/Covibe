import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useAuthStore } from '@/features/auth';
import { gantryDocsUrl } from '@/shared/services/gantry/config';
import { clearApiKey, getApiKey, setApiKey } from '@/shared/services/gantry/apiKeyStore';
import { getUserSettings, saveUserSettings } from '@/shared/services/gantry/userSettings';
import './AccountSettingsModal.css';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccountSettingsModal({ isOpen, onClose }: AccountSettingsModalProps) {
  const { user } = useAuthStore();
  const [gantryKey, setGantryKey] = useState('');
  const [savedKey, setSavedKey] = useState(false);
  const [githubToken, setGithubToken] = useState('');
  const [savedGithub, setSavedGithub] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setGantryKey(getApiKey());
      setGithubToken(getUserSettings().githubToken);
    }
  }, [isOpen]);

  const handleSaveGantryKey = () => {
    setApiKey(gantryKey);
    setSavedKey(true);
    setTimeout(() => setSavedKey(false), 2000);
  };

  const handleClearGantryKey = () => {
    clearApiKey();
    setGantryKey('');
  };

  const handleSaveGithubToken = () => {
    saveUserSettings({ githubToken: githubToken.trim() });
    setSavedGithub(true);
    setTimeout(() => setSavedGithub(false), 2000);
  };

  const handleClearGithubToken = () => {
    saveUserSettings({ githubToken: '' });
    setGithubToken('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Profile" size="md">
      <div className="account-settings">
        <section className="settings-section">
          <h3 className="settings-section-title">Gantry</h3>
          <div className="settings-field">
            <label className="settings-label">API key</label>
            <div className="settings-input-row">
              <input
                type="password"
                className="settings-input"
                value={gantryKey}
                onChange={(e) => setGantryKey(e.target.value)}
                placeholder="gantry_..."
                autoComplete="off"
              />
              <button className="settings-save-btn" onClick={handleSaveGantryKey} disabled={!gantryKey.trim()}>
                {savedKey ? <Check size={14} /> : 'Save'}
              </button>
            </div>
            <p className="settings-hint">
              Used for <code>/v1/*</code> calls. Stored in localStorage.{' '}
              <a href={gantryDocsUrl()} target="_blank" rel="noreferrer">API docs</a>
            </p>
            <button type="button" className="settings-save-btn" onClick={handleClearGantryKey}>
              Clear key
            </button>
          </div>
          <div className="settings-field">
            <label className="settings-label">GitHub personal access token</label>
            <div className="settings-input-row">
              <input
                type="password"
                className="settings-input"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="ghp_…"
                autoComplete="off"
              />
              <button className="settings-save-btn" onClick={handleSaveGithubToken}>
                {savedGithub ? <Check size={14} /> : 'Save'}
              </button>
            </div>
            <p className="settings-hint">
              Optional — browse repos when linking a workspace or for greenfield repo creation.
            </p>
            <button type="button" className="settings-save-btn" onClick={handleClearGithubToken}>
              Clear token
            </button>
          </div>
          {user?.email && (
            <div className="settings-field">
              <label className="settings-label">Signed in as</label>
              <p className="settings-value">{user.email}</p>
            </div>
          )}
        </section>
      </div>
    </Modal>
  );
}
