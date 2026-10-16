/**
 * Visible on every public page while SHOP_MODE=verification (HA-2.08).
 * Server component, no client JS. Pinned to the bottom edge so it never covers the
 * fixed Nav at the top; pointer-events-none so it never blocks a click.
 */
export default function TestModeBanner() {
  return (
    <div
      role="status"
      data-testid="test-mode-banner"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[1200] flex justify-center px-4 pb-2"
    >
      <p className="bg-amber-400 px-4 py-1.5 text-center font-[var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.18em] text-black shadow-lg">
        Tryb testowy — płatności nie są prawdziwe
      </p>
    </div>
  )
}
