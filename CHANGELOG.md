# Changelog

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
