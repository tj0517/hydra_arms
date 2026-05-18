"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import PostCard, { type PostCardData } from "./PostCard";

interface Props {
  posts: PostCardData[];
}

export default function PostListClient({ posts }: Props) {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gridRef.current) return;
    const cards = Array.from(gridRef.current.children) as HTMLElement[];
    gsap.fromTo(
      cards,
      { opacity: 0, y: 24 },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.08,
        ease: "power2.out",
        scrollTrigger: {
          trigger: gridRef.current,
          start: "top 85%",
          once: true,
        },
      }
    );
  }, []);

  if (posts.length === 0) {
    return (
      <section className="flex flex-col items-center justify-center py-24 gap-4 px-8">
        <div className="w-px h-16 bg-white/10" />
        <p className="font-[var(--font-mono)] text-xs uppercase tracking-[0.3em] text-text-dim">
          Brak wpisów
        </p>
      </section>
    );
  }

  return (
    <section className="px-[clamp(32px,5vw,64px)] py-16">
      <div
        ref={gridRef}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px border border-white/10"
      >
        {posts.map((post) => (
          <PostCard key={post._id} post={post} />
        ))}
      </div>
    </section>
  );
}
