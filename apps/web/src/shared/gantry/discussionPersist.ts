import type { MessageRole } from '@/shared/types';
import { api } from '@/shared/services/api';

/** Persist a message to discussionLocal (fire-and-forget). */
export function persistDiscussionMessage(
  discussionId: string,
  content: string,
  role: MessageRole,
): void {
  if (!discussionId || !content.trim()) return;
  void api.addMessage(discussionId, content, role).catch(() => {});
}
