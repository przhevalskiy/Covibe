import { Hammer, Lightbulb, Wrench } from 'lucide-react';
import { GREENFIELD_STARTERS } from '@/shared/constants/greenfieldStarters';
import './QuickStartCards.css';

const ICONS = [Hammer, Lightbulb, Wrench] as const;

function pickPrompts() {
  return GREENFIELD_STARTERS.slice(0, 3).map((group, i) => ({
    title: group.main,
    description: group.subQuestions[0]?.text ?? group.main,
    prompt: group.subQuestions[0]?.text ?? group.main,
    Icon: ICONS[i] ?? Wrench,
  }));
}

export function QuickStartCards({ onSelect }: { onSelect: (prompt: string) => void }) {
  const cards = pickPrompts();

  return (
    <div className="quick-start-cards">
      {cards.map(({ title, description, prompt, Icon }) => (
        <button
          key={title}
          type="button"
          className="quick-start-card"
          onClick={() => onSelect(prompt)}
        >
          <span className="quick-start-card-icon">
            <Icon size={18} />
          </span>
          <span className="quick-start-card-title">{title}</span>
          <span className="quick-start-card-desc">{description}</span>
        </button>
      ))}
    </div>
  );
}
