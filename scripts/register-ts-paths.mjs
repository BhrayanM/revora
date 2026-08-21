import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { resolve as resolvePath } from "node:path";
import { pathToFileURL } from "node:url";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (!specifier.startsWith("@/")) {
      return nextResolve(specifier, context);
    }

    const basePath = resolvePath(process.cwd(), "src", specifier.slice(2));
    for (const candidate of [`${basePath}.ts`, `${basePath}.tsx`]) {
      if (existsSync(candidate)) {
        return nextResolve(pathToFileURL(candidate).href, context);
      }
    }

    return nextResolve(specifier, context);
  },
});
