const pl = app.plugins.plugins.brass;
window.__savedTriggers = [
  pl.settings.variablePrefix,
  pl.settings.characterMentionPrefix,
];
pl.settings.variablePrefix = "%";
pl.settings.characterMentionPrefix = "&";
app.workspace.updateOptions();
const pre = "JEN\nHi.\n\nShe takes %car_keys and %cat. Costs $5.\n\n";
window.__surveyCases = [
  { name: "% list", start: pre + "Then |", steps: [{ type: "%" }] },
  { name: "$ no list now", start: pre + "Then |", steps: [{ type: "$" }] },
  { name: "& list", start: pre + "She sees |", steps: [{ type: "&" }] },
  {
    name: "&je Enter",
    start: pre + "She sees |",
    steps: [{ type: "&je" }, { key: "Enter" }],
  },
  { name: "+ no list now", start: pre + "She sees |", steps: [{ type: "+" }] },
  { name: "R&D no list", start: pre + "R|", steps: [{ type: "&" }] },
];
("ok");
