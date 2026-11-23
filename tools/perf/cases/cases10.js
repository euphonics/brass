const z = { key: "z", mods: { ctrlKey: true } };
const pre = "INT. HOUSE - DAY\n\nBOB\nYo.\n\n";
window.__surveyCases = [
  {
    name: "Tab under cue, Enter (user's case)",
    start: pre + "JEN\n|",
    steps: [{ key: "Tab" }, { key: "Enter" }],
  },
  {
    name: "  ...then type",
    start: pre + "JEN\n|",
    steps: [{ key: "Tab" }, { key: "Enter" }, { type: "Hi" }],
  },
  {
    name: "  ...then undo",
    start: pre + "JEN\n|",
    steps: [{ key: "Tab" }, { key: "Enter" }, z],
  },
  {
    name: "Tab under cue, Down, Enter",
    start: pre + "JEN\n|",
    steps: [{ key: "Tab" }, { key: "ArrowDown" }, { key: "Enter" }],
  },
  {
    name: "Tab start of dialogue, Enter",
    start: pre + "JEN\n|Hi there.",
    steps: [{ key: "Tab" }, { key: "Enter" }],
  },
  {
    name: "Tab end of dialogue, Enter",
    start: pre + "JEN\nHi.|",
    steps: [{ key: "Tab" }, { key: "Enter" }],
  },
  {
    name: "Tab under cue, Escape, Enter",
    start: pre + "JEN\n|",
    steps: [{ key: "Tab" }, { key: "Escape" }, { key: "Enter" }],
  },
  {
    name: "Typed wryly Enter",
    start: pre + "JEN\n(qui|)",
    steps: [{ key: "Enter" }],
  },
];
("ok");
