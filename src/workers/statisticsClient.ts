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

import workerSource from "./statisticsWorker.ts?worker-source";
import type { ScreenplayStatistics } from "../screenplay/model";
import {
  computeCurrentPage,
  computeStatistics,
  type PageRequest,
  type StatisticsRequest,
} from "./statisticsCompute";

/**
 * Counts statistics in a background thread. If a worker can't start (an
 * unusual platform), counts on the main thread instead.
 */
export class StatisticsWorker {
  private worker: Worker | null = null;
  private url: string | null = null;
  private failed = false;
  private nextId = 1;
  private readonly pending = new Map<
    number,
    {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
    }
  >();

  compute(request: StatisticsRequest): Promise<ScreenplayStatistics> {
    return this.run("statistics", request, () => computeStatistics(request));
  }

  currentPage(request: PageRequest): Promise<number> {
    return this.run("page", request, () => computeCurrentPage(request));
  }

  private run<T>(
    kind: "statistics" | "page",
    request: object,
    fallback: () => T,
  ): Promise<T> {
    const worker = this.start();
    if (worker === null) {
      try {
        return Promise.resolve(fallback());
      } catch (error) {
        return Promise.reject(
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    }
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
      });
      worker.postMessage({ id, kind, ...request });
    });
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
    if (this.url !== null) URL.revokeObjectURL(this.url);
    this.url = null;
    for (const { reject } of this.pending.values())
      reject(new Error("The statistics worker stopped."));
    this.pending.clear();
  }

  private start(): Worker | null {
    if (this.worker !== null || this.failed) return this.worker;
    try {
      this.url = URL.createObjectURL(
        new Blob([workerSource], { type: "text/javascript" }),
      );
      const worker = new Worker(this.url);
      worker.onmessage = (event: MessageEvent) => {
        const data = event.data as {
          id: number;
          result?: unknown;
          error?: string;
        };
        const entry = this.pending.get(data.id);
        if (!entry) return;
        this.pending.delete(data.id);
        if (data.error === undefined) entry.resolve(data.result);
        else entry.reject(new Error(data.error));
      };
      worker.onerror = () => {
        // A broken worker: stop using it and count on the main thread.
        this.failed = true;
        this.dispose();
      };
      this.worker = worker;
    } catch {
      this.failed = true;
      this.worker = null;
    }
    return this.worker;
  }
}
