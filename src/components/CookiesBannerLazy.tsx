"use client";

import dynamic from "next/dynamic";

const CookiesBanner = dynamic(() => import("@/components/CookiesBanner"), { ssr: false });

export default function CookiesBannerLazy() {
  return <CookiesBanner />;
}
