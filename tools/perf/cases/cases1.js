window.__surveyCases = [
  {
    name: "102 natural transition list",
    start: "Jen waits.\n\n|",
    steps: [{ type: "CUT T" }],
  },
  { name: "102b smash", start: "Jen waits.\n\n|", steps: [{ type: "SMASH" }] },
  { name: "103 EST list", start: "Jen waits.\n\n|", steps: [{ type: "ES" }] },
  {
    name: "104 after Escape, INT",
    start: "JEN\nHi.\n|",
    steps: [{ key: "Enter" }, { key: "Escape" }, { type: "INT" }],
  },
  {
    name: "105 forced cue @j",
    start: "JEN\nHi.\n\nJen waits.\n\n|",
    steps: [{ type: "@j" }],
  },
  {
    name: "105b forced cue @",
    start: "JEN\nHi.\n\nJen waits.\n\n|",
    steps: [{ type: "@" }],
  },
  {
    name: "168 mixed forced transition",
    start: "Jen waits.\n\n|",
    steps: [{ type: ">Burn to White." }],
  },
  {
    name: "168b TO: space",
    start: "Jen waits.\n\n|\n\nINT. CAR - DAY",
    steps: [{ type: "CUT TO: " }],
  },
  {
    name: "84 lowercase name capitalized",
    start: "JEN\nHi.\n\nJen waits.\n\n|",
    steps: [{ type: "jen" }, { key: "Enter" }],
  },
  {
    name: "84b natural transition lowercase",
    start: "Jen waits.\n\n|",
    steps: [{ type: "cut to:" }],
  },
  {
    name: "enter after action",
    start: "Jen waits.|",
    steps: [{ key: "Enter" }],
  },
  {
    name: "enter after dialogue",
    start: "JEN\nHi.|",
    steps: [{ key: "Enter" }],
  },
  {
    name: "enter twice after dialogue",
    start: "JEN\nHi.|",
    steps: [{ key: "Enter" }, { key: "Enter" }],
  },
  {
    name: "enter after slugline",
    start: "Jen waits.\n\nEXT. ROAD - DAY|",
    steps: [{ key: "Enter" }],
  },
  {
    name: "tab on empty action line",
    start: "Jen waits.\n\n|",
    steps: [{ key: "Tab" }],
  },
  {
    name: "tab tab on empty",
    start: "Jen waits.\n\n|",
    steps: [{ key: "Tab" }, { key: "Escape" }, { key: "Tab" }],
  },
  {
    name: "type ( in dialogue line start",
    start: "JEN\n|",
    steps: [{ type: "(" }],
  },
  {
    name: "wryly enter",
    start: "JEN\n|",
    steps: [{ type: "(quietly" }, { key: "Enter" }],
  },
  {
    name: "type cue then enter",
    start: "Jen waits.\n\n|",
    steps: [{ type: "BOB" }, { key: "Escape" }, { key: "Enter" }],
  },
  {
    name: "backspace empty dialogue line",
    start: "JEN\nHi.\n|",
    steps: [{ key: "Backspace" }],
  },
  { name: "enter mid action", start: "Jen |waits.", steps: [{ key: "Enter" }] },
  {
    name: "enter mid dialogue",
    start: "JEN\nHi |there.",
    steps: [{ key: "Enter" }],
  },
  {
    name: "slug lowercase int.",
    start: "Jen waits.\n\n|",
    steps: [{ type: "int. kitchen - day" }],
  },
  {
    name: "slug tab after location",
    start: "Jen waits.\n\n|",
    steps: [{ type: "INT. KITCHEN" }, { key: "Tab" }],
  },
  {
    name: "cue extension type (",
    start: "Jen waits.\n\n|",
    steps: [{ type: "JEN (" }],
  },
  { name: "dual ^", start: "JEN\nHi.\n\n|", steps: [{ type: "BOB ^" }] },
  {
    name: "shift-enter in dialogue",
    start: "JEN\nHi.|",
    steps: [{ key: "Enter", mods: { shiftKey: true } }],
  },
  {
    name: "centered >",
    start: "Jen waits.\n\n|",
    steps: [{ type: "> THE END <" }],
  },
  {
    name: "ellipsis action start",
    start: "Jen waits.\n\n|",
    steps: [{ type: "...and then" }],
  },
  {
    name: "number start action",
    start: "Jen waits.\n\n|",
    steps: [{ type: "3 men" }],
  },
];
("ok");
