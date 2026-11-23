const st = { key: "Tab", mods: { shiftKey: true } };
window.__surveyHead =
  "---\nscreenplay: true\n---\n\nINT. BARN - NIGHT\n\nHay.\n\nEXT. YARD - DAY\n\nMud.\n\nJEN\nHi.\n\n";
window.__surveyCases = [
  {
    name: "287 Shift+Tab at slug end",
    start: "Jen waits.\n\nINT. BARN - DAY|",
    steps: [st],
  },
  {
    name: "287b twice",
    start: "Jen waits.\n\nINT. BARN - DAY|",
    steps: [st, st],
  },
  {
    name: "287c three times",
    start: "Jen waits.\n\nINT. BARN - DAY|",
    steps: [st, st, st],
  },
  {
    name: "287d pick from list after Shift+Tab",
    start: "Jen waits.\n\nINT. BARN - DAY|",
    steps: [st, { key: "ArrowDown" }, { key: "Enter" }],
  },
  {
    name: "287e cue extension",
    start: "Jen waits.\n\nJEN (V.O.)|\nHello.",
    steps: [st],
  },
  {
    name: "287f action untouched",
    start: "Jen waits.\n\nShe runs|.",
    steps: [st],
  },
  {
    name: "286 +Jenandb",
    start:
      "INT. ROOM - DAY\n\nJEN\nHi.\n\nBLAKE\nHey.\n\nGEORGE\nYo.\n\nShe sees |",
    steps: [{ type: "+Jenandb" }],
  },
  {
    name: "286b +j,b",
    start:
      "INT. ROOM - DAY\n\nJEN\nHi.\n\nBLAKE\nHey.\n\nGEORGE\nYo.\n\nShe sees |",
    steps: [{ type: "+j,b" }],
  },
];
