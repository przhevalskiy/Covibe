
import { useCallback, useEffect, useState } from 'react';
import { gantryClient } from '@/shared/services/gantry/client';
import {
  CHECKPOINT_LABELS, type ApprovalPayload, type ClarificationPayload,
} from './agent-utils';
import './hitl-cards.css';

export function ApprovalCard({
  payload,
  taskId,
  autoApprove,
  resolvedState = null,
}: {
  payload: ApprovalPayload;
  taskId: string;
  autoApprove: boolean;
  resolvedState?: 'approved' | 'rejected' | null;
}) {
  const [localDecided, setLocalDecided] = useState<'approved' | 'rejected' | null>(null);
  const [loading, setLoading] = useState(false);

  const decided = resolvedState ?? localDecided;

  const sendSignal = useCallback(async (approved: boolean) => {
    if (decided || loading) return;
    setLoading(true);
    try {
      await gantryClient.hitl(taskId, {
        checkpoint: payload.checkpoint,
        workflow_id: payload.workflow_id,
        approved,
      });
      setLocalDecided(approved ? 'approved' : 'rejected');
    } catch {
      // leave in pending state so user can retry
    } finally {
      setLoading(false);
    }
  }, [decided, loading, taskId, payload.checkpoint, payload.workflow_id]);

  useEffect(() => {
    if (autoApprove && !decided && !loading) {
      sendSignal(true);
    }
  }, [autoApprove, decided, loading, sendSignal]);

  const label = CHECKPOINT_LABELS[payload.checkpoint] ?? 'Approval Required';
  const cardClass = [
    'hitl-card hitl-card--approval',
    decided === 'approved' ? 'hitl-card--approved hitl-card--resolved' : '',
    decided === 'rejected' ? 'hitl-card--rejected hitl-card--resolved' : '',
    !decided ? 'hitl-card--pending' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClass}>
      <div className="hitl-card__header">
        <span className="hitl-card__label">{label}</span>
        {decided && (
          <span className={`hitl-card__status hitl-card__status--${decided === 'approved' ? 'ok' : 'bad'}`}>
            {decided === 'approved' ? '✓ Approved' : '✗ Rejected'}
          </span>
        )}
      </div>

      <div className="hitl-card__body">
        <p className="hitl-card__text">{payload.action}</p>
      </div>

      {!decided && (
        <div className="hitl-card__actions">
          <button
            type="button"
            disabled={loading}
            onClick={() => sendSignal(true)}
            className="hitl-card__btn-approve"
          >
            {loading ? '…' : 'Approve'}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => sendSignal(false)}
            className="hitl-card__btn-secondary"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}

export function ClarificationCard({
  payload,
  taskId,
  autoApprove,
  resolvedFromStream = false,
}: {
  payload: ClarificationPayload;
  taskId: string;
  autoApprove: boolean;
  resolvedFromStream?: boolean;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [customInputs, setCustomInputs] = useState<Record<string, boolean>>({});
  const [localSubmitted, setLocalSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const submitted = resolvedFromStream || localSubmitted;

  function parseOptions(question: string): string[] {
    const egMatch = question.match(/\(e\.g\.?\s+([^)]+)\)/i);
    if (egMatch) {
      return egMatch[1]
        .split(/,\s*/)
        .map(s => s.replace(/^(or\s+)/i, '').trim())
        .filter(Boolean)
        .slice(0, 8);
    }

    const lines = question.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length > 1) {
      return lines.slice(1).map(l => l.replace(/^[-•*]\s*/, '')).filter(Boolean).slice(0, 8);
    }

    const q = question.toLowerCase();
    if (q.includes('framework') || q.includes('language') || q.includes('stack')) {
      return ['React + TypeScript', 'Next.js', 'Vue 3', 'Svelte', 'Python / FastAPI', 'Node.js / Express'];
    }
    if (q.includes('platform') || q.includes('web app') || q.includes('mobile') || q.includes('cli')) {
      return ['Web app', 'Mobile app', 'CLI tool', 'API only', 'Desktop app'];
    }
    if (q.includes('frontend') || q.includes('backend') || q.includes('full stack') || q.includes('fullstack')) {
      return ['Full stack (frontend + backend)', 'Frontend only', 'Backend API only', 'Frontend with mock data'];
    }
    if (q.includes('database') || q.includes('persist') || q.includes('storage') || q.includes('backend')) {
      return ['PostgreSQL', 'SQLite', 'MongoDB', 'MySQL', 'localStorage / in-memory', 'No database needed'];
    }
    if (q.includes('auth') || q.includes('login') || q.includes('user')) {
      return ['No auth needed', 'Email + password', 'OAuth (Google/GitHub)', 'JWT tokens', 'Single user local app'];
    }
    if (q.includes('ui') || q.includes('frontend') || q.includes('design') || q.includes('style')) {
      return ['Tailwind CSS', 'Material UI', 'Shadcn/ui', 'Chakra UI', 'Plain CSS', 'No UI framework'];
    }
    if (q.includes('deploy') || q.includes('hosting') || q.includes('cloud')) {
      return ['Vercel', 'AWS', 'Railway', 'Fly.io', 'Docker / self-hosted', 'No deployment needed'];
    }
    if (q.includes('test') || q.includes('testing')) {
      return ['Vitest', 'Jest', 'Playwright', 'Cypress', 'No tests needed'];
    }

    return [];
  }

  function stripHint(question: string): string {
    const firstLine = question.split('\n')[0];
    return firstLine.replace(/\s*\(e\.g\.?[^)]+\)/gi, '').trim();
  }

  const sendAnswers = useCallback(async (skip = false) => {
    if (submitted || loading) return;
    setLoading(true);
    try {
      const answerPayload = skip
        ? {}
        : Object.fromEntries(payload.questions.map(q => [q, answers[q] ?? '']));
      await gantryClient.hitl(taskId, {
        checkpoint: 'pm_clarification',
        workflow_id: payload.workflow_id,
        signal: 'submit',
        payload: answerPayload,
      });
      setLocalSubmitted(true);
    } catch {
      // leave open so user can retry
    } finally {
      setLoading(false);
    }
  }, [submitted, loading, taskId, payload, answers]);

  useEffect(() => {
    if (autoApprove && !submitted && !loading) sendAnswers(true);
  }, [autoApprove, submitted, loading, sendAnswers]);

  const cardClass = [
    'hitl-card',
    submitted ? 'hitl-card--resolved' : 'hitl-card--pending',
  ].join(' ');

  return (
    <div className={cardClass}>
      <div className="hitl-card__header">
        <span className="hitl-card__label">Project Manager · Clarification</span>
        {submitted && (
          <span className="hitl-card__status hitl-card__status--ok">✓ Submitted</span>
        )}
      </div>

      {submitted && (
        <div className="hitl-card__body" style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          {Object.keys(answers).length > 0 ? (
            payload.questions.map((q, i) => {
              const answer = answers[q];
              return (
                <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', opacity: 0.5, flexShrink: 0, minWidth: '1rem' }}>
                    {i + 1}.
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4, flex: 1 }}>
                    {stripHint(q)}
                  </span>
                  {answer && <span className="hitl-card__answer-tag">{answer}</span>}
                </div>
              );
            })
          ) : (
            <p className="hitl-card__context">
              {payload.questions.length} question{payload.questions.length !== 1 ? 's' : ''} answered — build is proceeding.
            </p>
          )}
        </div>
      )}

      {!submitted && (
        <>
          <div className="hitl-card__questions">
            {payload.context && (
              <p className="hitl-card__context">{payload.context}</p>
            )}

            {payload.questions.map((q, i) => {
              const options = parseOptions(q);
              const label = stripHint(q);
              const selected = answers[q] ?? '';
              const isCustom = customInputs[q] ?? false;

              return (
                <div key={i}>
                  <p className="hitl-card__question-label">{i + 1}. {label}</p>

                  {options.length > 0 && !isCustom ? (
                    <div className="hitl-card__chips">
                      {options.map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setAnswers(prev => ({ ...prev, [q]: opt }))}
                          className={`hitl-card__chip${selected === opt ? ' hitl-card__chip--selected' : ''}`}
                        >
                          {opt}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setCustomInputs(prev => ({ ...prev, [q]: true }));
                          setAnswers(prev => ({ ...prev, [q]: '' }));
                        }}
                        className="hitl-card__chip hitl-card__chip--ghost"
                      >
                        Other…
                      </button>
                    </div>
                  ) : (
                    <div className="hitl-card__input-row">
                      <input
                        type="text"
                        autoFocus={isCustom}
                        placeholder="Type your answer…"
                        value={selected}
                        onChange={e => setAnswers(prev => ({ ...prev, [q]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') sendAnswers(false); }}
                        className="hitl-card__input"
                      />
                      {options.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomInputs(prev => ({ ...prev, [q]: false }));
                            setAnswers(prev => ({ ...prev, [q]: '' }));
                          }}
                          className="hitl-card__link-btn"
                        >
                          ← chips
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="hitl-card__actions">
            <button
              type="button"
              disabled={loading}
              onClick={() => sendAnswers(false)}
              className="hitl-card__btn-primary"
            >
              {loading ? '…' : 'Submit answers'}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => sendAnswers(true)}
              className="hitl-card__btn-secondary"
            >
              Skip
            </button>
          </div>
        </>
      )}
    </div>
  );
}
