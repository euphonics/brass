const z = { key: "z", mods: { ctrlKey: true } };
const pre = "INT. HOUSE - DAY\n\nBOB\nYo.\n\n";
window.__surveyCases = [
  {
    name: "(beat|) under cue, nothing below",
    start: pre + "JEN\n(beat|)",
    steps: [{ key: "Enter" }],
  },
  {
    name: "(beat)| same, for comparison",
    start: pre + "JEN\n(beat)|",
    steps: [{ key: "Enter" }],
  },
  {
    name: "(beat|) with dialogue below",
    start: pre + "JEN\n(beat|)\nHi.",
    steps: [{ key: "Enter" }],
  },
  {
    name: "(beat|) after dialogue, nothing below",
    start: pre + "JEN\nHi.\n(beat|)",
    steps: [{ key: "Enter" }],
  },
  {
    name: "(beat)| after dialogue, for comparison",
    start: pre + "JEN\nHi.\n(beat)|",
    steps: [{ key: "Enter" }],
  },
  {
    name: "(be|at) mid-wryly",
    start: pre + "JEN\n(be|at)",
    steps: [{ key: "Enter" }],
  },
  {
    name: "(beat|) then undo",
    start: pre + "JEN\n(beat|)",
    steps: [{ key: "Enter" }, z],
  },
  {
    name: "Tab under cue, Enter (#222)",
    start: pre + "JEN\n|",
    steps: [{ key: "Tab" }, { key: "Enter" }],
  },
];
("ok");
