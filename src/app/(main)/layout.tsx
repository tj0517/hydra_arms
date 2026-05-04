import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SmoothScroll from "@/components/SmoothScroll";
import LoadingScreen from "@/components/LoadingScreen";
import GlobalCursor from "@/components/GlobalCursor";
import { CartProvider } from "@/components/shop/CartProvider";
import CartTrigger from "@/components/shop/CartTrigger";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <LoadingScreen />
      <SmoothScroll />
      <div className="grain" />
      <div className="lines-grid" />
      <GlobalCursor />
      <Nav />
      {children}
      <Footer />
      <CartTrigger />
    </CartProvider>
  );
}
