import type { FormEvent, ReactNode } from 'react';
import './PromptCard.css';

export type PromptCardProps = {
  chips?: ReactNode;
  suggestions?: ReactNode;
  toolbar?: ReactNode;
  footer?: ReactNode;
  feedback?: ReactNode;
  active?: boolean;
  compact?: boolean;
  className?: string;
  onSubmit?: (event: FormEvent) => void;
  children: ReactNode;
};

/** Shared Cortex-style input card for compose and IDE follow-up. */
export function PromptCard({
  chips,
  suggestions,
  toolbar,
  footer,
  feedback,
  active = false,
  compact = false,
  className = '',
  onSubmit,
  children,
}: PromptCardProps) {
  const rootClass = [
    'prompt-card',
    active ? 'prompt-card--active' : '',
    compact ? 'prompt-card--compact' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const body = (
    <>
      {feedback}
      {chips && <div className="prompt-card-meta">{chips}</div>}
      <div className="prompt-card-input-row">{children}</div>
      {suggestions && <div className="prompt-card-suggestions">{suggestions}</div>}
      {toolbar && <div className="prompt-card-toolbar">{toolbar}</div>}
      {footer && <div className="prompt-card-footer">{footer}</div>}
    </>
  );

  return (
    <div className="prompt-card-wrap">
      {onSubmit ? (
        <form className={rootClass} onSubmit={onSubmit}>
          {body}
        </form>
      ) : (
        <div className={rootClass}>{body}</div>
      )}
    </div>
  );
}
