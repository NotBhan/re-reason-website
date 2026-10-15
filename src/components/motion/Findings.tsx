import type { Transition } from 'motion/react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useMemo, useState } from 'react';
import type { Finding, FindingStatus } from '@/content/home';
import { FINDING_STATUS_LABELS } from '@/content/home';
import { repoBlob } from '@/lib/site';

// ===========================================================================
// MOTION FOR REACT LAYER — interface-level animation
// ---------------------------------------------------------------------------
// Motion owns this island and nothing outside it:
//   • the shared-layout indicator that slides between status filters
//   • the reflow of the list when the filter changes (layout="position")
//   • the entrance and exit of individual findings
//
// The status pill colours and the hover states on links are plain CSS — Motion
// is not asked to do work the stylesheet already handles. See
// docs/motion-guidelines.md.
//
// Progressive enhancement: the default filter is "All", so the server-rendered
// HTML contains every finding and the section is complete without JavaScript.
// Filtering is an enhancement on top of that.
// ===========================================================================

type FilterId = 'all' | FindingStatus;

const FILTERS: ReadonlyArray<{ id: FilterId; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'established', label: FINDING_STATUS_LABELS.established },
  { id: 'current', label: FINDING_STATUS_LABELS.current },
  { id: 'open', label: FINDING_STATUS_LABELS.open },
  { id: 'not-adopted', label: FINDING_STATUS_LABELS['not-adopted'] },
];

/** Status colours are CSS-owned; only the pill text differs. */
const STATUS_CLASS: Record<FindingStatus, string> = {
  established: 'border-line-hi text-bone',
  current: 'border-signal text-signal',
  open: 'border-line-hi text-ash',
  'not-adopted': 'border-line-hi text-ash-dim',
};

const INSTANT: Transition = { duration: 0 };
const PILL_SPRING: Transition = { type: 'spring', stiffness: 420, damping: 34 };
const CARD_TRANSITION: Transition = { duration: 0.22, ease: 'easeOut' };

interface Props {
  findings: ReadonlyArray<Finding>;
}

export default function Findings({ findings }: Props) {
  const [filter, setFilter] = useState<FilterId>('all');
  const reduceMotion = useReducedMotion() === true;

  const visible = useMemo(
    () => (filter === 'all' ? findings : findings.filter((finding) => finding.status === filter)),
    [filter, findings],
  );

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter findings by status">
        {FILTERS.map((entry) => {
          const isActive = entry.id === filter;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => setFilter(entry.id)}
              aria-pressed={isActive}
              className="relative border border-line px-3 py-2 transition-colors duration-200 ease-out hover:border-control"
            >
              {isActive && (
                <motion.span
                  layoutId="finding-filter-indicator"
                  className="absolute inset-0 bg-surface-hi"
                  transition={reduceMotion ? INSTANT : PILL_SPRING}
                  aria-hidden="true"
                />
              )}
              <span
                className={`label relative ${isActive ? 'text-bone' : 'text-ash-dim'}`}
              >
                {entry.label}
              </span>
            </button>
          );
        })}
      </div>

      <p aria-live="polite" className="label mt-5 text-ash-dim">
        {visible.length} of {findings.length} findings
      </p>

      <ul className="mt-8">
        <AnimatePresence initial={false}>
          {visible.map((finding) => (
            <motion.li
              key={finding.id}
              layout={reduceMotion ? false : 'position'}
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0 }}
              transition={reduceMotion ? INSTANT : CARD_TRANSITION}
              className="border-t border-line last:border-b"
            >
              <article className="grid gap-5 py-8 sm:grid-cols-[9rem_1fr] sm:gap-x-10">
                <span
                  className={`label h-fit w-fit border px-2 py-1 ${STATUS_CLASS[finding.status]}`}
                >
                  {FINDING_STATUS_LABELS[finding.status]}
                </span>

                <div>
                  <h4 className="font-display text-lead font-medium text-bone">{finding.title}</h4>
                  <p className="measure mt-3 text-body text-ash">{finding.detail}</p>

                  <dl className="mt-6 grid gap-x-10 gap-y-5 border-t border-line pt-5 sm:grid-cols-2">
                    <div>
                      <dt className="label text-ash-dim">Establishes</dt>
                      <dd className="mt-2 text-caption text-ash">{finding.establishes}</dd>
                    </div>
                    <div>
                      <dt className="label text-signal">Does not establish</dt>
                      <dd className="mt-2 text-caption text-ash">{finding.doesNotEstablish}</dd>
                    </div>
                  </dl>

                  <p className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
                    {finding.sources.map((source) => (
                      <a
                        key={source.path}
                        href={repoBlob(source.path)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mono text-ash-dim underline decoration-line-hi underline-offset-4 transition-colors duration-200 ease-out [overflow-wrap:anywhere] hover:text-bone hover:decoration-signal"
                      >
                        {source.label}
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    ))}
                  </p>
                </div>
              </article>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
