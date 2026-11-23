window.__surveyCases = [
  {
    name: "Shift-Enter then ( is wryly",
    start: "JEN\nHi.|",
    steps: [{ key: "Enter", mods: { shiftKey: true } }, { type: "(" }],
  },
  {
    name: "Enter on empty cue line (list open)",
    start: "JEN\nHi.\n|",
    steps: [{ key: "Enter" }, { key: "Enter" }],
  },
  {
    name: "Escape then Enter on empty cue line",
    start: "JEN\nHi.\n|",
    steps: [{ key: "Enter" }, { key: "Escape" }, { key: "Enter" }],
  },
  {
    name: "Tab picks character",
    start: "JEN\nHi.\n\nBOB\nYo.\n|",
    steps: [{ key: "Enter" }, { key: "Tab" }],
  },
  {
    name: "Type name, Tab",
    start: "JEN\nHi.\n\nJen waits.\n\n|",
    steps: [{ type: "JE" }, { key: "Tab" }],
  },
  {
    name: "Type name, Enter",
    start: "JEN\nHi.\n\nJen waits.\n\n|",
    steps: [{ type: "JE" }, { key: "Enter" }],
  },
  {
    name: "New name + Enter",
    start: "Jen waits.\n\n|",
    steps: [{ type: "ZED" }, { key: "Enter" }],
  },
  {
    name: "New name + Tab",
    start: "Jen waits.\n\n|",
    steps: [{ type: "ZED" }, { key: "Tab" }],
  },
  {
    name: "Wryly ( then Tab",
    start: "JEN\n|",
    steps: [{ type: "(qu" }, { key: "Tab" }],
  },
  {
    name: "Dialogue Enter Enter Enter",
    start: "JEN\nHi.|",
    steps: [{ key: "Enter" }, { key: "Escape" }, { key: "Enter" }],
  },
  {
    name: "Slug full flow",
    start: "Jen waits.\n\n|",
    steps: [
      { type: "EX" },
      { key: "Enter" },
      { type: "ROAD" },
      { key: "Tab" },
      { key: "Enter" },
    ],
  },
  {
    name: "Slug then Enter goes to action",
    start: "Jen waits.\n\n|",
    steps: [{ type: "EXT. ROAD - DAY" }, { key: "Escape" }, { key: "Enter" }],
  },
  {
    name: "Undo after cue typing",
    start: "Jen waits.\n\n|",
    steps: [
      { type: "ZED" },
      { key: "Escape" },
      { key: "z", mods: { ctrlKey: true } },
    ],
  },
  {
    name: "Backspace on wryly ()",
    start: "JEN\n(|)\nHi.",
    steps: [{ key: "Backspace" }],
  },
  {
    name: "Type ) at end of wryly with auto )",
    start: "JEN\n(beat|)",
    steps: [{ type: ")" }],
  },
  {
    name: "Enter at end of wryly",
    start: "JEN\n(beat)|",
    steps: [{ key: "Enter" }],
  },
  {
    name: "Enter at end of wryly with dialogue below",
    start: "JEN\n(beat)|\nHi.",
    steps: [{ key: "Enter" }],
  },
  {
    name: "Tab in empty dialogue line",
    start: "JEN\n|",
    steps: [{ key: "Tab" }],
  },
  {
    name: "Shift-Tab in empty dialogue line",
    start: "JEN\n|",
    steps: [{ key: "Tab", mods: { shiftKey: true } }],
  },
  {
    name: "Type in action right after slug (no blank)",
    start: "EXT. ROAD - DAY\n|",
    steps: [{ type: "cars pass." }],
  },
  {
    name: "Tab on line after slug",
    start: "EXT. ROAD - DAY\n\n|",
    steps: [{ key: "Tab" }],
  },
  {
    name: "Cue with ^ then Enter",
    start: "JEN\nHi.\n\n|",
    steps: [{ type: "BOB ^" }, { key: "Enter" }],
  },
  {
    name: "Ext after name then Enter",
    start: "JEN\nHi.\n\nJen waits.\n\n|",
    steps: [{ type: "JEN (V.O.)" }, { key: "Escape" }, { key: "Enter" }],
  },
  {
    name: "Delete forward at end of dialogue (blank below)",
    start: "JEN\nHi.|\n\nShe goes.",
    steps: [{ key: "Delete" }],
  },
  {
    name: "Paste-ish: type period in action",
    start: "Jen waits|",
    steps: [{ type: "..." }],
  },
  {
    name: "Typing -- in dialogue",
    start: "JEN\nWait|",
    steps: [{ type: "--" }],
  },
  {
    name: "Lowercase cue column with list closed",
    start: "JEN\nHi.\n|",
    steps: [
      { key: "Enter" },
      { key: "Escape" },
      { key: "Tab" },
      { type: "bob" },
    ],
  },
];
("ok");
