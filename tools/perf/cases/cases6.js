window.__namesWas = app.plugins.plugins.scribidian.settings.namesInAction;
app.plugins.plugins.scribidian.settings.namesInAction = true;
const base = "INT. HOUSE - DAY\n\nJENNY\nHi.\n\nTHEO\nYo.\n\n";
window.__surveyCases = [
  {
    name: "list in action",
    start: base + "She sees |",
    steps: [{ type: "JE" }],
  },
  {
    name: "Enter picks",
    start: base + "She sees |",
    steps: [{ type: "JE" }, { key: "Enter" }, { type: " wave." }],
  },
  { name: "cue at block start", start: base + "|", steps: [{ type: "JE" }] },
  {
    name: "dialogue untouched",
    start: "INT. HOUSE - DAY\n\nJENNY\nI saw |\n\nTHEO\nYo.",
    steps: [{ type: "TH" }],
  },
  {
    name: "lower case quiet",
    start: base + "She sees |",
    steps: [{ type: "je" }],
  },
];
("ok");
