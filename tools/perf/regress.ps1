param([string]$Build, [string]$Cases = "$PSScriptRoot/cases")
# Runs each casesN.js in $Cases through survey.js with main-$Build.js installed,
# saving reg-$Build-N.json for comparison (see README). Stops with an error
# if a case file produces no fresh result, instead of copying an old one.
$ErrorActionPreference = "Stop"
# Forward slashes: these paths go into JavaScript strings, where "\" escapes.
$tools = $PSScriptRoot -replace '\\', '/'
$Cases = $Cases -replace '\\', '/'
$s = "$env:TEMP/brass-perf" -replace '\\', '/'
New-Item -ItemType Directory -Force $s | Out-Null
$plugin = "C:/Users/arunc/Code/Obsidian Dev Vault/Dev/.obsidian/plugins/brass/main.js"
Copy-Item "$s/main-$Build.js" $plugin -Force
obsidian vault=Dev eval code="(async()=>{await app.plugins.disablePlugin('brass'); await app.plugins.enablePlugin('brass'); return 'ok'})()" | Out-Null
Start-Sleep 2
$out = "$s/survey-out.json"
$ran = 0
foreach ($n in 1..99) {
  $case = "$Cases/cases$n.js"
  if (-not (Test-Path $case)) { continue }
  Remove-Item $out -ErrorAction SilentlyContinue
  obsidian vault=Dev eval code="delete window.__surveyHead; delete window.__savedSlug; true" | Out-Null
  obsidian vault=Dev eval code="eval(require('fs').readFileSync('$case','utf8'))" | Out-Null
  obsidian vault=Dev eval code="eval(require('fs').readFileSync('$tools/survey.js','utf8'))" | Out-Null
  $waited = 0
  while ($waited -lt 180 -and -not (Test-Path $out)) { Start-Sleep 1; $waited++ }
  if (-not (Test-Path $out)) { throw "cases$n.js produced no result in 180 s" }
  Start-Sleep -Milliseconds 300
  Copy-Item $out "$s/reg-$Build-$n.json" -Force
  $ran++
}
"done $Build ($ran case files)"
