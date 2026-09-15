import { ChibiAvatar } from '@/components/chibi/ChibiAvatar';
import './HeroOrb.css';

export function HeroOrb() {
  return (
    <div className="hero-orb-wrap" aria-hidden>
      <ChibiAvatar role="foreman" size={80} motion="speaking" />
    </div>
  );
}
