'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface RunningPipelineState {
  opportunityId: string | null;
  opportunityTitle: string | null;
  currentStep: string | null;
}

interface RunningPipelineContextValue {
  running: RunningPipelineState | null;
  setRunning: (state: RunningPipelineState | null) => void;
  clearRunning: () => void;
}

const RunningPipelineContext = createContext<RunningPipelineContextValue>({
  running: null,
  setRunning: () => {},
  clearRunning: () => {},
});

export function RunningPipelineProvider({ children }: { children: ReactNode }) {
  const [running, setRunningState] = useState<RunningPipelineState | null>(null);

  const setRunning = useCallback((state: RunningPipelineState | null) => {
    setRunningState(state);
  }, []);

  const clearRunning = useCallback(() => {
    setRunningState(null);
  }, []);

  return (
    <RunningPipelineContext.Provider value={{ running, setRunning, clearRunning }}>
      {children}
    </RunningPipelineContext.Provider>
  );
}

export function useRunningPipeline() {
  return useContext(RunningPipelineContext);
}
