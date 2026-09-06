# Project maintenance

This directory is an independent repository. Do not modify the neighboring
svg-reconstruction project or include its artwork in public releases.

## Version management requested by the owner

- Inspect `git status` and recent history before making changes. Preserve
  uncommitted user work; do not stage unrelated files or rewrite published history.
- Keep each requested update in a coherent commit. Use local commits for completed
  changes, as authorized by the owner's ongoing version-management request.
- Bump patch for fixes and minor for new backward-compatible features with
  `npm version <patch|minor> --no-git-tag-version`. Update CHANGELOG.md and both
  READMEs when behavior changes. Package and lockfile versions must match.
- Before the final commit, run `npm test` and `npm run test:production`.
  Install Playwright Chromium, or use CHROME_PATH for an installed browser.
- After validation, commit the completed update and create a matching local
  `vX.Y.Z` tag. Do not move existing tags, push, publish or deploy without a
  request identifying the remote destination.
- Use prior tags for comparison and rollback references; never reset the working
  tree to roll back without checking for user changes.

## Implementation expectations

- Imported SVG content is untrusted. Keep scripts and external resources disabled,
  preserve sandbox/CSP isolation and safe source/download equivalence.
- Playback, code reveal and seeking derive from one timeline. Camera easing is
  independent, bounded, and must respect overview/manual mode and reduced motion.
- Keep the code view virtualized. Avoid one DOM node per character for large SVGs.
- Custom selectors must retain accessible focus, keyboard operation and localized
  labels. Check both desktop and mobile after UI changes.
