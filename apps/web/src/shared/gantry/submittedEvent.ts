import type { SSESubmittedEvent } from '@/shared/types';

/** Read task id from a submitted SSE event (`task_id` canonical; `hive_task_id` legacy). */
export function taskIdFromSubmittedEvent(event: SSESubmittedEvent): string {
  const id = event.task_id?.trim() || event.hive_task_id?.trim();
  if (!id) {
    throw new Error('submitted event missing task_id');
  }
  return id;
}
