window.__surveyCases = [
  {
    name: "256 mini slug offers a bare item",
    start: "Jen waits.\n\n.HALL - NIGHT\n\nJen waits.\n\n|",
    steps: [{ type: ".HA" }, { key: "ArrowDown" }, { key: "Enter" }],
  },
  {
    name: "256b bare first when last used bare",
    start:
      "Jen waits.\n\n.HALL - NIGHT\n\nJen waits.\n\n.HALL\n\nJen waits.\n\n|",
    steps: [{ type: ".HA" }, { key: "Enter" }],
  },
  {
    name: "255 + groups after names",
    start:
      "JENNA\nHi.\n\nINT. ROOM - DAY\n\nJEN\nHi.\n\nBLAKE\nHey.\n\nGEORGE\nYo.\n\nShe sees |",
    steps: [{ type: "+Je" }],
  },
  {
    name: "255b + Oxford list after a comma",
    start:
      "INT. ROOM - DAY\n\nJEN\nHi.\n\nBLAKE\nHey.\n\nGEORGE\nYo.\n\nShe sees |",
    steps: [{ type: "+Jen, B" }, { key: "Enter" }],
  },
];
