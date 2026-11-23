const pre =
  "INT. HOUSE - DAY\n\nJEN\nHi.\n\nMCALLISTER\nYo.\n\nMARY ANN\nHey.\n\nMcAllister waves.\n\n";
window.__surveyCases = [
  {
    name: "+ mid action",
    start: pre + "She looks at |",
    steps: [{ type: "+" }],
  },
  {
    name: "+je Enter",
    start: pre + "She looks at |",
    steps: [{ type: "+je" }, { key: "Enter" }],
  },
  {
    name: "+JE Enter",
    start: pre + "She looks at |",
    steps: [{ type: "+JE" }, { key: "Enter" }],
  },
  {
    name: "+mc Enter (note spelling)",
    start: pre + "She looks at |",
    steps: [{ type: "+mc" }, { key: "Enter" }],
  },
  {
    name: "+mary a Enter",
    start: pre + "She looks at |",
    steps: [{ type: "+mary a" }, { key: "Enter" }],
  },
  {
    name: "+ then type more after pick",
    start: pre + "She looks at |",
    steps: [{ type: "+je" }, { key: "Enter" }, { type: " and" }],
  },
  {
    name: "+ at start of new block",
    start: pre + "|",
    steps: [{ type: "+j" }],
  },
  {
    name: "+ at block start, Enter",
    start: pre + "|",
    steps: [{ type: "+j" }, { key: "Enter" }],
  },
  {
    name: "+ in dialogue (no list)",
    start: pre + "JEN\nI saw |",
    steps: [{ type: "+" }],
  },
  {
    name: "C++ (no list)",
    start: pre + "She codes C+|",
    steps: [{ type: "+" }],
  },
  {
    name: "+zz (no match)",
    start: pre + "She looks at |",
    steps: [{ type: "+zz" }],
  },
  {
    name: "+je Escape",
    start: pre + "She looks at |",
    steps: [{ type: "+je" }, { key: "Escape" }],
  },
];
("ok");
