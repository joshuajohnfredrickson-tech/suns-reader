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
              Suns Reader is a free news reader for Phoenix Suns fans. It gathers the latest Suns coverage from dozens of outlets into one clean, easy-to-read feed.
            </p>
            <p>
              No accounts, no ads, and no subscriptions — just Suns coverage in one place.
            </p>
            <p>
              Built by a longtime Suns fan in Phoenix.
            </p>
          </div>
        </section>

        {/* Section: Why it exists */}
        <section>
          <h2 className="text-xl font-semibold tracking-tight leading-[1.15]">Why it exists</h2>
          <div className="mt-3.5 space-y-3.5 text-base leading-[1.6] sm:text-lg sm:leading-[1.65] text-zinc-600 dark:text-zinc-300">
            <p>
              Following the Suns online usually means jumping between search results, social feeds, and multiple websites — often wading through duplicate articles, clickbait, betting sites, fantasy content, and SEO noise just to find real coverage.
            </p>
            <p>
              Suns Reader was built to make catching up on Suns news quick and clutter-free.
            </p>
            <p>
              I originally built it just for myself — partly to scratch a personal itch and partly to see if I could actually build something like this.
            </p>
            <p>
              After using it a few times a day, it became clear it genuinely made following the team easier, so I decided to share it with other Suns fans too.
            </p>
          </div>
        </section>

        {/* Section: Built by a Suns fan */}
        <section>
          <h2 className="text-xl font-semibold tracking-tight leading-[1.15]">Built by a Suns fan</h2>
          <div className="mt-3.5 space-y-3.5 text-base leading-[1.6] sm:text-lg sm:leading-[1.65] text-zinc-600 dark:text-zinc-300">
            <p>
              I've followed the Suns since the 1988–89 season, from the Tom Chambers era through the Barkley Finals run, the Steve Nash "Seven Seconds or Less" years, and today's Booker era.
            </p>
            <p>
              Like many fans, watching the games is only part of it — I also enjoy digging into box scores, reading recaps, and following Suns coverage throughout the season.
            </p>
            <p>
              Suns Reader is simply a tool built by a longtime fan who wanted a better way to keep up with the team.
            </p>
          </div>
        </section>

        {/* Section: How it works */}
        <section>
          <h2 className="text-xl font-semibold tracking-tight leading-[1.15]">How it works</h2>
          <div className="mt-3.5 space-y-3.5 text-base leading-[1.6] sm:text-lg sm:leading-[1.65] text-zinc-600 dark:text-zinc-300">
            <p>
              Suns Reader monitors RSS feeds and sports news sources covering the Suns and displays recent articles in a chronological feed.
            </p>
            <p>
              When you open an article, it loads in a clean reading view without pop-ups or autoplay videos, while still allowing you to open the original source if you prefer.
            </p>
            <p>
              You can also customize your feed by choosing trusted sources while discovering new perspectives in the Discovery tab.
            </p>
          </div>
        </section>

        {/* Section: Support Suns Reader */}
        <section>
          <h2 className="text-xl font-semibold tracking-tight leading-[1.15]">Support Suns Reader</h2>
          <div className="mt-3.5 space-y-3.5 text-base leading-[1.6] sm:text-lg sm:leading-[1.65] text-zinc-600 dark:text-zinc-300">
            <p>
              Suns Reader is free to use and will stay that way.
            </p>
            <p>
              If you use it regularly and find it helpful, donations help cover hosting costs and the time needed to keep the project running and improving.
            </p>
            <a
              href="https://buymeacoffee.com/sunsreader"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-zinc-200 dark:border-white/15 bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-white/90 hover:bg-zinc-200 dark:hover:bg-white/15 hover:border-zinc-300 dark:hover:border-white/25 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 dark:focus:ring-offset-zinc-900 transition-colors font-medium"
            >
              Support Suns Reader
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
