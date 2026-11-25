const fs = require("fs");
let j = JSON.parse(fs.readFileSync(process.argv[2], "utf8").replace(/^﻿/, ""));
const p = j.profile || j;
const byId = new Map(p.nodes.map((n) => [n.id, n]));
const parent = new Map();
for (const n of p.nodes) for (const c of n.children || []) parent.set(c, n.id);
const counts = new Map();
p.samples.forEach((id, i) =>
  counts.set(id, (counts.get(id) || 0) + (p.timeDeltas[i] || 0)),
);
const plug = (u) => {
  const m = decodeURIComponent(u || "").match(/plugins\/([^/?#]+)/);
  return m ? m[1] : null;
};
const byPlugin = new Map();
const scrib = new Map();
for (const [id, us] of counts) {
  let cur = id,
    outer = null,
    stack = [];
  while (cur !== undefined) {
    const n = byId.get(cur);
    const pl = plug(n.callFrame.url);
    if (pl && !outer) outer = pl;
    stack.push(n);
    cur = parent.get(cur);
  }
  const key =
    outer ||
    (stack[0].callFrame.functionName.startsWith("(")
      ? stack[0].callFrame.functionName
      : "obsidian/codemirror");
  byPlugin.set(key, (byPlugin.get(key) || 0) + us);
  const s = stack.filter((n) => plug(n.callFrame.url) === "brass");
  if (s.length) {
    const top = s[s.length - 1];
    const l =
      (top.callFrame.functionName || "anon") +
      ":" +
      (top.callFrame.lineNumber + 1);
    scrib.set(l, (scrib.get(l) || 0) + us);
  }
}
console.log("By plugin (outermost frame), ms:");
[...byPlugin]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 14)
  .forEach(([k, v]) => console.log((v / 1000).toFixed(0).padStart(6), k));
console.log("Brass entry points, ms:");
[...scrib]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 15)
  .forEach(([k, v]) => console.log((v / 1000).toFixed(0).padStart(6), k));
