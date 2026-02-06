import Link from 'next/link';
import Image from 'next/image';

interface MarketingContentProps {
  appUrl?: string;
}

export function MarketingContent({ appUrl = '/app?tab=trusted' }: MarketingContentProps) {
  return (
    <div className="max-w-2xl mx-auto px-6">
        {/* Hero Section */}
        <header className="pt-6 pb-7 sm:pt-8 sm:pb-10">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-5">Suns Reader</h1>
          <p className="text-xl sm:text-2xl text-zinc-500 dark:text-zinc-400 mb-4">
            The easiest way to follow the Phoenix Suns.
          </p>
          <Link
            href={appUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-accent font-medium hover:underline transition-colors"
          >
            <span>Open Suns Reader</span>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </Link>
        </header>

        {/* Content sections */}
        <div className="flex flex-col gap-7 sm:gap-10">
          {/* Section 1: Aggregation - text left, image right on desktop */}
          <section data-debug-section="1-aggregation">
            <div className="flex flex-col sm:flex-row sm:items-start sm:gap-8">
              <div className="flex-1">
                <h2 data-debug-h2 className="text-2xl font-semibold tracking-tight leading-[1.15] text-foreground">Bring the news to you.</h2>
                <p data-debug-subhead className="mt-1 text-lg text-foreground/80 leading-snug">
                  The latest Suns coverage is ready when you open the app.
                </p>
                <div data-debug-body className="mt-4 space-y-3.5 text-base leading-[1.6] sm:text-lg sm:leading-[1.65] text-zinc-500 dark:text-zinc-400">
                  <p>
                    Dozens of outlets publish Suns news every day. Suns Reader gathers recent articles into one feed so you can see what's new instantly.
                  </p>
                  <p>
                    No searching. No sorting or filtering results.
                  </p>
                  <p>
                    Open the app and start reading.
                  </p>
                </div>
              </div>
              <div className="mt-6 sm:mt-0 sm:w-[180px] sm:flex-shrink-0">
                <Image
                  src="/marketing/feed.png"
                  alt="Suns Reader feed showing latest articles"
                  width={180}
                  height={390}
                  className="rounded-xl shadow-lg mx-auto sm:mx-0"
                />
              </div>
            </div>
          </section>

          {/* Section 2: Curation - image left, text right on desktop */}
          <section data-debug-section="2-curation">
            <div className="flex flex-col sm:flex-row-reverse sm:items-start sm:gap-8">
              <div className="flex-1">
                <h2 data-debug-h2 className="text-2xl font-semibold tracking-tight leading-[1.15] text-foreground">Shape your own Suns feed.</h2>
                <p data-debug-subhead className="mt-1 text-lg text-foreground/80 leading-snug">
                  Follow the sources you trust while still discovering new perspectives.
                </p>
                <div data-debug-body className="mt-4 space-y-3.5 text-base leading-[1.6] sm:text-lg sm:leading-[1.65] text-zinc-500 dark:text-zinc-400">
                  <p>
                    Suns Reader starts with a trusted set of major outlets, but you're always in control.
                  </p>
                  <p>
                    Keep your main feed focused on the sources you like, while the Discovery tab lets you explore coverage from writers in other markets — see how upcoming opponents view the matchup.
                  </p>
                  <p>
                    Add sources you enjoy. Ignore the ones you don't.
                  </p>
                  <p>
                    Your feed evolves with you.
                  </p>
                </div>
              </div>
              <div className="mt-6 sm:mt-0 sm:w-[180px] sm:flex-shrink-0">
                <Image
                  src="/marketing/sources.png"
                  alt="Suns Reader trusted sources settings"
                  width={180}
                  height={390}
                  className="rounded-xl shadow-lg mx-auto sm:mx-0"
                />
              </div>
            </div>
          </section>

          {/* Section 3: Reader - text left, image right on desktop */}
          <section data-debug-section="3-reader">
            <div className="flex flex-col sm:flex-row sm:items-start sm:gap-8">
              <div className="flex-1">
                <h2 data-debug-h2 className="text-2xl font-semibold tracking-tight leading-[1.15] text-foreground">A better way to read.</h2>
                <p data-debug-subhead className="mt-1 text-lg text-foreground/80 leading-snug">
                  Articles open in a clean, readable format by default.
                </p>
                <div data-debug-body className="mt-4 space-y-3.5 text-base leading-[1.6] sm:text-lg sm:leading-[1.65] text-zinc-500 dark:text-zinc-400">
                  <p>
                    Instead of loading the original site first, Suns Reader opens articles directly in a simple reading view designed for your phone.
                  </p>
                  <p>
                    No pop-ups, autoplay videos, or layout jumps — just the article, formatted for comfortable reading.
                  </p>
                  <p>
                    If you ever want the full site experience, you can still open the original article with one tap.
                  </p>
                </div>
              </div>
              <div className="mt-6 sm:mt-0 sm:w-[180px] sm:flex-shrink-0">
                <Image
                  src="/marketing/reader.png"
                  alt="Suns Reader article view"
                  width={180}
                  height={390}
                  className="rounded-xl shadow-lg mx-auto sm:mx-0"
                />
              </div>
            </div>
          </section>

          {/* Section 4: Install */}
          <section data-debug-section="4-install">
            <h2 data-debug-h2 className="text-2xl font-semibold tracking-tight leading-[1.15] text-foreground">Use it like an app.</h2>
            <p data-debug-subhead className="mt-1 text-lg text-foreground/80 leading-snug">
              Add Suns Reader to your home screen for the best experience.
            </p>
            <div data-debug-body className="mt-4 space-y-3.5 text-base leading-[1.6] sm:text-lg sm:leading-[1.65] text-zinc-500 dark:text-zinc-400">
              <p>
                Suns Reader works instantly in your browser, but you can also install it on your phone so it opens just like a normal app.
              </p>
              <p>
                No app store search or downloads required — just add it to your home screen and start reading.
              </p>
              <p>
                Open Suns Reader on your phone to install it.
              </p>

              {/* Install instructions grid */}
              <div data-debug-cards className="grid sm:grid-cols-2 gap-4 pt-2">
                {/* iPhone instructions */}
                <div className="p-5 rounded-xl border border-border/50 bg-zinc-50/50 dark:bg-zinc-900/50">
                  <h3 className="text-base font-semibold text-foreground mb-4">iPhone (Safari)</h3>
                  <ol className="space-y-3 text-sm sm:text-base text-zinc-500 dark:text-zinc-400">
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/10 text-accent text-sm font-medium flex items-center justify-center">1</span>
                      <span>Open Suns Reader in Safari</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/10 text-accent text-sm font-medium flex items-center justify-center">2</span>
                      <span>Tap Share</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/10 text-accent text-sm font-medium flex items-center justify-center">3</span>
                      <span>Tap Add to Home Screen</span>
                    </li>
                  </ol>
                </div>

                {/* Android instructions */}
                <div className="p-5 rounded-xl border border-border/50 bg-zinc-50/50 dark:bg-zinc-900/50">
                  <h3 className="text-base font-semibold text-foreground mb-4">Android (Chrome)</h3>
                  <ol className="space-y-3 text-sm sm:text-base text-zinc-500 dark:text-zinc-400">
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/10 text-accent text-sm font-medium flex items-center justify-center">1</span>
                      <span>Open Suns Reader in Chrome</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/10 text-accent text-sm font-medium flex items-center justify-center">2</span>
                      <span>Tap the menu (three dots)</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/10 text-accent text-sm font-medium flex items-center justify-center">3</span>
                      <span>Tap Add to Home screen</span>
                    </li>
                  </ol>
                </div>
              </div>

              <p>
                Once installed, Suns Reader launches full-screen and behaves like a native app.
              </p>
            </div>
          </section>

          {/* Section 5: Free / No ads */}
          <section data-debug-section="5-free">
            <h2 data-debug-h2 className="text-2xl font-semibold tracking-tight leading-[1.15] text-foreground">Free to use. No ads.</h2>
            <p data-debug-subhead className="mt-1 text-lg text-foreground/80 leading-snug">
              Suns Reader is free and designed purely for a better reading experience.
            </p>
            <div data-debug-body className="mt-4 space-y-3.5 text-base leading-[1.6] sm:text-lg sm:leading-[1.65] text-zinc-500 dark:text-zinc-400">
              <p>
                There are no ads, accounts, or subscriptions — just Suns coverage in a clean, simple feed.
              </p>
              <p>
                Suns Reader was built by a Suns fan who wanted an easier way to follow the team, ended up using it every day, and decided to share it with other Suns fans.
              </p>
            </div>
          </section>

          {/* Final CTA */}
          <section data-debug-section="6-cta">
            <h2 data-debug-h2 className="text-2xl font-semibold tracking-tight leading-[1.15] text-foreground">Ready to start reading?</h2>
            <p data-debug-subhead className="mt-1 text-lg text-foreground/80 leading-snug">
              Open Suns Reader and catch up on the latest Suns coverage.
            </p>
            <Link
              data-debug-cta
              href={appUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-accent font-medium hover:underline transition-colors"
            >
              <span>Open Suns Reader</span>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </Link>
          </section>
        </div>
      </div>
  );
}
