import { db, collection, getDocs, addDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from "../../js/firebase.js";
import { uploadImageToGithub, isGithubConfigured } from "./github-storage.js";
import { confirmModal } from "./admin-ui.js";
import { toast } from "../../js/utils.js";

/**
 * Opens a WordPress-style media picker modal.
 * onSelect(url) is called once when the person picks (or finishes uploading) an image.
 */
export async function openMediaPicker(onSelect) {
  const backdrop = document.createElement("div");
  backdrop.className = "drawer-form-backdrop";
  backdrop.innerHTML = `
    <div class="drawer-form" role="dialog" aria-modal="true" style="width:min(94vw,640px);">
      <h3>Select Image</h3>
      <div class="field" style="margin-bottom:14px;">
        <label>Upload a new image (saved to your Media Library)</label>
        <input type="file" accept="image/*" id="mp-upload-input">
        <p class="muted" id="mp-upload-status" style="font-size:.8rem;margin-top:4px;"></p>
      </div>
      <h4 style="font-size:.85rem;margin:14px 0 8px;">Media Library</h4>
      <div id="mp-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:8px;max-height:340px;overflow-y:auto;">
        <div class="skel" style="height:84px;"></div>
      </div>
      <div class="drawer-form-actions">
        <button type="button" class="btn btn-outline" id="mp-close-btn">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);
  document.body.style.overflow = "hidden";
  const close = () => { backdrop.remove(); document.body.style.overflow = ""; };
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
  backdrop.querySelector("#mp-close-btn").addEventListener("click", close);

  async function loadGrid() {
    const grid = backdrop.querySelector("#mp-grid");
    const snap = await getDocs(query(collection(db, "media"), orderBy("createdAt", "desc")));
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    grid.innerHTML = items.length ? items.map(m => `
      <div style="position:relative;" data-id="${m.id}">
        <img src="${m.url}" style="width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:8px;cursor:pointer;border:2px solid transparent;" data-pick="${m.url}">
        <button data-del="${m.id}" data-path="${m.path || ""}" data-sha="${m.sha || ""}" title="Delete"
          style="position:absolute;top:2px;right:2px;width:20px;height:20px;border-radius:50%;background:rgba(0,0,0,.6);color:#fff;border:none;font-size:.7rem;cursor:pointer;line-height:1;">✕</button>
      </div>
    `).join("") : `<p class="muted" style="grid-column:1/-1;">No images uploaded yet — upload one above.</p>`;

    grid.querySelectorAll("[data-pick]").forEach(img => {
      img.addEventListener("click", () => { onSelect(img.dataset.pick); close(); });
    });
    grid.querySelectorAll("[data-del]").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const ok = await confirmModal("Remove this image from the library?", "This also deletes the file from GitHub, if it was uploaded there.");
        if (!ok) return;
        const { deleteImageFromGithub } = await import("./github-storage.js");
        await deleteImageFromGithub(btn.dataset.path, btn.dataset.sha);
        await deleteDoc(doc(db, "media", btn.dataset.del));
        loadGrid();
      });
    });
  }
  loadGrid();

  backdrop.querySelector("#mp-upload-input").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const status = backdrop.querySelector("#mp-upload-status");
    if (!isGithubConfigured()) {
      status.textContent = "GitHub image hosting isn't set up yet — configure it in Admin → Settings.";
      e.target.value = "";
      return;
    }
    status.textContent = "Uploading…";
    try {
      const { url, path, sha } = await uploadImageToGithub(file);
      await addDoc(collection(db, "media"), { url, path, sha, name: file.name, createdAt: serverTimestamp() });
      status.textContent = "";
      toast("Image uploaded to library.");
      onSelect(url);
      close();
    } catch (err) {
      status.textContent = err.message || "Upload failed.";
    }
    e.target.value = "";
  });
}
