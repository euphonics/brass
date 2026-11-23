const pre = "INT. HOUSE - DAY\n\nJEN\nHi.\n\n";
window.__surveyCases = [
  {
    name: "Enter start of action (after dialogue)",
    start: pre + "|Jen sits.\n\nMore.",
    steps: [{ key: "Enter" }],
  },
  {
    name: "Enter start of action (after action)",
    start: pre + "Jen sits.\n\n|Bob stands.\n\nMore.",
    steps: [{ key: "Enter" }],
  },
  {
    name: "Enter start of last action",
    start: pre + "Jen sits.\n\n|Bob stands.",
    steps: [{ key: "Enter" }],
  },
  {
    name: "Enter start of action after slug",
    start: "|Jen sits.\n\nMore.",
    steps: [{ key: "Enter" }],
  },
  {
    name: "Enter start of dialogue",
    start: pre + "BOB\n|Yo there.\n\nMore.",
    steps: [{ key: "Enter" }],
  },
  {
    name: "Enter start of cue",
    start: pre + "Jen sits.\n\n|BOB\nYo.\n\nMore.",
    steps: [{ key: "Enter" }],
  },
];
("ok");
