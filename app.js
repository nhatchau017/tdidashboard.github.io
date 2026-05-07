/* TDI Phase 2 Market Scan dashboard logic. Vanilla JS. */

const PRODUCTS = window.PRODUCTS || [];
const PRODUCT_SCREENSHOTS = window.PRODUCT_SCREENSHOTS || {};

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
const FEATURE_SHORT = {
  f_transdx: "Transdiag.", f_coping: "Coping tools", f_transition: "Transition",
  f_disclosure: "Disclosure", f_pain_mind: "Pain mind.", f_gamif: "Gamification",
  f_clusters: "Symptom clusters", f_cbt_cancer: "CBT/cancer", f_jitai: "JITAI/flare",
  f_peer: "Peer support", f_ccs_custom: "CCS custom", f_late_glossary: "Late effects",
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
    data: { labels, datasets: [{ data, backgroundColor: opts.color || "#c96442", borderRadius: 4, maxBarThickness: 28 }] },
    options: {
      indexAxis: opts.horizontal ? "y" : "x",
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: "#6b6964", font: { size: 11 } }, grid: { color: "#e6e4e0" } },
        y: { ticks: { color: "#6b6964", font: { size: 11 } }, grid: { color: "#e6e4e0" }, beginAtZero: true, precision: 0 },
      },
    },
  });
}
function makeDoughnut(id, labels, data, colors) {
  const defaultColors = ["#97b68f", "#6b8f62", "#c4d8be", "#4e7a55", "#b0cba9", "#7fa37a", "#d6e8d2", "#3d6147"];
  charts[id] = new Chart($("#" + id).getContext("2d"), {
    type: "doughnut",
    data: { labels, datasets: [{ data, backgroundColor: colors || defaultColors, borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "right", labels: { font: { size: 11 }, color: "#6b6964" } } } },
  });
}

function renderCharts(list) {
  destroyCharts();

  const symptomKeys = Object.keys(SYMPTOM_LABELS).filter(k => k !== "s_cog");
  const symptomCounts = symptomKeys.map(k => list.filter(p => isYes(p[k])).length);
  makeBar("chart-symptoms", symptomKeys.map(k => SYMPTOM_LABELS[k]), symptomCounts, { horizontal: true, color: "#97b68f" });

  const countryCounts = {};
  list.forEach(p => {
    const primary = (p.country || "").split("/")[0].trim() || "Unknown";
    countryCounts[primary] = (countryCounts[primary] || 0) + 1;
  });
  const sortedCountries = Object.entries(countryCounts).sort((a,b) => b[1]-a[1]);
  makeBar("chart-countries", sortedCountries.map(x=>x[0]), sortedCountries.map(x=>x[1]), { horizontal: true, color: "#97b68f" });

  const deliveryCounts = Object.keys(DELIVERY_LABELS).map(k => list.filter(p => isYes(p[k])).length);
  makeBar("chart-delivery", Object.values(DELIVERY_LABELS), deliveryCounts, { color: "#97b68f" });

  const popLabels = Object.values(POP_LABELS);
  const popCounts = Object.keys(POP_LABELS).map(k => list.filter(p => isYes(p[k])).length);
  makeDoughnut("chart-pop", popLabels, popCounts, ["#97b68f", "#d6e8d2", "#d6e8d2"]);

  // CBT degree
  const degrees = ["Core", "Mixed", "Loose"];
  const dCounts = degrees.map(d => list.filter(p => cbtDegreeLabel(p) === d).length);
  makeDoughnut("chart-cbt-degree", degrees, dCounts, ["#97b68f", "#d6e8d2", "#d6e8d2"]);

  // Standardised measures: count mentions of common screeners
  const measureKeys = ["PHQ-9", "GAD-7", "K-10", "WHO-5", "ISI", "DBAS-16", "PROMIS", "RCADS", "SCAS", "POMS", "CES-D"];
  const mCounts = measureKeys.map(k =>
    list.filter(p => (p.standardized_measures || "").includes(k)).length
  );
  makeBar("chart-measures", measureKeys, mCounts, { horizontal: true, color: "#97b68f" });
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
    const popTags = populationTagsFor(p) || '<span style="color:var(--muted);font-size:11px">Unknown</span>';
    const symptomTags = symptomTagsFor(p) || '<span style="color:var(--muted);font-size:11px">None coded Yes</span>';
    const deliveryTags = deliveryTagsFor(p);

    card.innerHTML = `
      <div class="pc-left">
        <div class="pc-id">${p.id}</div>
        <div class="pc-name">${escapeHTML(p.name)}</div>
        <div class="pc-meta">${escapeHTML(p.vendor || "Unknown vendor")}</div>
        <div class="pc-meta">${escapeHTML(country)}</div>
        ${cbtDegreeBadge(p)}
      </div>
      <div class="pc-body">
        ${p.elevator_pitch && p.elevator_pitch !== "Unknown" ? `<div class="pc-pitch">${escapeHTML(p.elevator_pitch)}</div>` : ""}
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
      </div>
      <div class="pc-actions">
        <div class="pc-link">View details</div>
      </div>
    `;
    card.querySelectorAll('a').forEach(a => a.addEventListener('click', e => e.stopPropagation()));
    card.addEventListener("click", () => openModal(p));
    wrap.appendChild(card);
  });
}

// ---------- Feature comparison ----------
function featureScore(p) {
  return Object.keys(FEATURE_LABELS).filter(k => isYes(p[k])).length;
}

function featureCell(val) {
  if (isYes(val)) return '<td class="fcell fcell-yes">✓</td>';
  if (isNo(val)) return '<td class="fcell fcell-no">–</td>';
  return '<td class="fcell fcell-unk">?</td>';
}

function renderCompare() {
  const sortVal = ($("#compare-sort") || {}).value || "id";
  const hlKey   = ($("#compare-highlight") || {}).value || "";
  let list = PRODUCTS.slice();
  if (sortVal === "name")  list.sort((a, b) => a.name.localeCompare(b.name));
  else if (sortVal === "score") list.sort((a, b) => featureScore(b) - featureScore(a));
  else list.sort((a, b) => a.id.localeCompare(b.id));

  const fkeys = Object.keys(FEATURE_LABELS);
  const colgroup = `<colgroup>
    <col style="width:56px">
    <col style="width:130px">
    <col style="width:50px">
    ${fkeys.map(() => '<col style="width:36px">').join("")}
    <col style="width:54px">
  </colgroup>`;
  const thead = `<thead><tr>
    <th class="fth-sticky fth-id">ID</th>
    <th class="fth-sticky fth-name">Product</th>
    <th class="fth-sticky fth-country">Country</th>
    ${fkeys.map(k => `<th class="fth-feature" title="${FEATURE_LABELS[k]}"><div>${FEATURE_SHORT[k]}</div></th>`).join("")}
    <th class="fth-feature fth-score">Score</th>
  </tr></thead>`;

  const tfoot = `<tfoot><tr class="frow-totals">
    <td colspan="3" class="ftotal-label">Products with Yes →</td>
    ${fkeys.map(k => {
      const yes = PRODUCTS.filter(p => isYes(p[k])).length;
      const unk = PRODUCTS.filter(p => !isYes(p[k]) && !isNo(p[k])).length;
      return `<td class="fcell ftotal-cell"><strong>${yes}</strong><br><span class="ftotal-unk">+${unk}?</span></td>`;
    }).join("")}
    <td></td>
  </tr></tfoot>`;

  const tbody = list.map(p => {
    const score = featureScore(p);
    const hl = hlKey && isYes(p[hlKey]) ? " class=\"frow-hl\"" : "";
    const country = escapeHTML((p.country || '').split('/')[0].trim());
    return `<tr${hl} data-id="${p.id}">
      <td class="fcell-id">${p.id}</td>
      <td class="fcell-name">${escapeHTML(p.name)}</td>
      <td class="fcell-country">${country}</td>
      ${fkeys.map(k => featureCell(p[k])).join("")}
      <td class="fcell fcell-score">${score}/12</td>
    </tr>`;
  }).join("");

  const table = $("#compare-table");
  table.innerHTML = colgroup + thead + tfoot + `<tbody>${tbody}</tbody>`;
  table.querySelectorAll("tr[data-id]").forEach(tr => {
    tr.addEventListener("click", () => {
      const p = PRODUCTS.find(x => x.id === tr.dataset.id);
      if (p) openModal(p);
    });
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
  renderEvidence(list);
  updateSortIndicators();
}

// ---------- CBT Evidence tab ----------
function renderEvidence(list) {
  const container = $("#evidence-container");
  if (!container) return;
  container.innerHTML = list.map(p => {
    const degree = cbtDegreeLabel(p);
    const fields = [
      ["Where CBT shows up", p.cbt_location],
      ["How CBT is structured", p.cbt_structure],
      ["CBT concepts", p.cbt_concepts],
      ["CBT tools", p.cbt_tools],
      ["Standardised measures", p.standardized_measures],
      ["Psychoeducation", p.psychoeducation],
      ["Daily content", p.daily_content],
      ["Usage & adoption", p.usage_adoption],
    ];
    const fieldsHtml = fields.map(([label, val]) => `
      <div class="ev-field">
        <div class="ev-field-label">${label}</div>
        <div class="ev-field-value${!val || val === 'Unknown' ? ' unknown' : ''}">${!val || val === 'Unknown' ? 'Unknown' : escapeHTML(val)}</div>
      </div>`).join("");
    const country = (p.country || "").split("/")[0].trim();
    return `
      <div class="ev-card">
        <div class="ev-header">
          <div class="ev-title-block">
            <span class="pc-id">${p.id}</span>
            <span class="ev-name">${escapeHTML(p.name)}</span>
            <span class="ev-meta">${escapeHTML(p.vendor || "")}${country ? " · " + escapeHTML(country) : ""}</span>
          </div>
          ${cbtDegreeBadge(p)}
          ${p.cbt_degree && p.cbt_degree !== "Unknown" ? `<div class="ev-degree-text">${escapeHTML(p.cbt_degree)}</div>` : ""}
        </div>
        <div class="ev-grid">${fieldsHtml}</div>
      </div>`;
  }).join("");
}


// ---------- All Designs tab ----------
const ALL_DESIGNS_STATE = { q: "", cbt: "", platform: "" };

function buildCbtDeliveryParagraph(p) {
  const degree = (p.cbt_degree || "").trim();
  const location = (p.cbt_location || "").trim();
  const structure = (p.cbt_structure || "").trim();
  const parts = [];
  if (degree && degree !== "Unknown") parts.push(`<strong>CBT involvement:</strong> ${escapeHTML(degree)}`);
  if (location && location !== "Unknown") parts.push(`<strong>Where CBT shows up:</strong> ${escapeHTML(location)}`);
  if (structure && structure !== "Unknown") parts.push(`<strong>How it is structured:</strong> ${escapeHTML(structure)}`);
  if (parts.length === 0) return '<em style="color:var(--muted);">CBT delivery details not documented in the scan.</em>';
  return parts.map(s => `<p style="margin:0 0 8px;line-height:1.55;">${s}</p>`).join("");
}

function parseFeatures(allFeatures) {
  if (!allFeatures || allFeatures === "Unknown") return [];
  // Features are usually semicolon-delimited e.g. "AI chatbot [CBT]; mood tracker; ..."
  return allFeatures.split(/;\s*/)
    .map(s => s.trim())
    .filter(Boolean);
}

function renderFeatureChips(allFeatures) {
  const items = parseFeatures(allFeatures);
  if (items.length === 0) {
    return '<span style="color:var(--muted);font-size:12px;">No feature data captured.</span>';
  }
  return items.map(f => {
    const isCbt = /\[CBT[^\]]*\]/i.test(f);
    const cleaned = f.replace(/\.+$/, "");
    return `<span class="ds-feature${isCbt ? ' ds-feature-cbt' : ''}">${escapeHTML(cleaned)}</span>`;
  }).join("");
}

function buildShotsHTML(p) {
  const shots = PRODUCT_SCREENSHOTS[p.id] || [];
  const isMobile = isYes(p.mobile);
  if (shots.length > 0) {
    const galleryClass = isMobile ? "mobile-gallery" : "web-gallery";
    const sectionLabel = isMobile ? "Mobile screenshots" : "Web interface";
    const figs = shots.map((url, i) => `
      <figure class="ds-shot">
        <img src="${escapeHTML(url)}" alt="${escapeHTML(p.name)} screen ${i+1}" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentElement.style.display='none'" />
        <figcaption>Screen ${i+1}</figcaption>
      </figure>`).join("");
    return `
      <p class="ds-section-label">${sectionLabel}</p>
      <div class="ds-gallery">
        <div class="ds-gallery-inner ${galleryClass}">${figs}</div>
      </div>`;
  }
  // No screenshots — show a tasteful placeholder with website link
  const webUrl = p.url && p.url !== "Unknown" ? p.url : "";
  const label = isMobile ? "Mobile screenshots" : "Web interface";
  const note = isMobile
    ? "Public mobile screenshots not available — app may be prescribed-only, region-restricted, or removed from the store."
    : "Web platform — no public UI screenshots indexed; visit product website to preview.";
  return `
    <p class="ds-section-label">${label}</p>
    <div class="ad-no-shots">
      <div class="ad-no-shots-msg">${note}</div>
      ${webUrl ? `<a class="btn-secondary" href="${escapeHTML(webUrl)}" target="_blank" rel="noopener">Open product website &#8599;</a>` : ""}
    </div>`;
}

function buildLinksHTML(p) {
  const links = [];
  if (p.url && p.url !== "Unknown") links.push(`<a href="${escapeHTML(p.url)}" target="_blank" rel="noopener">Website &#8599;</a>`);
  if (p.app_store_url && /apps\.apple\.com/.test(p.app_store_url)) links.push(`<a href="${escapeHTML(p.app_store_url)}" target="_blank" rel="noopener">App Store &#8599;</a>`);
  if (p.google_play_url && /play\.google\.com/.test(p.google_play_url)) links.push(`<a href="${escapeHTML(p.google_play_url)}" target="_blank" rel="noopener">Google Play &#8599;</a>`);
  return links.length ? `<div class="ds-links">${links.join("")}</div>` : "";
}

function platformBadge(p) {
  if (isYes(p.mobile) && isYes(p.web)) return `<span class="ds-badge type">Mobile + Web</span>`;
  if (isYes(p.mobile)) return `<span class="ds-badge type">Mobile</span>`;
  if (isYes(p.web)) return `<span class="ds-badge type">Web</span>`;
  return "";
}

function applyAllDesignsFilter(list) {
  const q = ALL_DESIGNS_STATE.q.toLowerCase();
  return list.filter(p => {
    if (ALL_DESIGNS_STATE.cbt && cbtDegreeLabel(p) !== ALL_DESIGNS_STATE.cbt) return false;
    if (ALL_DESIGNS_STATE.platform === "mobile" && !isYes(p.mobile)) return false;
    if (ALL_DESIGNS_STATE.platform === "web" && (isYes(p.mobile) || !isYes(p.web))) return false;
    if (q) {
      const blob = [p.id, p.name, p.vendor, p.country, p.all_features, p.cbt_location, p.cbt_structure, p.elevator_pitch].filter(Boolean).join(" ").toLowerCase();
      if (!blob.includes(q)) return false;
    }
    return true;
  });
}

function renderAllDesigns() {
  const container = $("#all-designs-container");
  if (!container) return;
  const list = applyAllDesignsFilter(PRODUCTS.slice().sort((a,b) => a.id.localeCompare(b.id)));
  const countEl = $("#ad-count");
  if (countEl) countEl.textContent = `${list.length} of ${PRODUCTS.length} products`;
  container.innerHTML = list.map(p => {
    const country = (p.country || "").split("/")[0].trim();
    const degree = cbtDegreeLabel(p);
    const cbtPara = buildCbtDeliveryParagraph(p);
    const features = renderFeatureChips(p.all_features);
    const shots = buildShotsHTML(p);
    const links = buildLinksHTML(p);
    const elevator = p.elevator_pitch && p.elevator_pitch !== "Unknown"
      ? `<p style="margin:0 0 12px;color:var(--ink-soft);font-size:13px;line-height:1.5;font-style:italic;">${escapeHTML(p.elevator_pitch)}</p>`
      : "";
    return `
      <div class="panel ds-card" data-id="${p.id}">
        <div class="ds-header">
          <div class="ds-title-row">
            <span class="pc-id" style="font-size:11px;color:var(--muted);font-weight:500;">${p.id}</span>
            <h2 class="ds-name">${escapeHTML(p.name)}</h2>
            <span class="ds-org">${escapeHTML(p.vendor || "")}${country ? " &middot; " + escapeHTML(country) : ""}</span>
          </div>
          <div class="ds-badges">
            ${cbtDegreeBadge(p)}
            ${platformBadge(p)}
          </div>
          ${elevator}
          ${links}
        </div>

        <div class="ad-section">
          <h4 class="ad-h4">1 &middot; How CBT is delivered</h4>
          <div class="ad-cbt-body">${cbtPara}</div>
        </div>

        <div class="ad-section">
          <h4 class="ad-h4">2 &middot; Core features</h4>
          <div class="ds-features" style="border-top:none;padding-top:0;margin-top:0;">${features}</div>
        </div>

        <div class="ad-section">
          <h4 class="ad-h4">3 &middot; ${isYes(p.mobile) ? "Interface preview" : "Web interface"}</h4>
          ${shots}
        </div>
      </div>`;
  }).join("");
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
  ["dashboard", "catalog", "evidence", "compare", "designs", "all-designs"].forEach(t => {
    const el = $(`#tab-${t}`);
    if (el) el.classList.toggle("hidden", name !== t);
  });
  if (name === "compare") renderCompare();
  if (name === "all-designs") renderAllDesigns();
}

function init() {
  populateCountrySelect();

  $("#q").addEventListener("input", e => { state.q = e.target.value; refresh(); });
  $("#country").addEventListener("change", e => { state.country = e.target.value; refresh(); });
  $("#symptom").addEventListener("change", e => { state.symptom = e.target.value; refresh(); });
  $("#delivery").addEventListener("change", e => { state.delivery = e.target.value; refresh(); });
  $("#population").addEventListener("change", e => { state.population = e.target.value; refresh(); });
  $("#cbtDegree").addEventListener("change", e => { state.cbtDegree = e.target.value; refresh(); });

  $("#modal-close").addEventListener("click", closeModal);
  $("#modal-back").addEventListener("click", e => { if (e.target === $("#modal-back")) closeModal(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

  $$(".tabs-inner button[data-tab]").forEach(b => {
    b.addEventListener("click", () => setTab(b.dataset.tab));
  });

  const hlSel = $("#compare-highlight");
  if (hlSel) {
    Object.keys(FEATURE_LABELS).forEach(k => {
      const opt = document.createElement("option");
      opt.value = k; opt.textContent = FEATURE_LABELS[k];
      hlSel.appendChild(opt);
    });
  }
  const cmpSort = $("#compare-sort");
  if (cmpSort) cmpSort.addEventListener("change", renderCompare);
  if (hlSel)   hlSel.addEventListener("change", renderCompare);

  const adSearch = $("#ad-search");
  const adCbt = $("#ad-cbt");
  const adPlatform = $("#ad-platform");
  if (adSearch) adSearch.addEventListener("input", e => { ALL_DESIGNS_STATE.q = e.target.value; renderAllDesigns(); });
  if (adCbt) adCbt.addEventListener("change", e => { ALL_DESIGNS_STATE.cbt = e.target.value; renderAllDesigns(); });
  if (adPlatform) adPlatform.addEventListener("change", e => { ALL_DESIGNS_STATE.platform = e.target.value; renderAllDesigns(); });

  refresh();
}
document.addEventListener("DOMContentLoaded", init);
