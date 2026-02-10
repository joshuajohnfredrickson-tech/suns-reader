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
                  } else {
                    document.documentElement.style.colorScheme = 'light';
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (!window.location.pathname.startsWith('/app')) return;
                var bg = document.documentElement.classList.contains('dark') ? '#000000' : '#ffffff';
                var fg = document.documentElement.classList.contains('dark') ? '#ededed' : '#171717';
                var d = document.createElement('div');
                d.id = 'sr-splash';
                d.setAttribute('role', 'status');
                d.setAttribute('aria-label', 'Loading Suns Reader');
                d.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;background:' + bg + ';pointer-events:auto;transition:opacity 200ms ease-out;';
                d.innerHTML = '<img src="/icons/icon-192.png" alt="" width="72" height="72" style="border-radius:16px;margin-bottom:16px;">'
                  + '<div style="font-size:20px;font-weight:600;color:' + fg + ';margin-bottom:24px;font-family:var(--font-inter),-apple-system,BlinkMacSystemFont,sans-serif;">Suns Reader</div>'
                  + '<div style="width:24px;height:24px;border:2px solid ' + fg + ';border-top-color:transparent;border-radius:50%;animation:sr-spin 0.8s linear infinite;"></div>';
                var s = document.createElement('style');
                s.textContent = '@keyframes sr-spin{to{transform:rotate(360deg)}}';
                document.head.appendChild(s);
                document.body.appendChild(d);
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
