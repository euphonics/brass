window.__surveyCases = [
  {
    name: "102 CUT T list",
    start: "Jen waits.\n\n|",
    steps: [{ type: "CUT T" }],
  },
  {
    name: "102 pick CUT TO:",
    start: "Jen waits.\n\n|",
    steps: [{ type: "CUT T" }, { key: "Enter" }],
  },
  {
    name: "102 pick then Enter",
    start: "Jen waits.\n\n|",
    steps: [{ type: "CUT T" }, { key: "Enter" }, { key: "Enter" }],
  },
  {
    name: "102 FADE pick",
    start: "Jen waits.\n\n|",
    steps: [{ type: "FADE O" }, { key: "Enter" }],
  },
  { name: "IN list", start: "Jen waits.\n\n|", steps: [{ type: "IN" }] },
  {
    name: "104 after Escape, IN",
    start: "JEN\nHi.\n|",
    steps: [{ key: "Enter" }, { key: "Escape" }, { type: "IN" }],
  },
  {
    name: "104 after Escape, JE (no list)",
    start: "JEN\nHi.\n|",
    steps: [{ key: "Enter" }, { key: "Escape" }, { type: "JE" }],
  },
  {
    name: "105 @j",
    start: "JEN\nHi.\n\nJen waits.\n\n|",
    steps: [{ type: "@j" }],
  },
  {
    name: "105 @j pick",
    start: "JEN\nHi.\n\nJen waits.\n\n|",
    steps: [{ type: "@j" }, { key: "Enter" }],
  },
  {
    name: "Tab in middle of action",
    start: "Jen |waits.",
    steps: [{ key: "Tab" }],
  },
  {
    name: "Enter at end of cue",
    start: "Jen waits.\n\nJEN|",
    steps: [{ key: "Enter" }],
  },
  {
    name: "Enter on empty dialogue line",
    start: "JEN\nHi.\n|",
    steps: [{ key: "Enter" }],
  },
  {
    name: "Backspace at start of dialogue",
    start: "JEN\n|Hi.",
    steps: [{ key: "Backspace" }],
  },
  {
    name: "Backspace at start of action after action",
    start: "Jen waits.\n\n|Bob sits.",
    steps: [{ key: "Backspace" }],
  },
  {
    name: "Backspace at start of slug",
    start: "Jen waits.\n\n|INT. CAR - DAY",
    steps: [{ key: "Backspace" }],
  },
  {
    name: "Delete at end of cue",
    start: "Jen waits.\n\nJEN|\nHi.",
    steps: [{ key: "Delete" }],
  },
  {
    name: "Type in middle of slug lower",
    start: "Jen waits.\n\nINT. CAR| - DAY",
    steps: [{ type: "go" }],
  },
  { name: "Tab end of dialogue", start: "JEN\nHi.|", steps: [{ key: "Tab" }] },
  { name: "Tab end of action", start: "Jen waits.|", steps: [{ key: "Tab" }] },
  {
    name: "Shift-Tab on cue line",
    start: "Jen waits.\n\nJEN|",
    steps: [{ key: "Tab", mods: { shiftKey: true } }],
  },
  {
    name: "Type parenthetical mid dialogue",
    start: "JEN\nHi.|",
    steps: [{ key: "Enter", mods: { shiftKey: true } }, { type: "(" }],
  },
  { name: "Type ) closes", start: "JEN\n|", steps: [{ type: "(beat)" }] },
  {
    name: "CONT'D-free: same speaker again",
    start: "JEN\nHi.\n\nShe waits.\n\n|",
    steps: [{ key: "Tab" }],
  },
  {
    name: "Ctrl+Space empty line",
    start: "Jen waits.\n\n|",
    steps: [{ key: " ", mods: { ctrlKey: true } }],
  },
  {
    name: "Enter after transition",
    start: "Jen waits.\n\n> CUT TO:|",
    steps: [{ key: "Enter" }],
  },
  {
    name: "Enter after centered",
    start: "Jen waits.\n\n> THE END <|",
    steps: [{ key: "Enter" }],
  },
  {
    name: "Type lower after slug",
    start: "INT. CAR - DAY\n\n|",
    steps: [{ type: "she drives." }],
  },
  {
    name: "Type i at action start",
    start: "Jen waits.\n\n|",
    steps: [{ type: "i think" }],
  },
  {
    name: "Type O.S. ext",
    start: "Jen waits.\n\n|",
    steps: [{ type: "JEN (o.s." }],
  },
  {
    name: "Dialogue lowercase first",
    start: "JEN\n|",
    steps: [{ type: "hi there." }],
  },
  {
    name: "Enter on empty line after action",
    start: "Jen waits.\n\n|",
    steps: [{ key: "Enter" }],
  },
];
("ok");
