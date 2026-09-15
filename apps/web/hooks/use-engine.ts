'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface EngineEvaluation {
  type: 'cp' | 'mate';
  value: number; // centipawns (positive = white advantage) or moves to mate
}

export interface UseEngineReturn {
  isReady: boolean;
  evaluation: EngineEvaluation | null;
  bestMove: string | null;
  pv: string[]; // principal variation (best line)
  thinking: boolean;
  analyzePosition: (fen: string) => void;
  stopAnalysis: () => void;
  setSkillLevel: (level: number) => void; // 0–20
  setDepth: (depth: number) => void;
  debugLogs: string[];
}

export function useEngine(options: { depth?: number; skillLevel?: number } = {}): UseEngineReturn {
  const [isReady, setIsReady] = useState(false);
  const [evaluation, setEvaluation] = useState<EngineEvaluation | null>(null);
  const [bestMove, setBestMove] = useState<string | null>(null);
  const [pv, setPv] = useState<string[]>([]);
  const [thinking, setThinking] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  const workerRef = useRef<Worker | null>(null);
  const depthRef = useRef(options.depth ?? 16);
  const skillRef = useRef(options.skillLevel ?? 10);
  const currentFenRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Load Stockfish Worker
    const worker = new Worker('/stockfish/stockfish-18-lite.js');
    workerRef.current = worker;

    worker.onerror = (err) => {
      let msg = 'Unknown';
      if (err instanceof ErrorEvent) {
        msg = err.message || 'ErrorEvent without message';
      } else if (err && typeof err === 'object') {
        msg = JSON.stringify(err, ['message', 'filename', 'lineno', 'colno', 'error', 'type']);
      } else {
        msg = String(err);
      }
      setDebugLogs((prev) => [...prev, `WORKER ERROR: ${msg}`]);
    };

    worker.onmessage = (e: MessageEvent<any>) => {
      const raw = typeof e.data === 'string' ? e.data : e.data?.data || '';
      const line = raw.trim();

      setDebugLogs((prev) => [...prev.slice(-9), `MSG: ${line}`]);

      if (line === 'uciok') {
        worker.postMessage('isready');
      }

      if (line === 'readyok') {
        setIsReady(true);
        // Apply initial skill level
        worker.postMessage(`setoption name Skill Level value ${skillRef.current}`);
      }

      if (line.startsWith('info') && line.includes('score')) {
        // Parse evaluation
        const cpMatch = line.match(/score cp (-?\d+)/);
        const mateMatch = line.match(/score mate (-?\d+)/);
        const pvMatch = line.match(/ pv (.+)/);

        if (cpMatch) {
          setEvaluation({ type: 'cp', value: parseInt(cpMatch[1]!) });
        } else if (mateMatch) {
          setEvaluation({ type: 'mate', value: parseInt(mateMatch[1]!) });
        }

        if (pvMatch) {
          setPv(pvMatch[1]!.trim().split(' '));
        }
      }

      // Parse best move
      if (line.startsWith('bestmove')) {
        const parts = line.split(' ');
        const move = parts[1];
        if (move && move !== '(none)') {
          setBestMove(move);
        }
        setThinking(false);
      }
    };

    // Start UCI handshake
    worker.postMessage('uci');

    return () => {
      worker.postMessage('quit');
      worker.terminate();
    };
  }, []);

  const analyzePosition = useCallback(
    (fen: string) => {
      if (!workerRef.current || !isReady) return;
      currentFenRef.current = fen;
      setThinking(true);
      setBestMove(null);
      setPv([]);
      workerRef.current.postMessage(`position fen ${fen}`);
      workerRef.current.postMessage(`go depth ${depthRef.current}`);
    },
    [isReady],
  );

  const stopAnalysis = useCallback(() => {
    if (!workerRef.current) return;
    workerRef.current.postMessage('stop');
    setThinking(false);
  }, []);

  const setSkillLevel = useCallback(
    (level: number) => {
      skillRef.current = Math.max(0, Math.min(20, level));
      if (workerRef.current && isReady) {
        workerRef.current.postMessage(`setoption name Skill Level value ${skillRef.current}`);
      }
    },
    [isReady],
  );

  const setDepth = useCallback((depth: number) => {
    depthRef.current = Math.max(1, Math.min(30, depth));
  }, []);

  return {
    isReady,
    evaluation,
    bestMove,
    pv,
    thinking,
    analyzePosition,
    stopAnalysis,
    setSkillLevel,
    setDepth,
    debugLogs,
  };
}
