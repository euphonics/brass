param([string]$Build, [string]$Cases = "$PSScriptRoot/cases")
# Runs each casesN.js in $Cases through survey.js with main-$Build.js installed,
# saving reg-$Build-N.json for comparison (see README).
$tools = $PSScriptRoot
$s = "$env:TEMP/scribidian-perf"
New-Item -ItemType Directory -Force $s | Out-Null
$plugin = "C:/Users/arunc/Code/Obsidian Dev Vault/Dev/.obsidian/plugins/scribidian/main.js"
Copy-Item "$s/main-$Build.js" $plugin -Force
obsidian vault=Dev eval code="(async()=>{await app.plugins.disablePlugin('scribidian'); await app.plugins.enablePlugin('scribidian'); return 'ok'})()" | Out-Null
Start-Sleep 2
$out = "$s/survey-out.json"
foreach ($n in 1..22) {
  $case = "$Cases/cases$n.js"
  if (-not (Test-Path $case)) { continue }
  $before = if (Test-Path $out) { (Get-Item $out).LastWriteTime } else { [datetime]::MinValue }
  obsidian vault=Dev eval code="delete window.__surveyHead; delete window.__savedSlug; true" | Out-Null
  obsidian vault=Dev eval code="eval(require('fs').readFileSync('$case','utf8'))" | Out-Null
  obsidian vault=Dev eval code="eval(require('fs').readFileSync('$tools/survey.js','utf8'))" | Out-Null
  $waited = 0
  while ($waited -lt 120) {
    Start-Sleep 1; $waited++
    if ((Test-Path $out) -and (Get-Item $out).LastWriteTime -gt $before) { break }
  }
  Copy-Item $out "$s/reg-$Build-$n.json" -Force
}
"done $Build"
