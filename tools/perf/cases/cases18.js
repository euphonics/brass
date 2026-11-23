const pre =
  "Jen.\n\nINT. KITCHEN - DAY\n\nToast.\n\nINT. KITCHEN - NIGHT (FLASHBACK)\n\nDark.\n\nINT. KITCHEN HALLWAY - DAY\n\nSteps.\n\nINT. KITCHEN HALLWAY - DAWN\n\nX.\n\n";
window.__surveyCases = [
  { name: "list at INT. KI", start: pre + "INT. K|", steps: [{ type: "I" }] },
  {
    name: "pick first, times list",
    start: pre + "INT. K|",
    steps: [{ type: "I" }, { key: "Enter" }],
  },
  {
    name: "pick first, Enter time",
    start: pre + "INT. K|",
    steps: [{ type: "I" }, { key: "Enter" }, { key: "Enter" }],
  },
];
("ok");
