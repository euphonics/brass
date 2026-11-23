const z = { key: "z", mods: { ctrlKey: true } };
const pre = "INT. HOUSE - DAY\n\nJEN\nHi.\n\nBOB\nYo.\n\n";
window.__surveyCases = [
  {
    name: "Tab end of action",
    start: pre + "Jen sits.|",
    steps: [{ key: "Tab" }],
  },
  {
    name: "Tab end of action, type B",
    start: pre + "Jen sits.|",
    steps: [{ key: "Tab" }, { type: "B" }],
  },
  {
    name: "Tab end of action, undo",
    start: pre + "Jen sits.|",
    steps: [{ key: "Tab" }, z],
  },
  {
    name: "Enter end of dialogue",
    start: pre + "JEN\nOkay.|",
    steps: [{ key: "Enter" }],
  },
  {
    name: "Enter end of dialogue, type B",
    start: pre + "JEN\nOkay.|",
    steps: [{ key: "Enter" }, { type: "B" }],
  },
  {
    name: "Tab end of dialogue",
    start: pre + "JEN\nOkay.|",
    steps: [{ key: "Tab" }],
  },
  {
    name: "Tab after slug dash",
    start: pre + "INT. HOUSE - |",
    steps: [{ key: "Tab" }],
  },
  {
    name: "Enter end of action",
    start: pre + "Jen sits.|",
    steps: [{ key: "Enter" }],
  },
  {
    name: "Tab blank line after action",
    start: pre + "Jen sits.\n\n|",
    steps: [{ key: "Tab" }],
  },
  {
    name: "Tab twice blank after action",
    start: pre + "Jen sits.\n\n|",
    steps: [{ key: "Tab" }, { key: "Tab" }],
  },
];
("ok");
