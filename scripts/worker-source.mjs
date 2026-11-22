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

import esbuild from "esbuild";
import path from "node:path";

// `import source from "./file.ts?worker-source"` bundles that file on its
// own (for a Web Worker) and imports the bundle as a string, so the plugin
// stays one main.js.
export function workerSourceEsbuildPlugin({ minify = false } = {}) {
  return {
    name: "worker-source",
    setup(build) {
      build.onResolve({ filter: /\?worker-source$/ }, (args) => ({
        path: path.resolve(
          args.resolveDir,
          args.path.slice(0, -"?worker-source".length),
        ),
        namespace: "worker-source",
      }));
      build.onLoad(
        { filter: /.*/, namespace: "worker-source" },
        async (args) => {
          const result = await esbuild.build({
            entryPoints: [args.path],
            bundle: true,
            write: false,
            format: "iife",
            platform: "browser",
            target: "es2018",
            minify,
            legalComments: "none",
          });
          return {
            contents: `export default ${JSON.stringify(result.outputFiles[0].text)};`,
            loader: "js",
            watchFiles: [args.path],
          };
        },
      );
    },
  };
}
