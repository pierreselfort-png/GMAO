/* =========================================================
   GMAO V1 (GitHub Pages / LocalStorage)
   - Machines (CRUD)
   - Pièces (CRUD)
   - Interventions (CRUD)
   - Fournisseurs (CRUD)
   - Dashboard + alertes stock + interventions à venir
   - Import / Export JSON
========================================================= */

const STORAGE_KEY = "gmao_v1_data";

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function money(n) {
  const x = Number(n || 0);
  return x.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

function safeText(s) {
  return String(s ?? "").trim();
}

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return {
      suppliers: [],
      machines: [],
      parts: [],
      interventions: [],
      meta: { version: 1, updatedAt: new Date().toISOString() }
    };
  }
  try {
    return JSON.parse(raw);
  } catch {
    return {
      suppliers: [],
      machines: [],
      parts: [],
      interventions: [],
      meta: { version: 1, updatedAt: new Date().toISOString() }
    };
  }
}

function saveData(data) {
  data.meta = { ...(data.meta || {}), version: 1, updatedAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

let db = loadData();

/* -------------------- Tabs -------------------- */
const tabs = [...document.querySelectorAll(".tab")];
const panels = {
  dashboard: document.querySelector("#panel-dashboard"),
  machines: document.querySelector("#panel-machines"),
  parts: document.querySelector("#panel-parts"),
  interventions: document.querySelector("#panel-interventions"),
  suppliers: document.querySelector("#panel-suppliers"),
};

tabs.forEach(t => {
  t.addEventListener("click", () => {
    tabs.forEach(x => x.classList.remove("active"));
    t.classList.add("active");
    const key = t.dataset.tab;
    Object.values(panels).forEach(p => p.classList.remove("active"));
    panels[key].classList.add("active");
    renderAll();
  });
});

/* -------------------- Common: selects -------------------- */
function supplierNameById(id) {
  if (!id) return "";
  const s = db.suppliers.find(x => x.id === id);
  return s ? s.name : "";
}
function machineNameById(id) {
  if (!id) return "";
  const m = db.machines.find(x => x.id === id);
  return m ? m.name : "";
}

function fillSupplierSelect(selectEl, allowEmpty = true) {
  const val = selectEl.value;
  selectEl.innerHTML = "";
  if (allowEmpty) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "—";
    selectEl.appendChild(opt);
  }
  db.suppliers
    .slice()
    .sort((a,b) => a.name.localeCompare(b.name))
    .forEach(s => {
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = s.name;
      selectEl.appendChild(opt);
    });
  selectEl.value = val || "";
}

function fillMachineSelect(selectEl, allowEmpty = true) {
  const val = selectEl.value;
  selectEl.innerHTML = "";
  if (allowEmpty) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "—";
    selectEl.appendChild(opt);
  }
  db.machines
    .slice()
    .sort((a,b) => a.name.localeCompare(b.name))
    .forEach(m => {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = `${m.name} (${m.ident})`;
      selectEl.appendChild(opt);
    });
  selectEl.value = val || "";
}

/* -------------------- Suppliers -------------------- */
const formSupplier = document.querySelector("#formSupplier");
const supplierId = document.querySelector("#supplierId");
const supplierName = document.querySelector("#supplierName");
const supplierContact = document.querySelector("#supplierContact");
const supplierEmail = document.querySelector("#supplierEmail");
const supplierPhone = document.querySelector("#supplierPhone");
const supplierWebsite = document.querySelector("#supplierWebsite");
const btnSupplierClear = document.querySelector("#btnSupplierClear");
const tableSuppliersBody = document.querySelector("#tableSuppliers tbody");
const searchSuppliers = document.querySelector("#searchSuppliers");

btnSupplierClear.addEventListener("click", () => {
  supplierId.value = "";
  formSupplier.reset();
});

formSupplier.addEventListener("submit", (e) => {
  e.preventDefault();
  const payload = {
    id: supplierId.value || uid(),
    name: safeText(supplierName.value),
    contact: safeText(supplierContact.value),
    email: safeText(supplierEmail.value),
    phone: safeText(supplierPhone.value),
    website: safeText(supplierWebsite.value),
  };
  if (!payload.name) return;

  const idx = db.suppliers.findIndex(x => x.id === payload.id);
  if (idx >= 0) db.suppliers[idx] = payload;
  else db.suppliers.push(payload);

  saveData(db);
  supplierId.value = "";
  formSupplier.reset();
  renderAll();
});

function editSupplier(id) {
  const s = db.suppliers.find(x => x.id === id);
  if (!s) return;
  supplierId.value = s.id;
  supplierName.value = s.name;
  supplierContact.value = s.contact || "";
  supplierEmail.value = s.email || "";
  supplierPhone.value = s.phone || "";
  supplierWebsite.value = s.website || "";
}

function deleteSupplier(id) {
  // Empêche suppression si utilisé par une machine/pièce
  const usedByMachine = db.machines.some(m => m.supplierId === id);
  const usedByPart = db.parts.some(p => p.supplierId === id);
  if (usedByMachine || usedByPart) {
    alert("Impossible : ce fournisseur est utilisé par une machine ou une pièce.");
    return;
  }
  db.suppliers = db.suppliers.filter(x => x.id !== id);
  saveData(db);
  renderAll();
}

function renderSuppliers() {
  const q = safeText(searchSuppliers.value).toLowerCase();
  const list = db.suppliers
    .slice()
    .sort((a,b) => a.name.localeCompare(b.name))
    .filter(s => {
      if (!q) return true;
      return (
        (s.name || "").toLowerCase().includes(q) ||
        (s.contact || "").toLowerCase().includes(q) ||
        (s.email || "").toLowerCase().includes(q) ||
        (s.phone || "").toLowerCase().includes(q)
      );
    });

  tableSuppliersBody.innerHTML = "";
  list.forEach(s => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${s.name}</td>
      <td>${s.contact || ""}</td>
      <td>${s.email || ""}</td>
      <td>${s.phone || ""}</td>
      <td>
        <button class="btn small btn-secondary" data-action="edit" data-id="${s.id}">Éditer</button>
        <button class="btn small btn-danger" data-action="del" data-id="${s.id}">Supprimer</button>
      </td>
    `;
    tableSuppliersBody.appendChild(tr);
  });

  tableSuppliersBody.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      if (btn.dataset.action === "edit") editSupplier(id);
      if (btn.dataset.action === "del") deleteSupplier(id);
    });
  });
}

/* -------------------- Machines -------------------- */
const formMachine = document.querySelector("#formMachine");
const machineId = document.querySelector("#machineId");
const machineName = document.querySelector("#machineName");
const machineIdent = document.querySelector("#machineIdent");
const machineCost = document.querySelector("#machineCost");
const machineSupplier = document.querySelector("#machineSupplier");
const machineState = document.querySelector("#machineState");
const machineLocation = document.querySelector("#machineLocation");
const machineNotes = document.querySelector("#machineNotes");
const btnMachineClear = document.querySelector("#btnMachineClear");
const tableMachinesBody = document.querySelector("#tableMachines tbody");
const searchMachines = document.querySelector("#searchMachines");

btnMachineClear.addEventListener("click", () => {
  machineId.value = "";
  formMachine.reset();
  machineState.value = "OK";
  fillSupplierSelect(machineSupplier, true);
});

formMachine.addEventListener("submit", (e) => {
  e.preventDefault();

  const payload = {
    id: machineId.value || uid(),
    name: safeText(machineName.value),
    ident: safeText(machineIdent.value),
    cost: Number(machineCost.value || 0),
    supplierId: machineSupplier.value || "",
    state: machineState.value || "OK",
    location: safeText(machineLocation.value),
    notes: safeText(machineNotes.value),
  };
  if (!payload.name || !payload.ident) return;

  const idx = db.machines.findIndex(x => x.id === payload.id);
  if (idx >= 0) db.machines[idx] = payload;
  else db.machines.push(payload);

  saveData(db);
  machineId.value = "";
  formMachine.reset();
  machineState.value = "OK";
  renderAll();
});

function editMachine(id) {
  const m = db.machines.find(x => x.id === id);
  if (!m) return;
  machineId.value = m.id;
  machineName.value = m.name;
  machineIdent.value = m.ident;
  machineCost.value = m.cost || 0;
  machineSupplier.value = m.supplierId || "";
  machineState.value = m.state || "OK";
  machineLocation.value = m.location || "";
  machineNotes.value = m.notes || "";
}

function deleteMachine(id) {
  const usedByIntervention = db.interventions.some(i => i.machineId === id);
  if (usedByIntervention) {
    alert("Impossible : cette machine est liée à des interventions.");
    return;
  }
  db.machines = db.machines.filter(x => x.id !== id);
  saveData(db);
  renderAll();
}

function renderMachines() {
  fillSupplierSelect(machineSupplier, true);

  const q = safeText(searchMachines.value).toLowerCase();
  const list = db.machines
    .slice()
    .sort((a,b) => a.name.localeCompare(b.name))
    .filter(m => {
      if (!q) return true;
      const sup = supplierNameById(m.supplierId).toLowerCase();
      return (
        (m.name || "").toLowerCase().includes(q) ||
        (m.ident || "").toLowerCase().includes(q) ||
        (m.location || "").toLowerCase().includes(q) ||
        (m.state || "").toLowerCase().includes(q) ||
        sup.includes(q)
      );
    });

  tableMachinesBody.innerHTML = "";
  list.forEach(m => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${m.name}</td>
      <td>${m.ident}</td>
      <td>${money(m.cost)}</td>
      <td>${supplierNameById(m.supplierId)}</td>
      <td><span class="pill">${m.state}</span></td>
      <td>${m.location || ""}</td>
      <td>
        <button class="btn small btn-secondary" data-action="edit" data-id="${m.id}">Éditer</button>
        <button class="btn small btn-danger" data-action="del" data-id="${m.id}">Supprimer</button>
      </td>
    `;
    tableMachinesBody.appendChild(tr);
  });

  tableMachinesBody.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      if (btn.dataset.action === "edit") editMachine(id);
      if (btn.dataset.action === "del") deleteMachine(id);
    });
  });
}

/* -------------------- Parts -------------------- */
const formPart = document.querySelector("#formPart");
const partId = document.querySelector("#partId");
const partName = document.querySelector("#partName");
const partQty = document.querySelector("#partQty");
const partCost = document.querySelector("#partCost");
const partSupplier = document.querySelector("#partSupplier");
const partLocation = document.querySelector("#partLocation");
const btnPartClear = document.querySelector("#btnPartClear");
const tablePartsBody = document.querySelector("#tableParts tbody");
const searchParts = document.querySelector("#searchParts");

btnPartClear.addEventListener("click", () => {
  partId.value = "";
  formPart.reset();
  fillSupplierSelect(partSupplier, true);
});

formPart.addEventListener("submit", (e) => {
  e.preventDefault();

  const payload = {
    id: partId.value || uid(),
    name: safeText(partName.value),
    qty: Number(partQty.value || 0),
    cost: Number(partCost.value || 0),
    supplierId: partSupplier.value || "",
    location: safeText(partLocation.value),
  };
  if (!payload.name) return;

  const idx = db.parts.findIndex(x => x.id === payload.id);
  if (idx >= 0) db.parts[idx] = payload;
  else db.parts.push(payload);

  saveData(db);
  partId.value = "";
  formPart.reset();
  renderAll();
});

function editPart(id) {
  const p = db.parts.find(x => x.id === id);
  if (!p) return;
  partId.value = p.id;
  partName.value = p.name;
  partQty.value = p.qty ?? 0;
  partCost.value = p.cost ?? 0;
  partSupplier.value = p.supplierId || "";
  partLocation.value = p.location || "";
}

function deletePart(id) {
  db.parts = db.parts.filter(x => x.id !== id);
  saveData(db);
  renderAll();
}

function renderParts() {
  fillSupplierSelect(partSupplier, true);

  const q = safeText(searchParts.value).toLowerCase();
  const list = db.parts
    .slice()
    .sort((a,b) => a.name.localeCompare(b.name))
    .filter(p => {
      if (!q) return true;
      const sup = supplierNameById(p.supplierId).toLowerCase();
      return (
        (p.name || "").toLowerCase().includes(q) ||
        (p.location || "").toLowerCase().includes(q) ||
        sup.includes(q)
      );
    });

  tablePartsBody.innerHTML = "";
  list.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.name}</td>
      <td>${p.qty}</td>
      <td>${money(p.cost)}</td>
      <td>${supplierNameById(p.supplierId)}</td>
      <td>${p.location || ""}</td>
      <td>
        <button class="btn small btn-secondary" data-action="edit" data-id="${p.id}">Éditer</button>
        <button class="btn small btn-danger" data-action="del" data-id="${p.id}">Supprimer</button>
      </td>
    `;
    tablePartsBody.appendChild(tr);
  });

  tablePartsBody.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      if (btn.dataset.action === "edit") editPart(id);
      if (btn.dataset.action === "del") deletePart(id);
    });
  });
}

/* -------------------- Interventions -------------------- */
const formIntervention = document.querySelector("#formIntervention");
const interventionId = document.querySelector("#interventionId");
const interventionDate = document.querySelector("#interventionDate");
const interventionMachine = document.querySelector("#interventionMachine");
const interventionStatus = document.querySelector("#interventionStatus");
const interventionMotif = document.querySelector("#interventionMotif");
const interventionTech = document.querySelector("#interventionTech");
const interventionDuration = document.querySelector("#interventionDuration");
const btnInterventionClear = document.querySelector("#btnInterventionClear");
const tableInterventionsBody = document.querySelector("#tableInterventions tbody");
const searchInterventions = document.querySelector("#searchInterventions");

btnInterventionClear.addEventListener("click", () => {
  interventionId.value = "";
  formIntervention.reset();
  interventionStatus.value = "Planifiée";
  fillMachineSelect(interventionMachine, true);
});

formIntervention.addEventListener("submit", (e) => {
  e.preventDefault();

  const payload = {
    id: interventionId.value || uid(),
    date: interventionDate.value, // YYYY-MM-DD
    machineId: interventionMachine.value || "",
    status: interventionStatus.value || "Planifiée",
    motif: safeText(interventionMotif.value),
    tech: safeText(interventionTech.value),
    durationMin: Number(interventionDuration.value || 0),
  };
  if (!payload.date || !payload.motif) return;

  const idx = db.interventions.findIndex(x => x.id === payload.id);
  if (idx >= 0) db.interventions[idx] = payload;
  else db.interventions.push(payload);

  saveData(db);
  interventionId.value = "";
  formIntervention.reset();
  interventionStatus.value = "Planifiée";
  renderAll();
});

function editIntervention(id) {
  const i = db.interventions.find(x => x.id === id);
  if (!i) return;
  interventionId.value = i.id;
  interventionDate.value = i.date;
  interventionMachine.value = i.machineId || "";
  interventionStatus.value = i.status || "Planifiée";
  interventionMotif.value = i.motif || "";
  interventionTech.value = i.tech || "";
  interventionDuration.value = i.durationMin || 0;
}

function deleteIntervention(id) {
  db.interventions = db.interventions.filter(x => x.id !== id);
  saveData(db);
  renderAll();
}

function renderInterventions() {
  fillMachineSelect(interventionMachine, true);

  const q = safeText(searchInterventions.value).toLowerCase();
  const list = db.interventions
    .slice()
    .sort((a,b) => (a.date || "").localeCompare(b.date || ""))
    .filter(i => {
      if (!q) return true;
      const mach = machineNameById(i.machineId).toLowerCase();
      return (
        (i.date || "").toLowerCase().includes(q) ||
        (i.motif || "").toLowerCase().includes(q) ||
        (i.status || "").toLowerCase().includes(q) ||
        mach.includes(q)
      );
    });

  tableInterventionsBody.innerHTML = "";
  list.forEach(i => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i.date || ""}</td>
      <td>${machineNameById(i.machineId)}</td>
      <td>${i.motif}</td>
      <td><span class="pill">${i.status}</span></td>
      <td>
        <button class="btn small btn-secondary" data-action="edit" data-id="${i.id}">Éditer</button>
        <button class="btn small btn-danger" data-action="del" data-id="${i.id}">Supprimer</button>
      </td>
    `;
    tableInterventionsBody.appendChild(tr);
  });

  tableInterventionsBody.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      if (btn.dataset.action === "edit") editIntervention(id);
      if (btn.dataset.action === "del") deleteIntervention(id);
    });
  });
}

/* -------------------- Dashboard -------------------- */
const kpiMachines = document.querySelector("#kpiMachines");
const kpiParts = document.querySelector("#kpiParts");
const kpiInterventions = document.querySelector("#kpiInterventions");
const upcomingList = document.querySelector("#upcomingList");
const stockAlerts = document.querySelector("#stockAlerts");
const stockThreshold = document.querySelector("#stockThreshold");
const btnRefreshAlerts = document.querySelector("#btnRefreshAlerts");

btnRefreshAlerts.addEventListener("click", renderDashboard);

function renderDashboard() {
  kpiMachines.textContent = db.machines.length;
  kpiParts.textContent = db.parts.length;
  kpiInterventions.textContent = db.interventions.length;

  // Upcoming interventions next 30 days
  upcomingList.innerHTML = "";
  const now = new Date();
  const limit = new Date(now);
  limit.setDate(limit.getDate() + 30);

  const upcoming = db.interventions
    .filter(i => i.date)
    .map(i => ({ ...i, d: new Date(i.date + "T00:00:00") }))
    .filter(i => i.d >= new Date(now.toDateString()) && i.d <= limit)
    .sort((a,b) => a.d - b.d)
    .slice(0, 12);

  if (upcoming.length === 0) {
    upcomingList.innerHTML = `<div class="item muted">Aucune intervention à venir dans les 30 prochains jours.</div>`;
  } else {
    upcoming.forEach(i => {
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `
        <div><strong>${i.date}</strong> • <span class="pill">${i.status}</span></div>
        <div class="muted">${machineNameById(i.machineId)} — ${i.motif}</div>
      `;
      upcomingList.appendChild(div);
    });
  }

  // Stock alerts
  stockAlerts.innerHTML = "";
  const th = Number(stockThreshold.value || 0);

  const low = db.parts
    .filter(p => Number(p.qty || 0) <= th)
    .slice()
    .sort((a,b) => (a.qty||0) - (b.qty||0));

  if (low.length === 0) {
    stockAlerts.innerHTML = `<div class="item muted">Aucune alerte (seuil ≤ ${th}).</div>`;
  } else {
    low.forEach(p => {
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `
        <div><strong>${p.name}</strong> • <span class="pill">Qté: ${p.qty}</span></div>
        <div class="muted">Fournisseur: ${supplierNameById(p.supplierId)} — Stockage: ${p.location || "—"}</div>
      `;
      stockAlerts.appendChild(div);
    });
  }
}

/* -------------------- Import / Export / Reset -------------------- */
const btnExport = document.querySelector("#btnExport");
const fileImport = document.querySelector("#fileImport");
const btnReset = document.querySelector("#btnReset");

btnExport.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gmao_export_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

fileImport.addEventListener("change", async () => {
  const f = fileImport.files?.[0];
  if (!f) return;
  try {
    const txt = await f.text();
    const imported = JSON.parse(txt);

    // Validation minimale
    const ok = imported &&
      Array.isArray(imported.suppliers) &&
      Array.isArray(imported.machines) &&
      Array.isArray(imported.parts) &&
      Array.isArray(imported.interventions);

    if (!ok) {
      alert("Fichier invalide (structure attendue: suppliers/machines/parts/interventions).");
      return;
    }

    db = imported;
    saveData(db);
    alert("Import OK.");
    renderAll();
  } catch (e) {
    console.error(e);
    alert("Import impossible (JSON invalide).");
  } finally {
    fileImport.value = "";
  }
});

btnReset.addEventListener("click", () => {
  if (!confirm("Reset complet ? Toutes les données locales seront supprimées.")) return;
  localStorage.removeItem(STORAGE_KEY);
  db = loadData();
  renderAll();
});

/* -------------------- Render all -------------------- */
function renderAll() {
  // Refresh selects (because suppliers/machines affect them)
  fillSupplierSelect(machineSupplier, true);
  fillSupplierSelect(partSupplier, true);
  fillMachineSelect(interventionMachine, true);

  renderDashboard();
  renderSuppliers();
  renderMachines();
  renderParts();
  renderInterventions();
}

/* -------------------- Search inputs (rerender on input) -------------------- */
[
  searchSuppliers,
  searchMachines,
  searchParts,
  searchInterventions
].forEach(el => el.addEventListener("input", renderAll));

/* -------------------- Init -------------------- */
renderAll();
