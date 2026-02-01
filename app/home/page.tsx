import Link from 'next/link';

export const metadata = {
  title: 'Suns Reader - The easiest way to follow the Phoenix Suns',
  description: 'The latest Suns coverage in one feed. No searching, no ads — just open and start reading. Free to use.',
};

export default function MarketingHomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-6">
        {/* Hero Section */}
        <header className="pt-20 pb-10 sm:pt-28 sm:pb-14">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-5">Suns Reader</h1>
          <p className="text-xl sm:text-2xl text-zinc-500 dark:text-zinc-400 mb-10">
            The easiest way to follow the Phoenix Suns.
          </p>
          <Link
            href="/app"
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
        <div className="mt-10 sm:mt-14 flex flex-col gap-[3.5rem] sm:gap-[5rem]">
          {/* Section 1: Aggregation */}
          <section className="space-y-4 sm:space-y-5 outline outline-1 outline-white/10">
            <div>
              <h2 className="text-xl font-semibold tracking-tight mb-1">Bring the news to you.</h2>
              <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400">
                The latest Suns coverage is ready when you open the app.
              </p>
            </div>
            <div className="space-y-4 sm:space-y-5 text-base leading-7 sm:text-lg sm:leading-8 text-zinc-600 dark:text-zinc-300">
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
          </section>

          {/* Section 2: Curation */}
          <section className="space-y-4 sm:space-y-5 outline outline-1 outline-white/10">
            <div>
              <h2 className="text-xl font-semibold tracking-tight mb-1">Shape your own Suns feed.</h2>
              <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400">
                Follow the sources you trust while still discovering new perspectives.
              </p>
            </div>
            <div className="space-y-4 sm:space-y-5 text-base leading-7 sm:text-lg sm:leading-8 text-zinc-600 dark:text-zinc-300">
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
          </section>

          {/* Section 3: Reader */}
          <section className="space-y-4 sm:space-y-5 outline outline-1 outline-white/10">
            <div>
              <h2 className="text-xl font-semibold tracking-tight mb-1">A better way to read.</h2>
              <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400">
                Articles open in a clean, readable format by default.
              </p>
            </div>
            <div className="space-y-4 sm:space-y-5 text-base leading-7 sm:text-lg sm:leading-8 text-zinc-600 dark:text-zinc-300">
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
          </section>

          {/* Section 4: Install */}
          <section className="space-y-4 sm:space-y-5 outline outline-1 outline-white/10">
            <div>
              <h2 className="text-xl font-semibold tracking-tight mb-1">Use it like an app.</h2>
              <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400">
                Add Suns Reader to your home screen for the best experience.
              </p>
            </div>
            <div className="space-y-4 sm:space-y-5 text-base leading-7 sm:text-lg sm:leading-8 text-zinc-600 dark:text-zinc-300">
              <p>
                Suns Reader works instantly in your browser, but you can also install it on your phone so it opens just like a normal app.
              </p>
              <p>
                No app store search or downloads required — just add it to your home screen and start reading.
              </p>
              <p className="text-zinc-500 dark:text-zinc-400">
                Open Suns Reader on your phone to install it.
              </p>

              {/* Install instructions grid */}
              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                {/* iPhone instructions */}
                <div className="p-5 rounded-xl border border-border/50 bg-zinc-50/50 dark:bg-zinc-900/50">
                  <h3 className="text-base font-semibold text-foreground mb-4">iPhone (Safari)</h3>
                  <ol className="space-y-3 text-sm sm:text-base text-zinc-600 dark:text-zinc-300">
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
                  <ol className="space-y-3 text-sm sm:text-base text-zinc-600 dark:text-zinc-300">
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
          <section className="space-y-4 sm:space-y-5 outline outline-1 outline-white/10">
            <div>
              <h2 className="text-xl font-semibold tracking-tight mb-1">Free to use. No ads.</h2>
              <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400">
                Suns Reader is free and designed purely for a better reading experience.
              </p>
            </div>
            <div className="space-y-4 sm:space-y-5 text-base leading-7 sm:text-lg sm:leading-8 text-zinc-600 dark:text-zinc-300">
              <p>
                There are no ads, accounts, or subscriptions — just Suns coverage in a clean, simple feed.
              </p>
              <p>
                Suns Reader was built by a Suns fan who wanted an easier way to follow the team, ended up using it every day, and decided to share it with other Suns fans.
              </p>
            </div>
          </section>

          {/* Final CTA */}
          <section className="space-y-4 sm:space-y-5 pb-16 sm:pb-24 outline outline-1 outline-white/10">
            <h2 className="text-xl font-semibold tracking-tight">Ready to start reading?</h2>
            <p className="text-base leading-7 sm:text-lg sm:leading-8 text-zinc-500 dark:text-zinc-400">
              Open Suns Reader and catch up on the latest Suns coverage.
            </p>
            <Link
              href="/app"
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
          </section>
        </div>
      </div>

      {/* Footer spacing */}
      <div className="h-12" />
    </main>
  );
}
