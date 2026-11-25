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

import type { Editor } from "obsidian";
import type BrassPlugin from "../main";
import { loadScreenplayContext } from "../projects/vault";
import { buildScreenplayIndex, rankUsages } from "../screenplay/indexer";
import { parseFountain } from "../screenplay/parser";
import { withListedCharacters } from "../screenplay/listedCharacters";
import { PickerModal, TextInputModal } from "../ui/pickers";
import { insertBlock } from "./editorText";
import { characterExtensionChoices } from "../editor/completionEngine";

interface CharacterChoice {
  kind: "character" | "new" | "extension";
  label: string;
}

export function openCharacterPicker(plugin: BrassPlugin, editor: Editor): void {
  void openCharacterPickerForContext(plugin, editor);
}

async function openCharacterPickerForContext(
  plugin: BrassPlugin,
  editor: Editor,
): Promise<void> {
  const file = plugin.activeMarkdownView()?.file ?? null;
  const context = file
    ? await loadScreenplayContext(
        plugin.app,
        file,
        plugin.settings.characterFolder,
        editor.getValue(),
      )
    : null;
  const index = withListedCharacters(
    buildScreenplayIndex(context?.document ?? parseFountain(editor.getValue())),
    context?.listedCharacters ?? [],
  );
  const characters: CharacterChoice[] = rankUsages(
    index.characters,
    "",
    plugin.settings.recentItemsWeighting,
    plugin.settings.maximumSuggestions,
  ).map((usage) => ({ kind: "character", label: usage.value }));
  characters.push({ kind: "new", label: "New character…" });
  chooseCharacter(plugin, editor, characters, "");
}

/**
 * The character list. With an `extension` ("(V.O.)"), the chosen name gets
 * it; without, the list also offers "With extension…", which asks for the
 * extension first and then shows the list again.
 */
function chooseCharacter(
  plugin: BrassPlugin,
  editor: Editor,
  characters: CharacterChoice[],
  extension: string,
): void {
  const insert = (name: string): void => {
    if (name.trim())
      insertCharacter(editor, extension ? `${name.trim()} ${extension}` : name);
  };
  new PickerModal(plugin.app, {
    title: extension ? `Character ${extension}` : "Character",
    placeholder: "Choose a character or create one",
    items: extension
      ? characters
      : [...characters, { kind: "extension", label: WITH_EXTENSION }],
    itemText: (item) => item.label,
    onChoose: (choice) => {
      if (choice.kind === "extension") {
        new PickerModal(plugin.app, {
          title: "Character — Extension",
          placeholder: "Choose an extension",
          items: characterExtensionChoices(
            editor.getValue(),
            plugin.settings.customExtensionsFirst,
          ),
          itemText: (item) => item,
          onChoose: (chosen) =>
            chooseCharacter(plugin, editor, characters, chosen),
        }).open();
      } else if (choice.kind === "new") {
        new TextInputModal(
          plugin.app,
          extension ? `New character ${extension}` : "New character",
          "Character name",
          insert,
        ).open();
      } else {
        insert(choice.label);
      }
    },
  }).open();
}

/** Last choice in the character list: add an extension like (V.O.). */
export const WITH_EXTENSION = "With extension (V.O.)…";

export function insertCharacter(editor: Editor, name: string): void {
  insertBlock(editor, name.trim().toLocaleUpperCase(), 1);
}
