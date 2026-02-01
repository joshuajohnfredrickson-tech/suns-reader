'use client';

import { useEffect, useState, useRef, ReactNode, Suspense } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';

interface ComputedStyles {
  h2LineHeight: string;
  subheadMarginTop: string;
  subheadLineHeight: string;
  bodyMarginTop: string;
  ctaMarginTop: string | null;
}

interface SectionMeasurements {
  sectionName: string;
  gapA: number; // subhead top - h2 bottom
  gapB: number; // body top - subhead bottom
  gapC: number | null; // cta top - body bottom (if CTA exists)
  computed: ComputedStyles;
}

interface HomeDebugClientProps {
  children: ReactNode;
  buildId: string;
}

// Inner component that uses useSearchParams (requires Suspense)
function HomeDebugInner({ children, buildId }: HomeDebugClientProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [measurements, setMeasurements] = useState<SectionMeasurements[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const isDebug = searchParams.get('debug') === '1';

  useEffect(() => {
    if (!isDebug || !containerRef.current) return;

    const measure = () => {
      const sections = containerRef.current?.querySelectorAll('[data-debug-section]');
      if (!sections) return;

      const newMeasurements: SectionMeasurements[] = [];

      sections.forEach((section) => {
        const sectionName = section.getAttribute('data-debug-section') || 'unknown';
        const h2 = section.querySelector('[data-debug-h2]') as HTMLElement | null;
        const subhead = section.querySelector('[data-debug-subhead]') as HTMLElement | null;
        const body = section.querySelector('[data-debug-body]') as HTMLElement | null;
        const cta = section.querySelector('[data-debug-cta]') as HTMLElement | null;

        let gapA = 0;
        let gapB = 0;
        let gapC: number | null = null;

        // Get computed styles
        const h2Styles = h2 ? window.getComputedStyle(h2) : null;
        const subheadStyles = subhead ? window.getComputedStyle(subhead) : null;
        const bodyStyles = body ? window.getComputedStyle(body) : null;
        const ctaStyles = cta ? window.getComputedStyle(cta) : null;

        const computed: ComputedStyles = {
          h2LineHeight: h2Styles?.lineHeight || 'n/a',
          subheadMarginTop: subheadStyles?.marginTop || 'n/a',
          subheadLineHeight: subheadStyles?.lineHeight || 'n/a',
          bodyMarginTop: bodyStyles?.marginTop || 'n/a',
          ctaMarginTop: ctaStyles?.marginTop || null,
        };

        if (h2 && subhead) {
          const h2Rect = h2.getBoundingClientRect();
          const subheadRect = subhead.getBoundingClientRect();
          gapA = Math.round(subheadRect.top - h2Rect.bottom);
        }

        if (subhead && body) {
          const subheadRect = subhead.getBoundingClientRect();
          const bodyRect = body.getBoundingClientRect();
          gapB = Math.round(bodyRect.top - subheadRect.bottom);
        } else if (h2 && body) {
          const h2Rect = h2.getBoundingClientRect();
          const bodyRect = body.getBoundingClientRect();
          gapB = Math.round(bodyRect.top - h2Rect.bottom);
        }

        if (cta && body) {
          const bodyRect = body.getBoundingClientRect();
          const ctaRect = cta.getBoundingClientRect();
          gapC = Math.round(ctaRect.top - bodyRect.bottom);
        }

        newMeasurements.push({ sectionName, gapA, gapB, gapC, computed });
      });

      setMeasurements(newMeasurements);
    };

    // Initial measure after a brief delay for layout
    const timer = setTimeout(measure, 100);

    // Re-measure on resize
    window.addEventListener('resize', measure);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', measure);
    };
  }, [isDebug]);

  // Add debug outlines via CSS when debug mode is active
  useEffect(() => {
    if (!isDebug) return;

    const style = document.createElement('style');
    style.id = 'home-debug-styles';
    style.textContent = `
      [data-debug-section] { outline: 2px dashed #ef4444 !important; outline-offset: 2px; }
      [data-debug-h2] { outline: 2px solid #3b82f6 !important; }
      [data-debug-subhead] { outline: 2px solid #22c55e !important; }
      [data-debug-body] { outline: 2px solid #eab308 !important; }
      [data-debug-cta] { outline: 2px solid #a855f7 !important; }
      [data-debug-cards] { outline: 2px solid #ec4899 !important; }
    `;
    document.head.appendChild(style);

    return () => {
      const existingStyle = document.getElementById('home-debug-styles');
      if (existingStyle) existingStyle.remove();
    };
  }, [isDebug]);

  return (
    <div ref={containerRef}>
      {children}

      {/* Debug overlay */}
      {isDebug && (
        <div className="fixed bottom-2 left-2 z-50 max-w-[340px] max-h-[60vh] overflow-auto bg-black/90 text-white text-[10px] font-mono p-3 rounded-lg shadow-lg">
          <div className="space-y-2">
            {/* Build info */}
            <div className="border-b border-white/20 pb-2">
              <div><span className="text-zinc-400">build:</span> {buildId}</div>
              <div><span className="text-zinc-400">path:</span> {pathname}{searchParams.toString() ? `?${searchParams.toString()}` : ''}</div>
            </div>

            {/* Color legend */}
            <div className="border-b border-white/20 pb-2 space-y-0.5">
              <div className="text-zinc-400 mb-1">Outlines:</div>
              <div><span className="inline-block w-3 h-2 bg-red-500 mr-1"></span>section</div>
              <div><span className="inline-block w-3 h-2 bg-blue-500 mr-1"></span>h2</div>
              <div><span className="inline-block w-3 h-2 bg-green-500 mr-1"></span>subhead</div>
              <div><span className="inline-block w-3 h-2 bg-yellow-500 mr-1"></span>body</div>
              <div><span className="inline-block w-3 h-2 bg-purple-500 mr-1"></span>cta</div>
              <div><span className="inline-block w-3 h-2 bg-pink-500 mr-1"></span>cards</div>
            </div>

            {/* Measurements */}
            <div className="space-y-3">
              <div className="text-zinc-400">Gaps & Computed Styles:</div>
              {measurements.map((m, i) => (
                <div key={i} className="pl-2 border-l border-white/20 space-y-1">
                  <div className="text-zinc-300 font-medium">{m.sectionName}</div>

                  {/* Gap measurements */}
                  <div className="text-zinc-500">Gaps:</div>
                  <div className="pl-2">
                    <div>A (h2→sub): <span className="text-blue-400">{m.gapA}px</span></div>
                    <div>B (sub→body): <span className="text-yellow-400">{m.gapB}px</span></div>
                    {m.gapC !== null && (
                      <div>C (body→cta): <span className="text-purple-400">{m.gapC}px</span></div>
                    )}
                  </div>

                  {/* Computed styles */}
                  <div className="text-zinc-500">Computed:</div>
                  <div className="pl-2 text-[9px]">
                    <div>h2 lh: <span className="text-cyan-400">{m.computed.h2LineHeight}</span></div>
                    <div>sub mt: <span className="text-green-400">{m.computed.subheadMarginTop}</span></div>
                    <div>sub lh: <span className="text-cyan-400">{m.computed.subheadLineHeight}</span></div>
                    <div>body mt: <span className="text-yellow-400">{m.computed.bodyMarginTop}</span></div>
                    {m.computed.ctaMarginTop && (
                      <div>cta mt: <span className="text-purple-400">{m.computed.ctaMarginTop}</span></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Outer component with Suspense boundary
export function HomeDebugClient({ children, buildId }: HomeDebugClientProps) {
  return (
    <Suspense fallback={<div>{children}</div>}>
      <HomeDebugInner buildId={buildId}>{children}</HomeDebugInner>
    </Suspense>
  );
}
