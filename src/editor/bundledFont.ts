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

import regular from "../../assets/fonts/courier-prime/CourierPrime-Regular.ttf?bytes";
import bold from "../../assets/fonts/courier-prime/CourierPrime-Bold.ttf?bytes";
import italic from "../../assets/fonts/courier-prime/CourierPrime-Italic.ttf?bytes";
import boldItalic from "../../assets/fonts/courier-prime/CourierPrime-BoldItalic.ttf?bytes";

/** The family name the bundled font is registered under. */
export const BUNDLED_FONT = "Courier Prime";

const FACES = [
  { data: regular, weight: "normal", style: "normal" },
  { data: bold, weight: "bold", style: "normal" },
  { data: italic, weight: "normal", style: "italic" },
  { data: boldItalic, weight: "bold", style: "italic" },
] as const;

/**
 * Make Courier Prime available in `doc` from the copy bundled for PDFs, so
 * scripts use it on phones and on computers where it isn't installed.
 * Returns a function that removes it again. Does nothing where the browser
 * has no FontFace support.
 */
export function registerBundledFont(doc: Document): () => void {
  const view = doc.defaultView;
  if (typeof view?.FontFace !== "function" || !doc.fonts) return () => {};
  const faces = FACES.map(({ data, weight, style }) => {
    const face = new view.FontFace(BUNDLED_FONT, data.slice(), {
      weight,
      style,
    });
    doc.fonts.add(face);
    return face;
  });
  return () => {
    for (const face of faces) doc.fonts.delete(face);
  };
}
