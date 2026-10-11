# REP531 · Strength Training

A mobile-first, offline 5/3/1 Boring But Big log built with React, TypeScript, Vite, Dexie and vite-plugin-pwa. No login or server is required. **This project has not been deployed.**

## Run on Windows

Install Node.js 22.18+ and open PowerShell in this folder:

```powershell
npm ci
npm run dev
```

Open the printed local URL. The development server is for UI development; use a production preview to test offline behavior:

```powershell
npm test
npm run build
npm run preview
```

Visit the preview URL while online, wait for **Ready offline**, and then disconnect. Service workers require HTTPS or localhost; a plain HTTP LAN IP on your phone does not qualify.

## Included

- Compact overview session summary with actual working loads, percentages/reps, training max, BBB, accessory names and in-progress completion count, plus a four-day schedule. Small lift pictograms appear beside movement names in the overview, workout and history.
- Interactive cycle weeks and a compact seven-day calendar inside This week. Tap a week to preview its prescriptions or a day/lift to view loads, BBB, accessories, logged sessions and cardio. Browsing leaves your actual workout progress unchanged; only the next/active session offers Start/Resume.
- All four 5/3/1 weeks with optional warmups and BBB. Skip deload for three-week/twelve-session cycles; deload otherwise omits warmup/BBB. Skip unfinished warmups directly in a workout, or omit warmups from new sessions in Preferences.
- Compact two-line lift rows with inline prescriptions, grouped plate counts, editable weights/reps and completion controls. Session notes and edits autosave locally. Accessories display under exercise headings with numbered sets and individual add/remove controls.
- Saved 1RM values, a 90% TM calculator, manual TM overrides and faint loadable conversions inside TM cells; configurable percentages, rounding and optional cycle increases.
- Separate lb and kg plate inventories with an assumed Olympic bar (45 lb / 20 kg). Unit preferences select the matching plates without changing either inventory. Automatic loads use the closest achievable symmetric plate load. Plate denominations assume unlimited matching pairs, not counted inventory.
- Normal BBB or BBB Swap, chosen independently for the current and next cycle. Swap pairs Squat ↔ Deadlift and Bench ↔ Overhead press, using each BBB lift’s own TM.
- Exercise reordering via native drag or a touch handle (keyboard Up/Down also works on the handle). No redundant arrow buttons.
- A searchable Push/Pull/Legs/Abs library, including ten push and ten pull presets, with bounded scrolling and a single exercise editor. Each day shows its selected exercises first, with drag/touch/keyboard reordering. Each lifting day supports one or multiple exercises from every category, without enforcing a quota.
- Rest deadlines, pause/resume, +30 seconds, and eight synthesized offline chimes with previews.
- Cardio on any date, completed session details and one estimated 1RM chart showing all four main lifts together on shared date/weight axes, with a colored legend and latest estimates in the selected unit.
- Full validated JSON backup/restore and timestamped Markdown history export.
- Acid Moss (lime/olive), Deep Cosmos (blue/purple) and Solar Flare (orange/red): charcoal surfaces with colored glows, gradient accents and a colored theme picker at the top of Preferences; larger text, mobile bottom navigation and safe-area support.

The training template is informed by [Jim Wendler’s Boring But Big article](https://www.jimwendler.com/blogs/jimwendler-com/101077382-boring-but-big). The requested schedule and deload behavior take precedence over the article’s optional variations. Default TMs are sample values: set your own before training. TMs stay unchanged between cycles unless automatic increases are enabled. Repetitions and AMRAP targets use the requested fixed scheme; percentages are editable.

Reddit Sans from [Google Fonts](https://github.com/google/fonts/tree/main/ofl/redditsans) is bundled locally, including normal and italic variable fonts, and precached for offline use. Its SIL Open Font License is included in `public/RedditSans-OFL.txt`. Numeric editors keep temporary blank input separate from saved numbers, so clearing a value never injects a zero. Abandoning an empty required field restores its previous value; optional 1RM cells may stay empty.

## Testing

```powershell
npm test          # calculations and IndexedDB backup/restore
npm run build    # strict TypeScript + production assets + service worker
npm run test:e2e # production browser flows at / and /bbb/
```

Browser tests use Microsoft Edge, normally already installed on Windows. They cover 320–1440px layout widths, saved set edits after reload, completion/cursor advancement, 1RM-to-TM changes, reordering, neutral surfaces and themed highlights, accessory day assignments, unit-specific equipment, BBB Swap, cardio, JSON restore and offline reloads. Unit/storage tests also cover symmetric nearest-load conversion and migration of version 1 and 2 data. Playwright starts and closes its preview servers. Screenshots and failure traces go to ignored `test-results/`. For a machine without Edge, install Edge or change the Playwright `channel` to an installed Chromium browser. No device simulator replaces testing on your actual phone, especially for audio and installation.

Accessory counts can be changed from zero to twenty in the active workout without changing Settings defaults. New sets copy the exercise's last weight/reps; removal takes the last unfinished set so completed work stays intact. Zero-set exercises remain available to add back. These counts survive reloads, Settings saves and JSON backup/restore, including older backups without count overrides. Completed entries are read-only until Edit workout is selected; weights, reps, completion and notes can then be corrected with Save changes or Cancel edits. Workout dates can also be corrected from History.

## GitHub Pages (manual deployment)

The included workflow **only runs manually**, and runs unit tests, a production build and browser tests before deployment. Nothing automatically publishes on push.

1. Create a GitHub repository and push this project, including `package-lock.json`.
2. In the repository’s **Settings → Pages**, select **GitHub Actions** as the build source.
3. Under **Actions → Test and deploy to GitHub Pages**, select **Run workflow** when ready to publish.
4. Open the URL reported by the deployment job. Both repository subpaths (e.g. `/bbb/`) and root hosting are supported through relative Vite assets and PWA scope.

The workflow uses Node 22 on Windows for build/testing, and the Pages deployment action on Ubuntu. There are no hosting secrets or database credentials to configure.

## Install on a phone

- **iPhone/iPad:** open the published HTTPS URL in Safari → Share → Add to Home Screen.
- **Android:** open it in Chrome → menu → Install app / Add to Home screen.

Load the app online once and wait for **Ready offline** before going offline. New app versions show an update prompt; let saving finish before updating. Phones can suspend background timers, and silent mode may suppress chimes. Keep the app visible for dependable timer sound.

## Local data and backups

`src/domain/` owns typed schemas and pure calculation functions. `src/data/` owns the Dexie database, validated backups and Markdown output. `src/components/` contains UI features. `AGENTS.md` documents requirements and calculation rules for future contributors.

Database `bbb-training` retains Dexie table version 1; its state document now uses data schema version 3. Table `state`, key `main` contains settings, cursor, active workout, history and cardio. Version 1 and 2 data and backups migrate automatically to v3: saved 1RM fields are initialized empty and missing accessory presets are added once; existing equipment stays in its original unit bank, existing accessory day assignments are retained, and all active/completed set values stay unchanged. The missing unit bank receives standard equipment defaults. Writes are serialized and transactional. A restore validates the entire document before replacing the existing record; an invalid backup leaves existing data intact. A running rest timer’s deadline is kept separately in localStorage and is intentionally not part of data backups.

Completed and active workouts snapshot their original units, TM, variant, BBB lift/TM, bar, plates and prescription. Main program changes apply to future workouts. Accessory selections update when Settings are saved or a workout is resumed: completed accessory sets remain, even if deselected; retained exercises keep manual weight/repetition edits; untouched pending sets refresh and new selections are added in the chosen order. The selected unit applies across Overview, active workouts, history details, charts and Markdown exports. Changing units converts active sets and TMs to loadable weights using the destination Olympic bar and plate bank, including completed sets and saved zero-set templates, while keeping reps, completion and set counts. Existing mixed-unit active saves and imported backups are corrected on load/restore. History details and Markdown show rounded preferred-unit conversions; stored history and JSON backups retain original historical values. Settings intentionally shows both plate banks and faint alternate-unit TM conversions. Completed performance stays unchanged when correcting a workout date. Older name-only accessory snapshots remain supported; new sets also store an optional catalog ID. Each cycle’s variation is saved separately; unconfigured cycles default to Normal BBB. Switching units converts training weights and rounds to the nearest load achievable with the destination unit’s Olympic bar and available matching plates. For example, 225 lb converts to about 102.06 kg, then snaps to **100 kg** with a 20 kg bar and 40 kg per side using the default kg inventory (25, 20, 10, 5, 2.5). Equipment entries never convert. Converted accessory weights and cycle increases use standard 5 lb / 2.5 kg steps. Because conversions snap to actual equipment, they are intentionally approximate rather than reversible to the original decimal weight.

Browser storage belongs to a device, browser profile and origin. Clearing site data or losing the device can erase it. The app requests persistent storage when starting a session, where supported, but **regular downloaded JSON backups are the durable recovery path**. There is no automatic synchronization between devices or browser tabs: use one active tab and export/import JSON to transfer data. Import replaces the full log, while reset cycle retains history/settings and clears the active workout.

Calendar dates are estimates derived from your configured lifting weekdays, anchored to the current cycle's first available session (or its upcoming training day before starting). Completed sessions appear on the local date they were actually logged; cardio uses its saved date. Planned dates never reschedule workouts or force progress. Calendar browsing and previews need no new stored records, network connection or separate calendar account. Skip deload removes the fourth week from the calendar.

Workouts can finish once all main sets and any enabled BBB sets are checked. Warmups and accessories are optional for completion; their unfinished sets remain unchecked in saved history. Skip warmups in Preferences applies to new workouts; the workout’s Skip warmups button removes only unfinished warmups from that session. Skip deload advances directly after week three and applies enabled cycle increases once. Enabling it while an idle deload is next advances immediately; an already started deload stays available until finished, then starts the next cycle. Both skip options default off for existing data and travel in JSON backups. Native operating systems may render dropdown option colors differently; the selected theme text is colored in the app.


## Log a missed workout

Choose **History → Add past workout**, or open a calendar day/session and use its past-workout action. Pick the actual date, cycle, week and lift. The form starts with your current training settings: edit weights, reps, accessory sets and notes to match what you did. Check the completed sets, or use **Mark main & BBB complete**, then **Save past workout**. Future dates are not accepted.

The past draft autosaves separately, survives a reload, and is included in JSON backups. Return through **History → Resume past workout**. Saving normally adds history without changing your active workout, program position or training maxes. To catch up on your next program session, enable **Count as next program workout** before saving; it is available only for that exact session when no workout is active. This advances once and applies any enabled cycle increase. You can also change **Workout date** inside a normal active workout to backdate it, then finish normally. History, charts, calendar details and Markdown use the workout's actual date.

The optional `pastWorkout` state snapshot and `historyOnly` workout flag are backward-compatible additions to document schema version 3. Both editable workouts follow preferred units, while completed historical snapshots retain their original stored values.

Starry Night is available under Settings → Preferences → Theme color: moonlit silver and periwinkle highlights with a subtle star field. All five themes share the same stars over their own colored glows. Stars use a bundled SVG with irregular positions, varied brightness and soft halos; they work offline and drift slowly behind the interface. The stars stay still when your device has Reduce Motion enabled. The selected theme persists locally and in JSON backups.

Event Horizon is the AMOLED option in the same theme picker: true-black page, panels and navigation, silver/slate highlights, and the shared stars without a broad colored background glow. It persists locally and in backups like every other theme.

To correct a completed workout’s date, open it in History and change **Workout date**. The change saves automatically and updates History, the calendar, chart and exports. Dates must be today or earlier. Sets, original units, completion time, training maxes and program progress stay unchanged.

Log cardio offers themed icon shortcuts for Walking, Elliptical, Treadmill, Cycling and Rowing. Tap one or type a custom Activity. The next form remembers your last saved activity, including after reloads or restoring a JSON backup; closing without saving does not change it. Dates, duration and notes can still be entered independently, and cardio never advances lifting progress.

The Legs accessory library includes Bulgarian split squat, Romanian deadlift, Leg press, Goblet squat, Walking lunge, Step up, Lying leg curl, Leg extension, Hip thrust and Standing calf raise. These start at editable 5 × 10 with zero load and are never assigned automatically. Existing saves receive missing leg presets once; custom entries and assignments are preserved, and deleted presets stay deleted after the update.

Exercise selection references: [NASM exercise library](https://www.nasm.org/workout-exercise-guidance) and [ACE lower-body exercise guidance](https://www.acefitness.org/resources/pros/expert-articles/8807/strength-training-the-glutes-an-evidence-based-approach/). Preset sets/reps are editable starting values, not an individually prescribed program.

All accessories now start at 5 × 10, including new custom exercises. Existing saved catalog entries are updated once; you can edit sets/reps afterward and those choices persist. Completed history and saved workout snapshots are not rewritten by this update.

Active workouts can be discarded with confirmation without advancing the program. Open a workout in History and choose **Edit workout** to correct weights, repetitions, completion, notes or its date; **Save changes** saves the correction and **Cancel edits** leaves the entry unchanged. Corrections update charts and exports without advancing the program or adjusting training maxes.

**Keep screen awake** is enabled by default in Preferences. On supported browsers over HTTPS, it prevents idle dimming while the app is visible, including between sets. Returning from another app requests it again. Low-power settings or browser restrictions can override this; background apps cannot keep the display awake.

Settings uses five collapsible groups with live summaries and remembers the last open group. Open **Program & schedule → Manage accessories** for daily accessory selections and the exercise library. Changes stay in the same draft while navigating; use the sticky **Save changes** button to apply them.

Completing a workout set opens a compact glass bottom sheet with a countdown ring and pause/resume, +30 seconds, restart and red Stop controls. Pull its handle down or tap X to hide it while the countdown continues; a small countdown button on the Workout page reopens it. Running/paused countdowns survive reloads. There is no separate Timer tab.

Configure sound, the eight chimes, vibration and optional local notifications under **Settings → Equipment & rest**. Notifications require permission and HTTPS; iPhone users need the installed Home Screen app. These are local alerts, with no push service or external database. If the browser or phone suspends the app, completion alerts can be delayed until it runs again. Vibration is browser/device dependent; use the existing Keep screen awake setting during workouts. Alert preferences are included in JSON backups; the transient countdown is device-local.

### Starting a new cycle
Before the first workout of cycle 2 onward, review your training maxes and choose Normal BBB or BBB Swap. Keep the previous cycle's TMs, apply the per-lift increases configured in Settings, or enter custom values. These suggestions use fixed cycle increases rather than performance-derived estimates. Final loads round to your available plates. Cancel leaves everything unchanged; confirming starts the first session and saves your choices, including through reloads and JSON backups. Existing automatic increases are suggested only once, never added a second time by the setup screen.

### First-time setup
On a new install, choose pounds or kilograms, enter either a 1RM or direct TM for each main lift, and select Normal BBB or BBB Swap. The preview uses 90% of entered 1RM and rounds to available plates; entered 1RMs remain saved in Settings. Save setup opens the Overview without starting a workout, or explicitly accept the displayed defaults. Closing postpones setup until your next launch or first workout. Completion is saved locally and in JSON backups. Existing saves without the new marker are left alone.

In Settings → Your data, **Reset cycle** keeps completed lifting history but clears cardio history. **Delete all cycles** requires confirmation and clears all lifting history, workout drafts, cycle variations and progress, returning to cycle 1. It also clears cardio history, while keeping training maxes and personal settings. Export a JSON backup first if you want to restore the deleted lifting records later.

First-time setup continues to an accessories step with tabs for Squat, Bench press, Deadlift and Overhead press. Search/filter the shared library and select/order any number of exercises independently per day; a push, pull and legs/abs is suggested, not required. Back keeps your draft; final Save setup stores both steps together. Use defaults on step one accepts the displayed maxes and still lets you review accessories before saving.

REP531 uses the approved stacked REP / 531 artwork in its desktop header, favicon and install icons, including a maskable Android asset and iOS touch icon. The header keeps the source artwork’s exact shapes while recoloring REP and the plates to the theme text color and 531 to the theme accent. Installed icons use the default white/lime colors. Existing local database/storage identifiers remain unchanged, so the new name preserves saved training data.
