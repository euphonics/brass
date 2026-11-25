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

import { addIcon } from "obsidian";

/** Icon name of the Brass logo, a brass brad lying on its side. */
export const BRASS_ICON = "brass-logo";

/**
 * The logo from assets/logo/brass-logo.svg (drawn on a 512 grid), cropped to
 * the brad and scaled to the 100-unit grid Obsidian icons use. It keeps its
 * brass colors.
 */
export const BRASS_ICON_SVG =
  '<g transform="translate(50 50) scale(0.26) translate(-275.5 -287)"><g transform="rotate(-28 256 256) translate(10 0)">' +
  '<path d="M170 226 L414 220 L458 236 L414 250 L170 256 Z" fill="#E2B649"/>' +
  '<path d="M170 226 L414 220 L458 236 L170 241 Z" fill="#F0CF73"/>' +
  '<path d="M170 262 L414 270 L458 290 L414 304 L170 294 Z" fill="#B8862B"/>' +
  '<path d="M170 262 L414 270 L458 290 L170 278 Z" fill="#C9932F"/>' +
  '<ellipse cx="170" cy="258" rx="46" ry="150" fill="#8A5E18"/>' +
  '<ellipse cx="152" cy="258" rx="46" ry="150" fill="#C9932F"/>' +
  '<ellipse cx="146" cy="250" rx="34" ry="124" fill="#E2B649"/>' +
  '<path d="M128 190 Q132 150 148 136" stroke="#F8E3A0" stroke-width="12" fill="none" stroke-linecap="round"/>' +
  "</g></g>";

/** Register the logo so views, the ribbon and setIcon can use BRASS_ICON. */
export function registerBrassIcon(): void {
  addIcon(BRASS_ICON, BRASS_ICON_SVG);
}
