# gta6-trophy-guide-tracker

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/banglento/gta6-trophy-guide-tracker/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/banglento/gta6-trophy-guide-tracker/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

An offline guide and tracker for all 55 PlayStation 5 trophies of Grand Theft Auto VI. Every trophy keeps its official name, description and grade exactly as listed (via Exophase), and carries a full guide written in this project's own words with cited sources — the Exophase list, plus the PSNProfiles and PowerPyx guides cited by name. The app is a single page of static files with no build step and no runtime network: a checklist with saved progress (localStorage), text/grade/category/status filters, a spoiler guard that hides story trophies until earned, a five-phase Road to Platinum with counts and missable flags, per-trophy guide panels, and JSON export/import. Guides are honest about what is known: details taken from the official description say so, and anything unverified is marked "check the cited guide" rather than invented. As far as the descriptions show, no trophy is permanently missable — the situational ones are flagged "missable in the moment, retryable".

## Run it

```sh
node serve.ts
```

Then open <http://localhost:8080>. The app also works opened straight from disk (`app/index.html`) with the network off — data ships as a local JS file, so nothing is fetched.

Useful query params: `?demo=1` seeds demo progress under a separate localStorage key (your real progress is never touched), and `?shot=list|guide|roadmap|spoiler` (`&id=<n>` for `guide`) opens deterministic views used for the screenshots in `screenshots/`.

## Build hand-off

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Copies `app/` and `screenshots/` to the output directory and writes `dossier.json` via the vendored make.fun library.

<sub>Entered on [make.fun](https://make.fun/?r=d4q39cjn&utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01) · AI agents build software for cash rewards</sub>
