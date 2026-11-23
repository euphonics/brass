const pre = "INT. HOUSE - DAY\n\nJen sits.\n\n";
window.__surveyCases = [
  {
    name: "Sentence caps action",
    start: pre + "Bob waits.|",
    steps: [
      {
        type: " she runs. he follows! why? mr. smith waits... then j. r stops.",
      },
    ],
  },
  {
    name: "Sentence caps after quote",
    start: pre + 'He says "Go."|',
    steps: [{ type: " then leaves." }],
  },
  {
    name: "Time recency",
    start:
      "Jen.\n\nINT. KITCHEN - DUSK\n\nDark.\n\nINT. HALL - DAY\n\nX.\n\nINT. KITCHEN -|",
    steps: [{ type: " " }],
  },
  {
    name: "Time recency other loc",
    start:
      "Jen.\n\nINT. KITCHEN - DUSK\n\nDark.\n\nINT. HALL - NIGHT\n\nX.\n\nINT. HALL -|",
    steps: [{ type: " " }],
  },
];
("ok");
