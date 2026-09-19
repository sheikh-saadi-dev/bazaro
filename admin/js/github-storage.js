// Uses the GitHub REST Contents API to push an uploaded file straight into a GitHub repo,
// then returns a public raw.githubusercontent.com URL for it.
//
// IMPORTANT SECURITY NOTE: the personal access token is stored only in this browser's
// localStorage (never in source code, never in Firestore). Anyone who opens devtools on
// THIS device could read it, so:
//   - use a fine-grained token scoped to Contents: Read & write on ONE repo only
//   - never paste a token with broader (classic, all-repo) scope here
//   - re-configure on each admin device separately; it is not synced anywhere

const CONFIG_KEY = "bazaro_admin_github_cfg";

export function getGithubConfig() {
  try { return JSON.parse(localStorage.getItem(CONFIG_KEY)) || null; } catch { return null; }
}

export function setGithubConfig(cfg) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

export function clearGithubConfig() {
  localStorage.removeItem(CONFIG_KEY);
}

export function isGithubConfigured() {
  const c = getGithubConfig();
  return !!(c && c.owner && c.repo && c.token);
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function safeFileName(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-");
}

/**
 * Uploads a file to the configured GitHub repo and returns { url, path, sha } on success.
 * Throws with a human-readable message on failure.
 */
export async function uploadImageToGithub(file) {
  const cfg = getGithubConfig();
  if (!cfg || !cfg.owner || !cfg.repo || !cfg.token) {
    throw new Error("GitHub image hosting isn't configured yet — set it up in Admin → Settings first.");
  }
  const branch = cfg.branch || "main";
  const folder = (cfg.folder || "images/products").replace(/^\/+|\/+$/g, "");
  const path = `${folder}/${Date.now()}_${safeFileName(file.name)}`;
  const base64 = await fileToBase64(file);

  const res = await fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${path}`, {
    method: "PUT",
    headers: {
      "Authorization": `token ${cfg.token}`,
      "Accept": "application/vnd.github+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: `Add media image ${path}`,
      content: base64,
      branch
    })
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `GitHub upload failed (${res.status}).`);
  }
  const data = await res.json();
  const url = `https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${branch}/${path}`;
  return { url, path, sha: data.content?.sha || null };
}

/**
 * Deletes a file from the configured GitHub repo (used when removing an image from the library).
 * Silently no-ops if not configured or if path/sha are missing (e.g. an externally-pasted URL).
 */
export async function deleteImageFromGithub(path, sha) {
  const cfg = getGithubConfig();
  if (!cfg || !cfg.owner || !cfg.repo || !cfg.token || !path || !sha) return;
  const branch = cfg.branch || "main";
  await fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${path}`, {
    method: "DELETE",
    headers: {
      "Authorization": `token ${cfg.token}`,
      "Accept": "application/vnd.github+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ message: `Remove media image ${path}`, sha, branch })
  }).catch(() => {}); // best-effort; the media library record is removed regardless
}
