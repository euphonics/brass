(async () => {
  if (app.vault.getName() !== "Dev") throw new Error("ABORT: Dev only");
  if (window.__solo === "off") {
    window.__soloDisabled = Object.keys(app.plugins.plugins).filter(
      (id) => id !== "brass",
    );
    for (const id of window.__soloDisabled) await app.plugins.disablePlugin(id);
    return "disabled " + window.__soloDisabled.length;
  }
  for (const id of window.__soloDisabled || [])
    await app.plugins.enablePlugin(id);
  return "re-enabled " + (window.__soloDisabled || []).length;
})();
