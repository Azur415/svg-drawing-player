# Changelog

## 1.4.1 — 2026-09-07

- Keep the anonymous analytics privacy switch available on narrow screens as
  an accessible compact control.

## 1.4.0 — 2026-09-07

- Add privacy-preserving Cloudflare usage analytics for sessions, SVG import
  outcomes, playback, navigation, settings, downloads and coarse errors.
- Keep SVG source, full file names, accounts, raw IP and cross-device identity
  out of the telemetry payload; make analytics best effort so it cannot affect
  the player.
- Add a Pages Function, Analytics Engine binding configuration and SQL/query
  documentation for project summaries.

## 1.3.2 — 2026-09-07

- Keep successful imports quiet; only actual import failures show a toast.
- Treat explicitly marked trace paths with local filters as replayable instead
  of warning about an avoidable fallback.
- Ignore equivalent CSS formatting normalization when reporting sanitized input.

## 1.3.1 — 2026-09-07

- Support trace-contract SVGs that mark drawable paths with
  `data-trace-chapter`, `data-trace-order` and `data-trace-role`.
- Keep marked paths replayable inside composition-filtered or opacity-only
  groups while preserving static and explicitly excluded elements.
- Add regression coverage for nested trace containers and update compatibility
  documentation.

## 1.3.0 — 2026-09-06

- Add a reproducible Cloudflare Pages deployment command for the Vite build.
- Add an optional GitHub Actions workflow for Cloudflare Pages direct uploads.
- Document Cloudflare Pages Git integration, direct upload, and required secrets
  for open-source forks.

## 1.2.0 — 2026-09-06

- Keep speed menus open during source auto-scroll; selecting a speed takes effect
  during playback without pausing. Reposition open menus on viewport scrolling.
- Show chapters in a narrow translucent left rail with a visibility toggle.
  Chapter navigation keeps the rail open; desktop framing reserves its space.
- Enlarge the Helvetica-based title, key controls, metadata and source text;
  add neutral gray surfaces to distinguish nested panels.
- Add live-speed and persistent chapter navigation regression checks.

## 1.1.2 — 2026-09-06

- Fit complete chapter bounds to the actual canvas aspect ratio rather than
  the source SVG ratio, improving close-ups of hair, bags and portrait details.
- Center the chapter with 10% padding on each side; remove the restrictive
  2.6× cap and retain a 20× safeguard for near-zero bounds.
- Refit on canvas resize without retargeting between elements in a chapter.
- Calculate the zoom readout from visible scale relative to full composition.
- Add portrait regression coverage for transformed bounds, full chapter
  coverage, centering, mobile resize and fixed framing between chapter elements.

## 1.1.1 — 2026-09-06

- Lock automatic framing for the entire chapter; only chapter changes trigger
  smooth reframing. Bounds include every drawable item in that chapter.
- Fade all future source lines, retaining progressive character illumination
  for the current element. Completion brightens the full source; rewind restores
  the correct future state, including virtualized rows.
- Replace the header mark with Azur., remove the subtitle and rebalance the
  SVG Drawing Player title for desktop and mobile.

## 1.1.0 — 2026-09-06

- Default smooth camera tracking of the current drawing area, with spatial
  grouping of adjacent marks and a moderate 2.6× automatic zoom cap.
- Explicit follow / full-view / manual modes; manual pan or zoom suspends follow.
  Completed playback returns to full composition when following is enabled.
- Toggleable full-composition mini-map with the current viewport rectangle.
- Character-by-character source illumination synchronized to playback, pause,
  speed and seeking; retained full-source context and virtualized rendering.
- Replaced system dropdown popups with consistent paper/brick-red custom menus
  for speed, replay mode, duration and camera mode, including keyboard controls.
- Established Git baseline, local release tags, maintenance rules and this log.
- Regression coverage includes smooth same-layer tracking, overview/manual
  locking, mini-map toggling, deterministic character reveal and custom menus.

## 1.0.0 — 2026-09-06

- Preserved initial browser-only SVG player as the baseline release.
- Safe local import, 30/60/120-second quick replay, full element replay,
  0.25×–16× speed, timeline seeking and synchronized full-source highlighting.
- English/Chinese interface, desktop/mobile layouts, original CC0 pavilion
  example, MIT code license and GitHub Pages workflow.
