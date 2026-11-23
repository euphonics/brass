window.__surveyCases = [
  {
    name: "208 Enter at wryly end",
    start: "VINCE\n(quietly)|\nNo.\n\nTORI\nWhy?",
    steps: [{ key: "Enter" }],
  },
  {
    name: "208 Enter before wryly bracket",
    start: "VINCE\n(quietly|)\nNo.\n\nTORI\nWhy?",
    steps: [{ key: "Enter" }, { type: "X" }],
  },
  {
    name: "208 Enter at cue end unchanged",
    start: "VINCE|\nNo.\n\nTORI\nWhy?",
    steps: [{ key: "Enter" }],
  },
  {
    name: "209 Enter splits dialogue",
    start: "VINCE\nNo. |Never.\n\nTORI\nWhy?",
    steps: [{ key: "Enter" }],
  },
  {
    name: "209 Enter splits action",
    start: "INT. HOUSE - DAY\n\nShe runs. |He walks.",
    steps: [{ key: "Enter" }],
  },
  {
    name: "214 type cut to:",
    start: "She runs.\n\n|",
    steps: [{ type: "cut to:" }],
  },
  {
    name: "214 sentence untouched",
    start: "She runs.\n\n|",
    steps: [{ type: "She walks over to:" }],
  },
  {
    name: "214 no blank above",
    start: "She runs.\n|",
    steps: [{ type: "cut to:" }],
  },
];
("ok");
