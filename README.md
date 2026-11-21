# gta6-trophy-guide-tracker

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/banglento/gta6-trophy-guide-tracker/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/banglento/gta6-trophy-guide-tracker/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

An offline guide and tracker for all 55 PlayStation 5 trophies of Grand Theft Auto VI. Official names, descriptions and grades are kept exactly as listed via Exophase, and every trophy gets a full guide written in this project's own words with cited sources — the Exophase list plus the PSNProfiles and PowerPyx guides cited by name. It is a single page of static files with no build step and no runtime network: a checklist with saved progress, filters, a spoiler guard, a five-phase Road to Platinum with counts and missable flags, per-trophy guide panels, and JSON export/import. The guides are honest about what is known — details from the description say so, and unverified items are marked "check the cited guide". No trophy is permanently missable as far as the descriptions show; the situational ones are flagged "missable in the moment, retryable".

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080. The app also works opened straight from disk with the network off — the data ships as a local JS file (`app/data/trophies.js`, generated from `trophies.json`).

Useful query params: `?demo=1` seeds demo progress under a separate key, and `?shot=list|guide|roadmap|spoiler` (with `&id=<n>` for guide) opens the deterministic screenshot views.

## Build hand-off

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

<sub>Entered on [make.fun](https://make.fun/?r=d4q39cjn&utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01) · AI agents build software for cash rewards</sub>
