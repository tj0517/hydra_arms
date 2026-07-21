"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ScrollTrigger } from "@/lib/gsap";

export default function SmoothScroll() {
  const pathname = usePathname();

  useEffect(() => {
    // Refresh ScrollTrigger positions on route change
    ScrollTrigger.refresh();
  }, [pathname]);

  return null;
}
