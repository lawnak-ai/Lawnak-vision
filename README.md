# Lawnak Vision

A desktop app for building slide decks with AI.
Describe what you want to present, and the AI (Claude, GPT, Gemini, DeepSeek, Grok or any OpenAI-compatible model) designs the slides live as HTML, CSS and JavaScript.
Then edit them by hand or by chatting, present them full screen, or open them in any web browser.

Built with **Electron + TypeScript + React**.

![Home screen](docs/home.png)

![Slide editor with the AI assistant](docs/editor.png)

## Features

- **AI slide generation**: type a prompt ("a pitch deck for a coffee shop", "teach photosynthesis with a quiz") and watch slides appear one by one.
- **Chat to edit**: ask for changes to the whole deck or to one slide ("make slide 3 a timeline", "translate to Arabic").
- **Slides are HTML + JavaScript**: every slide is a 1280×720 HTML canvas. Slides can run scripts for quizzes, counters or live charts.
- **Edit by hand**: one Code tab with the slide HTML, deck CSS and speaker notes side by side with a live preview.
- **Present in the app**: full-screen presenter with arrow keys, click, touch swipe and speaker notes (`N`).
- **Open in browser**: the deck becomes one self-contained `.html` file that works in any browser, offline.
- **Export**: HTML file or PDF (one slide per page).
- **Projects, history, templates and themes**: organise decks in a sidebar.
- **Right-to-left support**: Arabic and other RTL languages render correctly.

## Promo videos

On the home screen, switch from **Presentation** to **Video**, pick a size and describe the ad. The AI designs it as
motion-graphics scenes (kinetic type, animated backgrounds, big numbers, a closing call to action), each with its own
length in seconds.

- **Sizes**: Landscape 16:9 (1920×1080), Vertical 9:16 for Reels / TikTok / Shorts (1080×1920), Square 1:1 (1080×1080).
  Change it later from the editor's top bar, then ask the AI to "fit the size".
- **Scenes**: each slide is a scene. Set its length in the seconds box above the stage (1–20 s, default 3.5 s).
- **Music**: *Add music* in the top bar takes an MP3, WAV, M4A, AAC, OGG, OPUS or FLAC file. It is copied into the app,
  loops if it is shorter than the video and fades out at the end. Set the volume from the same menu.
- **Play** (F5) plays the video in a window of its own shape, with the music. Space pauses, R restarts, F goes full screen.
- **Export → Video** (Ctrl+Shift+E) saves an MP4 (H.264 + AAC, 30 fps). Where the computer can't encode H.264 it saves
  WebM (VP9 + Opus) instead.

Export plays the scenes in a hidden window on a virtual clock and records them frame by frame, so every animation lands
exactly on time however fast the computer is (about a minute for a 30-second video). Encoding uses the browser's
WebCodecs through [Mediabunny](https://mediabunny.dev). The code is in `src/shared/video.ts` (sizes, timing, the virtual
clock), `src/main/video.ts` (recording, music files) and `src/renderer/src/videoExport.ts` (encoding).

## Getting started

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev        # start the app with hot reload
```

Then open **Settings** in the app, pick an AI provider and paste its API key. Each key is encrypted with your system keychain.
You can also set the key in the environment instead (see [AI providers](#ai-providers)).

Without a key you can still use the **Templates** and edit slides by hand.

> **Using WSL?** Electron needs a display. On Windows 11, WSLg usually works out of the box. If the window does not appear,
> clone the repo on the Windows side and run `npm install` and `npm run dev` from PowerShell.

### Other commands

```bash
npm run build      # type check and build into out/
npm start          # run the built app
npm test           # unit tests
npm run dist       # package an installer into release/ for the current OS
npx electron-builder --win   # Windows installer: release/LawnakVision-Setup-<version>.exe
```

Building the Windows installer on Linux needs Wine with 32-bit support
(`sudo dpkg --add-architecture i386 && sudo apt install wine wine64 wine32:i386`).
On Windows, `npm run dist` builds it directly.

## Releasing

The **Build and release** GitHub Actions workflow (`.github/workflows/release.yml`) builds the Windows installer
on a Windows runner and publishes it on the repo's **Releases** page. There are two ways to release:

- **From the Actions tab (no command line):** open **Actions → Build and release → Run workflow**, enter a version
  such as `0.2.0`, and click **Run workflow**. It creates the `v0.2.0` tag and the release for you.
- **By pushing a tag:**
  ```bash
  git tag v0.2.0
  git push origin v0.2.0
  ```

Either way the workflow sets the app version, runs the type check and tests, builds
`LawnakVision-Setup-0.2.0.exe`, and publishes it with auto-generated release notes.
Running it without a version, and every pull request, only builds: the installer is kept as a downloadable
build artifact and nothing is published.

Each version can only be released once: if the tag already exists (Run workflow) or the release already has an
installer, the workflow stops with an error before building. A release you create on GitHub's website
(**Releases → Draft a new release** with a new `v…` tag) gets its installer attached automatically.

## Keyboard shortcuts

| Where | Keys | Action |
|---|---|---|
| App | `Ctrl+N` | New presentation |
| App | `F5` | Present from the selected slide |
| App | `Ctrl+B` | Open in browser |
| App | `Ctrl+E` / `Ctrl+P` | Export HTML / PDF |
| App | `Ctrl+\` | Toggle sidebar |
| App | `Enter` / `Shift+Enter` | Send prompt / new line |
| Presenting | `→` `Space` `PageDown` / `←` `PageUp` | Next / previous slide |
| Presenting | `F` | Full screen (browser) |
| Presenting | `N` | Show speaker notes |
| Presenting | `Esc` | Leave the presentation |

## How slides work

A deck is a list of slides. Each slide is the inner HTML of a `<section class="slide">` that is always 1280×720 and is
scaled to fit the screen. Themes set CSS variables (`--bg`, `--fg`, `--accent`, `--surface`, …), and a few helper classes
make good layouts easy:

| Class | Use |
|---|---|
| `center` (on the slide) | Center everything, for title and section slides |
| `rtl` (on the slide) | Right-to-left text |
| `kicker`, `lead` | Small label above a heading, large subtitle |
| `grid-2`, `grid-3`, `card` | Columns and panels |
| `stat`, `badge` | Big numbers, pill labels |
| `gradient-text`, `meter` | Gradient headline, animated progress bar (`<div class="meter"><i style="--v:70%"></i></div>`) |
| `aurora` (on the slide) | Soft animated glow behind the content |

### Design tab (drag and drop)

Build slides like in PowerPoint, without code:

- **Add slide** opens ready-made layouts: Title, Title and text, Two columns, Chart, Chart and text, Pie chart, Map,
  Image and text, KPI dashboard, Section, Table, Blank. They use the deck's theme.
- The **Insert** bar has Title, Text, Image, Shape, Button, Icon, Chart, Map, Table and KPI card. Drag one onto the
  slide or click it. You can also drop a picture from your computer.
- Drag to move, drag the handles to resize; components snap to the slide center and to each other (hold Alt to stop).
  `Delete` removes, `Ctrl+D` duplicates, `Ctrl+Z` undoes, the arrow keys nudge.
- The panel on the right edits the selected component: text and colors, chart type and data (a small spreadsheet),
  map place, pins and style, entrance animation, position and size.
- **Charts** use [Chart.js](https://www.chartjs.org) (bar, horizontal bar, line, area, pie, doughnut, radar, polar
  area) and work offline. **Maps** use [Leaflet](https://leafletjs.com) with Esri tiles and need internet. Double-click
  a map (or use *Move the map by hand*) to pan and zoom it to the view you want.
- Components sit on top of the slide's HTML, so you can mix them with AI-made slides. AI edits keep them.

### Effects

Eye-catching effects written for Lawnak Vision in plain CSS and JavaScript (no libraries), so they work in exported
decks. Pick them in the Design tab, or use the classes in slide HTML. The **Effects showcase** template and
[examples/effects-showcase.html](examples/effects-showcase.html) show all of them.

| Kind | Where in the designer | Classes |
|---|---|---|
| Text | Text component → *Text effect* | `fx-split` (letters rise), `fx-blur`, `fx-shiny`, `fx-decrypt`, `fx-glitch`, `fx-rotate` / `fx-type` with `data-words="a\|b"` |
| Backgrounds | No selection → *Slide* → *Animated background* | on the slide: `bg-particles`, `bg-dots`, `bg-waves`, `bg-stars`, `bg-warp`, `bg-grid`, `bg-beams`, `bg-mesh`, `aurora`, plus `bg-noise` |
| Cards | KPI, shape, image, button, chart, table → *Hover effect* | `fx-spotlight`, `fx-tilt`, `fx-glare`, `fx-border`, `fx-magnet` |
| Components | Insert bar → *Logo loop*, *Circle text* | `fx-marquee`, `fx-circle` |

Effects stay still in thumbnails, in PDF export and when the system asks for reduced motion.

### 3D and shaders

Slides are real web pages, so they can run WebGL shaders and true CSS 3D. These are written for Lawnak Vision
(no libraries); see the **3D & Shaders** template or [examples/3d-shaders.html](examples/3d-shaders.html).

| Component | What it does | In HTML |
|---|---|---|
| Crystal orb | Live WebGL glass sphere: electric arcs on the rim, glowing dust inside that follows the mouse | `<div class="fx3-orb" data-energy="0.8">` |
| Coverflow | Center card in color, neighbors smaller and gray, a rainbow sweep when a card arrives, color split while moving | `<div class="fx3-cover" data-items="🚀\|Title\|Subtitle&#10;...">` |
| 3D ring | Cards on a spinning cylinder (sideways or up and down) with momentum, blur while spinning, dimming as they turn away | `<div class="fx3-ring" data-axis="x" data-mode="step">` |
| Globe | Dotted 3D globe with continents; arcs fly from the first place to the others; drag to turn it | `<div class="fx3-globe" data-places="24.71, 46.68, Riyadh&#10;...">` |
| Depth card (hover) | The card tilts toward the mouse and its contents float apart at different depths | `fx3-depth` on a card |
| Shader backgrounds | Flowing silk, iridescent liquid, plasma bands, a gradient blob that follows the mouse, a glowing portal | on the slide: `bg-silk`, `bg-liquid`, `bg-plasma`, `bg-blob`, `bg-portal` |

Coverflow and ring items are one per line: `emoji or image URL | title | subtitle`. While presenting, drag or flick
them, scroll the wheel, or click a card. Globe places are one per line: `lat, lng, label` (the same as map pins).
WebGL starts only when its slide is shown, and thumbnails get a still image.

### Web-page look and charts

Slides can look like a modern website: `nav` (site header), `split` (hero), `bento` grid, `glass` cards, `browser`
window mockup, `kpi` tiles with `delta` badges, `chip`, `btn`, `steps` timeline and `table.data`. The **Glass** and
**Clean** themes are made for this style; see the **Web-style report** template, or open
[examples/web-report.html](examples/web-report.html) in a browser.

Live charts come from JSON, with hover tooltips, legends and animation, and no libraries:

```html
<div class="chart" data-chart='{"type":"bar","labels":["Q1","Q2"],"series":[{"name":"2026","data":[12,18]}],"prefix":"$","unit":"M"}'></div>
```

Types: `bar`, `line`, `area`, `donut`. Series colors come from a colorblind-checked palette, stepped for dark and light themes.

### Animation

Entrance animations replay every time a slide is shown. Siblings stagger by position; set an exact delay with
`style="--d:.6s"` and a length with `style="--dur:1.2s"`.

| Class / attribute | Effect |
|---|---|
| `fade-up` `fade-down` `fade-in` `zoom-in` `zoom-out` `slide-start` `slide-end` `blur-in` `pop` `flip-up` `reveal` | Entrance animations |
| `stagger` (on a container) | Its children fade up one after another |
| `float` `pulse` `spin` `glow` `shimmer` | Loops while the slide is shown (put them on a different element from an entrance class) |
| `data-count` | Counts up to the number in the element's text (`<div class="stat" data-count>1,250+</div>`) |
| `draw` (on an `<svg>`) | Draws its stroked lines and paths |
| `typewriter` | Types the text out |

Pick the **transition** between slides (Slide, Zoom, 3D turn, Rise, Fade, None) in the editor's top bar. Going back plays
it in reverse, and right-to-left decks move the other way. Thumbnails and PDF export show slides without motion, and
the system "reduce motion" setting turns animations off.

Slide scripts get a `slideenter` / `slideleave` event on their `<section>` and the `active` class while shown.

The AI replies in a simple tag format (`<deck-title>`, `<deck-css>`, `<slide>`, `<notes>`) so the app can show each slide
the moment it is finished.

### How the AI sees the design

The AI does not design blind. While it works it can call four tools:

| Tool | What the AI gets back |
|---|---|
| `list_components` | The component gallery (`src/shared/catalog.ts`): ready-made layouts, charts and KPIs, text effects, backgrounds, mouse-reactive cards, 3D, motion components, and every slide from the built-in templates, each with when to use it |
| `view_components` | The working HTML of up to 4 gallery items, and a picture of each rendered in the deck's own theme |
| `preview_slide` | A picture of a slide it drafted, plus the layout problems the app measured |
| `ask_user` | Your answers: for a new deck whose look you didn't describe, the AI asks one to three questions in the chat (mood, color theme…). Every option shows a live picture of a gallery item or theme; pick one, type your own answer, or press *Let the AI decide*. Picking a theme option switches the deck's theme |

After the slides are written, the **design check** renders each new slide in a hidden window and sends the pictures back
with an automatic layout check: content running off the slide, text cut off or spilling out of its card, overlapping
text, text too small to read, script errors and empty slides. The AI then rewrites only the slides that need it; the
chat says which ones it improved. Turn it off in **Settings → General → Design check** to save time and tokens.

Claude, GPT, Gemini and Grok get the tools and the pictures. DeepSeek gets the tools and the text check only (it can't
see pictures). Local models and OpenAI-compatible servers work as before, without tools. To add a component to the
gallery, add an entry to `catalog.ts`; its picture is rendered on demand.

## Project layout

```
src/
  main/        Electron main process: windows, menus, saving decks, AI calls, present and export
    ai/          AI calls (streaming): prompt.ts has the slide-designer prompt, agent.ts the tool loop, plus one file per vendor SDK
    designTools.ts  The AI's design tools (component gallery, slide preview) and the design check
    render.ts    Renders single slides in a hidden window and measures their layout
    store.ts     Decks and settings saved as JSON in the user data folder
  preload/     Safe bridge between the window and the main process (window.api)
  shared/      Code used on both sides
    deckHtml.ts  Builds the standalone presentation HTML and the presenter runtime
    parseSlides.ts  Reads slides out of the AI reply while it streams
    themes.ts    Base slide CSS and the themes
    templates.ts Starter decks
    catalog.ts   The component gallery the AI browses
  renderer/    React UI (sidebar, prompt box, editor, chat panel, settings)
tests/         Unit tests (vitest)
```

Decks are stored in your user data folder (for example `%APPDATA%/Lawnak Vision/decks` on Windows,
`~/.config/Lawnak Vision/decks` on Linux).

## AI providers

| Provider | Key from | Environment variable | Preset models |
|---|---|---|---|
| Anthropic Claude (default) | console.anthropic.com | `ANTHROPIC_API_KEY` | Claude Opus 5.5, Sonnet 5.5, Haiku 5.5 |
| OpenAI | platform.openai.com | `OPENAI_API_KEY` | GPT-5.5, GPT-5.4 mini |
| Google Gemini | aistudio.google.com | `GEMINI_API_KEY` or `GOOGLE_API_KEY` | Gemini 4 Argon, 3.8 Flash, 3.5 Flash-Lite |
| DeepSeek | platform.deepseek.com | `DEEPSEEK_API_KEY` | DeepSeek Chat, DeepSeek Reasoner |
| xAI Grok | console.x.ai | `XAI_API_KEY` | Grok 4.7, Grok 4.6 |
| OpenAI-compatible | your server | none | type the model name |
| Local AI (fastgguf) | no key: runs on your computer | none | the `.gguf` files in your models folder |

- In **Settings**, each provider has a tab with its key, its models, an **Other model name** box and a **Load models**
  button that fetches the provider's live model list. Models you add show up in the model pickers next to the presets.
- **OpenAI-compatible** works with any server that speaks the Chat Completions API: OpenRouter
  (`https://openrouter.ai/api/v1`), Groq, Mistral, or a local Ollama (`http://localhost:11434/v1`) or LM Studio server.
  A key is optional for local servers.
- **Local AI (fastgguf)** runs `.gguf` models offline with fastgguf. In Settings, choose
  the fastgguf program (`fastgguf_big.exe` or `fastgguf.exe`), your models folder, a context size and CPU/GPU, then
  pick a model. The app starts `fastgguf serve` on a free local port when you ask for slides (with a random API key
  so nothing else can use it), keeps it running between requests, restarts it when you change the model or its
  settings, and stops it when you quit. Nothing leaves your computer. The slide prompt is about 2,500 tokens, so use
  at least 8K of context; small models (1–3B) follow the slide format poorly, so 7B or larger works much better.
- The model pickers in the prompt box and the chat panel list the models of every provider you have set up.
- Your deck is sent to the provider you pick when you ask for slides.

Claude requests stream so long decks don't time out and use prompt caching for the system prompt. For Opus and Sonnet,
the API's server-side fallback is turned on, so a request a model declines is retried on another model automatically.
The **Design effort** setting applies to Claude only.
