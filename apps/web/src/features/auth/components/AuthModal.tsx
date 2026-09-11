import { useState, FormEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useAuthStore } from '../store';
import logo from '@/assets/logo.png';
import './AuthModal.css';

interface AuthModalProps {
  isOpen: boolean;
}

export function AuthModal({ isOpen }: AuthModalProps) {
  const [apiKey, setApiKey] = useState('');
  const { signInWithApiKey, error, isLoading } = useAuthStore();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;
    signInWithApiKey(apiKey.trim());
  };

  return (
    <Modal isOpen={isOpen} onClose={() => {}} title="" size="sm" hideCloseButton>
      <div className="auth-header">
        <img src={logo} alt="" className="auth-brand-logo" />
        <span className="auth-brand-name">Gantry</span>
        <p className="auth-title">Connect with your Gantry API key</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-field">
          <label htmlFor="apiKey">Gantry API key</label>
          <input
            id="apiKey"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="gantry_..."
            required
            autoComplete="off"
          />
        </div>
        <p className="settings-hint">
          Create a key in Gantry Settings or via <code>POST /v1/keys</code>. Stored locally in this browser.
        </p>
        {error && <div className="auth-error">{error}</div>}
        <button type="submit" className="auth-submit" disabled={isLoading || !apiKey.trim()}>
          Connect
        </button>
      </form>
    </Modal>
  );
}
