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
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">Suns Reader</h1>
          <p className="text-xl sm:text-2xl text-zinc-600 dark:text-zinc-300 mb-3">
            A calmer way to follow Suns news.
          </p>
          <p className="text-lg text-zinc-500 dark:text-zinc-400 mb-8">
            All the latest articles. None of the noise.
          </p>
          <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-10 space-y-1">
            <p>Free to use.</p>
            <p>No ads.</p>
            <p>Built for a better daily reading experience.</p>
          </div>
          <Link
            href="/"
            className="inline-block px-8 py-4 bg-accent text-white font-medium rounded-lg hover:opacity-90 active:opacity-80 transition-opacity"
          >
            Open Suns Reader
          </Link>
        </div>
      </section>

      {/* What is Suns Reader? */}
      <section className="px-6 py-12 sm:py-16 border-t border-border">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold mb-6">What is Suns Reader?</h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed">
            Suns Reader brings together recent Phoenix Suns articles from across the web and makes them easier to read — especially on mobile.
          </p>
        </div>
      </section>

      {/* Bring the news to you */}
      <section className="px-6 py-12 sm:py-16 border-t border-border">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold mb-6">Bring the news to you</h2>
          <div className="space-y-4 text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed">
            <p>
              Hundreds of sites publish Suns content every day: local coverage, national outlets, blogs, and beat writers.
            </p>
            <p>
              Suns Reader pulls recent Suns articles into a single feed so you don't have to hunt, refresh tabs, or remember which sites to check.
            </p>
            <p>
              Open the app and see what's new — simple as that.
            </p>
          </div>
        </div>
      </section>

      {/* You are the algorithm */}
      <section className="px-6 py-12 sm:py-16 border-t border-border">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold mb-6">You are the algorithm</h2>
          <div className="space-y-4 text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed">
            <p>
              Finding articles is easy. Finding good articles is harder.
            </p>
            <p>
              The web is increasingly filled with spam, low-quality AI writing, and bloated sites. Suns Reader puts you back in control.
            </p>
            <p>You can:</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>discover new sources</li>
              <li>mark favorites as trusted</li>
              <li>shape a feed that reflects what you want to read</li>
            </ul>
            <p>
              Set it once. Adjust over time. Enjoy a cleaner signal.
            </p>
          </div>
        </div>
      </section>

      {/* Clean reading experience */}
      <section className="px-6 py-12 sm:py-16 border-t border-border">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold mb-6">A clean, distraction-free reading experience</h2>
          <div className="space-y-4 text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed">
            <p>
              Tap an article and it opens in a simple, text-first reading view.
            </p>
            <div className="space-y-1">
              <p>No pop-ups.</p>
              <p>No autoplay videos.</p>
              <p>No layout jumping.</p>
            </div>
            <p>
              Just the article, formatted to be readable on your phone.
            </p>
            <p className="text-zinc-500 dark:text-zinc-400">
              You can always open the original article if you want the full site experience.
            </p>
          </div>
        </div>
      </section>

      {/* Free to use. No ads. */}
      <section className="px-6 py-12 sm:py-16 border-t border-border">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold mb-6">Free to use. No ads.</h2>
          <div className="space-y-4 text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed">
            <p>
              Suns Reader is free and does not run ads.
            </p>
            <p>
              It was built as a personal project by a Suns fan who wanted a calmer way to read — not as an ad platform or a data grab.
            </p>
            <div className="space-y-1">
              <p>No sign-ups.</p>
              <p>No catch.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Use it like an app */}
      <section className="px-6 py-12 sm:py-16 border-t border-border">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold mb-6">Use it like an app</h2>
          <div className="space-y-6 text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed">
            <p>
              Suns Reader works in your browser and can be added to your home screen.
            </p>

            {/* iPhone instructions */}
            <div>
              <h3 className="text-base font-semibold text-foreground mb-3">iPhone (Safari)</h3>
              <ol className="list-decimal list-inside space-y-2 ml-2">
                <li>Open Suns Reader in Safari</li>
                <li>Tap Share</li>
                <li>Tap Add to Home Screen</li>
              </ol>
            </div>

            {/* Android instructions */}
            <div>
              <h3 className="text-base font-semibold text-foreground mb-3">Android (Chrome)</h3>
              <ol className="list-decimal list-inside space-y-2 ml-2">
                <li>Open Suns Reader in Chrome</li>
                <li>Tap the ⋮ menu</li>
                <li>Tap Add to Home screen</li>
              </ol>
            </div>

            <p>
              Once installed, Suns Reader launches full-screen and behaves like a native app — without the App Store.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-12 sm:py-16 border-t border-border">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold mb-8">Frequently asked questions</h2>
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-medium text-foreground mb-2">Is Suns Reader free?</h3>
              <p className="text-zinc-600 dark:text-zinc-300">
                Yes. Suns Reader is free to use and does not show ads.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-foreground mb-2">Where does the content come from?</h3>
              <p className="text-zinc-600 dark:text-zinc-300">
                Suns Reader brings together recent articles published around the web by existing outlets. All articles are clearly attributed, with links to original sources.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-foreground mb-2">Does Suns Reader replace the original websites?</h3>
              <p className="text-zinc-600 dark:text-zinc-300">
                No. Suns Reader is a reading tool. You can open the original article at any time.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-foreground mb-2">Do I need to install anything?</h3>
              <p className="text-zinc-600 dark:text-zinc-300">
                No. You can use Suns Reader directly in your browser. Installing it is optional.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-foreground mb-2">Is this an official Phoenix Suns app?</h3>
              <p className="text-zinc-600 dark:text-zinc-300">
                No. Suns Reader is an independent project built by a fan, for fans.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-16 sm:py-24 border-t border-border text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold mb-4">Start reading</h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-300 mb-8">
            If you follow the Suns and are tired of the noise, Suns Reader is built for you.
          </p>
          <Link
            href="/"
            className="inline-block px-8 py-4 bg-accent text-white font-medium rounded-lg hover:opacity-90 active:opacity-80 transition-opacity"
          >
            Open Suns Reader
          </Link>
        </div>
      </section>

      {/* Footer spacing */}
      <div className="h-8" />
    </div>
  );
}
