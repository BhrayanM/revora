import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { resolve as resolvePath } from "node:path";
import { pathToFileURL } from "node:url";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (/^next\/[A-Za-z0-9_/-]+$/.test(specifier)) {
      const nextSubpath = resolvePath(
        process.cwd(),
        "node_modules",
        `${specifier}.js`,
      );
      if (existsSync(nextSubpath)) {
        return nextResolve(pathToFileURL(nextSubpath).href, context);
      }
    }

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
