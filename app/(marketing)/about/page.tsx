export const metadata = {
  title: 'About - Suns Reader',
  description: 'Learn about Suns Reader, a free news aggregator for Phoenix Suns fans.',
};

const SUPPORT_URL = 'https://buymeacoffee.com/sunsreader';

function SupportCta() {
  return (
    <a
      href={SUPPORT_URL}
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
  );
}

export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto px-6">
      {/* Page Header */}
      <header className="pt-6 sm:pt-8">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-7 sm:mb-10">About Suns Reader</h1>
      </header>

      {/* Content sections */}
      <div className="flex flex-col gap-7 sm:gap-10">
        {/* Section: Built by a Suns fan */}
        <section>
          <h2 className="text-2xl font-semibold tracking-tight leading-[1.15] text-foreground">Built by a Suns fan</h2>
          <div className="mt-4 space-y-3.5 text-base leading-[1.6] text-foreground">
            <p>
              Suns Reader started as a personal project by a Phoenix Suns fan who wanted an easier way to keep up with the team.
            </p>
            <p>
              Like a lot of fans, I found myself bouncing between search results, podcasts, YouTube, and different sites just to see what was new. All the coverage was out there — it just wasn't easy to follow in one place.
            </p>
            <p>
              So I built something to fix that for myself... and decided to share it with other Suns fans too.
            </p>
            <SupportCta />
          </div>
        </section>

        {/* Section: The idea behind Suns Reader */}
        <section>
          <h2 className="text-2xl font-semibold tracking-tight leading-[1.15] text-foreground">The idea behind Suns Reader</h2>
          <div className="mt-4 space-y-3.5 text-base leading-[1.6] text-foreground">
            <p>
              Suns Reader isn't trying to replace news sites or creators. The goal is to make following Suns coverage easier and more enjoyable — bringing articles and videos together in one place — and making them nicer to read and simpler to watch.
            </p>
            <p>
              Less time hunting across sites and apps, more time enjoying Suns coverage.
            </p>
          </div>
        </section>

        {/* Section: An independent fan project */}
        <section>
          <h2 className="text-2xl font-semibold tracking-tight leading-[1.15] text-foreground">An independent fan project</h2>
          <div className="mt-4 space-y-3.5 text-base leading-[1.6] text-foreground">
            <p>
              Suns Reader isn't run by a media company or advertising network. It's an independent side project built and maintained by one Suns fan.
            </p>
            <p>
              There are no ads, no accounts to create, and no data being sold. The goal isn't to build a media business — just to make something useful for the Suns community.
            </p>
          </div>
        </section>

        {/* Section: Supporting the project */}
        <section>
          <h2 className="text-2xl font-semibold tracking-tight leading-[1.15] text-foreground">Supporting the project</h2>
          <div className="mt-4 space-y-3.5 text-base leading-[1.6] text-foreground">
            <p>
              Running Suns Reader does come with hosting and infrastructure costs, so the app is supported by optional contributions from fans who enjoy using it.
            </p>
            <p>
              If Suns Reader adds value for you, consider chipping in to help cover those costs.
            </p>
            <SupportCta />
          </div>
        </section>

        {/* Section: Looking ahead */}
        <section>
          <h2 className="text-2xl font-semibold tracking-tight leading-[1.15] text-foreground">Looking ahead</h2>
          <div className="mt-4 space-y-3.5 text-base leading-[1.6] text-foreground">
            <p>
              Suns Reader will continue improving over time based on what fans find useful and enjoyable, with the focus staying the same: keep it simple, fast, and make it easier to keep up with the Phoenix Suns.
            </p>
            <p>
              And of course... Go Suns!
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
