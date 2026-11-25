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
import { BUNDLED_FONT, registerBundledFont } from "../src/editor/bundledFont";

class FakeFontFace {
  constructor(
    public family: string,
    public source: Uint8Array,
    public descriptors: { weight: string; style: string },
  ) {}
}

function fakeDocument(withFontFace = true) {
  const fonts = new Set<FakeFontFace>();
  const doc = {
    fonts,
    defaultView: withFontFace ? { FontFace: FakeFontFace } : {},
  } as unknown as Document;
  return { doc, fonts };
}

describe("bundled Courier Prime", () => {
  it("adds all four styles under one family and removes them again", () => {
    const { doc, fonts } = fakeDocument();
    const remove = registerBundledFont(doc);
    const faces = [...fonts];
    expect(faces.map((face) => face.family)).toEqual(
      Array(4).fill(BUNDLED_FONT),
    );
    expect(
      faces.map(
        (face) => `${face.descriptors.weight} ${face.descriptors.style}`,
      ),
    ).toEqual(["normal normal", "bold normal", "normal italic", "bold italic"]);
    for (const face of faces)
      expect(face.source.byteLength).toBeGreaterThan(50_000);
    remove();
    expect(fonts.size).toBe(0);
  });

  it("does nothing without FontFace support", () => {
    const { doc, fonts } = fakeDocument(false);
    registerBundledFont(doc)();
    expect(fonts.size).toBe(0);
  });
});
