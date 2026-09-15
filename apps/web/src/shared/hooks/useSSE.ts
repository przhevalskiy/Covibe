import { useCallback, useRef } from 'react';
import { sseClient } from '@/shared/services/sse';
import { useChatStore } from '@/features/chat';
import { useDiscussionStore } from '@/features/discussions';
import { approveFactoryHitl } from '@/shared/services/gantry/hitl';
import { taskIdFromSubmittedEvent } from '@/shared/gantry/submittedEvent';
import { persistDiscussionMessage } from '@/shared/gantry/discussionPersist';
import { useWorkspaceStore } from '@/features/workspace';
import { useRunLaunchStore } from '@/features/runs/runLaunchStore';

export function useSSE() {
  const messageIdRef = useRef<string>('');

  const {
    addMessage,
    startStream,
    appendToStream,
    setStreamIntent,
    finalizeStream,
    cancelStream,
    addChecklistMessage,
    setSubmitted,
    setActiveTaskId,
  } = useChatStore();
  const { activeDiscussionId, updateDiscussionTitle, linkTaskToDiscussion } = useDiscussionStore();

  const sendMessage = useCallback(
    async (content: string, discussionId?: string, projectId?: string | null) => {
      let targetDiscussionId = discussionId || activeDiscussionId;

      if (!targetDiscussionId) {
        const { createDiscussion } = useDiscussionStore.getState();
        const newDiscussion = await createDiscussion(
          projectId ? { project_id: projectId } : undefined,
        );
        targetDiscussionId = newDiscussion.id;
        useChatStore.getState().skipNextMessageLoad();
      }

      const userMessage = {
        id: crypto.randomUUID(),
        content,
        role: 'user' as const,
        timestamp: new Date().toISOString(),
      };
      addMessage(userMessage);
      persistDiscussionMessage(targetDiscussionId, content, 'user');

      startStream();
      messageIdRef.current = crypto.randomUUID();

      try {
        const stream = sseClient.streamChat({
          discussion_id: targetDiscussionId,
          message: content,
          project_id: projectId,
        });

        for await (const event of stream) {
          if (event.type === 'discussion_title') {
            updateDiscussionTitle(event.discussion_id, event.title);
          } else if (event.type === 'intent') {
            setStreamIntent(event.intent, event.label);
          } else if (event.type === 'chunk') {
            appendToStream(event.content);
          } else if (event.type === 'error') {
            appendToStream(event.error);
            finalizeStream(messageIdRef.current, targetDiscussionId);
            return;
          } else if (event.type === 'checklist') {
            addChecklistMessage(event.fields, event.intent, targetDiscussionId);
          } else if (event.type === 'submitted') {
            const taskId = taskIdFromSubmittedEvent(event);
            setSubmitted(true);
            setActiveTaskId(taskId);
            useRunLaunchStore.getState().setPendingTask(taskId);
            linkTaskToDiscussion(targetDiscussionId, taskId);
            useWorkspaceStore.getState().hydrate();
            finalizeStream(messageIdRef.current, targetDiscussionId);
            sseClient.cancel();
            return;
          } else if (event.type === 'done') {
            finalizeStream(messageIdRef.current, targetDiscussionId);
            break;
          }
        }
      } catch (error) {
        cancelStream();
        throw error;
      }
    },
    [
      activeDiscussionId,
      addMessage,
      startStream,
      appendToStream,
      setStreamIntent,
      finalizeStream,
      cancelStream,
      addChecklistMessage,
      setSubmitted,
      setActiveTaskId,
      updateDiscussionTitle,
      linkTaskToDiscussion,
    ],
  );

  const resolveHitl = useCallback(
    async (fields: Record<string, string>, approved: boolean, discussionId?: string) => {
      const targetDiscussionId = discussionId || activeDiscussionId;
      if (!targetDiscussionId) return;

      const label = approved ? 'Approved checkpoint' : 'Rejected checkpoint';
      addMessage({
        id: crypto.randomUUID(),
        content: label,
        role: 'user',
        timestamp: new Date().toISOString(),
      });
      persistDiscussionMessage(targetDiscussionId, label, 'user');

      try {
        await approveFactoryHitl(targetDiscussionId, fields, approved);
        appendToStream(`\n✓ HITL ${approved ? 'approved' : 'rejected'} — workflow continuing…\n`);
      } catch (error) {
        appendToStream(`\n✗ HITL failed: ${(error as Error).message}\n`);
      }
    },
    [activeDiscussionId, addMessage, appendToStream],
  );

  const stopStream = useCallback(() => {
    sseClient.cancel();
    const discussionId = useDiscussionStore.getState().activeDiscussionId;
    if (discussionId) {
      useChatStore.getState().gracefulStop(messageIdRef.current, discussionId);
    }
  }, []);

  return {
    sendMessage,
    resolveHitl,
    stopStream,
    isStreaming: useChatStore((state) => state.isStreaming),
    activeTaskId: useChatStore((state) => state.activeTaskId),
  };
}
