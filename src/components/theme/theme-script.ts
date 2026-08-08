export const THEME_STORAGE_KEY = "ai-growth-theme";

export const THEME_INIT_SCRIPT = `
(() => {
  const storageKey = "${THEME_STORAGE_KEY}";
  const root = document.documentElement;
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  let preference = "system";

  try {
    const stored = window.localStorage.getItem(storageKey);
    if (stored === "light" || stored === "dark" || stored === "system") {
      preference = stored;
    }
  } catch {}

  const resolved = preference === "system"
    ? (systemPrefersDark ? "dark" : "light")
    : preference;

  root.classList.toggle("dark", resolved === "dark");
  root.dataset.theme = resolved;
  root.dataset.themePreference = preference;
  root.style.colorScheme = resolved;
})();`;
