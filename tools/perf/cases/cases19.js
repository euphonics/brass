const pre =
  "Jen.\n\nINT. KITCHEN - DAY\n\nToast.\n\nINT. KITCHEN - NIGHT (FLASHBACK)\n\nDark.\n\nINT. KITCHEN HALLWAY - DAWN\n\nX.\n\n";
const pl = app.plugins.plugins.scribidian;
window.__savedSlug = [
  pl.settings.offerFullSlugs,
  pl.settings.slugSuggestionOrder,
];
pl.settings.offerFullSlugs = true;
pl.settings.slugSuggestionOrder = ["recent", "shortest"];
window.__surveyCases = [
  {
    name: "full, recent first",
    start: pre + "INT. K|",
    steps: [{ type: "I" }],
  },
  {
    name: "pick full slug",
    start: pre + "INT. K|",
    steps: [{ type: "I" }, { key: "Enter" }],
  },
  {
    name: "pick location (2nd)",
    start: pre + "INT. K|",
    steps: [{ type: "I" }, { key: "ArrowDown" }, { key: "Enter" }],
  },
];
("ok");
