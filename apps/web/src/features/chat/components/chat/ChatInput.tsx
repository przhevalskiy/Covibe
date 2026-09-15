import { useState, useRef, useEffect, FormEvent, KeyboardEvent } from 'react';
import { ArrowUp, Square, Sparkles, Paperclip } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSSE } from '@/shared/hooks/useSSE';
import { useChatStore } from '@/features/chat';
import { useDiscussionStore } from '@/features/discussions';
import {
  RunContextMenu,
  ComposeChips,
  ComposeGoalPill,
  loadComposeGoal,
  saveComposeGoal,
  clearComposeGoal,
  useRunComposeStore,
} from '@/features/compose';
import { useWorkspaceStore } from '@/features/workspace';
import { PromptCard } from '@/components/input/PromptCard';
import './ChatInput.css';

interface ChatInputProps {
  initialValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
}

export function ChatInput({
  initialValue = '',
  onValueChange,
  placeholder,
}: ChatInputProps) {
  const hoverPlaceholder = useChatStore((s) => s.hoverPlaceholder);
  const [input, setInput] = useState(() => loadComposeGoal() || initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage, stopStream, isStreaming } = useSSE();
  const { activeDiscussionId, createDiscussion } = useDiscussionStore();
  const { skipNextMessageLoad } = useChatStore();
  const clearSpecs = useRunComposeStore((s) => s.clearSpecs);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaceRevision = useWorkspaceStore((s) => s.workspaceRevision);
  const hydrateFromDefaults = useRunComposeStore((s) => s.hydrateFromDefaults);

  useEffect(() => {
    hydrateFromDefaults();
  }, [hydrateFromDefaults]);

  useEffect(() => {
    if (initialValue && !input) {
      setInput(initialValue);
    }
  }, [initialValue]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  }, [input]);

  useEffect(() => {
    saveComposeGoal(input);
  }, [input]);

  const handleInputChange = (value: string) => {
    setInput(value);
    onValueChange?.(value);
  };

  const doSend = async (message: string) => {
    let discussionId = activeDiscussionId;
    if (!discussionId) {
      const newDiscussion = await createDiscussion(
        activeWorkspaceId ? { project_id: activeWorkspaceId } : undefined,
      );
      discussionId = newDiscussion.id;
      skipNextMessageLoad();
    }

    setInput('');
    onValueChange?.('');
    clearComposeGoal();
    clearSpecs();

    try {
      await sendMessage(message, discussionId, activeWorkspaceId);
    } catch (error) {
      console.error('Failed to send message:', error);
      setInput(message);
      onValueChange?.(message);
      saveComposeGoal(message);
    }
  };

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    const message = input.trim();
    if (!message || isStreaming) return;
    await doSend(message);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  const displayPlaceholder =
    hoverPlaceholder ||
    placeholder ||
    'Describe what to build…';

  return (
    <div className="chat-input">
      <PromptCard
        active={!!input.trim()}
        onSubmit={(e) => void handleSubmit(e)}
        toolbar={
          <>
            <div className="prompt-card-toolbar-left">
              <RunContextMenu onStarterPick={(body) => handleInputChange(body)} />
              <ComposeChips />
            </div>
            <div className="prompt-card-toolbar-right">
              {isStreaming ? (
                <button
                  type="button"
                  className="prompt-card-action prompt-card-action--stop"
                  onClick={stopStream}
                  title="Stop generating"
                >
                  <Square size={16} />
                </button>
              ) : (
                <button
                  type="submit"
                  className="prompt-card-action prompt-card-action--send"
                  disabled={!input.trim()}
                  title="Start factory run"
                >
                  <ArrowUp size={18} />
                </button>
              )}
            </div>
          </>
        }
        footer={
          <>
            <Link to="/starters" className="prompt-card-footer-link">
              <Sparkles size={14} />
              Saved starters
            </Link>
            <span className="prompt-card-footer-link prompt-card-footer-link--muted">
              <Paperclip size={14} />
              Use + for specs & profile
            </span>
          </>
        }
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={displayPlaceholder}
          disabled={isStreaming}
          rows={1}
          className="prompt-card-textarea"
        />
      </PromptCard>

      <ComposeGoalPill
        key={`${activeWorkspaceId ?? 'greenfield'}-${workspaceRevision}`}
        onSelect={(body) => handleInputChange(body)}
      />
    </div>
  );
}
