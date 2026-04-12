"use client";

interface RawTranscriptPanelProps {
  rawTranscript: string;
}

export default function RawTranscriptPanel({ rawTranscript }: RawTranscriptPanelProps) {
  return (
    <details className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
      <summary className="cursor-pointer text-sm text-zinc-500">
        Surový přepis podkladu
      </summary>
      <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap font-mono text-xs text-zinc-500">
        {rawTranscript || "—"}
      </pre>
    </details>
  );
}