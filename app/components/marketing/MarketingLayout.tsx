import Link from 'next/link';

interface MarketingLayoutProps {
  children: React.ReactNode;
}

export function MarketingLayout({ children }: MarketingLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50">
        <nav className="max-w-2xl mx-auto px-6 py-4">
          <ul className="flex items-center gap-6 text-sm font-medium">
            <li>
              <Link
                href="/"
                className="text-zinc-600 dark:text-zinc-400 hover:text-foreground transition-colors"
              >
                Home
              </Link>
            </li>
            <li>
              <Link
                href="/app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-600 dark:text-zinc-400 hover:text-foreground transition-colors"
              >
                App
              </Link>
            </li>
            <li>
              <Link
                href="/about"
                className="text-zinc-600 dark:text-zinc-400 hover:text-foreground transition-colors"
              >
                About
              </Link>
            </li>
          </ul>
        </nav>
      </header>

      {/* Main content */}
      <main className="flex-1 pb-6 sm:pb-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50">
        <nav className="max-w-2xl mx-auto px-6 py-4">
          <ul className="flex items-center gap-6 text-sm text-zinc-500 dark:text-zinc-400">
            <li>
              <Link
                href="/"
                className="hover:text-foreground transition-colors"
              >
                Home
              </Link>
            </li>
            <li>
              <Link
                href="/app"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                App
              </Link>
            </li>
            <li>
              <Link
                href="/about"
                className="hover:text-foreground transition-colors"
              >
                About
              </Link>
            </li>
          </ul>
        </nav>
        {/* iOS safe area spacer */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </footer>
    </div>
  );
}
