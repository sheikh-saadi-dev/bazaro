const KEY = "bazaro_theme";

export function initTheme() {
  const saved = localStorage.getItem(KEY);
  const system = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  const theme = saved || system;
  document.documentElement.setAttribute("data-theme", theme);
  return theme;
}

export function toggleTheme() {
  const cur = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  const next = cur === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem(KEY, next);
  return next;
}

export function currentTheme() {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}
