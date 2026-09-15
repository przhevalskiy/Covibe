import { useState } from 'react';
import { ChevronDown, PanelBottom, PanelRight } from 'lucide-react';
import { CrewPanel } from './CrewPanel';
import { RunActivityFeed } from './RunActivityFeed';
import { TracesPanel } from './TracesPanel';
import type { HitlPrompt, PipelineMeta, PipelineStage, TaskMessage } from './swarmUtils';
import './AgentRail.css';

type PendingHitlItem = {
  checkpoint: string;
  workflow_id: string;
  description?: string;
  questions?: string[];
};

type AgentRailProps = {
  taskId: string;
  messages: TaskMessage[];
  status: string;
  effectivelyDone: boolean;
  pendingHitl?: PendingHitlItem[];
  messageHitl?: HitlPrompt[];
  onFollowUpSent?: () => void;
  onTerminated?: () => void;
  onDrawerModeChange?: (drawer: boolean) => void;
  stages: PipelineStage[];
  pipelineMeta: PipelineMeta;
  prUrl?: string | null;
  tierLabel?: string | null;
};

const RAIL_TAB_KEY = 'gantry_agent_rail_tab';
const CREW_OPEN_KEY = 'gantry_crew_open';
const RAIL_DRAWER_KEY = 'gantry_agent_rail_drawer';

export function AgentRail({
  taskId,
  messages,
  status,
  effectivelyDone,
  pendingHitl = [],
  messageHitl = [],
  onFollowUpSent,
  onTerminated,
  onDrawerModeChange,
  stages,
  pipelineMeta,
  prUrl,
  tierLabel,
}: AgentRailProps) {
  const [railTab, setRailTab] = useState<'activity' | 'traces'>(() =>
    localStorage.getItem(RAIL_TAB_KEY) === 'traces' ? 'traces' : 'activity',
  );
  const [crewOpen, setCrewOpen] = useState(() =>
    localStorage.getItem(CREW_OPEN_KEY) !== 'false',
  );
  const [drawerMode, setDrawerMode] = useState(() =>
    localStorage.getItem(RAIL_DRAWER_KEY) === 'true',
  );

  const deployed = stages.filter(s => s.state !== 'pending').length;
  const tierMeta = pipelineMeta.tierMeta;
  const tierSummary = tierMeta?.label
    ? `Tier ${tierMeta.tier} · ${tierMeta.label}`
    : tierLabel ?? 'Crew';

  const selectRailTab = (tab: 'activity' | 'traces') => {
    setRailTab(tab);
    localStorage.setItem(RAIL_TAB_KEY, tab);
  };

  const toggleCrew = () => {
    setCrewOpen(prev => {
      const next = !prev;
      localStorage.setItem(CREW_OPEN_KEY, String(next));
      return next;
    });
  };

  const toggleDrawer = () => {
    setDrawerMode(prev => {
      const next = !prev;
      localStorage.setItem(RAIL_DRAWER_KEY, String(next));
      onDrawerModeChange?.(next);
      return next;
    });
  };

  return (
    <aside className={`agent-rail ${drawerMode ? 'agent-rail--drawer-mode' : ''}`}>
      <div className="agent-rail-crew">
        <button type="button" className="agent-rail-crew-toggle" onClick={toggleCrew}>
          <span className="agent-rail-crew-title">Crew</span>
          <span className="agent-rail-crew-meta">
            {tierSummary} · {deployed}/{stages.length} active
          </span>
          <ChevronDown size={14} className={`agent-rail-chevron ${crewOpen ? 'open' : ''}`} />
        </button>
        {crewOpen && (
          <div className="agent-rail-crew-body">
            <CrewPanel
              compact
              stages={stages}
              pipelineMeta={pipelineMeta}
              prUrl={prUrl}
              tierLabel={tierLabel}
            />
          </div>
        )}
      </div>

      <div className="agent-rail-toolbar">
        <div className="agent-rail-tabs">
          <button
            type="button"
            className={railTab === 'activity' ? 'active' : ''}
            onClick={() => selectRailTab('activity')}
          >
            Activity
          </button>
          <button
            type="button"
            className={railTab === 'traces' ? 'active' : ''}
            onClick={() => selectRailTab('traces')}
          >
            Traces
          </button>
        </div>
        <button
          type="button"
          className="agent-rail-layout-toggle"
          onClick={toggleDrawer}
          title={drawerMode ? 'Dock agent panel right' : 'Expand agent panel to bottom drawer'}
        >
          {drawerMode ? <PanelRight size={14} /> : <PanelBottom size={14} />}
        </button>
      </div>

      <div className="agent-rail-body">
        {railTab === 'activity' ? (
          <RunActivityFeed
            taskId={taskId}
            messages={messages}
            status={status}
            effectivelyDone={effectivelyDone}
            pendingHitl={pendingHitl}
            messageHitl={messageHitl}
            onFollowUpSent={onFollowUpSent}
            onTerminated={onTerminated}
          />
        ) : (
          <TracesPanel taskId={taskId} />
        )}
      </div>
    </aside>
  );
}
