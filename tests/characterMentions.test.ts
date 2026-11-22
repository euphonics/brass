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
import { mentionAtEnd, mentionText } from "../src/editor/characterMentions";

describe("+ character mentions", () => {
  it("finds the mention being typed", () => {
    expect(mentionAtEnd("+")).toEqual({ typed: "" });
    expect(mentionAtEnd("She sees +je")).toEqual({ typed: "je" });
    expect(mentionAtEnd("(+Ma")).toEqual({ typed: "Ma" });
    expect(mentionAtEnd("She sees +mary a")).toEqual({ typed: "mary a" });
    expect(mentionAtEnd("C++")).toBeNull();
    expect(mentionAtEnd("1+1")).toBeNull();
    expect(mentionAtEnd("a+b")).toBeNull();
  });

  it("writes names in mixed case unless typed in capitals", () => {
    expect(mentionText("JEN", "", "")).toBe("Jen");
    expect(mentionText("JEN", "je", "")).toBe("Jen");
    expect(mentionText("JEN", "JE", "")).toBe("JEN");
    expect(mentionText("MARY ANN", "m", "")).toBe("Mary Ann");
    expect(mentionText("O'BRIEN", "", "")).toBe("O'Brien");
  });

  it("uses the note's own spelling of a name", () => {
    const source = "MCALLISTER\nHi.\n\nMcAllister waves. McAllister sits.";
    expect(mentionText("MCALLISTER", "mc", source)).toBe("McAllister");
    expect(mentionText("MCALLISTER", "MC", source)).toBe("MCALLISTER");
    expect(mentionText("JEN", "", "Jenny waves.")).toBe("Jen");
  });
});
