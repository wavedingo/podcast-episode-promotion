import type { GenerationStatus } from '@/types/generation';

const STEPS: Array<{ key: GenerationStatus; label: string }> = [
  { key: 'researching', label: 'Researching Case' },
  { key: 'generating-social', label: 'Writing Posts' },
  { key: 'generating-thumbnail', label: 'Creating Thumbnail' },
  { key: 'complete', label: 'Complete' },
];

const ORDER: GenerationStatus[] = [
  'idle',
  'researching',
  'generating-social',
  'generating-thumbnail',
  'complete',
];

export function ProgressSteps({ status }: { status: GenerationStatus }) {
  const currentIndex = ORDER.indexOf(status);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {STEPS.map((step, i) => {
        const stepIndex = ORDER.indexOf(step.key);
        const isDone = currentIndex > stepIndex;
        const isActive = status === step.key;

        return (
          <div key={step.key} className="flex items-center gap-2">
            {i > 0 && <div className="h-px w-6 bg-slate-700" />}
            <div className="flex items-center gap-1.5">
              <div
                className={`h-2.5 w-2.5 rounded-full transition-colors ${
                  isDone
                    ? 'bg-pink-500'
                    : isActive
                    ? 'bg-pink-400 animate-pulse'
                    : 'bg-slate-700'
                }`}
              />
              <span
                className={`text-xs ${
                  isDone || isActive ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
