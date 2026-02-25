'use client';

import { useState } from 'react';

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="text-xs px-2 py-1 rounded border border-slate-600 text-slate-400 hover:border-pink-500 hover:text-pink-400 transition-colors"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}
