import type { SocialPost } from '@/types/generation';
import { CopyButton } from '@/components/ui/CopyButton';

export function PostCard({ post, index }: { post: SocialPost; index: number }) {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">Post {index + 1}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600">{post.charCount} chars</span>
          <CopyButton text={post.content} />
        </div>
      </div>
      <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{post.content}</p>
    </div>
  );
}
