/*
 * Copyright 2026 Christian Grobmeier
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
  characterFilename,
  characterFirstName,
  characterProjectName,
  sanitizeProjectName,
  renderCharacterTemplate,
  characterPageFromFrontmatter,
  characterPageTemplate,
  matchingCharacterPages,
  wikiLinkTarget,
} from "../src/characters/catalogue";

describe("character catalogue", () => {
  it("parses portable character frontmatter", () => {
    expect(
      characterPageFromFrontmatter("Characters/Jane.md", {
        firstdraft: "character",
        character: "Jane",
        aliases: ["Dr. Jane Morrow"],
        screenplays: ["[[Milestone 4]]"],
        related: ["[[Miller|Dr Miller]]"],
      }),
    ).toEqual({
      path: "Characters/Jane.md",
      character: "JANE",
      aliases: ["DR. JANE MORROW"],
      screenplays: ["[[Milestone 4]]"],
      related: ["[[Miller|Dr Miller]]"],
    });
  });

  it("matches canonical cues and aliases without changing screenplay text", () => {
    const page = characterPageFromFrontmatter("Characters/Jane.md", {
      firstdraft: "character",
      character: "JANE",
      aliases: ["DR. JANE MORROW"],
    });
    expect(page).not.toBeNull();
    expect(matchingCharacterPages([page!], "dr. jane morrow")).toEqual([page]);
  });

  it("creates readable filenames and templates", () => {
    expect(characterFilename("DR. JANE MORROW (O.S.)")).toBe("Dr. Jane Morrow");
    const template = characterPageTemplate("JANE", "Scripts/Milestone 4");
    expect(template).toContain('character: "JANE"');
    expect(template).toContain('"[[Scripts/Milestone 4]]"');
    expect(template).toContain("## Relationships");
  });

  it("names and heads character pages after their project", () => {
    expect(characterProjectName("TIGHTER (project)")).toBe("TIGHTER");
    expect(characterProjectName("TIGHTER")).toBe("TIGHTER");
    expect(characterProjectName("TIGHTER fountain pages")).toBe("TIGHTER");
    expect(characterProjectName("ARACHNID script")).toBe("ARACHNID");
    expect(characterProjectName("Pages of Fire")).toBe("Pages of Fire");
    // An explicit title is kept as written.
    expect(sanitizeProjectName("The Rough Draft")).toBe("The Rough Draft");
    expect(sanitizeProjectName("Act: One")).toBe("Act One");
    expect(characterFilename("JEN", "TIGHTER")).toBe(
      "Jen (Character in TIGHTER)",
    );
    const template = characterPageTemplate("JEN", "TIGHTER", "TIGHTER");
    expect(template).toContain(
      "# Jen\n\n#Character in [[TIGHTER (project)|TIGHTER]]\n\n## Background",
    );
    expect(template).toContain('character: "JEN"');
  });

  it("adds the first name as an alias on new pages", () => {
    expect(characterFirstName("JOHN")).toBe("John");
    expect(characterFirstName("JANE MORROW")).toBe("Jane");
    expect(characterFirstName("DR. JANE MORROW (O.S.)")).toBe("Jane");
    expect(characterFirstName("MR. SMITH")).toBe("Smith");
    expect(characterPageTemplate("JOHN", "STORY", "STORY")).toContain(
      'aliases:\n  - "John"\n',
    );
  });

  it("fills placeholders in a user character template", () => {
    const rendered = renderCharacterTemplate(
      "# {{character}}\n\n#Character in {{project_link}}\n{{ cue }} {{screenplay}} {{date}} {{unknown}}",
      {
        character: "Jen",
        cue: "JEN",
        project: "TIGHTER",
        title: "Jen (Character in TIGHTER)",
        screenplayLink: "TIGHTER",
        date: "2026-11-14",
        time: "12:00",
      },
    );
    expect(rendered).toBe(
      "# Jen\n\n#Character in [[TIGHTER (project)|TIGHTER]]\nJEN [[TIGHTER]] 2026-11-14 {{unknown}}",
    );
  });

  it("extracts ordinary Obsidian link targets", () => {
    expect(wikiLinkTarget("[[Characters/Miller|Miller]]")).toBe(
      "Characters/Miller",
    );
    expect(wikiLinkTarget("[[Jane#Background]]")).toBe("Jane");
  });
});
