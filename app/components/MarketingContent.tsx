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
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight mb-5">Suns Reader</h1>
          <p className="text-xl sm:text-2xl text-foreground mb-3">
            The easiest way to follow the Phoenix Suns.
          </p>
          <p className="text-base leading-[1.6] text-foreground/85 mb-5">
            All the latest Suns articles and videos in one place — with a clean, fast experience for reading and watching.
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
        <div className="flex flex-col gap-10 sm:gap-14">
          {/* Section 1: Aggregation - text left, image right on desktop */}
          <section data-debug-section="1-aggregation">
            <div className="flex flex-col sm:flex-row sm:items-start sm:gap-10">
              <div className="flex-1">
                <h2 data-debug-h2 className="text-2xl sm:text-3xl font-semibold text-foreground">Everything Suns, in one place</h2>
                <div data-debug-body className="mt-4 space-y-3.5 text-base leading-[1.6] text-foreground/85">
                  <p>
                    Suns Reader pulls coverage from across the web, bringing together articles and videos from many different Suns sources into a single feed.
                  </p>
                  <p>
                    So whenever you check in, you can quickly see what's happening with the team.
                  </p>
                </div>
              </div>
              <div className="mt-6 sm:mt-0 flex-1 flex justify-center sm:justify-end">
                <Image
                  src="/marketing/feed.png"
                  alt="Suns Reader feed showing latest articles from multiple sources"
                  width={250}
                  height={542}
                  className="rounded-xl shadow-lg max-w-[250px]"
                />
              </div>
            </div>
          </section>

          {/* Section 2: Articles - image left, text right on desktop */}
          <section data-debug-section="2-articles">
            <div className="flex flex-col sm:flex-row-reverse sm:items-start sm:gap-10">
              <div className="flex-1">
                <h2 data-debug-h2 className="text-2xl sm:text-3xl font-semibold text-foreground">Suns articles, without the clutter</h2>
                <div data-debug-body className="mt-4 space-y-3.5 text-base leading-[1.6] text-foreground/85">
                  <p>
                    Tap any article and it opens instantly in a clean, easy-to-read format.
                  </p>
                  <p>
                    Just the story, optimized for reading on your phone or desktop — making it enjoyable to stay in the know.
                  </p>
                </div>
              </div>
              <div className="mt-6 sm:mt-0 flex-1 flex justify-center sm:justify-start">
                <Image
                  src="/marketing/reader.png"
                  alt="Suns Reader article view in clean reading format"
                  width={250}
                  height={542}
                  className="rounded-xl shadow-lg max-w-[250px]"
                />
              </div>
            </div>
          </section>

          {/* Section 3: Videos - text left, image right on desktop */}
          <section data-debug-section="3-videos">
            <div className="flex flex-col sm:flex-row sm:items-start sm:gap-10">
              <div className="flex-1">
                <h2 data-debug-h2 className="text-2xl sm:text-3xl font-semibold text-foreground">Suns videos, ready to watch</h2>
                <div data-debug-body className="mt-4 space-y-3.5 text-base leading-[1.6] text-foreground/85">
                  <p>
                    Highlights, analysis, interviews, podcasts, and talk radio clips show up right in your feed.
                  </p>
                  <p>
                    Tap a video and it plays instantly inside Suns Reader, making it delightfully simple to enjoy Suns videos without leaving the app.
                  </p>
                </div>
              </div>
              <div className="mt-6 sm:mt-0 flex-1 flex justify-center sm:justify-end">
                <Image
                  src="/marketing/videos.png"
                  alt="Suns Reader video feed with highlights and analysis"
                  width={250}
                  height={542}
                  className="rounded-xl shadow-lg max-w-[250px]"
                />
              </div>
            </div>
          </section>

          {/* Section 4: Personalization */}
          <section data-debug-section="4-personalization">
            <h2 data-debug-h2 className="text-2xl sm:text-3xl font-semibold text-foreground">Shape your feed over time</h2>
            <div data-debug-body className="mt-4 space-y-3.5 text-base leading-[1.6] text-foreground/85">
              <p>
                Suns Reader starts with a great mix of Suns coverage, so you can jump right in.
              </p>
              <p>
                Over time, you can adjust the sources you want to see more of — and less of — making the feed your own.
              </p>
            </div>
          </section>

          {/* Section 5: Install */}
          <section data-debug-section="5-install">
            <h2 data-debug-h2 className="text-2xl sm:text-3xl font-semibold text-foreground">Install Suns Reader for the best experience</h2>
            <div data-debug-body className="mt-4 space-y-3.5 text-base leading-[1.6] text-foreground/85">
              <p>
                Suns Reader works in your browser, but adding it to your home screen lets it run like a real app — with a cleaner, more polished experience and more space for Suns content instead of browser controls.
              </p>

              {/* Install instructions grid */}
              <div data-debug-cards className="grid sm:grid-cols-2 gap-4 pt-2">
                {/* iPhone / iPad instructions */}
                <div className="p-5 rounded-xl border border-border/50 bg-zinc-50/50 dark:bg-zinc-900/50">
                  <h3 className="text-base font-semibold text-foreground mb-4">iPhone / iPad</h3>
                  <ol className="space-y-3 text-sm sm:text-base text-foreground/85">
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/10 text-accent text-sm font-medium flex items-center justify-center">1</span>
                      <span>Tap <strong>Share</strong></span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/10 text-accent text-sm font-medium flex items-center justify-center">2</span>
                      <span>Select <strong>Add to Home Screen</strong></span>
                    </li>
                  </ol>
                </div>

                {/* Android / Desktop instructions */}
                <div className="p-5 rounded-xl border border-border/50 bg-zinc-50/50 dark:bg-zinc-900/50">
                  <h3 className="text-base font-semibold text-foreground mb-4">Android / Desktop</h3>
                  <ol className="space-y-3 text-sm sm:text-base text-foreground/85">
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/10 text-accent text-sm font-medium flex items-center justify-center">1</span>
                      <span>Choose <strong>Install App</strong> when prompted by your browser</span>
                    </li>
                  </ol>
                </div>
              </div>

              <p>
                Install once, and Suns Reader opens just like any other app on your device.
              </p>
            </div>
          </section>

          {/* Section 6: Free */}
          <section data-debug-section="6-free">
            <h2 data-debug-h2 className="text-2xl sm:text-3xl font-semibold text-foreground">Free. No accounts. No tracking.</h2>
            <div data-debug-body className="mt-4 space-y-3.5 text-base leading-[1.6] text-foreground/85">
              <p>
                Suns Reader is completely free to use.
              </p>
              <p>
                No account required. No ads. No tracking.
              </p>
              <p>
                Just Suns content, in one place.
              </p>
              <p>
                If you enjoy the app, you can support it with an optional donation — but it'll always be free to use.
              </p>
            </div>
          </section>

          {/* Final CTA */}
          <section data-debug-section="7-cta">
            <h2 data-debug-h2 className="text-2xl sm:text-3xl font-semibold text-foreground">Ready to start reading?</h2>
            <p data-debug-subhead className="mt-1.5 mb-5 text-xl sm:text-2xl font-medium text-foreground leading-snug">
              Open Suns Reader and see what's new with the Suns.
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
