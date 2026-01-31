'use client';

/**
 * Layout for app routes (/, /reader, /sources)
 * Applies mobile scroll-lock to prevent iOS Safari rubber-banding on sticky headers.
 * This does NOT apply to /home (marketing page) which uses normal document scrolling.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style jsx global>{`
        @media (max-width: 767px) {
          html,
          body {
            overflow: hidden;
            height: 100%;
          }
        }
      `}</style>
      {children}
    </>
  );
}
