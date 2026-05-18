import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";

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

const BASE_URL = "https://hydraarms.pl";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "HYDRA ARMS — Zaawansowana Inżynieria Obronna",
    template: "%s | HYDRA ARMS",
  },
  description:
    "Interdyscyplinarny ośrodek inżynieryjny specjalizujący się w projektowaniu, wytwarzaniu oraz obrocie zaawansowanymi rozwiązaniami dla sektora obronnego.",
  robots: { index: true, follow: true },
  alternates: { canonical: BASE_URL },
  openGraph: {
    type: "website",
    locale: "pl_PL",
    url: BASE_URL,
    siteName: "HYDRA ARMS",
    title: "HYDRA ARMS — Zaawansowana Inżynieria Obronna",
    description:
      "Interdyscyplinarny ośrodek inżynieryjny specjalizujący się w projektowaniu, wytwarzaniu oraz obrocie zaawansowanymi rozwiązaniami dla sektora obronnego.",
    images: [{ url: "/og-default.jpg", width: 1200, height: 630, alt: "HYDRA ARMS" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "HYDRA ARMS — Zaawansowana Inżynieria Obronna",
    description:
      "Interdyscyplinarny ośrodek inżynieryjny specjalizujący się w projektowaniu, wytwarzaniu oraz obrocie zaawansowanymi rozwiązaniami dla sektora obronnego.",
    images: ["/og-default.jpg"],
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "HYDRA ARMS Sp. z o.o.",
  url: BASE_URL,
  logo: `${BASE_URL}/logo.png`,
  description:
    "Interdyscyplinarny ośrodek inżynieryjny specjalizujący się w projektowaniu, wytwarzaniu oraz obrocie zaawansowanymi rozwiązaniami dla sektora obronnego.",
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    email: "biuro@hydraarms.pl",
    availableLanguage: ["Polish"],
  },
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        {children}
      </body>
    </html>
  );
}
