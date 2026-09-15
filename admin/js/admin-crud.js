import { db, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy, query } from "../../js/firebase.js";
import { escapeHtml, toast } from "../../js/utils.js";
import { confirmModal } from "./admin-ui.js";

/**
 * config = {
 *   collectionName, title, addLabel,
 *   orderByField?: string,
 *   columns: [{ key, label, render?: (item)=>html }],
 *   fields: [{ key, label, type: 'text'|'number'|'textarea'|'select'|'toggle'|'date', required, options?, default? }],
 *   emptyMessage
 * }
 */
export function mountCrudPage(config) {
  const root = document.getElementById("crud-root");
  let items = [];

  async function load() {
    root.innerHTML = `<div class="skel" style="height:200px"></div>`;
    const col = collection(db, config.collectionName);
    const snap = await getDocs(config.orderByField ? query(col, orderBy(config.orderByField)) : col);
    items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    render();
  }

  function render() {
    root.innerHTML = `
      <div class="admin-header-row">
        <div>
          <p class="muted" style="margin:0;">${items.length} item(s)</p>
        </div>
        <button class="btn btn-primary" id="add-btn">${config.addLabel || "Add new"}</button>
      </div>
      <div class="table-scroll">
        <table class="data-table">
          <thead><tr>${config.columns.map(c => `<th>${c.label}</th>`).join("")}<th>Actions</th></tr></thead>
          <tbody>
            ${items.length ? items.map(item => `
              <tr data-id="${item.id}">
                ${config.columns.map(c => `<td data-label="${c.label}">${c.render ? c.render(item) : escapeHtml(String(item[c.key] ?? ""))}</td>`).join("")}
                <td data-label="Actions">
                  <button class="action-link" data-edit="${item.id}">Edit</button>
                  <button class="action-link danger" data-del="${item.id}">Delete</button>
                </td>
              </tr>`).join("") : `<tr><td colspan="${config.columns.length + 1}"><div class="empty-state">${config.emptyMessage || "Nothing here yet."}</div></td></tr>`}
          </tbody>
        </table>
      </div>
    `;
    document.getElementById("add-btn").addEventListener("click", () => openForm(null));
    root.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => openForm(items.find(i => i.id === b.dataset.edit))));
    root.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", () => handleDelete(b.dataset.del)));
  }

  function fieldHtml(f, item) {
    const val = item ? item[f.key] : (f.default ?? "");
    if (f.type === "toggle") {
      return `<label class="pill-toggle"><input type="checkbox" data-field="${f.key}" ${val ? "checked" : ""}> ${f.label}</label>`;
    }
    if (f.type === "select") {
      return `<div class="field"><label>${f.label}</label>
        <select data-field="${f.key}" ${f.required ? "required" : ""}>
          ${f.options.map(o => `<option value="${o.value}" ${val === o.value ? "selected" : ""}>${o.label}</option>`).join("")}
        </select></div>`;
    }
    if (f.type === "textarea") {
      return `<div class="field"><label>${f.label}</label><textarea data-field="${f.key}" rows="3" ${f.required ? "required" : ""}>${escapeHtml(val || "")}</textarea></div>`;
    }
    return `<div class="field"><label>${f.label}</label><input data-field="${f.key}" type="${f.type || "text"}" value="${escapeHtml(val ?? "")}" ${f.required ? "required" : ""}></div>`;
  }

  function openForm(item) {
    const backdrop = document.createElement("div");
    backdrop.className = "drawer-form-backdrop";
    backdrop.innerHTML = `
      <div class="drawer-form" role="dialog" aria-modal="true" onclick="event.stopPropagation()">
        <h3>${item ? "Edit" : "Add"} ${config.title}</h3>
        <form id="crud-form">
          ${config.fields.map(f => fieldHtml(f, item)).join("")}
          <div class="drawer-form-actions">
            <button type="button" class="btn btn-outline" id="cancel-btn">Cancel</button>
            <button type="submit" class="btn btn-primary">Save</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(backdrop);
    document.body.style.overflow = "hidden";
    const close = () => { backdrop.remove(); document.body.style.overflow = ""; };
    backdrop.addEventListener("click", close);
    backdrop.querySelector("#cancel-btn").addEventListener("click", close);

    backdrop.querySelector("#crud-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = {};
      config.fields.forEach(f => {
        const el = backdrop.querySelector(`[data-field="${f.key}"]`);
        if (f.type === "toggle") data[f.key] = el.checked;
        else if (f.type === "number") data[f.key] = el.value === "" ? null : Number(el.value);
        else data[f.key] = f.transform ? f.transform(el.value) : el.value;
      });
      try {
        if (item) {
          await updateDoc(doc(db, config.collectionName, item.id), { ...data, updatedAt: serverTimestamp() });
          toast(`${config.title} updated successfully.`);
        } else {
          await addDoc(collection(db, config.collectionName), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
          toast(`${config.title} added successfully.`);
        }
        close();
        load();
      } catch (err) {
        toast("Something went wrong.", "err");
      }
    });
  }

  async function handleDelete(id) {
    const ok = await confirmModal(`Delete this ${config.title.toLowerCase()}?`, "This can't be undone.");
    if (!ok) return;
    try {
      await deleteDoc(doc(db, config.collectionName, id));
      toast(`${config.title} deleted.`);
      load();
    } catch (e) { toast("Couldn't delete — please try again.", "err"); }
  }

  load();
}
