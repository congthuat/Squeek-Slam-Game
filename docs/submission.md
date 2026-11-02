# Squeekchain Genesis — project submission

Squeek Slam is submitted to the **Squeekchain Genesis** program through the official project page:

> **https://squeekchain.com/genesis/code** (section: *How building works*)

> [!IMPORTANT]
> **Direct submissions are paused. Projects are submitted from the IMD swarm.**
> The page reads the canonical record from IMD — nothing is created or paid there.

## How building works

| Step | What happens |
| --- | --- |
| **1 — Join Genesis** | Connect a wallet, verify it, link X (Discord is optional and only unlocks holder roles) → you get a member card and an invite link |
| **2 — Hire the IMD swarm** | Create the build job and pay the **0.5 IMD** fee **from a wallet that is verified on your Genesis profile** — an IMD project belongs to the wallet that paid for its first job |
| **3 — Submit on `/genesis/code`** | Paste the **IMD job URL or job id** → *Preview project* → confirm the request wallet shows **“Request wallet verified”** → set the display name → answer **“How does this project use Squeekchain?”** → **Save project** |
| **4 — Review** | The Squeekchain team reviews the project before it appears on the board; projects that pass a **Swarm Review** earn more |

**Badge ladder** — *The Buildooooor* (project verified and approved) → *Squeek of Approval* (passes Swarm Review) → *Hall of Hamsters* (among the top reviewed projects).

Genesis rank is decided by **Aura**, and rank decides the Genesis whitelist, so the build badges are worth climbing for.

### Watch out for

- Paying the IMD job from a **different wallet** than the one verified on the profile → the page answers *“That payer is not one of your verified wallets.”* and the project cannot be linked.
- A job that is **already linked to another participant** cannot be linked again.
- The “How does this project use Squeekchain?” answer is yours: refreshes never overwrite it.

## Ready-to-paste — IMD job objective

Paste this into the IMD launch form (or the `job.open` `objective` field) after picking the
`build-website` skill. It is deliberately explicit: the swarm decides anything the brief leaves open.

```text
Build and host "Squeek Slam": a polished, mobile-first browser arcade game for the Squeekchain community.
Squeekchain is a hamster-powered proof-of-work chain; the live hamster telemetry is public at
https://api.squeekchain.com/v1/status and https://api.squeekchain.com/v1/core (core status, RPM,
distance, cumulative work units, block height). A public reference implementation of the game is at
https://github.com/congthuat/Squeek-Slam-Game — study it for feel and parity, but deliver your own
hosted build.

GAMEPLAY
- 30-second whack-a-hamster round on a 3x3 grid of holes. Slamming a hole with pointer/touch, or with
  keyboard keys 1-9; Space starts and restarts a round.
- Targets: hamster +10; golden hamster +50 (rare, short lifetime); clock +3 seconds (rare); bomb -20 and
  resets the combo. A hit within the first 0.3s of a spawn pays a +5 quick bonus.
- Combo: consecutive hits raise a score multiplier up to x5; the combo decays when the player stops
  connecting for about 3 seconds; slamming an empty hole counts as a miss against accuracy.
- Four announced round phases: Warm-up 0-8s (no bombs), Speed-up 8-20s, Frenzy 20-25s (faster spawns, up
  to 3 targets at once), Final 5 seconds (all points x2, red pulsing vignette, per-second countdown ticks).
- Three difficulty modes, each with its own leaderboard: Standard (x1 points), Hard (x1.25, faster spawns,
  more bombs), Insane (x1.5, maximum speed, 2-3 concurrent targets). The chosen mode shows on the HUD and is
  remembered locally. Grades are normalised by the mode multiplier.
- End-of-round screen: S/A/B/C/D grade, score, hits, misses, accuracy, top combo, quick hits, seconds added;
  "new personal best" celebration; a share button that copies the result; a name field that submits the score.

LIVE CHAIN DATA (the point of the project)
- Poll the hamster telemetry every ~10s through your own server-side proxy with a short cache; show live
  core status, RPM, kilometres and cumulative work units on the page, and keep serving the last known values
  if upstream is slow.
- "CHAIN RUSH": while the real hamster is running (core status RUNNING, or RPM above zero), every hit pays
  x1.5 and an amber CHAIN RUSH badge plus an in-game announcement appears; it switches off when the hamster stops.

LEADERBOARD AND WEEKLY TOURNAMENT
- Hosted Postgres leaderboard. Filters: this week / today / all-time, and by difficulty mode. Each row shows
  name, score, top combo, mode badge and how long ago it was set.
- Weekly tournament card: the week resets Monday 00:00 UTC; countdown to the end of the week; weekly champion
  with a crown; top-3 podium; number of runs this week.

PRESENTATION
- Bilingual UI, Vietnamese default with an English toggle, dark arcade theme, hamster branding, tasteful
  juice: particles on hit, red flash and screen shake on bomb, combo aura around the board, floating score
  popups, synthesized WebAudio sounds with a mute toggle, grade reveal animations.
- Great on phones and desktop: no horizontal scroll, big enough touch targets, animations stay smooth.

RULES (hard)
- No wallet connection, no NFTs, no tokens, no payments inside the app; points are off-chain fun only.
  Footer disclaimer: unofficial community game, points are not real $SQK.
- No claims of official Squeek mining, yield, insurance or airdrop.
- Never fake data: everything displayed comes from the real chain API or real player submissions.
- Deliver a hosted site plus its source repo, with a README covering the rules, the live-data endpoints used
  and how scores are stored.
```

## Ready-to-paste — “How does this project use Squeekchain?”

One short answer. Pick one:

**English**

> Squeek Slam reads the live hamster telemetry from the public Squeekchain API — core status, RPM, distance,
> cumulative work units and block height — and turns it into gameplay: while the real hamster is running,
> every slam pays ×1.5 (“Chain Rush”), and the round's pacing, leaderboards and weekly tournament are all
> tied to that live chain state.

**Tiếng Việt**

> Squeek Slam đọc trực tiếp dữ liệu hamster thật từ API công khai của Squeekchain — trạng thái core, RPM,
> quãng đường, work units và block height — rồi biến nó thành lối chơi: khi hamster thật đang chạy, mọi cú
> đập được ×1,5 (“Chain Rush”), còn nhịp độ ván đấu, bảng xếp hạng và giải đấu tuần đều gắn với trạng thái
> chain trực tiếp đó.

Display name: **Squeek Slam**

## Reference

- Submission page — <https://squeekchain.com/genesis/code>
- IMD (hire the swarm) — <https://explorer.imd.fun/launch> · API guide in <https://imd.fun/skill.md>
- This project — <https://github.com/congthuat/Squeek-Slam-Game>
