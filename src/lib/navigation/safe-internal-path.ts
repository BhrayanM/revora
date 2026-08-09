/**
 * Accept only an application-relative path. Keeping this utility free of
 * server-only dependencies lets client auth screens preserve a safe return
 * path without duplicating redirect validation rules.
 */
export function getSafeInternalPath(
  value: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  try {
    const url = new URL(value, "https://local.invalid");
    if (url.origin !== "https://local.invalid") {
      return fallback;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
