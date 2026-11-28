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

import { describe, expect, it } from "vitest";
import {
  DEFAULT_PHONE_BUTTONS,
  PHONE_ACTIONS,
  movePhoneButton,
  normalizePhoneButtons,
} from "../src/editor/phoneActions";

const shown = (items: { action: string; shown: boolean }[]) =>
  items.filter((item) => item.shown).map((item) => item.action);

describe("phone toolbar buttons", () => {
  it("starts with the writer's five, in order, and lists every action once", () => {
    expect(shown([...DEFAULT_PHONE_BUTTONS])).toEqual([
      "cycle",
      "slug",
      "action",
      "character",
      "tab",
    ]);
    expect(DEFAULT_PHONE_BUTTONS.map((item) => item.action).sort()).toEqual(
      PHONE_ACTIONS.map((info) => info.id).sort(),
    );
  });

  it("gives every action words and an emoji", () => {
    for (const info of PHONE_ACTIONS) {
      expect(info.words.length).toBeGreaterThan(0);
      expect(info.emoji.length).toBeGreaterThan(0);
    }
  });

  it("repairs saved lists: unknown and repeated dropped, new ones hidden", () => {
    const items = normalizePhoneButtons([
      { action: "transition", shown: true },
      { action: "bogus", shown: true },
      { action: "transition", shown: false },
      { action: "slug" },
    ]);
    expect(items.slice(0, 2)).toEqual([
      { action: "transition", shown: true },
      { action: "slug", shown: false },
    ]);
    expect(items).toHaveLength(PHONE_ACTIONS.length);
    expect(shown(items)).toEqual(["transition"]);
  });

  it("turns Convert into Cycle, in its place (#360)", () => {
    const items = normalizePhoneButtons([
      { action: "slug", shown: true },
      { action: "convert", shown: true },
      { action: "tab-back", shown: true },
    ]);
    expect(shown(items)).toEqual(["slug", "cycle", "tab-back"]);
    const hidden = normalizePhoneButtons([{ action: "convert", shown: false }]);
    expect(shown(hidden)).toEqual([]);
  });

  it("swaps the old default row for the new one: Cycle for <--Tab (#360)", () => {
    const old = ["tab-back", "convert", "slug", "action", "character", "tab"];
    const items = normalizePhoneButtons([
      ...old.map((action) => ({ action, shown: true })),
      { action: "wryly", shown: false },
    ]);
    expect(items).toEqual(DEFAULT_PHONE_BUTTONS);
    // A row the writer changed stays theirs.
    const changed = normalizePhoneButtons([
      ...old.map((action) => ({ action, shown: true })),
      { action: "wryly", shown: true },
    ]);
    expect(shown(changed)).toEqual([
      "tab-back",
      "cycle",
      "slug",
      "action",
      "character",
      "tab",
      "wryly",
    ]);
  });

  it("uses the defaults when nothing is saved", () => {
    expect(normalizePhoneButtons(undefined)).toEqual(DEFAULT_PHONE_BUTTONS);
  });

  it("moves a button up or down, and not past the ends", () => {
    const items = normalizePhoneButtons(undefined);
    const up = movePhoneButton(items, 1, -1);
    expect(up[0]?.action).toBe("slug");
    expect(up[1]?.action).toBe("cycle");
    expect(movePhoneButton(items, 0, -1)).toEqual(items);
    expect(items[0]?.action).toBe("cycle");
  });
});
