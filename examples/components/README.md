# Motion components

Ready-made slide pieces with motion, written in the same HTML/CSS that Lawnak Vision slides use.
Each file is one component you can watch on its own and copy into a slide.

Open `index.html` to see them all playing at once (from the project folder: `python -m http.server 5178 --directory examples`,
then go to <http://localhost:5178/components/>). Opening a file directly by double-clicking also works.

| Component | What it does | Good for |
|---|---|---|
| [`kinetic-title`](kinetic-title.html) | Headline words rise out of a mask one by one; a highlight bar sweeps behind the key word | Title and section slides |
| [`ring-stats`](ring-stats.html) | Three progress rings draw themselves while the number inside counts up | Survey results, percentages, KPIs |
| [`timeline-draw`](timeline-draw.html) | A line draws across; each milestone pops in as the line reaches it; the last one pulses | History, roadmap, process steps |
| [`marquee-band`](marquee-band.html) | Two tilted bands of keywords loop in opposite directions | Feature lists, clients, closing slides |
| [`card-fan`](card-fan.html) | A stack of three cards fans out, then floats; hovering a card lifts it | Pricing plans, three options, team |

## In the app

All five are in the app's component gallery, so the AI inside Lawnak Vision can find them (`list_components`), look at
them (`view_components`) and copy them into a deck by itself. `src/shared/catalog.ts` reads each file at build time and
takes the part between the `COMPONENT` markers, so this folder is the only copy: edit a file here and the app's gallery
follows on the next build.

To add a new component to the gallery, add its file here and one entry to `FILE_COMPONENTS` in `src/shared/catalog.ts`
(an import, an id that matches the markers, a category and one line on when to use it).

## Using a component

### With an AI assistant (any AI that can read the project)

Name the component and say what to change. The AI reads the file and copies it:

> Use `examples/components/timeline-draw.html` on slide 4, with these 5 milestones: …

> Make a new component like `card-fan` but with 4 cards in a row.

### By hand, in the app

1. Open the file in a text editor.
2. Copy everything between `<!-- COMPONENT name: copy from here -->` and `<!-- /COMPONENT name -->`.
   That is one `<style>` block plus the markup.
3. In Lawnak Vision, open the slide's **Code** tab and paste it into the slide HTML.
4. Change the text. Keep the class names.

Everything outside the markers (`_preview/`, the toolbar, the `<section>`) is only for previewing here. The app already
provides all of it.

## How these components are built

Follow the same rules when you add one, or ask the AI to follow them. They are what make a component work in every
place the app shows a slide.

- **Start on the slide's own signal.** Animations only run under `.slide:is(.active,.lv-leave)`: the app adds `active`
  while the slide is on screen, so the motion replays every time you arrive at the slide. A script, if needed, listens
  for the `slideenter` event on the slide's `<section>`.
- **The resting state is the final state.** Write the finished look as the normal CSS, and put only the starting
  position in `@keyframes … { from { … } }` with `animation-fill-mode: both`. Thumbnails and PDF export
  (`html.lv-static`) jump every animation to its last frame, so the slide shows finished, not empty. Check it
  with the **Static** button.
- **Prefer real elements for moving parts.** A small element such as the `<i class="cx-kt-hl">` in
  `kinetic-title` is easier to restyle and to time than a `::before` or `::after`.
- **Theme colors only.** Use `var(--accent)`, `--fg`, `--muted`, `--surface`, `--border`, `--bg-solid`, `--accent-fg`,
  `--good`, `--bad`, `--font`, `--heading-font`. Then the component follows whichever theme the deck uses. Check it
  with the **Light** button.
- **Prefix everything with `cx-`.** Class names, keyframes and custom properties (`--cx-i`, `--cx-p`…). The app
  already uses `lv-`, `fx-`, `fx3-` and `fxp-`, and it sets `--i` on every element in a slide by itself, so
  never rely on a plain `--i`.
- **Right-to-left.** Use logical CSS (`inset-inline`, `padding-inline`, `margin-inline`) and `:dir(rtl)` for anything
  that has a direction (a line that draws, a band that scrolls). Animate whole words, never single letters, so Arabic
  letters stay joined. Check it with the **RTL** button.
- **Reduced motion.** End the style block with `@media (prefers-reduced-motion: reduce)` that turns the animations off.
- **Numbers that count** use the app's own `data-count` attribute (with `--d` for the delay). No script needed.
- **Content that crosses the slide edge on purpose** (a scrolling band, a bleed) confuses the app's automatic layout
  check, which then tells the AI the text is cut off. Add the component's outer class to the `WIDGET` list in
  `src/main/render.ts`, as `.cx-mq` is, so the check treats it as one block.

## Motion vocabulary

Use these words and numbers when asking the AI for motion. A screenshot cannot show movement, so describe it.

| | Value | When |
|---|---|---|
| Easing, entrances | `var(--lv-ease)` = `cubic-bezier(.22,1,.36,1)` | Things arriving: fast start, soft landing |
| Easing, sweeps | `cubic-bezier(.77,0,.18,1)` | Bars and wipes that cross the screen |
| Easing, pops | `cubic-bezier(.34,1.56,.64,1)` | Dots and badges that overshoot a little |
| Entrance length | 0.6 s – 1 s | Most elements |
| Stagger | 80 – 150 ms between items | Words, cards, list items |
| Whole slide settled by | ~2 s | After that only gentle loops (floats, pulses, marquees) |

Example request: *"The title rises 40px and fades in over 0.8s with ease-out, then the three cards follow, 120ms
apart, and after that they float up and down 12px every 5 seconds."*

## Adding components from other sites

Sites like 21st.dev, Magic UI, Aceternity UI and uiverse.io mostly give React + Tailwind or Framer Motion code.
Slides are plain HTML and CSS, so the code needs converting:

1. Copy the component's code (or its page link) into the chat with your AI assistant.
2. Ask: *"Turn this into a component in `examples/components/` following the README: plain HTML and CSS, `cx-` prefix,
   theme variables, works in static mode and RTL."*
3. Open the new file, press **Replay**, **Light**, **RTL** and **Static**, and add a line to the table above, to
   the list in `index.html` and to `FILE_COMPONENTS` in `src/shared/catalog.ts`.
