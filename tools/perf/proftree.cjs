// node proftree.cjs prof.json  -> brass functions by self and inclusive time (unminified names)
const fs = require("fs");
const p = JSON.parse(
  fs.readFileSync(process.argv[2], "utf8").replace(/^﻿/, ""),
);
const pr = p.profile || p;
const byId = new Map(pr.nodes.map((n) => [n.id, n]));
const parent = new Map();
for (const n of pr.nodes) for (const c of n.children || []) parent.set(c, n.id);
const counts = new Map();
pr.samples.forEach((id, i) =>
  counts.set(id, (counts.get(id) || 0) + (pr.timeDeltas[i] || 0)),
);
const isS = (n) => /brass/.test(decodeURIComponent(n.callFrame.url));
const self = new Map(),
  tot = new Map();
for (const [id, us] of counts) {
  const stack = [];
  let cur = id;
  while (cur !== undefined) {
    stack.push(byId.get(cur));
    cur = parent.get(cur);
  }
  if (!stack.some(isS)) continue;
  const leaf = stack[0];
  const lk =
    (leaf.callFrame.functionName || "anon") +
    (isS(leaf)
      ? ""
      : " [" +
        (decodeURIComponent(leaf.callFrame.url).split("/").pop() || "native") +
        "]");
  self.set(lk, (self.get(lk) || 0) + us);
  const seen = new Set();
  for (const n of stack) {
    if (!isS(n)) continue;
    const k = n.callFrame.functionName || "anon";
    if (seen.has(k)) continue;
    seen.add(k);
    tot.set(k, (tot.get(k) || 0) + us);
  }
}
const pr2 = (m, n) =>
  [...m]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k, v]) => (v / 1000).toFixed(0).padStart(5) + " " + k)
    .join("\n");
console.log("INCLUSIVE (brass frames):\n" + pr2(tot, 30));
console.log("SELF (leaf frames, in brass stacks):\n" + pr2(self, 20));
