"use client";

import { Loading, Skeleton, ProgressBar } from "./Loading";
import { ErrorDisplay } from "./ErrorBoundary";

interface ProcessingStateProps {
  /** Current processing state */
  state: "idle" | "uploading" | "processing" | "correcting" | "complete";
  /** Progress percentage (0-100) */
  progress?: number;
  /** Custom message for current state */
  message?: string;
  /** Error to display if any */
  error?: string | null;
  /** Whether to show detailed status */
  detailed?: boolean;
}

export function ProcessingState({
  state,
  progress,
  message,
  error,
  detailed = false,
}: ProcessingStateProps) {
  const stateConfig = {
    idle: {
      title: "Připraveno",
      description: "Čekám na vstup...",
      color: "text-zinc-400",
      icon: "🟢",
    },
    uploading: {
      title: "Nahrávání souboru",
      description: "Nahrávám soubor na server...",
      color: "text-blue-400",
      icon: "📤",
    },
    processing: {
      title: "Zpracovávání",
      description: "Analyzuji obsah souboru...",
      color: "text-yellow-400",
      icon: "⚙️",
    },
    correcting: {
      title: "Korekce názvů",
      description: "Opravuji názvy firem a míst...",
      color: "text-purple-400",
      icon: "🔍",
    },
    complete: {
      title: "Hotovo",
      description: "Zpracování dokončeno!",
      color: "text-green-400",
      icon: "✅",
    },
  };

  const config = stateConfig[state];

  if (error) {
    return <ErrorDisplay error={error} title="Chyba při zpracování" />;
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="flex items-start gap-4">
        <div className="text-2xl">{config.icon}</div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className={`font-semibold ${config.color}`}>{config.title}</h3>
            {progress !== undefined && (
              <span className="text-sm font-medium text-zinc-400">
                {Math.round(progress)}%
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-zinc-400">
            {message || config.description}
          </p>
          
          {progress !== undefined && (
            <div className="mt-4">
              <ProgressBar progress={progress} color="blue" showPercentage={false} />
            </div>
          )}
          
          {detailed && (
            <div className="mt-4 space-y-2 text-xs text-zinc-500">
              <div className="flex items-center justify-between">
                <span>Stav:</span>
                <span className="font-medium">{config.title}</span>
              </div>
              {progress !== undefined && (
                <div className="flex items-center justify-between">
                  <span>Postup:</span>
                  <span className="font-medium">{progress}%</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface FileUploadStatusProps {
  /** File being uploaded */
  file?: File;
  /** Upload progress (0-100) */
  uploadProgress?: number;
  /** Processing progress (0-100) */
  processingProgress?: number;
  /** Current status message */
  status: string;
  /** Whether upload is complete */
  isComplete?: boolean;
  /** Error message if any */
  error?: string;
}

export function FileUploadStatus({
  file,
  uploadProgress,
  processingProgress,
  status,
  isComplete = false,
  error,
}: FileUploadStatusProps) {
  const totalProgress = uploadProgress !== undefined 
    ? Math.min(100, uploadProgress + (processingProgress || 0) / 2)
    : processingProgress || 0;

  return (
    <div className="space-y-4">
      {file && (
        <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-900/50">
            <span className="text-lg">📄</span>
          </div>
          <div className="flex-1">
            <p className="font-medium text-zinc-200">{file.name}</p>
            <p className="text-sm text-zinc-400">
              {(file.size / 1024).toFixed(1)} KB • {file.type}
            </p>
          </div>
          {isComplete ? (
            <div className="rounded-full bg-green-900/30 px-3 py-1 text-sm font-medium text-green-400">
              Hotovo
            </div>
          ) : (
            <div className="rounded-full bg-blue-900/30 px-3 py-1 text-sm font-medium text-blue-400">
              Zpracovává se
            </div>
          )}
        </div>
      )}
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-zinc-300">Postup</span>
          <span className="text-sm font-medium text-zinc-400">{Math.round(totalProgress)}%</span>
        </div>
        <ProgressBar progress={totalProgress} />
        
        <div className="rounded-md bg-zinc-900/50 p-3">
          <p className="text-sm text-zinc-300">{status}</p>
          {error && (
            <p className="mt-2 text-sm text-red-400">{error}</p>
          )}
        </div>
        
        {uploadProgress !== undefined && processingProgress !== undefined && (
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Nahrávání</span>
                <span className="font-medium">{uploadProgress}%</span>
              </div>
              <ProgressBar progress={uploadProgress} color="blue" showPercentage={false} />
            </div>
            <div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Zpracování</span>
                <span className="font-medium">{processingProgress}%</span>
              </div>
              <ProgressBar progress={processingProgress} color="blue" showPercentage={false} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface ApiCallStatusProps {
  /** Whether API call is in progress */
  isLoading: boolean;
  /** Error from API call */
  error?: string | null;
  /** Success message */
  success?: string | null;
  /** Loading text */
  loadingText?: string;
  /** Whether to show as inline component */
  inline?: boolean;
}

export function ApiCallStatus({
  isLoading,
  error,
  success,
  loadingText = "Komunikuji se serverem...",
  inline = false,
}: ApiCallStatusProps) {
  if (!isLoading && !error && !success) {
    return null;
  }

  const content = (
    <>
      {isLoading && (
        <div className="flex items-center gap-3">
          <Loading size="sm" text="" />
          <span className="text-sm text-zinc-400">{loadingText}</span>
        </div>
      )}
      {error && (
        <ErrorDisplay error={error} title="Chyba komunikace" />
      )}
      {success && !isLoading && (
        <div className="rounded-md border border-green-800 bg-green-900/30 p-3">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-800 text-xs font-bold text-white">
              ✓
            </div>
            <p className="text-sm text-green-300">{success}</p>
          </div>
        </div>
      )}
    </>
  );

  if (inline) {
    return <div className="mt-2">{content}</div>;
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      {content}
    </div>
  );
}

// Skeleton components for specific parts of the app
export function InvoiceLinesSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton lines={1} lineHeight="md" randomWidth={false} className="w-32" />
        <Skeleton lines={1} lineHeight="md" randomWidth={false} className="w-24" />
      </div>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between rounded-lg border border-zinc-800 p-4">
          <div className="space-y-2 flex-1">
            <Skeleton lines={1} lineHeight="sm" className="w-3/4" />
            <Skeleton lines={1} lineHeight="sm" className="w-1/2" />
          </div>
          <Skeleton lines={1} lineHeight="md" randomWidth={false} className="w-20" />
        </div>
      ))}
    </div>
  );
}

export function InvoiceHeaderSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <Skeleton lines={1} lineHeight="md" randomWidth={false} className="w-24" />
          <Skeleton lines={1} lineHeight="lg" />
          <Skeleton lines={1} lineHeight="lg" />
        </div>
        <div className="space-y-3">
          <Skeleton lines={1} lineHeight="md" randomWidth={false} className="w-24" />
          <Skeleton lines={1} lineHeight="lg" />
          <Skeleton lines={1} lineHeight="lg" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Skeleton lines={1} lineHeight="md" />
        <Skeleton lines={1} lineHeight="md" />
      </div>
    </div>
  );
}

export function PreviewSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-zinc-800 bg-white p-8">
        <div className="space-y-6">
          <div className="flex justify-between">
            <Skeleton lines={1} lineHeight="lg" className="w-40" />
            <Skeleton lines={1} lineHeight="lg" className="w-32" />
          </div>
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-3">
              <Skeleton lines={1} lineHeight="md" className="w-24" />
              <Skeleton lines={3} lineHeight="sm" />
            </div>
            <div className="space-y-3">
              <Skeleton lines={1} lineHeight="md" className="w-24" />
              <Skeleton lines={3} lineHeight="sm" />
            </div>
          </div>
          <div className="mt-8">
            <Skeleton lines={1} lineHeight="md" className="w-32 mb-4" />
            <InvoiceLinesSkeleton count={3} />
          </div>
          <div className="mt-8 flex justify-between pt-8 border-t border-zinc-200">
            <Skeleton lines={1} lineHeight="lg" className="w-40" />
            <Skeleton lines={1} lineHeight="lg" className="w-32" />
          </div>
        </div>
      </div>
    </div>
  );
}