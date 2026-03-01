import type { SocialPost } from '@/types/generation';
import { CopyButton } from '@/components/ui/CopyButton';

export function PostCard({
  post,
  index,
  selected,
  onSelect,
}: {
  post: SocialPost;
  index: number;
  selected?: boolean;
  onSelect?: () => void;
}) {
  return (
    <div
      className={`bg-slate-900 border rounded-lg p-4 space-y-3 transition-colors ${
        selected ? 'border-pink-700 bg-pink-950/20' : 'border-slate-700'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onSelect && (
            <input
              type="checkbox"
              checked={selected ?? false}
              onChange={onSelect}
              className="w-4 h-4 accent-pink-500 cursor-pointer shrink-0"
            />
          )}
          <span className="text-xs text-slate-500">Post {index + 1}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600">{post.charCount} chars</span>
          <CopyButton text={post.content} />
        </div>
      </div>
      <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{post.content}</p>
    </div>
  );
}
