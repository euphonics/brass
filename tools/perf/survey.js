(async () => {
  const DIR = require("os").tmpdir().replace(/\\/g, "/") + "/brass-perf";
  require("fs").mkdirSync(DIR, { recursive: true });
  const fs = require("fs");
  const OUT = DIR + "/survey-out.json";
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  {
    const w = require("electron").remote?.getCurrentWindow?.();
    if (w) {
      w.show();
      w.focus();
    }
  }
  if (app.vault.getName() !== "Dev")
    throw new Error("ABORT: harness runs only in the Dev vault");
  const path = "Brass Example/Test Bench.md";
  const f = app.vault.getAbstractFileByPath(path);
  if (!f) throw new Error("ABORT: no Test Bench");
  const pl = app.plugins.plugins.brass;
  const saved = JSON.stringify(pl.settings);
  let leaf = app.workspace
    .getLeavesOfType("markdown")
    .find((l) => l.view.file?.path === path);
  if (!leaf) {
    leaf = app.workspace.getLeaf("tab");
    await leaf.openFile(f);
  }
  app.workspace.setActiveLeaf(leaf, { focus: true });
  await wait(1500);
  const cm = leaf.view.editor.cm;
  const guard = () => {
    if (leaf.view.file?.path !== path || leaf.view.editor.cm !== cm)
      throw new Error("ABORT: editor is not on Test Bench");
  };
  const key = (k, mods = {}) => {
    guard();
    cm.contentDOM.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: k,
        code: k,
        bubbles: true,
        cancelable: true,
        ...mods,
      }),
    );
  };
  const type = async (s) => {
    for (const ch of s) {
      guard();
      const sel = cm.state.selection.main;
      cm.dispatch({
        changes: { from: sel.from, to: sel.to, insert: ch },
        selection: { anchor: sel.from + 1 },
        userEvent: "input.type",
      });
      await wait(60);
    }
    await wait(250);
  };
  const HEAD =
    window.__surveyHead ||
    "---\nscreenplay: true\n---\n\nINT. HALL - NIGHT\n\n";
  const set = async (raw) => {
    if (document.querySelector(".suggestion-container")) key("Escape");
    await wait(60);
    guard();
    const body = raw.replace("|", "");
    cm.dispatch({
      changes: { from: 0, to: cm.state.doc.length, insert: HEAD + body },
      selection: { anchor: HEAD.length + raw.indexOf("|") },
    });
    cm.focus();
    await wait(350);
  };
  const show = () => {
    const d = cm.state.doc.toString();
    const h = cm.state.selection.main.head;
    return (d.slice(0, h) + "|" + d.slice(h)).slice(HEAD.length);
  };
  const list = () =>
    Array.from(
      document.querySelectorAll(
        ".cm-tooltip-autocomplete li, .suggestion-container .suggestion-item",
      ),
    )
      .map((e) => e.textContent.trim())
      .slice(0, 6);
  const kind = () => {
    const ln = cm.domAtPos(cm.state.selection.main.head).node;
    const el = (ln.nodeType === 3 ? ln.parentElement : ln)?.closest?.(
      ".cm-line",
    );
    return el ? (el.className.match(/brass-sp-([a-z-]+)/) || [])[1] || "" : "?";
  };
  const snap = (label) => out.push([label, show(), kind(), list()]);
  const out = [];
  const cases = window.__surveyCases;
  try {
    pl.settings.editorLayout = "screenplay";
    app.workspace.updateOptions();
    await wait(400);
    for (const c of cases) {
      fs.writeFileSync(OUT + ".progress", c.name);
      await set(c.start);
      for (const step of c.steps) {
        if (step.set !== undefined)
          pl.settings.enterAfterCueMovesDown = step.set;
        if (step.setx !== undefined)
          pl.settings.customExtensionsFirst = step.setx;
        if (step.type) await type(step.type);
        if (step.key) {
          key(step.key, step.mods || {});
          await wait(350);
        }
      }
      snap(c.name);
    }
  } catch (e) {
    out.push(["ERROR", String((e && e.stack) || e)]);
  } finally {
    if (document.querySelector(".suggestion-container")) key("Escape");
    Object.assign(pl.settings, JSON.parse(saved));
    app.workspace.updateOptions();
    fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  }
})();
("started");
