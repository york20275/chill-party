# Chill Party V0.3.0 — YouTube Playables Submission Build

This build is based on V0.2.4 and keeps all current gameplay features, including custom 1–100 rounds, BGM 150%, Traditional Chinese / English UI, and the Draw & Guess hide-word control.

## YouTube Playables integration

- `index.html` is at the ZIP root.
- Loads `https://www.youtube.com/game_api/v1` before all game JavaScript.
- Calls `ytgame.game.firstFrameReady()` while a visible loading screen is present.
- Calls `ytgame.game.gameReady()` only after the interactive home screen has rendered.
- Uses `ytgame.system.isAudioEnabled()` and `onAudioEnabledChange()` as the platform mute source of truth.
- Uses `ytgame.system.onPause()` / `onResume()` only; browser Page Visibility pause logic was removed.
- Uses `ytgame.system.getLanguage()` inside Playables. YouTube locale selects Chinese for `zh-*`; all other locales fall back to English. Outside Playables (for Vercel testing), the game defaults to Traditional Chinese.
- Awaits `ytgame.game.loadData()` during initialization. Chill Party is intentionally session-based and does not present persistent progression, so it does not write cloud saves in this build.
- Does not use `sendScore`: party scores belong to multiple local players and are not an appropriate single-user YouTube leaderboard score.
- No external game links, external monetization, third-party ads, account/login flow, or in-game exit button.
- Touch and mouse input supported; responsive CSS preserves game state on resize.

## Submission bundle

Upload the ZIP itself to the YouTube Playables Developer Portal after access is granted. The ZIP root must directly contain:

- `index.html`
- `app.js`
- `styles.css`
- `questions.js`
- `vercel.json`
- `README.md`
- `PLAYABLES_SUBMISSION_CHECKLIST.md`

Do not wrap these files in an extra parent directory.

## Testing

For normal browser/Vercel testing the YouTube SDK behaves as a no-op outside the Playables environment. For certification validation, use the official YouTube Playables Test Suite / Developer Portal build URL.
