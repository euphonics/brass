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
import { PickerModal, TextInputModal } from "../ui/pickers";
import { insertBlock } from "./editorText";

interface Choice {
  kind: "value" | "custom";
  label: string;
  value?: string;
}

function choices(values: readonly string[], customLabel: string): Choice[] {
  return [
    ...values.map((value) => ({ kind: "value" as const, label: value, value })),
    { kind: "custom", label: customLabel },
  ];
}

function unique(values: readonly string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toLocaleUpperCase();
    if (!value.trim() || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function openNewScene(plugin: BrassPlugin, editor: Editor): void {
  void openNewSceneForContext(plugin, editor);
}

async function projectIndex(
  plugin: BrassPlugin,
  editor: Editor,
): Promise<ReturnType<typeof buildScreenplayIndex>> {
  const file = plugin.activeMarkdownView()?.file ?? null;
  if (file === null)
    return buildScreenplayIndex(parseFountain(editor.getValue()));
  const context = await loadScreenplayContext(
    plugin.app,
    file,
    plugin.settings.characterFolder,
    editor.getValue(),
  );
  return buildScreenplayIndex(context.document);
}

async function openNewSceneForContext(
  plugin: BrassPlugin,
  editor: Editor,
): Promise<void> {
  const index = await projectIndex(plugin, editor);
  new PickerModal(plugin.app, {
    title: "New Scene — Scene type",
    placeholder: "Choose INT., EXT., another scene type or a mini slug",
    items: [...plugin.settings.preferredSceneTypes, MINI_SLUG],
    itemText: (item) => item,
    onChoose: (sceneType) =>
      sceneType === MINI_SLUG
        ? chooseMiniSlug(plugin, editor, index)
        : chooseLocation(plugin, editor, index, sceneType),
  }).open();
}

/** Last choice in the scene type list: a mini slug (".KITCHEN"). */
export const MINI_SLUG = "Mini slug (.)";

/** The forced scene heading for a mini slug: ".KITCHEN". */
export function miniSlug(location: string): string {
  return `.${location.trim().replace(/^\./u, "").trim().toLocaleUpperCase()}`;
}

/** A mini slug: a known or new location, written as ".LOCATION". */
function chooseMiniSlug(
  plugin: BrassPlugin,
  editor: Editor,
  index: ReturnType<typeof buildScreenplayIndex>,
): void {
  const locations = rankUsages(
    index.locations,
    "",
    plugin.settings.recentItemsWeighting,
    plugin.settings.maximumSuggestions,
  ).map((usage) => usage.value);
  const insert = (location: string): void => {
    if (location.trim()) insertBlock(editor, miniSlug(location), 2);
  };
  new PickerModal(plugin.app, {
    title: "New Scene — Mini slug",
    placeholder: "Choose a known location or create one",
    items: choices(locations, "New location…"),
    itemText: (item) => item.label,
    onChoose: (choice) => {
      if (choice.kind === "custom") {
        new TextInputModal(
          plugin.app,
          "New Scene — Mini slug",
          "Location",
          insert,
        ).open();
      } else if (choice.value) {
        insert(choice.value);
      }
    },
  }).open();
}

export function openNewSceneAtLocation(
  plugin: BrassPlugin,
  editor: Editor,
  location: string,
): void {
  void openNewSceneAtLocationForContext(plugin, editor, location);
}

async function openNewSceneAtLocationForContext(
  plugin: BrassPlugin,
  editor: Editor,
  location: string,
): Promise<void> {
  const index = await projectIndex(plugin, editor);
  new PickerModal(plugin.app, {
    title: "New Scene — Scene type",
    placeholder: "Choose INT., EXT., or another scene type",
    items: plugin.settings.preferredSceneTypes,
    itemText: (item) => item,
    onChoose: (sceneType) =>
      chooseTime(plugin, editor, index, sceneType, location),
  }).open();
}

function chooseLocation(
  plugin: BrassPlugin,
  editor: Editor,
  index: ReturnType<typeof buildScreenplayIndex>,
  sceneType: string,
): void {
  const locations = rankUsages(
    index.locations,
    "",
    plugin.settings.recentItemsWeighting,
    plugin.settings.maximumSuggestions,
  ).map((usage) => usage.value);

  new PickerModal(plugin.app, {
    title: "New Scene — Location",
    placeholder: "Choose a known location or create one",
    items: choices(locations, "New location…"),
    itemText: (item) => item.label,
    onChoose: (choice) => {
      if (choice.kind === "custom") {
        new TextInputModal(
          plugin.app,
          "New Scene — New location",
          "Location",
          (location) => chooseTime(plugin, editor, index, sceneType, location),
        ).open();
      } else if (choice.value) {
        chooseTime(plugin, editor, index, sceneType, choice.value);
      }
    },
  }).open();
}

function chooseTime(
  plugin: BrassPlugin,
  editor: Editor,
  index: ReturnType<typeof buildScreenplayIndex>,
  sceneType: string,
  location: string,
): void {
  const recentCustom = rankUsages(
    index.timesOfDay,
    "",
    plugin.settings.recentItemsWeighting,
    plugin.settings.maximumSuggestions,
  ).map((usage) => usage.value);
  const times = unique([
    ...plugin.settings.preferredTimesOfDay,
    ...recentCustom,
  ]);

  new PickerModal(plugin.app, {
    title: "New Scene — Time",
    placeholder: "Choose a time or enter a custom value",
    items: choices(times, "Custom…"),
    itemText: (item) => item.label,
    onChoose: (choice) => {
      if (choice.kind === "custom") {
        new TextInputModal(
          plugin.app,
          "New Scene — Custom time",
          "Time of day",
          (time) => insertScene(editor, sceneType, location, time),
        ).open();
      } else if (choice.value) {
        insertScene(editor, sceneType, location, choice.value);
      }
    },
  }).open();
}

function insertScene(
  editor: Editor,
  sceneType: string,
  location: string,
  time: string,
): void {
  const heading = `${sceneType.trim()} ${location.trim().toLocaleUpperCase()} - ${time.trim().toLocaleUpperCase()}`;
  insertBlock(editor, heading, 2);
}
