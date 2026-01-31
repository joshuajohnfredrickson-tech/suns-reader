import Link from 'next/link';

export const metadata = {
  title: 'Suns Reader - A calmer way to follow Suns news',
  description: 'All the latest Phoenix Suns articles. None of the noise. Free to use, no ads, built for a better daily reading experience.',
};

export default function MarketingHomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="px-6 py-16 sm:py-24 text-center">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-5">Suns Reader</h1>
          <p className="text-xl sm:text-2xl text-zinc-500 dark:text-zinc-400 mb-4">
            A calmer way to follow Suns news.
          </p>
          <p className="text-lg text-zinc-400 dark:text-zinc-500 mb-10">
            All the latest articles. None of the noise.
          </p>
          <div className="text-sm text-zinc-400 dark:text-zinc-500 mb-12 space-y-1.5">
            <p>Free to use.</p>
            <p>No ads.</p>
            <p>Built for a better daily reading experience.</p>
          </div>
          <Link
            href="/"
            className="inline-block px-10 py-4 bg-accent text-white text-lg font-semibold rounded-xl hover:opacity-90 active:opacity-80 transition-opacity shadow-lg shadow-accent/20"
          >
            Open Suns Reader
          </Link>
        </div>
      </section>

      {/* What is Suns Reader? */}
      <section className="px-6 py-12 sm:py-20">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">What is Suns Reader?</h2>
          <div className="mt-6 sm:mt-5 space-y-6 sm:space-y-5 text-lg text-zinc-500 dark:text-zinc-400 leading-relaxed">
            <p>
              Suns Reader brings together recent Phoenix Suns articles from across the web.
            </p>
            <p>
              It makes them easier to read — especially on mobile.
            </p>
          </div>
        </div>
      </section>

      {/* Bring the news to you */}
      <section className="px-6 py-12 sm:py-20">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Bring the news to you</h2>
          <div className="mt-6 sm:mt-5 space-y-6 sm:space-y-5 text-lg text-zinc-500 dark:text-zinc-400 leading-relaxed">
            <p>
              Hundreds of sites publish Suns content every day.
            </p>
            <p>
              Local coverage. National outlets. Blogs. Beat writers.
            </p>
            <p>
              Suns Reader pulls recent articles into a single feed so you don't have to hunt, refresh tabs, or remember which sites to check.
            </p>
            <p>
              Open the app and see what's new — simple as that.
            </p>
          </div>
        </div>
      </section>

      {/* You are the algorithm */}
      <section className="px-6 py-12 sm:py-20">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">You are the algorithm</h2>
          <div className="mt-6 sm:mt-5 space-y-6 sm:space-y-5 text-lg text-zinc-500 dark:text-zinc-400 leading-relaxed">
            <p>
              Finding articles is easy.
            </p>
            <p>
              Finding good articles is harder.
            </p>
            <p>
              The web is increasingly filled with spam, low-quality AI writing, and bloated sites.
            </p>
            <p>
              Suns Reader puts you back in control.
            </p>
            <p>You can:</p>
            <ul className="space-y-4 sm:space-y-3 ml-1">
              <li className="flex items-start gap-3">
                <span className="text-accent mt-1.5">•</span>
                <span>discover new sources</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent mt-1.5">•</span>
                <span>mark favorites as trusted</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent mt-1.5">•</span>
                <span>shape a feed that reflects what you want to read</span>
              </li>
            </ul>
            <p>
              Set it once. Adjust over time.
            </p>
            <p>
              Enjoy a cleaner signal.
            </p>
          </div>
        </div>
      </section>

      {/* Clean reading experience */}
      <section className="px-6 py-12 sm:py-20">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">A clean, distraction-free reading experience</h2>
          <div className="mt-6 sm:mt-5 space-y-6 sm:space-y-5 text-lg text-zinc-500 dark:text-zinc-400 leading-relaxed">
            <p>
              Tap an article and it opens in a simple, text-first reading view.
            </p>
            <div className="space-y-2">
              <p>No pop-ups.</p>
              <p>No autoplay videos.</p>
              <p>No layout jumping.</p>
            </div>
            <p>
              Just the article, formatted to be readable on your phone.
            </p>
            <p className="text-zinc-400 dark:text-zinc-500">
              You can always open the original article if you want the full site experience.
            </p>
          </div>
        </div>
      </section>

      {/* Free to use. No ads. */}
      <section className="px-6 py-12 sm:py-20">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Free to use. No ads.</h2>
          <div className="mt-6 sm:mt-5 space-y-6 sm:space-y-5 text-lg text-zinc-500 dark:text-zinc-400 leading-relaxed">
            <p>
              Suns Reader is free and does not run ads.
            </p>
            <p>
              It was built as a personal project by a Suns fan who wanted a calmer way to read.
            </p>
            <p>
              Not as an ad platform or a data grab.
            </p>
            <div className="space-y-2">
              <p>No sign-ups.</p>
              <p>No catch.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Use it like an app */}
      <section className="px-6 py-12 sm:py-20">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Use it like an app</h2>
          <div className="mt-6 sm:mt-5 space-y-6 sm:space-y-5 text-lg text-zinc-500 dark:text-zinc-400 leading-relaxed">
            <p>
              Suns Reader works in your browser.
            </p>
            <p>
              You can also add it to your home screen.
            </p>

            {/* Install instructions grid */}
            <div className="grid sm:grid-cols-2 gap-4">
              {/* iPhone instructions */}
              <div className="p-5 rounded-xl border border-border/50 bg-zinc-50/50 dark:bg-zinc-900/50">
                <h3 className="text-base font-semibold text-foreground mb-4">iPhone (Safari)</h3>
                <ol className="space-y-3 text-base">
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
                <ol className="space-y-3 text-base">
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/10 text-accent text-sm font-medium flex items-center justify-center">1</span>
                    <span>Open Suns Reader in Chrome</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/10 text-accent text-sm font-medium flex items-center justify-center">2</span>
                    <span>Tap the ⋮ menu</span>
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
            <p>
              No App Store required.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-12 sm:py-20">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Frequently asked questions</h2>
          <div className="mt-6 sm:mt-5 space-y-10 sm:space-y-10">
            <div>
              <h3 className="text-lg font-medium text-foreground mb-4">Is Suns Reader free?</h3>
              <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Yes. Suns Reader is free to use and does not show ads.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-foreground mb-4">Where does the content come from?</h3>
              <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Suns Reader brings together recent articles published around the web by existing outlets. All articles are clearly attributed, with links to original sources.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-foreground mb-4">Does Suns Reader replace the original websites?</h3>
              <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
                No. Suns Reader is a reading tool. You can open the original article at any time.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-foreground mb-4">Do I need to install anything?</h3>
              <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
                No. You can use Suns Reader directly in your browser. Installing it is optional.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-foreground mb-4">Is this an official Phoenix Suns app?</h3>
              <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
                No. Suns Reader is an independent project built by a fan, for fans.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-20 sm:py-28 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Start reading</h2>
          <div className="mt-6 sm:mt-5 space-y-5">
            <p className="text-lg text-zinc-500 dark:text-zinc-400">
              If you follow the Suns and are tired of the noise, Suns Reader is built for you.
            </p>
            <Link
              href="/"
              className="inline-block px-10 py-4 bg-accent text-white text-lg font-semibold rounded-xl hover:opacity-90 active:opacity-80 transition-opacity shadow-lg shadow-accent/20"
            >
              Open Suns Reader
            </Link>
          </div>
        </div>
      </section>

      {/* Footer spacing */}
      <div className="h-12" />
    </div>
  );
}
