import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SmoothScroll from "@/components/SmoothScroll";
import LoadingScreen from "@/components/LoadingScreen";
import GlobalCursor from "@/components/GlobalCursor";
import { CartProvider } from "@/components/shop/CartProvider";
import CartTrigger from "@/components/shop/CartTrigger";
import { sanityFetch } from "@/sanity/client";
import { siteSettingsQuery, navigationQuery } from "@/sanity/queries";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let siteSettings = null;
  let navLinks: { href: string; label: string }[] | undefined = undefined;

  try {
    const [settings, navData] = await Promise.all([
      sanityFetch<{
        companyName?: string; nip?: string; regon?: string; koncesja?: string;
        emailRD?: string; emailB2G?: string; emailHandel?: string; emailBiuro?: string;
        facebookUrl?: string; instagramUrl?: string; lat?: number; lng?: number;
      }>({ query: siteSettingsQuery }),
      sanityFetch<{ links?: { href: string; label: string }[] }>({ query: navigationQuery }),
    ]);
    siteSettings = settings;
    navLinks = navData?.links;
  } catch {}

  return (
    <CartProvider>
      <LoadingScreen />
      <SmoothScroll />
      <div className="grain" />
      <div className="lines-grid" />
      <GlobalCursor />
      <Nav navLinks={navLinks} />
      {children}
      <Footer navLinks={navLinks} siteSettings={siteSettings} />
      <CartTrigger />
    </CartProvider>
  );
}
