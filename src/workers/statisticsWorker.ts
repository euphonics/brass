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

/*
 * The status bar's statistics, counted in a background thread (a Web
 * Worker) so a long script never holds up typing. Bundled into main.js as
 * text (scripts/worker-source.mjs) and started from a Blob URL.
 */

import {
  computeCurrentPage,
  computeIndex,
  computeStatistics,
  type IndexRequest,
  type PageRequest,
  type StatisticsRequest,
} from "./statisticsCompute";

type Message =
  | ({ id: number; kind: "statistics" } & StatisticsRequest)
  | ({ id: number; kind: "page" } & PageRequest)
  | ({ id: number; kind: "index" } & IndexRequest);

interface WorkerScope {
  onmessage: ((event: { data: Message }) => void) | null;
  postMessage(message: unknown): void;
}

const scope = self as unknown as WorkerScope;

scope.onmessage = (event) => {
  const message = event.data;
  try {
    const result =
      message.kind === "page"
        ? computeCurrentPage(message)
        : message.kind === "index"
          ? computeIndex(message)
          : computeStatistics(message);
    scope.postMessage({ id: message.id, result });
  } catch (error) {
    scope.postMessage({ id: message.id, error: String(error) });
  }
};
