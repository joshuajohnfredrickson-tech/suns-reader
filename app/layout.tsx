import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider";
import { ServiceWorkerManager } from "./components/ServiceWorkerManager";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Suns Reader",
  description: "Your trusted news reader",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Suns Reader",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var preference = localStorage.getItem('themePreference');
                  var isDark = preference === 'dark' ||
                    (preference !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.style.colorScheme = 'dark';
                    document.documentElement.style.background = '#000000';
                  } else {
                    document.documentElement.style.colorScheme = 'light';
                    document.documentElement.style.background = '#ffffff';
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} antialiased`}>
        {/* Splash overlay: server-rendered static HTML so it paints on first frame.
            Removed on non-/app routes by the inline script below.
            On /app routes, React SplashOverlay takes over dismiss logic. */}
        <style dangerouslySetInnerHTML={{ __html: '@keyframes sr-spin{to{transform:rotate(360deg)}}' }} />
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (!window.location.pathname.startsWith('/app')) {
                  var el = document.getElementById('sr-splash');
                  if (el) el.remove();
                }
              })();
            `,
          }}
        />
        <ThemeProvider>
          <ServiceWorkerManager />
          <div className="w-full md:flex md:justify-center">
            <div className="w-full md:max-w-[1024px] md:flex-none">
              {children}
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
