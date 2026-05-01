/* TDI Phase 2 Market Scan dashboard logic. Vanilla JS. */

const PRODUCTS = window.PRODUCTS || [];

const SYMPTOM_LABELS = {
  s_anx: "Anxiety", s_dep: "Depression", s_pain: "Pain", s_fatigue: "Fatigue",
  s_sleep: "Sleep disturbance", s_cog: "Cancer-related cognitive impairment",
  s_isolation: "Social isolation", s_rumin: "Rumination",
  s_health_anx: "Health anxiety", s_other: "Other",
};
const FEATURE_LABELS = {
  f_transdx: "Transdiagnostic", f_coping: "Health-anxiety coping tools",
  f_transition: "Healthcare transition guide", f_disclosure: "Cancer disclosure modules",
  f_pain_mind: "Pain mindfulness", f_gamif: "Gamification elements",
  f_clusters: "Personalised symptom-cluster ID", f_cbt_cancer: "CBT tailored to cancer",
  f_jitai: "Just-in-time interventions for flares", f_peer: "Moderated peer support",
  f_ccs_custom: "Customised for CCS", f_late_glossary: "Late-effect glossary",
};
const DIM_LABELS = {
  ucd: "1. UCD & usability for AYA",
  cbt_comorbid: "2. Transdiagnostic CBT fidelity",
  symptom_cluster: "3. Symptom-cluster coverage",
  sdt: "4. SDT alignment",
  psd: "5. PSD engagement features",
  wcag: "6. WCAG 2.2 accessibility",
  equity: "7. Equity",
  surv_fit: "8. Survivorship contextual fit",
};
const DELIVERY_LABELS = {
  self_guided: "Self-guided", therapist_guided: "Therapist-guided",
  hybrid: "Hybrid", ai_mediated: "AI-mediated",
};
const POP_LABELS = {
  ayaccs: "AYA cancer survivors",
  adjacent_aya: "Adjacent AYA chronic illness",
  general_adult: "General adult mental health",
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const isYes = v => (v || "").toString().toLowerCase().startsWith("yes");
const isNo = v => (v || "").toString().toLowerCase().startsWith("no");
function classifyCell(v) {
  if (isYes(v)) return "cell-yes"; if (isNo(v)) return "cell-no"; return "cell-unknown";
}
function escapeHTML(s) {
  return (s || "").toString()
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function formatMultiline(s) {
  if (!s || s === "Unknown") return '<span class="cell-unknown">Unknown</span>';
  return escapeHTML(s).replace(/\n/g, "<br>");
}
function cbtDegreeLabel(p) {
  const d = (p.cbt_degree || "").toLowerCase();
  if (d.startsWith("core")) return "Core";
  if (d.startsWith("mixed")) return "Mixed";
  if (d.startsWith("loose")) return "Loose";
  return "Unknown";
}
function symptomTagsFor(p) {
  return Object.keys(SYMPTOM_LABELS)
    .filter(k => isYes(p[k]))
    .map(k => `<span class="tag">${SYMPTOM_LABELS[k]}</span>`).join("");
}
function deliveryTagsFor(p) {
  return Object.keys(DELIVERY_LABELS)
    .filter(k => isYes(p[k]))
    .map(k => `<span class="tag muted">${DELIVERY_LABELS[k]}</span>`).join("");
}
function populationTagsFor(p) {
  return Object.keys(POP_LABELS)
    .filter(k => isYes(p[k]))
    .map(k => {
      const cls = k === "ayaccs" ? "good" : (k === "adjacent_aya" ? "warn" : "muted");
      return `<span class="tag ${cls}">${POP_LABELS[k]}</span>`;
    }).join("");
}
function cbtDegreeBadge(p) {
  const lbl = cbtDegreeLabel(p);
  const cls = lbl.toLowerCase();
  return `<span class="cbt-degree-badge ${cls}">${lbl}</span>`;
}

// ---------- KPIs ----------
function renderKPIs(list) {
  $("#kpi-total").textContent = list.length;
  $("#kpi-core").textContent = list.filter(p => cbtDegreeLabel(p) === "Core").length;
  $("#kpi-surv").textContent = list.filter(p => isYes(p.surv_fit)).length;
  $("#kpi-aya").textContent = list.filter(p => isYes(p.adjacent_aya) || isYes(p.ayaccs)).length;
}

// ---------- Charts ----------
const charts = {};
function destroyCharts() { Object.values(charts).forEach(c => c && c.destroy()); }
function makeBar(id, labels, data, opts = {}) {
  charts[id] = new Chart($("#" + id).getContext("2d"), {
    type: "bar",
    data: { labels, datasets: [{ data, backgroundColor: opts.color || "#2b59c3", borderRadius: 6, maxBarThickness: 32 }] },
    options: {
      indexAxis: opts.horizontal ? "y" : "x",
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: "#4a5568", font: { size: 11 } }, grid: { color: "#eef0f5" } },
        y: { ticks: { color: "#4a5568", font: { size: 11 } }, grid: { color: "#eef0f5" }, beginAtZero: true, precision: 0 },
      },
    },
  });
}
function makeDoughnut(id, labels, data) {
  charts[id] = new Chart($("#" + id).getContext("2d"), {
    type: "doughnut",
    data: { labels, datasets: [{ data, backgroundColor: ["#2b59c3", "#1c8b5a", "#c97f00", "#8392ab", "#b3261e", "#7c4dff", "#0ea5e9", "#84cc16"], borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "right", labels: { font: { size: 11 }, color: "#4a5568" } } } },
  });
}

function renderCharts(list) {
  destroyCharts();

  const symptomCounts = Object.keys(SYMPTOM_LABELS).map(k => list.filter(p => isYes(p[k])).length);
  makeBar("chart-symptoms", Object.values(SYMPTOM_LABELS), symptomCounts, { horizontal: true, color: "#2b59c3" });

  const countryCounts = {};
  list.forEach(p => {
    const primary = (p.country || "").split("/")[0].trim() || "Unknown";
    countryCounts[primary] = (countryCounts[primary] || 0) + 1;
  });
  const sortedCountries = Object.entries(countryCounts).sort((a,b) => b[1]-a[1]);
  makeBar("chart-countries", sortedCountries.map(x=>x[0]), sortedCountries.map(x=>x[1]), { horizontal: true, color: "#1c8b5a" });

  const deliveryCounts = Object.keys(DELIVERY_LABELS).map(k => list.filter(p => isYes(p[k])).length);
  makeBar("chart-delivery", Object.values(DELIVERY_LABELS), deliveryCounts, { color: "#7c4dff" });

  const popLabels = Object.values(POP_LABELS);
  const popCounts = Object.keys(POP_LABELS).map(k => list.filter(p => isYes(p[k])).length);
  makeDoughnut("chart-pop", popLabels, popCounts);

  // CBT degree
  const degrees = ["Core", "Mixed", "Loose"];
  const dCounts = degrees.map(d => list.filter(p => cbtDegreeLabel(p) === d).length);
  makeDoughnut("chart-cbt-degree", degrees, dCounts);

  // Standardised measures: count mentions of common screeners
  const measureKeys = ["PHQ-9", "GAD-7", "K-10", "WHO-5", "ISI", "DBAS-16", "PROMIS", "RCADS", "SCAS", "POMS", "CES-D"];
  const mCounts = measureKeys.map(k =>
    list.filter(p => (p.standardized_measures || "").includes(k)).length
  );
  makeBar("chart-measures", measureKeys, mCounts, { horizontal: true, color: "#0ea5e9" });
}

// ---------- Filters ----------
const state = {
  q: "", country: "", symptom: "", delivery: "", population: "", cbtDegree: "",
  sortKey: "id", sortDir: 1,
};

function populateCountrySelect() {
  const sel = $("#country");
  const set = new Set();
  PRODUCTS.forEach(p => (p.country || "").split("/").map(s => s.trim()).forEach(c => c && set.add(c)));
  Array.from(set).sort().forEach(c => {
    const opt = document.createElement("option");
    opt.value = c; opt.textContent = c; sel.appendChild(opt);
  });
}

function applyFilters() {
  let list = PRODUCTS.slice();
  if (state.q) {
    const q = state.q.toLowerCase();
    list = list.filter(p => {
      const blob = [
        p.name, p.vendor, p.stated_pop, p.note, p.country,
        p.elevator_pitch, p.usage_adoption, p.cbt_location,
        p.cbt_structure, p.cbt_ui_examples, p.all_features,
        p.cbt_concepts, p.cbt_tools, p.daily_content,
        p.psychoeducation, p.standardized_measures, p.other_assessments,
      ].filter(Boolean).join(" ").toLowerCase();
      return blob.includes(q);
    });
  }
  if (state.country) list = list.filter(p => (p.country || "").includes(state.country));
  if (state.symptom)  list = list.filter(p => isYes(p[state.symptom]));
  if (state.delivery) list = list.filter(p => isYes(p[state.delivery]));
  if (state.population) list = list.filter(p => isYes(p[state.population]));
  if (state.cbtDegree) list = list.filter(p => cbtDegreeLabel(p) === state.cbtDegree);

  const key = state.sortKey, dir = state.sortDir;
  list.sort((a,b) => {
    const av = (a[key] || "").toString().toLowerCase();
    const bv = (b[key] || "").toString().toLowerCase();
    if (av < bv) return -1 * dir;
    if (av > bv) return  1 * dir;
    return 0;
  });
  return list;
}

function renderActiveChips() {
  const chips = [];
  if (state.q) chips.push({ k: "q", label: `“${state.q}”` });
  if (state.country) chips.push({ k: "country", label: `Country: ${state.country}` });
  if (state.symptom) chips.push({ k: "symptom", label: `Symptom: ${SYMPTOM_LABELS[state.symptom]}` });
  if (state.delivery) chips.push({ k: "delivery", label: `Delivery: ${DELIVERY_LABELS[state.delivery]}` });
  if (state.population) chips.push({ k: "population", label: `Population: ${POP_LABELS[state.population]}` });
  if (state.cbtDegree) chips.push({ k: "cbtDegree", label: `CBT: ${state.cbtDegree}` });
  const c = $("#active-chips");
  c.innerHTML = "";
  chips.forEach(ch => {
    const span = document.createElement("span");
    span.className = "chip";
    span.textContent = ch.label + " ×";
    span.addEventListener("click", () => {
      state[ch.k] = "";
      const el = $("#" + ch.k);
      if (el) el.value = "";
      refresh();
    });
    c.appendChild(span);
  });
  if (chips.length > 1) {
    const clear = document.createElement("button");
    clear.className = "clear-btn"; clear.textContent = "Clear all";
    clear.addEventListener("click", () => {
      Object.assign(state, { q: "", country: "", symptom: "", delivery: "", population: "", cbtDegree: "" });
      ["q","country","symptom","delivery","population","cbtDegree"].forEach(id => { const el = $("#" + id); if (el) el.value = ""; });
      refresh();
    });
    c.appendChild(clear);
  }
}

function renderTable(list) {
  const tbody = $("#products-body");
  tbody.innerHTML = "";
  list.forEach(p => {
    const tr = document.createElement("tr");
    tr.dataset.id = p.id;
    tr.innerHTML = `
      <td>${p.id}</td>
      <td><div class="product-name">${escapeHTML(p.name)}</div><div style="color:var(--muted);font-size:11px">${escapeHTML(p.platform || "")}</div></td>
      <td>${escapeHTML(p.vendor || "")}</td>
      <td><span class="country-tag">${escapeHTML((p.country || "").split("/")[0].trim())}</span></td>
      <td><div class="symptom-tags">${symptomTagsFor(p) || '<span style="color:var(--muted);font-size:11px">None coded Yes</span>'}</div></td>
      <td><div class="symptom-tags">${deliveryTagsFor(p)}</div></td>
      <td>${cbtDegreeBadge(p)}</td>
      <td><div class="symptom-tags">${populationTagsFor(p)}</div></td>
    `;
    tr.addEventListener("click", () => openModal(p));
    tbody.appendChild(tr);
  });
}

function fieldOrUnknown(value) {
  if (!value || value === "Unknown") {
    return `<div class="field-value unknown">Unknown</div>`;
  }
  return `<div class="field-value">${escapeHTML(value)}</div>`;
}

function renderCards(list) {
  const wrap = $("#cards-container");
  wrap.innerHTML = "";
  list.forEach(p => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.dataset.id = p.id;
    const country = (p.country || "").split("/")[0].trim() || "Unknown";
    const stores = `
      ${storeButton("Apple App Store", p.app_store_url)}
      ${storeButton("Google Play", p.google_play_url)}
    `;
    const evidenceFields = [
      ["Where CBT shows up", p.cbt_location],
      ["How CBT is structured", p.cbt_structure],
      ["CBT concepts used", p.cbt_concepts],
      ["Concrete CBT tools", p.cbt_tools],
      ["Standardised measures", p.standardized_measures],
      ["Usage & adoption", p.usage_adoption],
      ["Daily readings / lessons", p.daily_content],
      ["Psychoeducation", p.psychoeducation],
    ];
    const evidenceHtml = evidenceFields.map(([k, v]) => `
      <div class="field">
        <div class="field-label">${k}</div>
        ${fieldOrUnknown(v)}
      </div>
    `).join("");

    const popTags = populationTagsFor(p) || '<span style="color:var(--muted);font-size:11px">Unknown</span>';
    const symptomTags = symptomTagsFor(p) || '<span style="color:var(--muted);font-size:11px">None coded Yes</span>';
    const deliveryTags = deliveryTagsFor(p);

    card.innerHTML = `
      <div class="pc-header">
        <div style="flex:1; min-width:0">
          <div class="pc-id">${p.id}</div>
          <div class="pc-name">${escapeHTML(p.name)}</div>
          <div class="pc-meta">
            ${escapeHTML(p.vendor || "Unknown vendor")}
            <span class="sep">·</span>${escapeHTML(country)}
            <span class="sep">·</span>${escapeHTML(p.platform || "")}
          </div>
        </div>
        ${cbtDegreeBadge(p)}
      </div>
      ${p.elevator_pitch && p.elevator_pitch !== "Unknown" ? `<div class="pc-pitch">${escapeHTML(p.elevator_pitch)}</div>` : ""}
      <div class="pc-stores">${stores}</div>

      <div class="pc-tag-row">
        <span class="label">Symptoms</span>
        <div class="pc-tags">${symptomTags}</div>
      </div>
      <div class="pc-tag-row">
        <span class="label">Delivery</span>
        <div class="pc-tags">${deliveryTags}</div>
      </div>
      <div class="pc-tag-row">
        <span class="label">Population</span>
        <div class="pc-tags">${popTags}</div>
      </div>

      <div class="pc-evidence">${evidenceHtml}</div>

      <div class="pc-link">View full evidence (features, dimensions, all measures)</div>
    `;
    // Stop modal opening if user clicks store buttons inside the card
    card.querySelectorAll('a').forEach(a => a.addEventListener('click', e => e.stopPropagation()));
    card.addEventListener("click", () => openModal(p));
    wrap.appendChild(card);
  });
}

function updateSortIndicators() {
  $$("#products-table th[data-sort]").forEach(th => {
    th.classList.remove("sort-asc", "sort-desc");
    if (th.dataset.sort === state.sortKey) th.classList.add(state.sortDir === 1 ? "sort-asc" : "sort-desc");
  });
}

function refresh() {
  const list = applyFilters();
  $("#result-count").textContent = `${list.length} of ${PRODUCTS.length} products`;
  renderActiveChips();
  renderKPIs(list);
  renderCharts(list);
  renderCards(list);
  renderTable(list);
  updateSortIndicators();
}

function setCatalogView(name) {
  $$(".view-toggle").forEach(b => b.classList.toggle("active", b.dataset.view === name));
  $("#cards-container").classList.toggle("hidden", name !== "cards");
  $("#table-container").classList.toggle("hidden", name !== "table");
}

// ---------- Modal ----------
function detailLine(label, val) {
  if (!val || val === "Unknown") return `<div><div class="k">${label}</div><div class="v cell-unknown">Unknown</div></div>`;
  return `<div><div class="k">${label}</div><div class="v">${escapeHTML(val)}</div></div>`;
}
function yesNoUnknownList(map, p) {
  return Object.keys(map).map(k => {
    const v = p[k] || "Unknown";
    return `<li><span class="${classifyCell(v)}">${v}</span> — ${map[k]}</li>`;
  }).join("");
}
function storeButton(label, url) {
  if (!url || url === "Unknown") return `<span class="store-link unknown">${label} — Unknown</span>`;
  return `<a class="store-link" href="${url}" target="_blank" rel="noopener">${label} ↗</a>`;
}

function openModal(p) {
  const url = p.url ? `<a href="${p.url}" target="_blank" rel="noopener">${escapeHTML(p.url)}</a>` : '<span class="cell-unknown">Unknown</span>';
  const pitch = p.elevator_pitch ? `<div class="pitch">${escapeHTML(p.elevator_pitch)}</div>` : "";
  const stores = `
    <div class="store-row">
      ${storeButton("Apple App Store", p.app_store_url)}
      ${storeButton("Google Play", p.google_play_url)}
    </div>
  `;
  const evidenceFields = [
    ["Usage & adoption", p.usage_adoption],
    ["Where CBT shows up", p.cbt_location],
    ["How CBT is structured", p.cbt_structure],
    ["What the CBT tools look like (UI)", p.cbt_ui_examples],
    ["All major features (CBT-marked)", p.all_features],
    ["CBT concepts used", p.cbt_concepts],
    ["Concrete CBT tools", p.cbt_tools],
    ["Daily readings / lessons", p.daily_content],
    ["Psychoeducation", p.psychoeducation],
    ["Standardised measures", p.standardized_measures],
    ["Other assessments", p.other_assessments],
  ];
  const evidenceSection = evidenceFields.map(([k, v]) =>
    `<div><h4>${k}</h4><p>${formatMultiline(v)}</p></div>`
  ).join("");

  $("#modal-body").innerHTML = `
    <h2>${escapeHTML(p.name)} <span style="font-weight:400;color:var(--muted);font-size:14px">(${p.id})</span> ${cbtDegreeBadge(p)}</h2>
    <div class="vendor">${escapeHTML(p.vendor || "")}</div>
    ${pitch}
    ${stores}

    <div class="detail-grid">
      ${detailLine("Platform", p.platform)}
      ${detailLine("Country", p.country)}
      ${detailLine("Last update", p.last_update)}
      <div><div class="k">Vendor / product website</div><div class="v">${url}</div></div>
      ${detailLine("Stated population", p.stated_pop)}
      ${detailLine("Age range stated", p.age_range)}
    </div>

    <div class="detail-section">
      <h4>Note / source caveat</h4>
      <p>${escapeHTML(p.note || "")}</p>
    </div>

    <div class="detail-section">
      <h4>Real-world evidence on CBT use</h4>
      <div class="evidence-grid">${evidenceSection}</div>
      <h4 style="margin-top:14px">Degree of CBT involvement</h4>
      <p>${formatMultiline(p.cbt_degree)}</p>
    </div>

    <div class="detail-section">
      <h4>Population targeting</h4>
      <ul>${yesNoUnknownList(POP_LABELS, p)}</ul>
    </div>

    <div class="detail-section">
      <h4>Delivery model</h4>
      <ul>${yesNoUnknownList(DELIVERY_LABELS, p)}</ul>
    </div>

    <div class="detail-section">
      <h4>Symptom coverage</h4>
      <ul>${yesNoUnknownList(SYMPTOM_LABELS, p)}</ul>
    </div>

    <div class="detail-section">
      <h4>Evaluation dimensions (TDI Section 3.1)</h4>
      <ul>${yesNoUnknownList(DIM_LABELS, p)}</ul>
    </div>

    <div class="detail-section">
      <h4>Design features (TDI Section 1.3.4)</h4>
      <ul>${yesNoUnknownList(FEATURE_LABELS, p)}</ul>
    </div>
  `;
  $("#modal-back").classList.add("open");
}
function closeModal() { $("#modal-back").classList.remove("open"); }

function setTab(name) {
  $$(".tabs-inner button[data-tab]").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
  $("#tab-dashboard").classList.toggle("hidden", name !== "dashboard");
  $("#tab-catalog").classList.toggle("hidden", name !== "catalog");
}

function init() {
  populateCountrySelect();

  $("#q").addEventListener("input", e => { state.q = e.target.value; refresh(); });
  $("#country").addEventListener("change", e => { state.country = e.target.value; refresh(); });
  $("#symptom").addEventListener("change", e => { state.symptom = e.target.value; refresh(); });
  $("#delivery").addEventListener("change", e => { state.delivery = e.target.value; refresh(); });
  $("#population").addEventListener("change", e => { state.population = e.target.value; refresh(); });
  $("#cbtDegree").addEventListener("change", e => { state.cbtDegree = e.target.value; refresh(); });

  $$("#products-table th[data-sort]").forEach(th => {
    th.addEventListener("click", () => {
      const k = th.dataset.sort;
      if (state.sortKey === k) state.sortDir *= -1;
      else { state.sortKey = k; state.sortDir = 1; }
      refresh();
    });
  });

  $("#modal-close").addEventListener("click", closeModal);
  $("#modal-back").addEventListener("click", e => { if (e.target === $("#modal-back")) closeModal(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

  $$(".tabs-inner button[data-tab]").forEach(b => {
    b.addEventListener("click", () => setTab(b.dataset.tab));
  });

  $$(".view-toggle").forEach(b => {
    b.addEventListener("click", () => setCatalogView(b.dataset.view));
  });

  refresh();
}
document.addEventListener("DOMContentLoaded", init);
