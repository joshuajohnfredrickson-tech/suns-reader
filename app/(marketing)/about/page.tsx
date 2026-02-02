export const metadata = {
  title: 'About - Suns Reader',
  description: 'Learn about Suns Reader, a free news aggregator for Phoenix Suns fans.',
};

export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto px-6">
      {/* Page Header */}
      <header className="pt-6 pb-7 sm:pt-8 sm:pb-10">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">About Suns Reader</h1>
      </header>

      {/* Content sections */}
      <div className="flex flex-col gap-7 sm:gap-10">
        {/* Section: What is Suns Reader? */}
        <section>
          <h2 className="text-xl font-semibold tracking-tight leading-[1.15]">What is Suns Reader?</h2>
          <div className="mt-3.5 space-y-3.5 text-base leading-[1.6] sm:text-lg sm:leading-[1.65] text-zinc-600 dark:text-zinc-300">
            <p>
              Suns Reader is a free news aggregator built specifically for Phoenix Suns fans. It gathers the latest Suns coverage from dozens of sources into one clean, easy-to-read feed.
            </p>
            <p>
              No accounts, no ads, no subscriptions — just the news you want to read.
            </p>
          </div>
        </section>

        {/* Section: Why it exists */}
        <section>
          <h2 className="text-xl font-semibold tracking-tight leading-[1.15]">Why it exists</h2>
          <div className="mt-3.5 space-y-3.5 text-base leading-[1.6] sm:text-lg sm:leading-[1.65] text-zinc-600 dark:text-zinc-300">
            <p>
              Following the Suns used to mean bouncing between multiple websites, apps, and social media feeds. It was frustrating to miss important stories or wade through clickbait to find quality coverage.
            </p>
            <p>
              Suns Reader was created to solve that problem — a single place to catch up on everything Suns, built by a fan who uses it every day.
            </p>
          </div>
        </section>

        {/* Section: How it works */}
        <section>
          <h2 className="text-xl font-semibold tracking-tight leading-[1.15]">How it works</h2>
          <div className="mt-3.5 space-y-3.5 text-base leading-[1.6] sm:text-lg sm:leading-[1.65] text-zinc-600 dark:text-zinc-300">
            <p>
              Suns Reader monitors RSS feeds and other sources from sports news outlets, team beat writers, and independent journalists. New articles are automatically collected and displayed in a chronological feed.
            </p>
            <p>
              When you tap an article, it opens in a clean reading view — no pop-ups, no autoplay videos, just the content. You can always open the original site if you prefer.
            </p>
            <p>
              You can customize your feed by choosing which sources to follow and discover new perspectives in the Discovery tab.
            </p>
          </div>
        </section>

        {/* Section: Support Suns Reader */}
        <section className="pb-16 sm:pb-24">
          <h2 className="text-xl font-semibold tracking-tight leading-[1.15]">Support Suns Reader</h2>
          <div className="mt-3.5 space-y-3.5 text-base leading-[1.6] sm:text-lg sm:leading-[1.65] text-zinc-600 dark:text-zinc-300">
            <p>
              Suns Reader is free to use and will stay that way. If you find it useful and want to support its development, donations help cover hosting costs and future improvements.
            </p>
            <p className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border/50 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400">
              Donation link coming soon.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
