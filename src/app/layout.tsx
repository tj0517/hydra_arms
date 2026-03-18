import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SmoothScroll from "@/components/SmoothScroll";
import LoadingScreen from "@/components/LoadingScreen";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "HYDRA ARMS — Zaawansowana Inżynieria Obronna",
  description:
    "Interdyscyplinarny ośrodek inżynieryjny specjalizujący się w projektowaniu, wytwarzaniu oraz obrocie zaawansowanymi rozwiązaniami dla sektora obronnego.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body
        className={`${outfit.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <LoadingScreen />
        <SmoothScroll />
        <div className="grain" />
        <div className="lines-grid" />
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  );
}
