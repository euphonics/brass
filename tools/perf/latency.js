// window.__lat = { size: 2|8, mode: "screenplay"|"plain"|"off", where: "action"|"dialogue", n: 60, gap: 90 }
(async () => {
  const DIR = require("os").tmpdir().replace(/\\/g, "/") + "/brass-perf";
  require("fs").mkdirSync(DIR, { recursive: true });
  const fs = require("fs");
  const cfg = window.__lat;
  const OUT = `${DIR}/lat-${cfg.tag}.json`;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const frame = () =>
    new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
  if (app.vault.getName() !== "Dev") throw new Error("ABORT: Dev only");
  {
    const w = require("electron").remote?.getCurrentWindow?.();
    if (w) {
      w.show();
      w.focus();
    }
  }
  const path = `Brass Example/Perf ${cfg.size}x.md`;
  if (!app.vault.getAbstractFileByPath(path)) {
    const src = fs
      .readFileSync(
        "C:/Users/arunc/Code/Obsidian Dev Vault/Dev/2026.10.26 EXFILTRATION by Arun Croll BRASS.fountain",
        "utf8",
      )
      .replace(/^Title:[\s\S]*?\n\n/, "");
    await app.vault.create(
      path,
      "---\nscreenplay: true\n---\n\n" +
        Array.from({ length: cfg.size }, () => src).join("\n\n"),
    );
  }
  if (cfg.mode === "off") {
    if (app.plugins.plugins.brass)
      await app.plugins.disablePlugin("brass");
  } else if (!app.plugins.plugins.brass)
    await app.plugins.enablePlugin("brass");
  await wait(800);
  const pl = app.plugins.plugins.brass;
  const saved = pl ? pl.settings.editorLayout : null;
  if (pl) {
    pl.settings.editorLayout = cfg.mode === "plain" ? "plain" : "screenplay";
    app.workspace.updateOptions();
  }
  const f = app.vault.getAbstractFileByPath(path);
  let leaf = app.workspace
    .getLeavesOfType("markdown")
    .find((l) => l.view.file?.path === path);
  if (!leaf) {
    leaf = app.workspace.getLeaf("tab");
    await leaf.openFile(f);
  }
  app.workspace.setActiveLeaf(leaf, { focus: true });
  await wait(2500);
  const cm = leaf.view.editor.cm;
  const guard = () => {
    if (leaf.view.file?.path !== path || leaf.view.editor.cm !== cm)
      throw new Error("ABORT: wrong editor");
  };
  const original = cm.state.doc.toString();
  // Spot: a line in the middle that is action (or dialogue)
  const lines = original.split("\n");
  let target = Math.floor(lines.length / 2);
  const isCap = (s) =>
    s.trim() && s.trim() === s.trim().toUpperCase() && /[A-Z]/.test(s);
  for (; target < lines.length - 2; target++) {
    const t = lines[target],
      prev = lines[target - 1] ?? "";
    if (
      cfg.where === "dialogue"
        ? isCap(prev) &&
          !prev.startsWith("INT") &&
          !prev.startsWith("EXT") &&
          t.length > 20 &&
          !t.startsWith("(")
        : prev.trim() === "" && t.length > 40 && !isCap(t) && !t.startsWith("(")
    )
      break;
  }
  const lineObj = cm.state.doc.line(target + 1);
  cm.dispatch({ selection: { anchor: lineObj.to }, scrollIntoView: true });
  cm.focus();
  await wait(800);
  const longtasks = [];
  const obs = new PerformanceObserver((list) => {
    for (const e of list.getEntries()) longtasks.push(Math.round(e.duration));
  });
  obs.observe({ entryTypes: ["longtask"] });
  const lat = [],
    sync = [];
  const text = " she said nothing at all and waited for him".slice(0, cfg.n);
  try {
    for (const ch of text) {
      guard();
      const t0 = performance.now();
      document.execCommand("insertText", false, ch);
      const t1 = performance.now();
      await frame();
      lat.push(performance.now() - t0);
      sync.push(t1 - t0);
      await wait(
        cfg.pauseEvery && lat.length % cfg.pauseEvery === 0
          ? cfg.pause
          : cfg.gap,
      );
    }
    await wait(2500);
  } finally {
    obs.disconnect();
    guard();
    cm.dispatch({
      changes: { from: 0, to: cm.state.doc.length, insert: original },
    });
    await wait(300);
    if (pl && saved) {
      pl.settings.editorLayout = saved;
      app.workspace.updateOptions();
    }
    if (cfg.mode === "off") await app.plugins.enablePlugin("brass");
  }
  const stats = (a) => {
    const s = [...a].sort((x, y) => x - y);
    const q = (p) =>
      +s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(1);
    return { median: q(0.5), p95: q(0.95), max: +s[s.length - 1].toFixed(1) };
  };
  const typedOk = leaf.view.editor.cm.state.doc.length;
  fs.writeFileSync(
    OUT,
    JSON.stringify(
      {
        cfg,
        docLines: lines.length,
        latency: stats(lat),
        sync: stats(sync),
        longtasks,
        n: lat.length,
      },
      null,
      1,
    ),
  );
})();
("started");
