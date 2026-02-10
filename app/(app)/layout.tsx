import { SplashOverlay } from '../components/SplashOverlay';

/**
 * Layout for app routes (/app, /app/reader, /app/settings)
 * Server component so that the splash overlay is server-rendered static HTML
 * and paints on the very first frame (no JS dependency).
 * Also applies mobile scroll-lock to prevent iOS Safari rubber-banding.
 * This does NOT apply to marketing pages (/ and /home).
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes sr-spin{to{transform:rotate(360deg)}}
            @media (max-width: 767px) {
              html, body {
                overflow: hidden;
                height: 100%;
              }
            }
          `,
        }}
      />
      {/* Splash overlay: server-rendered static HTML so it paints on first frame.
          Only rendered for /app routes (this layout).
          React SplashOverlay takes over dismiss logic on hydration. */}
      <div
        id="sr-splash"
        role="status"
        aria-label="Loading Suns Reader"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 2147483647,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 1,
          pointerEvents: 'auto' as const,
          transition: 'opacity 200ms ease-out',
        }}
        className="bg-background"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" width={72} height={72} style={{ borderRadius: 16, marginBottom: 16 }} />
        <div className="text-foreground" style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>Suns Reader</div>
        <div
          className="text-foreground"
          style={{
            width: 24,
            height: 24,
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'sr-spin 0.8s linear infinite',
          }}
        />
      </div>
      <SplashOverlay />
      {children}
    </>
  );
}
