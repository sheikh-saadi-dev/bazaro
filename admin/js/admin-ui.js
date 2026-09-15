export function confirmModal(title, body) {
  return new Promise((resolve) => {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.innerHTML = `
      <div class="modal" role="alertdialog" aria-modal="true">
        <h3>${title}</h3>
        <p class="muted" style="margin:0;">${body || ""}</p>
        <div class="modal-actions">
          <button class="btn btn-outline" id="modal-cancel">Cancel</button>
          <button class="btn btn-danger" id="modal-confirm">Delete</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);
    const close = (result) => { backdrop.remove(); resolve(result); };
    backdrop.querySelector("#modal-cancel").addEventListener("click", () => close(false));
    backdrop.querySelector("#modal-confirm").addEventListener("click", () => close(true));
    backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(false); });
  });
}
