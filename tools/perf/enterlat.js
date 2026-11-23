(async () => {
  const DIR = require("os").tmpdir().replace(/\\/g, "/") + "/scribidian-perf";
  require("fs").mkdirSync(DIR, { recursive: true });
  const fs = require("fs");
  const cfg = window.__ent;
  const OUT = `${DIR}/ent-${cfg.tag}.json`;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const frame = () =>
    new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
  if (app.vault.getName() !== "Dev") throw new Error("ABORT");
  {
    const w = require("electron").remote?.getCurrentWindow?.();
    if (w) {
      w.show();
      w.focus();
    }
  }
  const path = `Scribidian Example/Perf ${cfg.size}x.md`;
  const pl = app.plugins.plugins.scribidian;
  pl.settings.editorLayout = "screenplay";
  app.workspace.updateOptions();
  let leaf = app.workspace
    .getLeavesOfType("markdown")
    .find((l) => l.view.file?.path === path);
  if (!leaf) {
    leaf = app.workspace.getLeaf("tab");
    await leaf.openFile(app.vault.getAbstractFileByPath(path));
  }
  app.workspace.setActiveLeaf(leaf, { focus: true });
  await wait(2000);
  const cm = leaf.view.editor.cm;
  const original = cm.state.doc.toString();
  const lines = original.split("\n");
  let target = Math.floor(lines.length / 2);
  for (; target < lines.length; target++)
    if (
      lines[target - 1] === "" &&
      lines[target].length > 40 &&
      lines[target] !== lines[target].toUpperCase()
    )
      break;
  cm.dispatch({
    selection: { anchor: cm.state.doc.line(target + 1).to },
    scrollIntoView: true,
  });
  cm.focus();
  await wait(600);
  const key = (k) =>
    cm.contentDOM.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: k,
        code: k,
        bubbles: true,
        cancelable: true,
      }),
    );
  const res = { enter: [], tab: [] };
  try {
    for (let i = 0; i < 10; i++) {
      // Enter at end of action -> new action paragraph; type a word; repeat
      let t0 = performance.now();
      key("Enter");
      await frame();
      res.enter.push(performance.now() - t0);
      document.execCommand("insertText", false, "Word");
      await wait(120);
      // Tab at end of action -> character
      t0 = performance.now();
      key("Tab");
      await frame();
      res.tab.push(performance.now() - t0);
      key("Escape");
      await wait(60);
      for (const ch of "BOB") {
        document.execCommand("insertText", false, ch);
        await wait(30);
      }
      key("Escape");
      await wait(60);
      t0 = performance.now();
      key("Enter");
      await frame();
      res.enter.push(performance.now() - t0);
      document.execCommand("insertText", false, "Hi.");
      await wait(120);
      key("Enter");
      await wait(150);
      document.execCommand("insertText", false, "Jen moves on and on.");
      await wait(150);
    }
  } finally {
    cm.dispatch({
      changes: { from: 0, to: cm.state.doc.length, insert: original },
    });
  }
  const med = (a) => {
    const s = [...a].sort((x, y) => x - y);
    return {
      median: +s[s.length >> 1].toFixed(1),
      max: +s[s.length - 1].toFixed(1),
    };
  };
  fs.writeFileSync(
    OUT,
    JSON.stringify({ enter: med(res.enter), tab: med(res.tab) }),
  );
})();
("started");
