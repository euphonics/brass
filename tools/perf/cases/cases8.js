const z = { key: "z", mods: { ctrlKey: true } };
window.__surveyCases = [
  {
    name: "Enter on empty wryly after dialogue",
    start: "JEN\nHi.\n(|)",
    steps: [{ key: "Enter" }],
  },
  {
    name: "  ...then one undo",
    start: "JEN\nHi.\n(|)",
    steps: [{ key: "Enter" }, z],
  },
  {
    name: "Tab under empty wryly",
    start: "JEN\nHi.\n()\n|",
    steps: [{ key: "Tab" }],
  },
  {
    name: "  ...then one undo",
    start: "JEN\nHi.\n()\n|",
    steps: [{ key: "Tab" }, z],
  },
  {
    name: "Enter under empty wryly",
    start: "JEN\nHi.\n()\n|",
    steps: [{ key: "Enter" }],
  },
  {
    name: "  ...then one undo",
    start: "JEN\nHi.\n()\n|",
    steps: [{ key: "Enter" }, z],
  },
  {
    name: "Enter end of dialogue, undo",
    start: "JEN\nHi.|",
    steps: [{ key: "Enter" }, z],
  },
  {
    name: "Enter at wryly end (208)",
    start: "JEN\n(quietly)|\nHi.",
    steps: [{ key: "Enter" }],
  },
  {
    name: "Enter blank speech line",
    start: "JEN\nHi.\n|Bye.",
    steps: [{ key: "Enter" }],
  },
  {
    name: "VINCE first line Enter",
    start: "VINCE\n|No.",
    steps: [{ key: "Enter" }],
  },
];
("ok");
