'use client';

interface ContentColumnProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Wrapper that centers content on desktop while remaining full-width on mobile.
 * Use for article lists and reader content (NOT headers, tabs, or nav).
 */
export function ContentColumn({ children, className = '' }: ContentColumnProps) {
  return (
    <div className={`w-full md:max-w-[700px] md:mx-auto ${className}`}>
      {children}
    </div>
  );
}
