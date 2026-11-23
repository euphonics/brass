window.__surveyHead =
  '---\nscreenplay: true\ncharacters: [Silent Man, "[[Old Woman]]", Jen]\n---\n\nINT. HALL - NIGHT\n\n';
const pre = "JEN\nHi.\n\n";
window.__surveyCases = [
  { name: "cue list at new block", start: pre + "|", steps: [{ type: "S" }] },
  {
    name: "Tab cue list (all)",
    start: pre + "Jen sits.|",
    steps: [{ key: "Tab" }],
  },
  { name: "+ list", start: pre + "She sees |", steps: [{ type: "+" }] },
  {
    name: "+si Enter",
    start: pre + "She sees |",
    steps: [{ type: "+si" }, { key: "Enter" }],
  },
  {
    name: "+ol Enter",
    start: pre + "She sees |",
    steps: [{ type: "+ol" }, { key: "Enter" }],
  },
  {
    name: "cue OL Enter",
    start: pre + "|",
    steps: [{ type: "OL" }, { key: "Enter" }],
  },
];
("ok");
