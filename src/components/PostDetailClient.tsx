"use client";

import Link from "next/link";
import SubpageHero from "./SubpageHero";
import PostBodyRenderer from "./PostBodyRenderer";
import PostCard, { type PostCardData } from "./PostCard";

export interface PostDetailData {
  _id: string;
  title: string;
  slug: string;
  publishedAt?: string;
  coverImage?: string;
  excerpt?: string;
  tags?: string[];
  featured?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body?: any[];
}

interface Props {
  post: PostDetailData;
  backHref: string;
  backLabel: string;
  video: string;
  otherPosts?: PostCardData[];
}

export default function PostDetailClient({ post, backHref, backLabel, video, otherPosts }: Props) {
  const date = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString("pl-PL", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const subtitle = date
    ? `HYDRA ARMS / ${backLabel.toUpperCase()} — ${date}`
    : `HYDRA ARMS / ${backLabel.toUpperCase()}`;

  return (
    <main>
      <SubpageHero
        subtitle={subtitle}
        title={post.title}
        titleClass="text-[clamp(1.4rem,3.5vw,52px)] font-semibold text-white leading-[1.1] tracking-[-1px] md:tracking-[-1.5px] relative z-[6] max-w-4xl"
        video={video}
      />

      {/* Tags + back link row */}
      <div className="flex flex-wrap items-center gap-3 pt-8 pb-6 border-b border-white/10 px-[clamp(32px,5vw,64px)]">
          <Link
            href={backHref}
            className="font-[var(--font-mono)] text-[10px] uppercase tracking-widest text-text-dim hover:text-accent transition-colors"
          >
            ← {backLabel}
          </Link>
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 ml-auto">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="font-[var(--font-mono)] text-[10px] uppercase tracking-widest text-accent border border-accent/30 px-2 py-0.5"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
      </div>

      {/* Content */}
      <div className="px-[clamp(32px,5vw,64px)] pb-24 pt-8">
        <div className="max-w-[720px] mx-auto">
          {post.body && post.body.length > 0 ? (
            <PostBodyRenderer body={post.body} />
          ) : (
            <p className="text-text-dim font-[var(--font-mono)] text-xs uppercase tracking-widest">
              Brak treści
            </p>
          )}
        </div>
      </div>

      {/* Other posts */}
      {otherPosts && otherPosts.length > 0 && (
        <section className="border-t border-white/10 px-[clamp(32px,5vw,64px)] pb-24 pt-12">
          <p className="font-[var(--font-mono)] text-[10px] uppercase tracking-widest text-accent mb-6">
            Inne {backLabel.toLowerCase()}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px">
            {otherPosts.map((p) => (
              <PostCard key={p._id} post={p} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
