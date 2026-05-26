"use client";

import { useRef, useEffect, useState } from "react";

const GLITCH_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*<>{}[]";
const PUNCTUATION = /[\s,.\-—:;!?()]/;

function useScramble(text: string, active: boolean) {
  const [display, setDisplay] = useState(() =>
    text
      .split("")
      .map((c) =>
        PUNCTUATION.test(c)
          ? c
          : GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
      )
      .join("")
  );
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!active) return;

    setDone(false);
    const len = text.length;
    const duration = 800;
    const interval = 30;
    const totalFrames = Math.ceil(duration / interval);
    let frame = 0;

    const id = setInterval(() => {
      frame++;
      const resolvedPos = Math.floor((frame / totalFrames) * len);

      let out = "";
      for (let i = 0; i < len; i++) {
        if (PUNCTUATION.test(text[i])) {
          out += text[i];
        } else if (i < resolvedPos) {
          out += text[i];
        } else {
          out += GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
        }
      }
      setDisplay(out);

      if (frame >= totalFrames) {
        clearInterval(id);
        setDisplay(text);
        setDone(true);
      }
    }, interval);

    return () => clearInterval(id);
  }, [text, active]);

  return { display, done };
}

interface DrawRevealProps {
  title: string;
  desc: string;
  delay?: number;
  noLine?: boolean;
}

export default function DrawReveal({ title, desc, delay = 0, noLine = false }: DrawRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [borderActive, setBorderActive] = useState(false);
  const [textActive, setTextActive] = useState(false);

  const { display: titleText } = useScramble(title, textActive);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setBorderActive(true), delay * 1000);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  useEffect(() => {
    if (!borderActive) return;
    const timer = setTimeout(() => setTextActive(true), 600);
    return () => clearTimeout(timer);
  }, [borderActive]);

  return (
    <div ref={ref}>
      <div
        className={`${noLine ? "" : `draw-reveal-border${borderActive ? " active" : ""}`} pb-6`}
      >
        <h3 className="text-white text-[20px] md:text-[28px] font-medium leading-[1.25] md:leading-[34px] mb-4">
          {textActive ? (
            titleText
          ) : (
            <span className="invisible">{title}</span>
          )}
        </h3>
        <p className="text-text-dim text-[15px] md:text-[18px] font-normal leading-[1.7] md:leading-[30px] max-w-[535px] text-justify">
          {desc.split(" ").map((word, i) => (
            <span
              key={i}
              className="inline-block transition-opacity duration-300"
              style={{
                opacity: textActive ? 1 : 0,
                transitionDelay: textActive ? `${i * 60}ms` : "0ms",
              }}
            >
              {word}
              {i < desc.split(" ").length - 1 ? "\u00A0" : ""}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}
