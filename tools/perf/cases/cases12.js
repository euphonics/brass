const pre =
  "INT. HOUSE - DAY\n\nJen grabs $killer's_knife and $car_keys. $car_keys jingle. $cat sleeps. It costs $12.\n\nJEN\nWhere's $killer's_knife?\n\n";
window.__surveyCases = [
  {
    name: "type $ in action",
    start: pre + "She takes |",
    steps: [{ type: "$" }],
  },
  { name: "type $ca", start: pre + "She takes |", steps: [{ type: "$ca" }] },
  {
    name: "type $ca, Enter",
    start: pre + "She takes |",
    steps: [{ type: "$ca" }, { key: "Enter" }],
  },
  {
    name: "type $k, Tab",
    start: pre + "She takes |",
    steps: [{ type: "$k" }, { key: "Tab" }],
  },
  {
    name: "type $ in dialogue",
    start: pre + "JEN\nGive me |",
    steps: [{ type: "$" }],
  },
  {
    name: "type $1 (amount)",
    start: pre + "She pays |",
    steps: [{ type: "$1" }],
  },
  { name: "US$ no list", start: pre + "She pays US|", steps: [{ type: "$" }] },
];
("ok");
