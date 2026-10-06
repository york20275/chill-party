# Chill Party V0.3.0 — Playables Submission Checklist

## Build
- [x] `index.html` at bundle root
- [x] YouTube SDK loads before game code
- [x] All local file references are relative
- [x] No third-party game assets or audio files
- [x] No external game links
- [x] No external monetization or ad SDKs
- [x] No in-game Exit / Quit control

## SDK
- [x] `firstFrameReady()` during visible loading state
- [x] `gameReady()` after interactive home UI renders
- [x] `isAudioEnabled()` initial audio state
- [x] `onAudioEnabledChange()` platform mute updates
- [x] `onPause()` / `onResume()` lifecycle handling
- [x] `getLanguage()` used inside Playables
- [x] `loadData()` awaited before any future save path
- [n/a] `saveData()` — game is intentionally session-based and does not imply persistent progression
- [n/a] `sendScore()` — local party scores represent multiple players, not one YouTube user's progression

## UX / input
- [x] Touch input
- [x] Mouse input
- [x] Responsive layout
- [x] Resize preserves JavaScript game state
- [x] English supported
- [x] Traditional Chinese supported
- [x] Content completion shown on Party Results screen

## Portal validation still required
- [ ] Upload build to Developer Portal
- [ ] Run official Playables Test Suite
- [ ] Check all target aspect ratios and devices
- [ ] Upload required thumbnails / metadata
- [ ] Configure monetization only if YouTube enables it for the title
- [ ] Submit for Certification
