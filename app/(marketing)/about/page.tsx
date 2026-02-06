export const metadata = {
  title: 'About - Suns Reader',
  description: 'Learn about Suns Reader, a free news aggregator for Phoenix Suns fans.',
};

export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto px-6">
      {/* Page Header */}
      <header className="pt-6 pb-7 sm:pt-8 sm:pb-10">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-5">About Suns Reader</h1>
      </header>

      {/* Content sections */}
      <div className="flex flex-col gap-7 sm:gap-10">
        {/* Section: About Suns Reader */}
        <section>
          <div className="space-y-3.5 text-base leading-[1.6] text-foreground">
            <p>
              Suns Reader is an independent project built by a Phoenix Suns fan who wanted an easier way to keep up with team coverage without jumping between dozens of sites, social feeds, and apps.
            </p>
            <p>
              Instead of searching for news across the web, Suns Reader brings recent Suns coverage into one clean, readable feed so fans can spend less time hunting for articles and more time enjoying them.
            </p>
            <p>
              Enjoying Suns Reader? You can help support the project here.
            </p>
            <a
              href="https://buymeacoffee.com/sunsreader"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-accent font-medium hover:underline transition-colors"
            >
              <span>Support Suns Reader</span>
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
            </a>
          </div>
        </section>

        {/* Section: Why this exists */}
        <section>
          <h2 className="text-2xl font-semibold tracking-tight leading-[1.15] text-foreground">Why this exists</h2>
          <div className="mt-4 space-y-3.5 text-base leading-[1.6] text-foreground">
            <p>
              Following the Suns often means dealing with pop-ups, autoplay videos, and cluttered pages just to read a single article.
            </p>
            <p>
              Suns Reader focuses on one simple goal: make Suns coverage easier to read and easier to follow.
            </p>
            <p>
              No clickbait tricks. No algorithm games. Just Suns coverage in a cleaner format.
            </p>
          </div>
        </section>

        {/* Section: Who runs this? */}
        <section>
          <h2 className="text-2xl font-semibold tracking-tight leading-[1.15] text-foreground">Who runs this?</h2>
          <div className="mt-4 space-y-3.5 text-base leading-[1.6] text-foreground">
            <p>
              Suns Reader isn't run by a media company or advertising network. It's a side project built and maintained independently by a Suns fan.
            </p>
            <p>
              The goal isn't to build a media empire — just to make something useful for the Suns community.
            </p>
          </div>
        </section>

        {/* Section: Is Suns Reader free? */}
        <section>
          <h2 className="text-2xl font-semibold tracking-tight leading-[1.15] text-foreground">Is Suns Reader free?</h2>
          <div className="mt-4 space-y-3.5 text-base leading-[1.6] text-foreground">
            <p>
              Yes. Suns Reader is free to use.
            </p>
            <p>
              Running the app does have hosting and infrastructure costs, so optional donations help keep the project running, but nothing is locked behind a paywall.
            </p>
            <p>
              If Suns Reader makes it easier to follow the Suns, you can help support ongoing development here.
            </p>
            <a
              href="https://buymeacoffee.com/sunsreader"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-accent font-medium hover:underline transition-colors"
            >
              <span>Support Suns Reader</span>
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
            </a>
          </div>
        </section>

        {/* Section: Privacy & data */}
        <section>
          <h2 className="text-2xl font-semibold tracking-tight leading-[1.15] text-foreground">Privacy & data</h2>
          <div className="mt-4 space-y-3.5 text-base leading-[1.6] text-foreground">
            <p>
              Suns Reader doesn't require accounts and doesn't sell personal data. The goal is simply to make reading Suns coverage easier — not to track users.
            </p>
          </div>
        </section>

        {/* Section: What's next? */}
        <section>
          <h2 className="text-2xl font-semibold tracking-tight leading-[1.15] text-foreground">What's next?</h2>
          <div className="mt-4 space-y-3.5 text-base leading-[1.6] text-foreground">
            <p>
              Suns Reader will continue improving over time based on feedback and usage. The focus will stay the same: keep it simple, fast, and useful for Suns fans.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
