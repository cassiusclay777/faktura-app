"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { OCRWorkerMessage, OCRWorkerResponse } from "@/workers/ocr.worker";

export interface OCRProcessingOptions {
  fixNames?: boolean;
  userInstructions?: string;
  fixNamesIdokladStyle?: boolean;
  styleReference?: string;
}

export interface OCRProcessingState {
  isProcessing: boolean;
  progress: number;
  result: unknown | null;
  error: string | null;
}

export function useOCRWorker() {
  const workerRef = useRef<Worker | null>(null);
  const [state, setState] = useState<OCRProcessingState>({
    isProcessing: false,
    progress: 0,
    result: null,
    error: null,
  });

  // Initialize worker
  useEffect(() => {
    if (typeof window !== "undefined") {
      workerRef.current = new Worker(
        new URL("@/workers/ocr.worker.ts", import.meta.url),
        { type: "module" }
      );

      const worker = workerRef.current;

      const handleMessage = (event: MessageEvent<OCRWorkerResponse>) => {
        const { type, data } = event.data;

        switch (type) {
          case "progress":
            setState(prev => ({
              ...prev,
              progress: data?.progress || 0,
            }));
            break;

          case "result":
            setState(prev => ({
              ...prev,
              result: data?.result || null,
            }));
            break;

          case "error":
            setState(prev => ({
              ...prev,
              isProcessing: false,
              error: data?.error || "Neznámá chyba",
            }));
            break;

          case "complete":
            setState(prev => ({
              ...prev,
              isProcessing: false,
              progress: data?.progress || 100,
            }));
            break;
        }
      };

      worker.addEventListener("message", handleMessage);

      return () => {
        worker.removeEventListener("message", handleMessage);
        worker.terminate();
      };
    }
  }, []);

  const processFile = useCallback(
    async (
      file: File,
      provider: "ollama" | "deepseek" = "deepseek",
      options: OCRProcessingOptions = {}
    ): Promise<unknown> => {
      const worker = workerRef.current;
      if (!worker) {
        throw new Error("Worker není inicializován");
      }

      setState({
        isProcessing: true,
        progress: 0,
        result: null,
        error: null,
      });

      return new Promise((resolve, reject) => {
        const messageId = `file_${Date.now()}`;

        const handleWorkerMessage = (event: MessageEvent<OCRWorkerResponse>) => {
          const { type, id, data } = event.data;

          if (id !== messageId) return;

          switch (type) {
            case "result":
              resolve(data?.result);
              break;

            case "error":
              reject(new Error(data?.error || "Chyba zpracování"));
              break;

            case "complete":
              worker.removeEventListener("message", handleWorkerMessage);
              break;
          }
        };

        worker.addEventListener("message", handleWorkerMessage);

        const message: OCRWorkerMessage = {
          type: "process",
          id: messageId,
          data: {
            file,
            provider,
            options,
          },
        };

        worker.postMessage(message);
      });
    },
    []
  );

  const processText = useCallback(
    async (
      text: string,
      provider: "ollama" | "deepseek" = "deepseek",
      options: OCRProcessingOptions = {}
    ): Promise<unknown> => {
      const worker = workerRef.current;
      if (!worker) {
        throw new Error("Worker není inicializován");
      }

      setState({
        isProcessing: true,
        progress: 0,
        result: null,
        error: null,
      });

      return new Promise((resolve, reject) => {
        const messageId = `text_${Date.now()}`;

        const handleWorkerMessage = (event: MessageEvent<OCRWorkerResponse>) => {
          const { type, id, data } = event.data;

          if (id !== messageId) return;

          switch (type) {
            case "result":
              resolve(data?.result);
              break;

            case "error":
              reject(new Error(data?.error || "Chyba zpracování"));
              break;

            case "complete":
              worker.removeEventListener("message", handleWorkerMessage);
              break;
          }
        };

        worker.addEventListener("message", handleWorkerMessage);

        const message: OCRWorkerMessage = {
          type: "process",
          id: messageId,
          data: {
            text,
            provider,
            options,
          },
        };

        worker.postMessage(message);
      });
    },
    []
  );

  const cancelProcessing = useCallback(() => {
    if (workerRef.current && state.isProcessing) {
      const messageId = `cancel_${Date.now()}`;
      const message: OCRWorkerMessage = {
        type: "cancel",
        id: messageId,
      };

      workerRef.current.postMessage(message);

      setState({
        isProcessing: false,
        progress: 0,
        result: null,
        error: null,
      });
    }
  }, [state.isProcessing]);

  const reset = useCallback(() => {
    setState({
      isProcessing: false,
      progress: 0,
      result: null,
      error: null,
    });
  }, []);

  return {
    ...state,
    processFile,
    processText,
    cancelProcessing,
    reset,
  };
}