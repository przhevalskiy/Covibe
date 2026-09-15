import { ArrowUp, Loader2, Square } from 'lucide-react';
import { useState } from 'react';
import { gantryClient } from '@/shared/services/gantry/client';
import { PromptCard } from '@/components/input/PromptCard';
import './RunFollowUpComposer.css';

const TERMINAL = new Set(['completed', 'failed', 'cancelled', 'terminated', 'timeout', 'canceled']);

export function RunFollowUpComposer({
  taskId,
  status,
  effectivelyDone,
  onSent,
  onTerminated,
}: {
  taskId: string;
  status: string;
  effectivelyDone: boolean;
  onSent?: () => void;
  onTerminated?: () => void;
}) {
  const [prompt, setPrompt] = useState('');
  const [sending, setSending] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const isDone = TERMINAL.has(status.toLowerCase());
  const isRunning = !isDone;
  const showStop = isRunning && !effectivelyDone && !prompt.trim();

  const submit = async () => {
    const text = prompt.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    setSent(false);
    try {
      await gantryClient.sendFollowUp(taskId, text);
      setPrompt('');
      setSent(true);
      onSent?.();
      window.setTimeout(() => setSent(false), 2000);
    } catch (e) {
      setError((e as Error).message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const stop = async () => {
    if (stopping) return;
    setStopping(true);
    setError(null);
    try {
      await gantryClient.terminateTask(taskId);
      onTerminated?.();
    } catch (e) {
      const msg = (e as Error).message || 'Stop failed';
      if (/already completed|already finished/i.test(msg)) {
        onTerminated?.();
      } else {
        setError(msg);
        setStopping(false);
      }
    }
  };

  return (
    <div className="run-followup">
      <PromptCard
        compact
        active={!!prompt.trim()}
        feedback={
          error || sent ? (
            <>
              {error && <p className="prompt-card-feedback prompt-card-feedback--error">{error}</p>}
              {sent && <p className="prompt-card-feedback prompt-card-feedback--success">Sent</p>}
            </>
          ) : undefined
        }
        toolbar={
          <div className="prompt-card-toolbar-right" style={{ marginLeft: 'auto' }}>
            {showStop ? (
              <button
                type="button"
                className="prompt-card-action prompt-card-action--stop"
                title="Stop task"
                disabled={stopping}
                onClick={() => void stop()}
              >
                {stopping ? <Loader2 size={14} className="spinning" /> : <Square size={12} fill="currentColor" />}
              </button>
            ) : (
              <button
                type="button"
                className="prompt-card-action prompt-card-action--send"
                title="Send (Enter)"
                disabled={!prompt.trim() || sending}
                onClick={() => void submit()}
              >
                {sending ? <Loader2 size={14} className="spinning" /> : <ArrowUp size={14} />}
              </button>
            )}
          </div>
        }
      >
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder={
            effectivelyDone
              ? 'Send a follow-up to the foreman…'
              : 'Foreman is building — queue a follow-up…'
          }
          rows={1}
          disabled={sending}
          className="prompt-card-textarea"
        />
      </PromptCard>
    </div>
  );
}
