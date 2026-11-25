(async () => {
  const DIR = require("os").tmpdir().replace(/\\/g, "/") + "/brass-perf";
  require("fs").mkdirSync(DIR, { recursive: true });
  const fs = require("fs");
  const OUT = DIR + "/consist-out.json";
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  if (app.vault.getName() !== "Dev") throw new Error("ABORT: Dev only");
  {
    const w = require("electron").remote?.getCurrentWindow?.();
    if (w) {
      w.show();
      w.focus();
    }
  }
  const path = "Brass Example/Perf 2x.md";
  const pl = app.plugins.plugins.brass;
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
  const guard = () => {
    if (leaf.view.file?.path !== path || leaf.view.editor.cm !== cm)
      throw new Error("ABORT");
  };
  const layout = () =>
    cm.plugins
      .map((p) => p.value)
      .find((v) => v && Array.isArray(v.kinds) && "cueStarts" in v);
  const original = cm.state.doc.toString();
  const results = [];
  // Edits that change meaning: type a cue, dialogue, make action caps, delete blank lines
  const scenarios = [
    ["type action", (pos) => [{ from: pos, insert: " and then more words" }]],
    [
      "new cue block",
      (pos) => [{ from: pos, insert: "\n\nJEN\nHello there." }],
    ],
    ["caps line", (pos) => [{ from: pos, insert: "\n\nBANG" }]],
    [
      "delete blank",
      (pos) => {
        const l = cm.state.doc.lineAt(pos);
        const n = cm.state.doc.line(Math.min(cm.state.doc.lines, l.number + 1));
        return [{ from: l.to, to: n.from }];
      },
    ],
    ["paren", (pos) => [{ from: pos, insert: "\n(beat)" }]],
  ];
  try {
    for (let k = 0; k < 4; k++)
      for (const [name, make] of scenarios) {
        guard();
        const line = cm.state.doc.line(
          200 + Math.floor(Math.random() * (cm.state.doc.lines - 400)),
        );
        cm.dispatch({ selection: { anchor: line.to } });
        await wait(50);
        const changes = make(line.to);
        cm.dispatch({
          changes,
          selection: {
            anchor: Math.min(
              cm.state.doc.length,
              line.to + (changes[0].insert?.length ?? 0),
            ),
          },
          userEvent: "input.type",
        });
        await wait(30);
        const quick = [...layout().kinds];
        await wait(1200);
        const full = [...layout().kinds];
        let diffs = 0,
          first = -1;
        for (let i = 0; i < Math.max(quick.length, full.length); i++)
          if (quick[i] !== full[i]) {
            diffs++;
            if (first < 0) first = i;
          }
        results.push({
          name,
          line: line.number,
          diffs,
          first,
          sample:
            first >= 0
              ? [
                  cm.state.doc.line(first + 1).text.slice(0, 40),
                  quick[first],
                  full[first],
                ]
              : null,
        });
      }
  } finally {
    guard();
    cm.dispatch({
      changes: { from: 0, to: cm.state.doc.length, insert: original },
    });
  }
  fs.writeFileSync(OUT, JSON.stringify(results, null, 1));
})();
("started");
