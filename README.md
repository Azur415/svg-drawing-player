# SVG Drawing Player

**Watch an SVG unfold alongside its source code.** A private, browser-only drawing player with a warm paper interface, a resizable canvas/code split, and a deterministic timeline.

[简体中文](README.zh-CN.md)

## Try it locally

Use Node.js 22.12+ or 24+.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Drop a `.svg` file or choose the original pavilion example. Import starts a 60-second replay automatically. The development build sends no usage analytics; the live build records anonymous usage events, while SVG files remain local and are never uploaded.

## Playback

- Quick sketch: target 30 / 60 / 120 seconds, with small, dense elements presented in staggered batches.
- Every element: separate timing for each drawable object, based on geometric complexity.
- Pause, restart, step backward/forward, drag to seek, and select 0.25×–16× speed. The timeline itself does not change when speed changes; estimated remaining time does.
- Full source lights up character by character for the current element or batch. The reveal pauses and rewinds with playback. Manual scrolling suspends follow; the follow button restores it. Only visible code rows are mounted.
- Camera fits the complete chapter bounds to the actual canvas aspect ratio, centered with 10% padding on each side. Small chapters can zoom beyond 2.6×; a 20× safeguard handles near-zero geometry. Framing stays fixed within a chapter and adapts when the canvas is resized. Select Full view for a fixed overview; manual pan/zoom suspends follow. The toggleable mini-map shows the complete composition and current viewport.
- All future source lines remain faded until playback reaches them. Completed lines stay bright; rewinding restores the corresponding faded state. The Azur. header uses a compact title without a subtitle.
- Chapters appear in a narrow translucent left rail; hide or restore it with the chapter button. Selecting a chapter keeps it open. Desktop framing reserves space for the rail; phones use an overlay and Canvas / Code tabs.
- Change speed during playback without pausing: source auto-scroll does not dismiss the menu. Custom menus support pointer, arrow keys and Escape. Larger Helvetica-based headings and neutral gray panels improve readability.
- Space plays/pauses and arrow keys step through elements outside focused controls. Background tabs pause playback.
- Switch English / Chinese in the header. Language preference and the local anonymous-analytics choice are the only settings stored in browser storage.

## Anonymous usage analytics

The live build uses a Cloudflare Pages Function and Analytics Engine to collect
project-summary metrics: sessions, import outcomes, element/chapter counts,
processing time, playback starts/pauses/completions, chapter selection,
seeking, speed and camera changes, downloads and coarse error classes. It does
not collect SVG source, full file names, accounts, raw IP, browser fingerprints
or a cross-device identity. A random anonymous session ID is kept only in the
current tab's `sessionStorage`. The header's anonymous-stats badge is a local
on/off switch; the preference is stored only on that device. If the analytics
endpoint is unavailable, the player continues normally.

See [ANALYTICS.md](ANALYTICS.md) for the event layout, Cloudflare binding setup
and ready-to-use SQL queries.

This is a visualization reconstructed from a finished SVG, **not a recording of the author's actual editing history**. DOM order is the playback order. Camera movement does not modify downloaded artwork.

## SVG support and boundaries

Paths use the browser's SVG geometry APIs, including relative commands, arcs and multiple subpaths. Basic shapes, nested groups, transforms, gradients and clipping are supported. Text, local `use` instances, embedded PNG/JPEG/GIF/WebP and unmarked complex compositing effects fade in; ordinary affected groups remain atomic to preserve their compositing. Trace-contract SVGs may mark replayable leaves with `data-trace-chapter`, `data-trace-order` and `data-trace-role="fill|stroke"`; their marked paths remain individually replayable inside composition-filtered, opacity-only or locally filtered containers, while `data-trace-role="static"` and `data-trace-exclude="true"` stay out of the timeline. References in `defs` do not become duplicate drawing steps.

DOMPurify cleans markup, a CSS AST allowlist removes unsupported declarations and external URLs, and a sandboxed iframe with restrictive CSP isolates imported styles. Scripts, event handlers, foreignObject, SVG animations, feImage and external resources are removed. Remote fonts and stylesheet imports are not supported. Reduced-motion preferences disable camera easing. System-font text metrics may differ from the author's environment. Native path dashes can reveal multiple subpaths concurrently, rather than reproducing pen-up motion between contours.

Import notes explain normalization and fallback behavior. The code panel and downloaded `.sanitized.svg` represent the same processed document. Normalization is not claimed to be visually identical to unsafe or externally dependent input. Limits: 10 MiB, 20,000 XML elements, bounded reference depth/expansion; DTD/entity declarations and cyclic use references are rejected. SVG filter complexity can still be expensive on low-powered devices.

## Build and deploy

```sh
npm run build
npm run preview
```

Publish `dist/` to a static host. Relative asset paths support both domain roots and repository subpaths. Serve the build over HTTP; do not double-click the source HTML.

### Cloudflare Pages

Cloudflare Pages is the recommended production host for this static Vite site. For Git integration, connect the GitHub repository and use:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | repository root |

For a local or CI direct upload, first create a Pages project in Cloudflare, then run:

```sh
npm ci
npm run deploy:cloudflare
```

The included `.github/workflows/cloudflare-pages.yml` builds every pull request and deploys `main` when these repository secrets exist: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. The token should have Account → Cloudflare Pages → Edit permission. Optionally set the repository variable `CLOUDFLARE_PAGES_PROJECT` if the Pages project name is not `mysvg`. Choose either Pages Git integration or the direct-upload workflow for production to avoid duplicate deployments.

The anonymous usage endpoint uses the `ANALYTICS_ENGINE` binding in
`wrangler.jsonc`. After the first production deployment, confirm under the
Pages project's Settings → Bindings that it points to the
`svg_drawing_player_usage` dataset. See [ANALYTICS.md](ANALYTICS.md) for
queries and the fixed field order.

For GitHub Pages, put **the contents of this folder at your new repository root**, use `main`, and select **Settings → Pages → Source → GitHub Actions**. The included workflow tests and builds pull requests, and deploys pushes to main. No remote repository is created by this project. If using another default branch, adjust the workflow's branch conditions.

## Development and verification

```sh
npx playwright install chromium
npm test
npm run test:production
```

Alternatively set `CHROME_PATH` to a locally installed Chrome executable. Tests cover import, sanitization, replay determinism, unique traversal, controls, layout and language. If `../svg-reconstruction/building.svg` exists, it is used for an optional local performance regression. It is **not** copied into the public build or licensed by this repository.

The TypeScript implementation separates `importer` (sanitization, safe frame, source mapping and chapters), `player` (timeline/state and overlays), `code-view` (virtualized text), and `main` (UI/camera/import lifecycle). Player exposes load, play, pause, seek, step, jump, restart, setSpeed and configure; state changes emit `change`. Test-only browser hooks are removed from production builds.

## License

Release history: [CHANGELOG](CHANGELOG.md). Local tags preserve the v1.0.0 baseline and v1.1.0 update. Future updates follow [maintenance rules](AGENTS.md): increment the version, validate, record changes, commit and tag; remote publication is separate.

Code: [MIT](LICENSE). The original bundled pavilion: [CC0](public/examples/LICENSE.txt). Imported files remain the property of their respective owners. Confirm rights before adding any other example to a public release. The repository is intended to be public and open source; do not commit Cloudflare tokens, account credentials or private SVG files.

Implementation references: [DOMPurify](https://github.com/cure53/DOMPurify), [Vite static deployment](https://vite.dev/guide/static-deploy).
