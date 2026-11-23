window.__surveyCases = [
  {
    name: "Enter at start of first dialogue",
    start: "TORI\nDid you tell them?\n\nVINCE\n|No.\n\nTORI\nwhy not?",
    steps: [{ key: "Enter" }],
  },
  {
    name: "Enter then Delete",
    start: "TORI\nDid you tell them?\n\nVINCE\n|No.\n\nTORI\nwhy not?",
    steps: [{ key: "Enter" }, { key: "Delete" }],
  },
  {
    name: "Enter then Backspace",
    start: "TORI\nDid you tell them?\n\nVINCE\n|No.\n\nTORI\nwhy not?",
    steps: [{ key: "Enter" }, { key: "Backspace" }],
  },
  {
    name: "Enter then type",
    start: "TORI\nDid you tell them?\n\nVINCE\n|No.\n\nTORI\nwhy not?",
    steps: [{ key: "Enter" }, { type: "Well" }],
  },
  {
    name: "Enter at start of 2nd dialogue line",
    start: "VINCE\nNo.\n|Never.\n\nTORI\nwhy not?",
    steps: [{ key: "Enter" }],
  },
  {
    name: "2nd line Enter then Delete",
    start: "VINCE\nNo.\n|Never.\n\nTORI\nwhy not?",
    steps: [{ key: "Enter" }, { key: "Delete" }],
  },
];
("ok");
