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
      <section className="flex flex-col items-center justify-center min-h-[40vh] py-32 gap-5 px-8">
        <div className="w-px h-20 bg-accent/10" />
        <p className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.4em] text-accent/40">
          // WKRÓTCE
        </p>
        <p className="font-[var(--font-mono)] text-sm uppercase tracking-[0.2em] text-white/50">
          Sekcja w przygotowaniu
        </p>
        <p className="font-[var(--font-mono)] text-[11px] text-text-dim/40 max-w-[280px] text-center leading-relaxed">
          Pracujemy nad pierwszymi wpisami. Wróć niebawem.
        </p>
        <div className="w-px h-20 bg-accent/10" />
      </section>
    );
  }

  return (
    <section className="px-[clamp(32px,5vw,64px)] py-16">
      <div
        ref={gridRef}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
      >
        {posts.map((post) => (
          <PostCard key={post._id} post={post} />
        ))}
      </div>
    </section>
  );
}
