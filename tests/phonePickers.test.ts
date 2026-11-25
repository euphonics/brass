/*
 * Copyright 2026 Christian Grobmeier
 * Modifications copyright 2026 arvn
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { describe, expect, it, vi } from "vitest";

interface Options<T> {
  title: string;
  items: T[];
  itemText: (item: T) => string;
  onChoose: (item: T) => void;
}
const opened: Options<unknown>[] = [];
const typed: ((value: string) => void)[] = [];

vi.mock("obsidian", () => ({ editorInfoField: {} }));
vi.mock("../src/ui/pickers", () => ({
  PickerModal: class {
    constructor(_app: unknown, options: Options<unknown>) {
      opened.push(options);
    }
    open() {}
  },
  TextInputModal: class {
    constructor(
      _app: unknown,
      _title: string,
      _label: string,
      done: (value: string) => void,
    ) {
      typed.push(done);
    }
    open() {}
  },
}));

const { openNewScene, miniSlug, MINI_SLUG } =
  await import("../src/commands/newScene");
const { openCharacterPicker, WITH_EXTENSION } =
  await import("../src/commands/character");

/** A tiny stand-in for Obsidian's Editor over one string. */
function fakeEditor(text: string) {
  let value = text;
  let caret = text.length;
  const pos = (offset: number) => {
    const before = value.slice(0, offset).split("\n");
    return {
      line: before.length - 1,
      ch: before[before.length - 1]?.length ?? 0,
    };
  };
  const off = (p: { line: number; ch: number }) =>
    value.split("\n").slice(0, p.line).join("\n").length +
    (p.line ? 1 : 0) +
    p.ch;
  return {
    getValue: () => value,
    getCursor: () => pos(caret),
    posToOffset: off,
    offsetToPos: pos,
    getLine: (line: number) => value.split("\n")[line] ?? "",
    replaceRange: (text: string, from: { line: number; ch: number }) => {
      const at = off(from);
      value = value.slice(0, at) + text + value.slice(at);
    },
    setCursor: (p: { line: number; ch: number }) => {
      caret = off(p);
    },
    focus: () => {},
  };
}

const plugin = {
  app: {},
  activeMarkdownView: () => null,
  settings: {
    preferredSceneTypes: ["INT.", "EXT."],
    preferredTimesOfDay: ["DAY", "NIGHT"],
    recentItemsWeighting: 0.5,
    maximumSuggestions: 10,
    characterFolder: "",
    customExtensionsFirst: false,
  },
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
function choose(label: string) {
  const options = opened[opened.length - 1]!;
  const item = options.items.find((entry) => options.itemText(entry) === label);
  if (item === undefined) throw new Error(`no choice ${label}`);
  options.onChoose(item);
}

const script =
  "INT. KITCHEN - DAY\n\nJEN\nHello.\n\nEXT. STREET - NIGHT\n\nShe runs.\n\n";

describe("mini slug", () => {
  it("writes a forced heading in capitals", () => {
    expect(miniSlug(" kitchen ")).toBe(".KITCHEN");
    expect(miniSlug(".hall")).toBe(".HALL");
  });

  it("is offered after the scene types and uses known locations", async () => {
    const editor = fakeEditor(script);
    openNewScene(plugin as never, editor as never);
    await settle();
    expect(opened[opened.length - 1]!.items.slice(-1)[0]).toBe(MINI_SLUG);
    choose(MINI_SLUG);
    choose("KITCHEN");
    expect(editor.getValue()).toBe(`${script}.KITCHEN\n\n`);
  });
});

describe("character with an extension", () => {
  it("asks for the extension, then the name", async () => {
    const editor = fakeEditor(script);
    openCharacterPicker(plugin as never, editor as never);
    await settle();
    choose(WITH_EXTENSION);
    expect(opened[opened.length - 1]!.items).toContain("(V.O.)");
    expect(opened[opened.length - 1]!.items).not.toContain("(CONT'D)");
    choose("(V.O.)");
    expect(opened[opened.length - 1]!.title).toBe("Character (V.O.)");
    choose("JEN");
    expect(editor.getValue()).toBe(`${script}JEN (V.O.)\n`);
  });

  it("names a new character with the extension", async () => {
    const editor = fakeEditor(script);
    openCharacterPicker(plugin as never, editor as never);
    await settle();
    choose(WITH_EXTENSION);
    choose("(O.S.)");
    choose("New character…");
    typed[typed.length - 1]!("mo");
    expect(editor.getValue()).toBe(`${script}MO (O.S.)\n`);
  });

  it("still inserts a plain name in one tap", async () => {
    const editor = fakeEditor(script);
    openCharacterPicker(plugin as never, editor as never);
    await settle();
    choose("JEN");
    expect(editor.getValue()).toBe(`${script}JEN\n`);
  });
});
