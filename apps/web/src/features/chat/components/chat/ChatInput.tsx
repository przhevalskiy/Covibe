import { useState, useRef, useEffect, FormEvent, KeyboardEvent } from 'react';
import { ArrowUp, Square } from 'lucide-react';
import { useSSE } from '@/shared/hooks/useSSE';
import { useChatStore } from '@/features/chat';
import { useDiscussionStore } from '@/features/discussions';
import {
  RunContextMenu,
  ComposeChips,
  loadComposeGoal,
  saveComposeGoal,
  clearComposeGoal,
  useRunComposeStore,
} from '@/features/compose';
import { useWorkspaceStore } from '@/features/workspace';
import './ChatInput.css';

interface ChatInputProps {
  initialValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
}

export function ChatInput({ initialValue = '', onValueChange, placeholder }: ChatInputProps) {
  const hoverPlaceholder = useChatStore((s) => s.hoverPlaceholder);
  const [input, setInput] = useState(() => loadComposeGoal() || initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage, stopStream, isStreaming } = useSSE();
  const { activeDiscussionId, createDiscussion } = useDiscussionStore();
  const { skipNextMessageLoad } = useChatStore();
  const clearSpecs = useRunComposeStore((s) => s.clearSpecs);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
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
      handleSubmit();
    }
  };

  return (
    <div className="chat-input">
      <ComposeChips />

      <form className="chat-input-form" onSubmit={handleSubmit}>
        <div className="chat-input-box">
          <RunContextMenu onStarterPick={(body) => handleInputChange(body)} />

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              hoverPlaceholder ||
              placeholder ||
              'Describe a scoped engineering goal for this run…'
            }
            disabled={isStreaming}
            rows={1}
            className="chat-textarea"
          />

          {isStreaming ? (
            <button type="button" className="send-btn stop" onClick={stopStream} title="Stop generating">
              <Square size={16} />
            </button>
          ) : (
            <button
              type="submit"
              className="send-btn"
              disabled={!input.trim()}
              title="Start factory run"
            >
              <ArrowUp size={18} />
            </button>
          )}
        </div>
      </form>

      <p className="chat-input-hint">
        Press <kbd>Enter</kbd> to start a run — builds in your workspace, streams in the IDE
      </p>
    </div>
  );
};
