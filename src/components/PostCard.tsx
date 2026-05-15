import Image from "next/image";
import Link from "next/link";

export interface PostCardData {
  _id: string;
  title: string;
  slug: string;
  publishedAt?: string;
  coverImage?: string;
  excerpt?: string;
  tags?: string[];
  featured?: boolean;
  href: string;
}

export default function PostCard({ post }: { post: PostCardData }) {
  const date = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString("pl-PL", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <Link
      href={post.href}
      className="group flex flex-col border border-white/10 bg-white/[0.02] hover:border-accent/40 hover:bg-white/[0.04] transition-all duration-300"
    >
      {/* Cover image */}
      <div className="relative aspect-video overflow-hidden bg-white/5">
        {post.coverImage ? (
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            className="object-cover grayscale brightness-75 group-hover:grayscale-0 group-hover:brightness-90 transition-all duration-500"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-[var(--font-mono)] text-xs text-text-dim tracking-widest uppercase opacity-30">
              brak zdjęcia
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5 gap-3">
        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {post.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="font-[var(--font-mono)] text-[10px] uppercase tracking-widest text-accent border border-accent/30 px-2 py-0.5"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h3 className="font-[var(--font-mono)] text-sm uppercase tracking-[0.1em] text-white group-hover:text-accent transition-colors duration-300 leading-snug">
          {post.title}
        </h3>

        {/* Excerpt */}
        {post.excerpt && (
          <p className="text-text-dim text-sm leading-relaxed line-clamp-3 flex-1">{post.excerpt}</p>
        )}

        {/* Date + CTA row */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/10">
          {date && (
            <span className="font-[var(--font-mono)] text-[10px] text-text-dim tracking-widest uppercase">
              {date}
            </span>
          )}
          <span className="font-[var(--font-mono)] text-[10px] uppercase tracking-widest text-accent group-hover:text-white transition-colors ml-auto">
            czytaj →
          </span>
        </div>
      </div>
    </Link>
  );
}
