# Performance tools

Scripts used to measure and profile typing in Obsidian (see
[docs/PERFORMANCE.md](../../docs/PERFORMANCE.md) and the vault note
**Obsidian Plugin Development - Performance Guidelines**). They run inside
Obsidian through the `obsidian` CLI (PowerShell on Windows) and only ever
in the **Dev** vault; each one checks `app.vault.getName() === "Dev"`.
Results go to `%TEMP%/scribidian-perf/`.

## Speed check before a release

`check.ps1` is the one-command check that runs before every public release
(docs/RELEASING.md). It measures the build installed in the Dev vault, so
run `npm run install-vault` first, then:

```powershell
& tools/perf/check.ps1
```

About 2 minutes; don't type in Obsidian meanwhile. It types in an action
line at about 120 and 500 pages with Scribidian off (plain Obsidian), in
script mode and in plain mode, then times Enter and Tab at 500 pages. Only
Scribidian runs (the Dev vault's other plugins are off for the session; add
`-WithPlugins` to keep them). Scribidian's cost is each mode minus plain
Obsidian in the same run, so a busy machine doesn't count against it.

It compares with `baseline.json` (committed) and prints a table, then
`PASS` (exit 0) or `FAIL` (exit 1). Fails when, compared with the baseline:

- Scribidian's typing cost grows by more than 3 ms (medians wobble about
  1.5 ms between runs);
- script mode's 95th percentile grows by over 50% and 15 ms, and is also
  15 ms above plain Obsidian's in the same run;
- a new long task (over 50 ms) appears while typing in script mode;
- Enter or Tab grows by over 25% and 5 ms.

On a fail, run it again; a repeat means a real slowdown to profile (below).
`-SaveBaseline` measures and saves a new baseline: do that after an
accepted change in speed. The baseline is for this machine; on another
computer, save a new one first. Results of the last run:
`%TEMP%/scribidian-perf/check-latest.json`.

## Typing latency

`latency.js` types real keystrokes (`document.execCommand("insertText")`)
into an action line in the middle of a test script and times each one to
the next painted frame. It also records long tasks (over 50 ms). On first
use it creates `Scribidian Example/Perf 2x.md` and `Perf 8x.md` (about 120
and 500 pages) from the EXFILTRATION note at the Dev vault root.

```powershell
obsidian vault=Dev eval code="window.__lat={tag:'run1',size:8,mode:'screenplay',where:'action',n:40,gap:90,pauseEvery:8,pause:600};'ok'"
```

```powershell
obsidian vault=Dev eval code="eval(require('fs').readFileSync('C:/Users/arunc/Code/firstdraft/tools/perf/latency.js','utf8'))"
```

Then read `%TEMP%/scribidian-perf/lat-run1.json` after about 35 seconds.

- `mode`: `screenplay` (script mode), `plain`, or `off` (Scribidian
  disabled for the run).
- `pauseEvery` and `pause`: stop after every N keystrokes, so background
  work (counts, safety passes) starts between bursts. Use 0 for none.

`enterlat.js` times Enter and Tab presses the same way
(`window.__ent={tag,size}`).

## Only the plugin under test

`soloplugins.js` turns every other community plugin off for the session
(`window.__solo='off'`) and back on (`window.__solo='on'`). It doesn't
change saved settings. Compare runs with your full plugin set and alone,
to tell what's yours.

## CPU profile

```powershell
node tools/perf/devbuild.mjs
```

That installs an unminified build in Dev (readable function names). Then:

```powershell
obsidian vault=Dev dev:debug on
```

```powershell
obsidian vault=Dev dev:cdp method=Profiler.start
```

Run a latency test, then:

```powershell
obsidian vault=Dev dev:cdp method=Profiler.stop | Out-File -Encoding utf8 "$env:TEMP/scribidian-perf/prof.json"
```

```powershell
node tools/perf/proftree.cjs "$env:TEMP/scribidian-perf/prof.json"
```

`proftree.cjs` lists the plugin's functions by inclusive and self time;
`profplug.cjs` splits the time by plugin. Afterwards, `npm run install-vault`
puts the normal build back.

## Behavior regression check

`regress.ps1` replays the recorded behavior cases (`cases/cases1.js` to
`cases25.js`, 214 cases) through `survey.js` with a given build, so two
builds can be compared case by case, including each line's layout kind.
Copy the two builds to `%TEMP%/scribidian-perf/main-old.js` and
`main-new.js`, then:

```powershell
& tools/perf/regress.ps1 -Build old
```

```powershell
& tools/perf/regress.ps1 -Build new
```

Compare the `reg-old-N.json` and `reg-new-N.json` files; any difference is a
behavior change to explain. `consist.js` checks the incremental layout
against a full pass after random edits.
