# Motion guidelines

RE:REASON uses three animation layers. They are not interchangeable, and the
boundaries between them matter more than any individual effect.

| Layer | Owns | Loads |
| --- | --- | --- |
| **CSS** (`src/styles/global.css`, component `<style>`) | The hero's staggered entrance. Hover, focus, active and disabled feedback. Ambient and end-state effects. Reduced-motion and no-JS fallbacks. Everything in sections B and E. | Always — it is the stylesheet |
| **Anime.js** (`animejs`, 4.x) | The state lattice in section C: staged reveals, the marker progression, the per-column build, and the end-state handover. Sequences that synchronise many elements on one timeline. | Only on pages that include `components/motion/StateLattice.astro` |
| **Motion for React** (`motion/react`, 14.x) | The findings island in section D: the shared-layout filter indicator, list reflow, and card entrance/exit. | Only when that island hydrates |

The dividing question is not "how complex is the effect" but **what kind of
thing is being animated**:

- Governing a *document* — CSS first. If it needs a coordinated timeline across
  many elements or SVG, Anime.js. Anime.js works on Astro-rendered HTML and SVG
  and needs no framework wrapper.
- Governing an *interface* — Motion for React, inside a hydrated island.

A short staggered entrance is not a reason to ship a timeline library. That is
why the hero is CSS.

## Ownership rules

1. **One owner per property.** A given property (`opacity`, `transform`, `fill`,
   `stroke-dashoffset`, …) on a given element must be animated by exactly one
   layer at a time. Two layers writing the same property on the same element is
   the failure mode this document exists to prevent.

2. **Do not animate what CSS already handles.** The hero entrance, hover
   colours, focus rings and simple fades are plain CSS. Never introduce
   JavaScript for those.

3. **Hand over explicitly, and switch elements or properties.** When one layer
   must follow another, the handover is an attribute or a class, never a shared
   property. Two current examples:
   - The lattice timeline sets `data-ready` when it finishes; CSS then recolours
     the writes at the final step. Anime.js owns `opacity`/`scale`, CSS owns
     `fill` — different properties, so the handover cannot race.
   - A CSS keyframe animation outranks inline styles, so a CSS animation and an
     inline-style tween on the *same* property silently fight. Avoid by design.

4. **Name things after what they are.** Animation code lives in components named
   for what they animate, and targets are selected with data attributes that
   describe their role (`data-reveal="cell"`, `data-lattice-marker`), not with
   structural selectors.

5. **No global animation manager.** There is no registry, bus or controller.
   Each component constructs its own timeline and tears it down itself.

6. **No scroll hijacking.** Smooth scrolling is opt-in
   (`prefers-reduced-motion: no-preference`). Nothing takes over the wheel, pins
   the page, or blocks normal navigation. The only scroll-aware behaviour is an
   `IntersectionObserver` that starts a timeline once.

## The pre-hidden reveal mechanism

Animation usually needs elements to start hidden, but hiding them in CSS breaks
the page when JavaScript never runs. The mechanism that resolves this:

1. `src/layouts/BaseLayout.astro` sets `data-anim="on"` on `<html>` from a small
   **inline, render-blocking** script in `<head>`. It is inline deliberately: a
   bundled module is deferred and would run after first paint, which is exactly
   the flash we are removing.
2. `global.css` only pre-hides while that flag is present:

   ```css
   [data-anim='on'] [data-reveal] {
     opacity: 0;
   }
   ```

3. The script also arms a failsafe. If `data-anim-ready` is not set within
   1800 ms, it removes `data-anim` and every `[data-reveal]` element becomes
   visible again.
4. Each animation module sets `data-anim-ready="true"` as soon as it takes
   ownership, disarming the failsafe. If it arrives *after* the failsafe already
   fired, it detects that `data-anim` is gone and adopts the finished state
   instead of re-hiding the content.
5. Scripted layers write inline styles for `opacity`, and inline styles outrank
   the `[data-anim='on'] [data-reveal]` rule, so the two mechanisms do not
   conflict.

Result:

| Situation | What the visitor sees |
| --- | --- |
| JavaScript disabled | Everything visible. The flag is never set. |
| JavaScript enabled, animation module fails or is blocked | Content flashes in at worst 1.8 s later. Nothing is stranded invisible. |
| Reduced motion | The flag is never set; scripts skip building timelines entirely. |
| Normal | No flash, because pre-hiding happened before first paint. |

Any element carrying `data-reveal` **must** be animated by the component that
hides it. An unanimated `data-reveal` element stays invisible until the failsafe
fires — treat that as a bug.

### The CSS-owned entrance

`data-reveal="enter"` is a variant: the same gate, but the entrance is a CSS
animation (`enter-rise`) rather than a scripted timeline, staggered with
`--enter-delay`:

```html
<p data-reveal="enter" style="--enter-delay: 90ms">…</p>
```

Nothing scripted touches these elements, so the hero costs no JavaScript.

**The hero headline is deliberately excluded from both mechanisms.** It is the
largest contentful paint. It renders on the first frame, and the sequence builds
around it rather than delaying it.

## Reduced motion

Three independent defences, because any one of them can be bypassed:

1. `BaseLayout` does not set `data-anim` under `prefers-reduced-motion: reduce`,
   so nothing is pre-hidden.
2. `global.css` forces `[data-reveal]` back to `opacity: 1` under the same query,
   and collapses all CSS animation/transition durations to a single frame.
3. Scripts check `matchMedia('(prefers-reduced-motion: reduce)')` before building
   anything:
   - `StateLattice.astro` returns before constructing a timeline. The grid
     renders complete in its finished state: `--color-cell` marks are visible and
     the committed writes carry the accent, because the accent rule keys off the
     *absence* of `data-anim` rather than off the timeline's completion
     attribute. The step markers stay hidden, since "current step" is meaningless
     when nothing is running.
   - `Findings.tsx` uses `useReducedMotion()` to replace the layout spring and
     card transitions with zero-duration changes.

The rule for new work: under reduced motion the page must be *complete and
still*, not merely faster. A diagram whose end state carries meaning must show
that end state when it is not being animated.

## Layout of animation code

| Path | Holds |
| --- | --- |
| `src/components/sections/` | Page sections. A section owns its own animation only when the animation is CSS-only (Hero, Premise, Access). |
| `src/components/motion/` | Anything that needs a script to animate: the Anime.js lattice and the Motion for React island. |

Prefer the section component when CSS can do the job; promote to
`components/motion/` only when a timeline or hydrated state is genuinely
required.

## Hydration

- Use `.astro` components by default. They ship no JavaScript.
- Use React only when state, gestures or Motion for React justify it. There is
  exactly one React island on the site.
- Choose the directive deliberately:
  - `client:visible` — the island is hydrated when it approaches the viewport,
    so its JavaScript is not in the critical path.
  - `client:load` — only when the interaction must be available immediately.
- Hydrate islands, never the page. There is no React root wrapping the document.
- The island's default state must be the complete one. `Findings` opens on
  "All", so the server-rendered HTML contains every finding and the section is
  whole without JavaScript.

## Performance rules

- Prefer `transform` and `opacity`. They are compositor properties.
- Avoid continuous layout recalculation. Nothing here animates `width`, `height`
  or position on a loop. `layout="position"` is used for the findings list
  precisely because it avoids size interpolation on text.
- Avoid unnecessary animation loops. Nothing loops. The lattice plays once and
  settles; the last marker stays lit as a static end state.
- Reserve space for visual elements so animation does not shift layout.
  Pre-hidden elements use `opacity` only, which never affects layout.
- Keep animation libraries off pages that do not use them. The Anime.js chunk is
  loaded by the component that needs it; the React and Motion chunks load only
  when the island hydrates.
- Lazy-start sequences below the fold: `StateLattice.astro` builds its timeline
  once and plays it from an `IntersectionObserver`.
- The hero's entrance is CSS, so nothing blocks the first paint.

## Adding a new animation

1. Decide which layer owns it, using the dividing question above. Try CSS first.
2. Put it in `src/components/motion/` if it needs a script; otherwise in the
   section component.
3. Mark animated elements with `data-reveal="<role>"` if they must be pre-hidden,
   and give them a class for styling — keep the two concerns separate.
4. Construct the animation in that component's `<script>` (Anime.js) or inside
   the island (Motion for React), and return a teardown.
5. Dispose in dev through `import.meta.hot.dispose()` so hot reloads do not stack
   timelines on the same elements.
6. Verify with reduced motion enabled, with JavaScript disabled, and at 390px.
