import type { ResearchResult } from '@/types/generation';

export function ResearchSection({ research }: { research: ResearchResult }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
        Case Research
      </h3>

      <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
          {research.summary}
        </p>
      </div>

      {research.citations.length > 0 && (
        <div>
          <h4 className="text-xs text-slate-500 uppercase tracking-wide mb-2">Sources</h4>
          <ul className="space-y-1">
            {research.citations.map((url, i) => (
              <li key={i}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-pink-400/70 hover:text-pink-400 truncate block transition-colors"
                >
                  {url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
