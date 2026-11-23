const pl = app.plugins.plugins.scribidian;
const C = (on) => [
  {
    name: (on ? "on" : "off") + ": cue end, dialogue below",
    start: "Jen walks.\n\nBOB|\nDialogue.\n",
    steps: [{ set: on }, { key: "Enter" }],
  },
  {
    name: (on ? "on" : "off") + ": tag before ), dialogue below",
    start: "Jen walks.\n\nBOB (MY TAG|)\nDialogue.\n",
    steps: [{ set: on }, { key: "Enter" }],
  },
  {
    name: (on ? "on" : "off") + ": cue end, wryly below",
    start: "Jen walks.\n\nBOB|\n(beat)\nHi.\n",
    steps: [{ set: on }, { key: "Enter" }],
  },
];
window.__surveyCases = [...C(true), ...C(false)];
("ok");
