const z = { key: "z", mods: { ctrlKey: true } };
window.__surveyCases = [
  {
    name: "Enter end of dialogue, undo",
    start: "JEN\nHi.|",
    steps: [{ key: "Enter" }, z],
  },
  {
    name: "Enter on cut to:, undo",
    start: "She runs.\n\ncut to|",
    steps: [{ type: ":" }, { key: "Enter" }, z],
  },
  {
    name: "Enter on empty wryly after dialogue, undo",
    start: "JEN\nHi.\n(|)",
    steps: [{ key: "Enter" }, z],
  },
  {
    name: "Tab after slugline type, undo",
    start: "INT|",
    steps: [{ key: "Tab" }, z],
  },
  {
    name: "pick character, undo",
    start: "JEN\nHi.\n\nTOM\nYo.\n\n|",
    steps: [{ type: "JE" }, { key: "Enter" }, z],
  },
];
("ok");
