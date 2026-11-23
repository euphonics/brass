# Copyright 2026 arvn
# Licensed under the Apache License, Version 2.0 (see LICENSE).
#
# One-command typing-speed check (Dev vault only). Run before every public
# release (docs/RELEASING.md). It installs nothing: it measures the build
# that is installed in the Dev vault now (run `npm run install-vault` first).
#
#   & tools/perf/check.ps1              # compare with tools/perf/baseline.json
#   & tools/perf/check.ps1 -SaveBaseline  # measure and save a new baseline
#
# Takes about 2 minutes. Don't type in Obsidian meanwhile.
#
# Runs, at about 120 and 500 pages (Perf 2x / Perf 8x):
#   - typing in an action line with Scribidian off ("vanilla" Obsidian),
#     in script mode and in plain (Fountain) mode;
#   - Enter and Tab presses in script mode at 500 pages.
# Scribidian's own cost is script/plain minus vanilla, measured in the same
# run, so a slower or busier machine doesn't count as a regression.
# Exit code 0 = pass, 1 = slower than the baseline, 2 = a run failed.
param(
  [switch]$SaveBaseline,
  [switch]$WithPlugins,     # keep the Dev vault's other plugins on (noisier)
  [int]$Keys = 60,
  [string]$Baseline = "$PSScriptRoot/baseline.json"
)

$ErrorActionPreference = "Stop"
# Default: only Scribidian runs (other plugins off for the session, not
# saved), so the numbers measure Scribidian and stay steady between runs.
$Solo = -not $WithPlugins
$tools = ($PSScriptRoot -replace '\\', '/')
$out = "$env:TEMP/scribidian-perf"
New-Item -ItemType Directory -Force $out | Out-Null

function Invoke-Dev([string]$code) {
  obsidian vault=Dev eval code="$code" | Out-Null
}

function Wait-File([string]$file, [datetime]$after, [int]$timeout = 120) {
  for ($i = 0; $i -lt $timeout; $i++) {
    Start-Sleep 1
    if ((Test-Path $file) -and (Get-Item $file).LastWriteTime -gt $after) {
      Start-Sleep -Milliseconds 300
      return Get-Content $file -Raw | ConvertFrom-Json
    }
  }
  throw "Timed out waiting for $file"
}

function Measure-Typing([int]$size, [string]$mode) {
  $tag = "check-$size-$mode"
  $file = "$out/lat-$tag.json"
  $now = Get-Date
  Invoke-Dev "window.__lat={tag:'$tag',size:$size,mode:'$mode',where:'action',n:$Keys,gap:90,pauseEvery:8,pause:600};'ok'"
  Invoke-Dev "eval(require('fs').readFileSync('$tools/latency.js','utf8'))"
  $r = Wait-File $file $now
  $long = @($r.longtasks | Where-Object { $_ -gt 50 }).Count
  [pscustomobject]@{ median = $r.latency.median; p95 = $r.latency.p95; long = $long }
}

function Measure-EnterTab() {
  $file = "$out/ent-check.json"
  $now = Get-Date
  Invoke-Dev "window.__ent={tag:'check',size:8};'ok'"
  Invoke-Dev "eval(require('fs').readFileSync('$tools/enterlat.js','utf8'))"
  Wait-File $file $now
}

# Dev vault only; bring it to the front (typing needs focus).
$vault = (obsidian vault=Dev eval code="app.vault.getName()") -join ""
if ($vault -notmatch "Dev") { Write-Error "The Dev vault isn't open."; exit 2 }

$started = Get-Date
try {
  if ($Solo) { Invoke-Dev "window.__solo='off';eval(require('fs').readFileSync('$tools/soloplugins.js','utf8'))"; Start-Sleep 3 }
  $result = [ordered]@{
    date    = (Get-Date -Format "yyyy-MM-dd HH:mm")
    commit  = (git -C "$PSScriptRoot/../.." rev-parse --short HEAD)
    solo    = [bool]$Solo
    keys    = $Keys
    typing  = [ordered]@{}
  }
  foreach ($size in 2, 8) {
    $row = [ordered]@{}
    foreach ($mode in "off", "screenplay", "plain") {
      Write-Host -NoNewline "  typing ${size}x $mode ... "
      $m = Measure-Typing $size $mode
      Write-Host "$($m.median) ms"
      $row[$mode] = $m
    }
    $row["scriptCost"] = [math]::Round($row.screenplay.median - $row.off.median, 1)
    $row["plainCost"] = [math]::Round($row.plain.median - $row.off.median, 1)
    $result.typing["$size"] = $row
  }
  Write-Host -NoNewline "  Enter and Tab 8x ... "
  $e = Measure-EnterTab
  Write-Host "Enter $($e.enter.median) ms, Tab $($e.tab.median) ms"
  $result["enter"] = $e.enter.median
  $result["tab"] = $e.tab.median
}
catch {
  Write-Error $_
  exit 2
}
finally {
  if ($Solo) { Invoke-Dev "window.__solo='on';eval(require('fs').readFileSync('$tools/soloplugins.js','utf8'))" }
}

$result | ConvertTo-Json -Depth 6 | Out-File -Encoding utf8 "$out/check-latest.json"
$minutes = [math]::Round(((Get-Date) - $started).TotalMinutes, 1)

if ($SaveBaseline) {
  $result | ConvertTo-Json -Depth 6 | Out-File -Encoding utf8 $Baseline
  "Saved baseline ($minutes min): $Baseline"
  exit 0
}
if (-not (Test-Path $Baseline)) { "No baseline yet: run with -SaveBaseline."; exit 2 }
$base = Get-Content $Baseline -Raw | ConvertFrom-Json
if ($base.solo -ne [bool]$Solo) { Write-Warning "Baseline solo=$($base.solo), this run solo=${Solo}: not comparable." }

# Limits: Scribidian's own cost may grow by 3 ms (medians wobble about
# 1.5 ms between runs; the slowdowns fixed in #267 were 10-40 ms); the 95th
# percentile by 50% and 15 ms (and 15 ms over vanilla's in the same run);
# no new long tasks over 50 ms in script mode;
# Enter and Tab by 25% and 5 ms.
$fails = @()
$table = @()
foreach ($size in "2", "8") {
  $now = $result.typing[$size]; $was = $base.typing.$size
  foreach ($kind in @(@("script", "scriptCost", "screenplay"), @("plain", "plainCost", "plain"))) {
    $name = "$($size)x $($kind[0]) cost"; $n = $now[$kind[1]]; $w = $was.($kind[1])
    $ok = $n -le [math]::Max($w, 0) + 3
    if (-not $ok) { $fails += $name }
    $table += [pscustomobject]@{ check = $name; baseline = $w; now = $n; ok = $ok }
  }
  # A stray slow frame (the system, not Scribidian) hits vanilla too, so
  # p95 only fails when it is also well above vanilla's in this run.
  $n = $now.screenplay.p95; $w = $was.screenplay.p95; $v = $now.off.p95
  $ok = -not ($n -gt $w * 1.5 -and $n -gt $w + 15 -and $n -gt $v + 15)
  if (-not $ok) { $fails += "$($size)x script p95" }
  $table += [pscustomobject]@{ check = "$($size)x script p95"; baseline = $w; now = $n; ok = $ok }
  $n = $now.screenplay.long; $w = $was.screenplay.long
  $ok = $n -le $w
  if (-not $ok) { $fails += "$($size)x long tasks" }
  $table += [pscustomobject]@{ check = "$($size)x long tasks"; baseline = $w; now = $n; ok = $ok }
}
foreach ($k in "enter", "tab") {
  $n = $result[$k]; $w = $base.$k
  $ok = -not ($n -gt $w * 1.25 -and $n -gt $w + 5)
  if (-not $ok) { $fails += "8x $k" }
  $table += [pscustomobject]@{ check = "8x $k"; baseline = $w; now = $n; ok = $ok }
}
$table | Format-Table -AutoSize | Out-String | Write-Host
"Vanilla typing: 2x $($result.typing['2'].off.median) ms, 8x $($result.typing['8'].off.median) ms (baseline $($base.typing.'2'.off.median), $($base.typing.'8'.off.median)). Took $minutes min."
if ($fails.Count -gt 0) {
  "FAIL: $($fails -join ', '). Rerun once to rule out noise; if it repeats, profile (tools/perf/README.md)."
  exit 1
}
"PASS"
exit 0
