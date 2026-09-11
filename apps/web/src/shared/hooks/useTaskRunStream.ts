import { useCallback, useEffect, useRef, useState } from 'react';
import type { TaskMessage } from '@/features/ide/swarmUtils';
import type { Project } from '@/shared/types';
import { gantryClient, type GantryTask } from '@/shared/services/gantry/client';
import { toUiWorkspace } from '@/shared/services/gantry/projectMapper';
import { streamGantryTask } from '@/shared/services/gantry/gantryStream';
import {
  applyRunStreamEvent,
  isTerminalStatus,
} from '@/shared/gantry/runStreamMessages';

const STREAM_RECONNECT_MS = 3000;
const FALLBACK_POLL_MS = 10000;

export function useTaskRunStream(taskId: string | undefined) {
  const [task, setTask] = useState<GantryTask | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [messages, setMessages] = useState<TaskMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [streamLive, setStreamLive] = useState(false);
  const refreshRef = useRef<() => Promise<void>>(async () => {});

  const loadSnapshot = useCallback(async () => {
    if (!taskId) return;
    const row = await gantryClient.getTask(taskId);
    setTask(row);

    if (row.project_id) {
      try {
        const p = await gantryClient.getWorkspace(row.project_id);
        setProject(toUiWorkspace(p));
      } catch {
        setProject(null);
      }
    } else {
      setProject(null);
    }

    const msgResp = await gantryClient.getTaskMessages(taskId);
    setMessages(msgResp.messages as TaskMessage[]);
    setError(null);
    return row;
  }, [taskId]);

  refreshRef.current = async () => {
    try {
      await loadSnapshot();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const refresh = useCallback(async () => {
    await refreshRef.current();
  }, []);

  useEffect(() => {
    if (!taskId) return;

    let cancelled = false;
    const abort = new AbortController();
    let fallbackTimer: ReturnType<typeof setInterval> | null = null;

    const clearFallback = () => {
      if (fallbackTimer) {
        clearInterval(fallbackTimer);
        fallbackTimer = null;
      }
    };

    const startFallbackPoll = () => {
      clearFallback();
      fallbackTimer = setInterval(() => {
        void refreshRef.current();
      }, FALLBACK_POLL_MS);
    };

    const refreshTaskMeta = async () => {
      if (!taskId || cancelled) return;
      try {
        const row = await gantryClient.getTask(taskId);
        setTask(row);
      } catch {
        /* keep last known task */
      }
    };

    const runLiveStream = async (): Promise<boolean> => {
      if (cancelled || !taskId) return false;
      setStreamLive(true);
      clearFallback();

      try {
        for await (const event of streamGantryTask(taskId, { signal: abort.signal })) {
          if (cancelled) return false;

          applyRunStreamEvent(event, {
            onChunk: (msg) => setMessages((prev) => [...prev, msg]),
            onChecklist: () => void refreshTaskMeta(),
            onStatus: (status) =>
              setTask((prev) => (prev ? { ...prev, status } : prev)),
            onDone: () => {},
            onError: (message) => setError(message),
          });

          if (event.type === 'done' || event.type === 'error') {
            await refreshRef.current();
            return event.type === 'done';
          }
        }
      } catch (e) {
        if ((e as Error).name !== 'AbortError' && !cancelled) {
          setError((e as Error).message);
        }
      } finally {
        setStreamLive(false);
      }

      return false;
    };

    const loop = async () => {
      try {
        await refreshRef.current();
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
        return;
      }

      while (!cancelled && taskId) {
        let row: GantryTask | null = null;
        try {
          row = await gantryClient.getTask(taskId);
          setTask(row);
        } catch (e) {
          if (!cancelled) setError((e as Error).message);
          startFallbackPoll();
          return;
        }

        if (isTerminalStatus(row.status)) {
          await refreshRef.current();
          return;
        }

        const finished = await runLiveStream();
        if (cancelled) return;

        if (finished) return;

        try {
          row = await gantryClient.getTask(taskId);
          setTask(row);
          if (isTerminalStatus(row.status)) {
            await refreshRef.current();
            return;
          }
        } catch {
          startFallbackPoll();
          return;
        }

        startFallbackPoll();
        await new Promise((resolve) => setTimeout(resolve, STREAM_RECONNECT_MS));
        clearFallback();
      }
    };

    void loop();

    return () => {
      cancelled = true;
      abort.abort();
      clearFallback();
      setStreamLive(false);
    };
  }, [taskId]);

  return {
    task,
    project,
    messages,
    error,
    streamLive,
    refresh,
  };
}
