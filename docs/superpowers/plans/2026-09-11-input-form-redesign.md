# Input Form Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the sidebar of sliders (visible only on the "Simulazione Giornaliera" tab) with a single collapsible input form above all tabs, using plain number fields instead of sliders, recalculating on blur/Enter instead of on every keystroke.

**Architecture:** Pure HTML/CSS/DOM-event restructuring. No changes to `simulation.js` or the calculation logic in `tabs.js`/`ui-daily.js` — every field keeps its existing `id`, so `getParams()` keeps working unmodified. Six `<details>` sections (native HTML, no JS needed to expand/collapse) replace the current two-column sidebar layout. Fields migrate from their old location to the new form one category at a time, so the app stays fully working after every single task (no duplicate or missing DOM ids at any point).

**Tech Stack:** Vanilla HTML/CSS/JS (no build step, no framework, no test runner — this project has none and this plan doesn't add one). `public/index.html`, `public/style.css`, `public/js/ui-daily.js`, `public/js/tabs.js`.

**Spec:** `docs/superpowers/specs/2026-09-11-input-form-redesign-design.md`

## Global Constraints

- Every field's `id` stays exactly as it is today — `getParams()` (in `simulation.js`) is never touched.
- Every number field keeps the same `min`/`max`/`step`/`value` it has today as a `<input type="range">`.
- Sim-affecting fields switch from `oninput="resetRun()"` to `onchange="clampNumberInput(this);resetRun()"`. CAPEX-only fields switch from `oninput="runCapex()"` to `onchange="clampNumberInput(this);runCapex()"`.
- `<select>` fields keep `onchange` as they have today (already correct, no keystroke-by-keystroke issue with a dropdown).
- No new dependencies, no new files beyond what's listed in each task.
- This plan covers sub-projects 1+2 only (layout + parameter reorganization). Tariffs (F1/F2/F3 + PPA pricing) and the new ice-priority logic are explicitly out of scope — do not touch tariff calculation logic or ice-charging logic in `simulation.js`.

---

## Task 1: CSS foundation + `clampNumberInput` helper

**Files:**
- Modify: `public/style.css:52` (insert after)
- Modify: `public/js/ui-daily.js:6` (insert after)

**Interfaces:**
- Produces: CSS classes `#input-form`, `#input-form details`, `#input-form summary`, `.input-grid` (used by every later task). JS function `clampNumberInput(el)` (used by every later task's `onchange` handlers).

- [ ] **Step 1: Add the CSS for the collapsible form and its field grid**

In `public/style.css`, after line 52 (`.cn{font-size:.95rem;color:var(--text);font-weight:600;} .cv{font-size:.95rem;font-family:'IBM Plex Mono',monospace;color:var(--amber);font-weight:700;}`), insert:

```css
#input-form{margin-bottom:1.5rem;}
#input-form details{border-bottom:1px solid var(--border);padding:.7rem 0;}
#input-form details:last-child{border-bottom:none;}
#input-form summary{font-size:1.0rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text2);cursor:pointer;list-style:none;padding:.2rem 0;}
#input-form summary::-webkit-details-marker{display:none;}
#input-form summary::before{content:'\25B8\00a0';color:var(--blue);}
#input-form details[open] summary::before{content:'\25BE\00a0';}
.input-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem;margin-top:.8rem;}
.input-grid label{display:block;font-size:.95rem;color:var(--text);font-weight:600;margin-bottom:4px;}
```

- [ ] **Step 2: Add the clamp helper**

In `public/js/ui-daily.js`, after line 5 (`function showPueInfo(){alert(PUE_INFO_TXT);}`) and before the `// CALENDARIO` comment block, insert:

```js
// ============================================================
// CLAMP INPUT NUMERICI (i vecchi slider avevano min/max nativi;
// un campo digitato può uscire dal range se l'utente scrive a mano)
// ============================================================
function clampNumberInput(el){
  var v=parseFloat(el.value);
  var min=parseFloat(el.min),max=parseFloat(el.max);
  if(isNaN(v))v=isNaN(min)?0:min;
  if(!isNaN(min))v=Math.max(min,v);
  if(!isNaN(max))v=Math.min(max,v);
  el.value=v;
}
```

- [ ] **Step 3: Verify**

Open the app (`preview_start` with the `ites-sim` launch config, or reload if already running). Confirm no console errors (`read_console_messages`, `onlyErrors: true`). The page should look and behave exactly as before — this task adds unused CSS/JS only, nothing references it yet.

- [ ] **Step 4: Commit**

```bash
git add public/style.css public/js/ui-daily.js
git commit -m "Aggiunge CSS del form a sezioni e helper clampNumberInput"
```

---

## Task 2: Build the empty `#input-form` skeleton

**Files:**
- Modify: `public/index.html:33-34` (insert between)

**Interfaces:**
- Consumes: CSS classes from Task 1 (`#input-form`, `.input-grid`).
- Produces: Six empty grid containers later tasks populate: `#grid-sito`, `#grid-fv`, `#grid-rack`, `#grid-chiller`, `#grid-tariffe`, `#grid-econ`.

- [ ] **Step 1: Insert the skeleton between the PVGIS bar and the tabs**

In `public/index.html`, the PVGIS bar closes at line 33 (`</div>`) and the tabs bar starts at line 35 (`<div class="tabs">`). Insert this new block between them (i.e. replace the blank line 34):

```html
<div class="card" id="input-form">
  <details open>
    <summary>Sito &amp; Capannone</summary>
    <div class="input-grid" id="grid-sito"></div>
  </details>
  <details open>
    <summary>Potenza FV</summary>
    <div class="input-grid" id="grid-fv"></div>
  </details>
  <details open>
    <summary>Data Center &mdash; Rack IT</summary>
    <div class="input-grid" id="grid-rack"></div>
  </details>
  <details open>
    <summary>Chiller / Pompa di calore</summary>
    <div class="input-grid" id="grid-chiller"></div>
  </details>
  <details open>
    <summary>Tariffe &amp; Rete</summary>
    <div class="input-grid" id="grid-tariffe"></div>
  </details>
  <details>
    <summary>Ipotesi economiche (CAPEX/OPEX)</summary>
    <div class="input-grid" id="grid-econ"></div>
  </details>
</div>
```

(The last section, "Ipotesi economiche", starts closed — `<details>` without `open` — since it only matters when looking at the CAPEX/OPEX tab; the other five start open.)

- [ ] **Step 2: Verify**

Reload the app. The six section headers should appear between the PVGIS bar and the tabs, each empty, each clickable to expand/collapse (native `<details>` behavior — click "Ipotesi economiche" and confirm it opens with nothing inside). No console errors. The old sidebar and CAPEX param block are untouched and still fully functional at this point.

- [ ] **Step 3: Commit**

```bash
git add public/index.html
git commit -m "Aggiunge lo scheletro vuoto del form a sezioni sopra le tab"
```

---

## Task 3: Migrate "Potenza FV" fields

**Files:**
- Modify: `public/index.html:49-58` (the "Impianto FV — Bellocchi" card)
- Modify: `public/index.html` (the new `#grid-fv` from Task 2)
- Modify: `public/js/ui-daily.js:87-92` (`updateLabels`)

**Interfaces:**
- Consumes: `#grid-fv` (Task 2), `clampNumberInput` (Task 1).

- [ ] **Step 1: Move the three fields into `#grid-fv`**

In `public/index.html`, replace:

```html
<div class="card" id="input-form">
  <details open>
    <summary>Sito &amp; Capannone</summary>
    <div class="input-grid" id="grid-sito"></div>
  </details>
  <details open>
    <summary>Potenza FV</summary>
    <div class="input-grid" id="grid-fv"></div>
  </details>
```

with:

```html
<div class="card" id="input-form">
  <details open>
    <summary>Sito &amp; Capannone</summary>
    <div class="input-grid" id="grid-sito"></div>
  </details>
  <details open>
    <summary>Potenza FV</summary>
    <div class="input-grid" id="grid-fv">
      <div>
        <label for="r-kwp">Potenza installata &mdash; FV interna (tetto+terreno lotto Petra), kWp</label>
        <input type="number" min="200" max="3000" step="20" value="2000" id="r-kwp" onchange="clampNumberInput(this);resetRun()">
      </div>
      <div>
        <label for="r-kwp-ext">Potenza esterna &mdash; PPA / campi terzi, kWp</label>
        <input type="number" min="0" max="25000" step="500" value="0" id="r-kwp-ext" onchange="clampNumberInput(this);resetRun()">
        <div style="font-size:.85rem;color:var(--text3);margin-top:4px;">Esterna: nessun vincolo fisico n&eacute; CAPEX &mdash; si somma alla produzione FV ma non compare nell'investimento.</div>
      </div>
      <div>
        <label for="r-loss">Perdite sistema, %</label>
        <input type="number" min="10" max="22" step="1" value="14" id="r-loss" onchange="clampNumberInput(this);resetRun()">
      </div>
    </div>
  </details>
```

- [ ] **Step 2: Remove the fields from their old location, keep the calendar**

In `public/index.html`, replace the "Impianto FV — Bellocchi" card:

```html
      <div class="card">
        <div class="ct">Impianto FV &mdash; Bellocchi</div>
        <div class="cg">
          <div><div class="ch"><span class="cn">Potenza installata &mdash; FV interna (tetto+terreno lotto Petra)</span><span class="cv" id="v-kwp">2000 kWp</span></div><input type="range" min="200" max="3000" step="20" value="2000" id="r-kwp" oninput="resetRun()"></div>
          <div><div class="ch"><span class="cn">Potenza esterna &mdash; PPA / campi terzi</span><span class="cv" id="v-kwp-ext">0 kWp</span></div><input type="range" min="0" max="25000" step="500" value="0" id="r-kwp-ext" oninput="resetRun()"></div>
          <div style="font-size:.85rem;color:var(--text3);">Esterna: nessun vincolo fisico n&eacute; CAPEX &mdash; si somma alla produzione FV ma non compare nell'investimento.</div>
          <div><div class="ch"><span class="cn">Perdite sistema</span><span class="cv" id="v-loss">14 %</span></div><input type="range" min="10" max="22" step="1" value="14" id="r-loss" oninput="resetRun()"></div>
          <div><div class="ct" style="margin-bottom:6px;">Seleziona giorno</div><div id="cal-container"></div></div>
        </div>
      </div>
```

with:

```html
      <div class="card">
        <div class="ct" style="margin-bottom:6px;">Seleziona giorno</div>
        <div id="cal-container"></div>
      </div>
```

- [ ] **Step 3: Stop writing to the removed value badges**

In `public/js/ui-daily.js`, inside `updateLabels(p)`, replace:

```js
  document.getElementById('v-kwp').textContent=p.kwpInterno+' kWp';
  document.getElementById('v-kwp-ext').textContent=itNum(p.kwpEsterno)+' kWp';
  document.getElementById('hdr-fvkwp-txt').textContent=itNum(p.kwp)+' kWp';
  document.getElementById('hdr-fvbadge-txt').textContent=itNum(p.kwp/1000,1)+' MWp';
  document.getElementById('v-loss').textContent=Math.round(p.loss*100)+' %';
```

with:

```js
  document.getElementById('hdr-fvkwp-txt').textContent=itNum(p.kwp)+' kWp';
  document.getElementById('hdr-fvbadge-txt').textContent=itNum(p.kwp/1000,1)+' MWp';
```

- [ ] **Step 4: Verify**

Reload the app. The "Potenza FV" section at the top now shows the three fields with their current values (2000, 0, 14). The old "Impianto FV — Bellocchi" card now shows only the day-picker calendar. Type `500` into the PPA field and press Tab (or click elsewhere) — the daily simulation results below should recalculate using 500 kWp of PPA (check the "Potenza esterna" summary text or any KPI that depends on FV size). Type `999999` into the PPA field and blur it — the field should snap back to `25000`. No console errors.

- [ ] **Step 5: Commit**

```bash
git add public/index.html public/js/ui-daily.js
git commit -m "Sposta i campi Potenza FV nel form in cima"
```

---

## Task 4: Migrate "Sito & Capannone" fields

**Files:**
- Modify: `public/index.html:60-75` (the "FV: tetto + terreno" card)
- Modify: `public/index.html` (`#grid-sito`)

**Interfaces:**
- Consumes: `#grid-sito` (Task 2), `clampNumberInput` (Task 1).

- [ ] **Step 1: Move the four fields into `#grid-sito`**

In `public/index.html`, replace:

```html
  <details open>
    <summary>Sito &amp; Capannone</summary>
    <div class="input-grid" id="grid-sito"></div>
  </details>
```

with:

```html
  <details open>
    <summary>Sito &amp; Capannone</summary>
    <div class="input-grid" id="grid-sito">
      <div>
        <label for="r-suplotto">Superficie lotto Petra netta, m&sup2;</label>
        <input type="number" value="23659" id="r-suplotto" onchange="clampNumberInput(this);resetRun()">
      </div>
      <div>
        <label for="r-footprint">Footprint edificio ex-frigo, m&sup2;</label>
        <input type="number" value="5500" id="r-footprint" onchange="clampNumberInput(this);resetRun()">
      </div>
      <div>
        <label for="r-fvroof">Densit&agrave; FV in copertura, kWp/m&sup2; utile</label>
        <input type="number" step="0.01" value="0.19" id="r-fvroof" onchange="clampNumberInput(this);resetRun()">
      </div>
      <div>
        <label for="r-fvground-type">Tipo montaggio FV a terra</label>
        <select id="r-fvground-type" onchange="resetRun()">
          <option value="bancali" selected>Bancali a terra (0,10 kWp/m&sup2;)</option>
          <option value="piazzali">Piazzali complanari (0,13 kWp/m&sup2;)</option>
          <option value="pensiline">Pensiline (0,15 kWp/m&sup2;)</option>
        </select>
      </div>
      <div id="superfici-info" style="font-size:1.0rem;color:var(--text3);line-height:1.7;grid-column:1/-1;"></div>
    </div>
  </details>
```

- [ ] **Step 2: Remove the old "FV: tetto + terreno" card**

In `public/index.html`, delete this whole block entirely (it directly follows the card left by Task 3, i.e. right after the calendar card's closing `</div>`):

```html
      <div class="card" style="border:1.5px solid var(--green);">
        <div class="ct" style="color:var(--green);">FV: tetto + terreno &mdash; Lotto Petra Srl</div>
        <div class="cg">
          <div><div class="ch"><span class="cn">Superficie lotto Petra netta (m&sup2;)</span></div><input type="number" value="23659" id="r-suplotto" oninput="resetRun()"></div>
          <div><div class="ch"><span class="cn">Footprint edificio ex-frigo (m&sup2;)</span></div><input type="number" value="5500" id="r-footprint" oninput="resetRun()"></div>
          <div><div class="ch"><span class="cn">Densit&agrave; FV in copertura (kWp/m&sup2; utile)</span></div><input type="number" step="0.01" value="0.19" id="r-fvroof" oninput="resetRun()"></div>
          <div><div class="ch"><span class="cn">Tipo montaggio FV a terra</span></div>
            <select id="r-fvground-type" onchange="resetRun()">
              <option value="bancali" selected>Bancali a terra (0,10 kWp/m&sup2;)</option>
              <option value="piazzali">Piazzali complanari (0,13 kWp/m&sup2;)</option>
              <option value="pensiline">Pensiline (0,15 kWp/m&sup2;)</option>
            </select>
          </div>
          <div id="superfici-info" style="font-size:1.0rem;color:var(--text3);line-height:1.7;"></div>
        </div>
      </div>
```

- [ ] **Step 3: Verify**

Reload the app. "Sito & Capannone" shows the four fields plus the derived `#superfici-info` text (e.g. "FV tetto max: ... FV terra max: ..."). Changing "Footprint edificio ex-frigo" and blurring recalculates the derived superfici text and the simulation. No console errors, no duplicate-id warnings.

- [ ] **Step 4: Commit**

```bash
git add public/index.html
git commit -m "Sposta i campi Sito & Capannone nel form in cima"
```

---

## Task 5: Migrate "Data Center — Rack IT" fields

**Files:**
- Modify: `public/index.html:77-94` (the "Data Center — Rack IT" card)
- Modify: `public/index.html` (`#grid-rack`)

**Interfaces:**
- Consumes: `#grid-rack` (Task 2), `clampNumberInput` (Task 1).

- [ ] **Step 1: Move the four fields into `#grid-rack`**

In `public/index.html`, replace:

```html
  <details open>
    <summary>Data Center &mdash; Rack IT</summary>
    <div class="input-grid" id="grid-rack"></div>
  </details>
```

with:

```html
  <details open>
    <summary>Data Center &mdash; Rack IT</summary>
    <div class="input-grid" id="grid-rack">
      <div>
        <label for="r-racktype">Tipo rack</label>
        <select id="r-racktype" onchange="resetRun()">
          <option value="ai_gpu">AI / GPU (40 kW/rack)</option>
          <option value="ai_mixed">AI Misto GPU+CPU (25 kW/rack)</option>
          <option value="hpc">HPC Computing (20 kW/rack)</option>
          <option value="cloud" selected>Cloud Standard (10 kW/rack)</option>
          <option value="colo">Colocation (7 kW/rack)</option>
        </select>
      </div>
      <div>
        <label for="r-nrack">Numero rack</label>
        <input type="number" min="5" max="2000" step="5" value="50" id="r-nrack" onchange="clampNumberInput(this);resetRun()">
      </div>
      <div>
        <label for="r-setp">Set-point interno, &deg;C</label>
        <input type="number" min="18" max="30" step="1" value="27" id="r-setp" onchange="clampNumberInput(this);resetRun()">
      </div>
      <div>
        <label for="r-ua">Involucro UA, W/K</label>
        <input type="number" min="100" max="5000" step="100" value="500" id="r-ua" onchange="clampNumberInput(this);resetRun()">
      </div>
      <div id="rack-summary" style="font-size:1.0rem;color:var(--text3);line-height:1.7;grid-column:1/-1;"></div>
    </div>
  </details>
```

- [ ] **Step 2: Remove the old "Data Center — Rack IT" card**

In `public/index.html`, delete this whole block entirely:

```html
      <div class="card">
        <div class="ct">Data Center &mdash; Rack IT</div>
        <div class="cg">
          <div><div class="ch"><span class="cn">Tipo rack</span></div>
            <select id="r-racktype" onchange="resetRun()">
              <option value="ai_gpu">AI / GPU (40 kW/rack)</option>
              <option value="ai_mixed">AI Misto GPU+CPU (25 kW/rack)</option>
              <option value="hpc">HPC Computing (20 kW/rack)</option>
              <option value="cloud" selected>Cloud Standard (10 kW/rack)</option>
              <option value="colo">Colocation (7 kW/rack)</option>
            </select>
          </div>
          <div><div class="ch"><span class="cn">Numero rack</span><span class="cv" id="v-nrack">50</span></div><input type="range" min="5" max="2000" step="5" value="50" id="r-nrack" oninput="resetRun()"></div>
          <div id="rack-summary" style="font-size:1.0rem;color:var(--text3);line-height:1.7;"></div>
          <div><div class="ch"><span class="cn">Set-point interno</span><span class="cv" id="v-setp">27 &deg;C</span></div><input type="range" min="18" max="30" step="1" value="27" id="r-setp" oninput="resetRun()"></div>
          <div><div class="ch"><span class="cn">Involucro UA</span><span class="cv" id="v-ua">500 W/K</span></div><input type="range" min="100" max="5000" step="100" value="500" id="r-ua" oninput="resetRun()"></div>
        </div>
      </div>
```

- [ ] **Step 3: Stop writing to the removed value badges**

In `public/js/ui-daily.js`, inside `updateLabels(p)`, replace:

```js
  document.getElementById('v-nrack').textContent=p.nRack;
  document.getElementById('v-setp').textContent=p.setP+' °C';
  document.getElementById('v-ua').textContent=p.ua+' W/K';
```

with nothing (delete these three lines).

- [ ] **Step 4: Verify**

Reload the app. "Data Center — Rack IT" shows the four fields plus `#rack-summary` (e.g. "IT: 500 kW_el..."). Change "Numero rack" to `100`, blur — the rack summary and daily simulation update. No console errors.

- [ ] **Step 5: Commit**

```bash
git add public/index.html public/js/ui-daily.js
git commit -m "Sposta i campi Data Center — Rack IT nel form in cima"
```

---

## Task 6: Migrate "Chiller / Pompa di calore" field

**Files:**
- Modify: `public/index.html:96-134` (the "Pompa di Calore / Chiller" card)
- Modify: `public/index.html` (`#grid-chiller`)

**Interfaces:**
- Consumes: `#grid-chiller` (Task 2), `clampNumberInput` (Task 1).

- [ ] **Step 1: Move the field and its explainer panels into `#grid-chiller`**

In `public/index.html`, replace:

```html
  <details open>
    <summary>Chiller / Pompa di calore</summary>
    <div class="input-grid" id="grid-chiller"></div>
  </details>
```

with:

```html
  <details open>
    <summary>Chiller / Pompa di calore</summary>
    <div class="input-grid" id="grid-chiller">
      <div>
        <label for="r-cop">EER/COP nominale (15&deg;C)</label>
        <input type="number" min="2.0" max="6.0" step="0.1" value="3.5" id="r-cop" onchange="clampNumberInput(this);resetRun()">
      </div>
      <div style="grid-column:1/-1;">
        <div class="cop-panel" id="cop-explain-panel">
          <div style="font-size:1.0rem;font-weight:700;color:var(--teal);text-transform:uppercase;letter-spacing:.05em;margin-bottom:.4rem;">Catena di conversione energetica</div>
          <div class="cop-flow">
            <span class="cop-box" style="background:var(--red3);color:var(--red);">200 kW_el IT</span>
            <span class="cop-arrow">&rarr;</span>
            <span class="cop-box" style="background:var(--orange3);color:var(--orange);">200 kW_th calore</span>
            <span style="font-size:1.0rem;color:var(--text3);">(100% conversione fisica)</span>
          </div>
          <div class="cop-flow" style="margin-top:5px;">
            <span class="cop-box" style="background:var(--blue3);color:var(--blue);" id="cop-el-box">1 kWh_el FV</span>
            <span class="cop-arrow">&times;</span>
            <span class="cop-box" style="background:var(--teal3);color:var(--teal);" id="cop-th-box">EER 3.5</span>
            <span class="cop-arrow">=</span>
            <span class="cop-box" style="background:var(--green3);color:var(--green);" id="cop-result-box">3.5 kWh_th freddo</span>
          </div>
          <div class="cop-flow" style="margin-top:5px;">
            <span class="cop-box" style="background:var(--blue3);color:var(--blue);" id="cop-ice-el-box">1 kWh_el FV surplus</span>
            <span class="cop-arrow">&times;</span>
            <span class="cop-box" style="background:var(--teal3);color:var(--teal);" id="cop-ice-th-box">COP_ice 2.98</span>
            <span class="cop-arrow">=</span>
            <span class="cop-box" style="background:rgba(57,200,200,0.15);color:#0e7490;" id="cop-ice-result-box">2.98 kWh_th ghiaccio</span>
          </div>
          <div style="font-size:.95rem;color:var(--text3);margin-top:.4rem;">COP_ice = COP &times; 0.85 &middot; Degrada -2%/&deg;C sopra 15&deg;C</div>
          <div class="cop-flow" style="margin-top:8px;padding-top:8px;border-top:1px dashed var(--border2);">
            <span class="cop-box" style="background:var(--amber3);color:var(--amber);">+25% ausiliari</span>
            <span style="font-size:.95rem;color:var(--text3);">pompe glicole/acqua, ventole condensatore, controlli &rarr;</span>
            <span class="cop-box" style="background:var(--teal3);color:var(--teal);" id="cop-real-box">EER impianto 2.8</span>
          </div>
          <div style="font-size:.95rem;color:var(--text3);margin-top:.4rem;">Il kW_el realmente assorbito dalla centrale frigorifera si calcola con l'EER/COP <b>di impianto</b> (compressore + ausiliari), non il solo compressore.</div>
        </div>
        <div id="cop-mensile-quick" style="font-size:1.0rem;color:var(--text3);line-height:1.7;"></div>
      </div>
    </div>
  </details>
```

- [ ] **Step 2: Remove the old "Pompa di Calore / Chiller" card**

In `public/index.html`, delete this whole block entirely:

```html
      <div class="card" style="border:1.5px solid var(--teal);">
        <div class="ct" style="color:var(--teal);">Pompa di Calore / Chiller &mdash; Conversione kWh_el &#8596; kWh_th</div>
        <div class="cg">
          <div><div class="ch"><span class="cn">EER/COP nominale (15&deg;C)</span><span class="cv" id="v-cop">3.5</span></div>
            <input type="range" min="2.0" max="6.0" step="0.1" value="3.5" id="r-cop" oninput="resetRun()">
          </div>
          <div class="cop-panel" id="cop-explain-panel">
            <div style="font-size:1.0rem;font-weight:700;color:var(--teal);text-transform:uppercase;letter-spacing:.05em;margin-bottom:.4rem;">Catena di conversione energetica</div>
            <div class="cop-flow">
              <span class="cop-box" style="background:var(--red3);color:var(--red);">200 kW_el IT</span>
              <span class="cop-arrow">&rarr;</span>
              <span class="cop-box" style="background:var(--orange3);color:var(--orange);">200 kW_th calore</span>
              <span style="font-size:1.0rem;color:var(--text3);">(100% conversione fisica)</span>
            </div>
            <div class="cop-flow" style="margin-top:5px;">
              <span class="cop-box" style="background:var(--blue3);color:var(--blue);" id="cop-el-box">1 kWh_el FV</span>
              <span class="cop-arrow">&times;</span>
              <span class="cop-box" style="background:var(--teal3);color:var(--teal);" id="cop-th-box">EER 3.5</span>
              <span class="cop-arrow">=</span>
              <span class="cop-box" style="background:var(--green3);color:var(--green);" id="cop-result-box">3.5 kWh_th freddo</span>
            </div>
            <div class="cop-flow" style="margin-top:5px;">
              <span class="cop-box" style="background:var(--blue3);color:var(--blue);" id="cop-ice-el-box">1 kWh_el FV surplus</span>
              <span class="cop-arrow">&times;</span>
              <span class="cop-box" style="background:var(--teal3);color:var(--teal);" id="cop-ice-th-box">COP_ice 2.98</span>
              <span class="cop-arrow">=</span>
              <span class="cop-box" style="background:rgba(57,200,200,0.15);color:#0e7490;" id="cop-ice-result-box">2.98 kWh_th ghiaccio</span>
            </div>
            <div style="font-size:.95rem;color:var(--text3);margin-top:.4rem;">COP_ice = COP &times; 0.85 &middot; Degrada -2%/&deg;C sopra 15&deg;C</div>
            <div class="cop-flow" style="margin-top:8px;padding-top:8px;border-top:1px dashed var(--border2);">
              <span class="cop-box" style="background:var(--amber3);color:var(--amber);">+25% ausiliari</span>
              <span style="font-size:.95rem;color:var(--text3);">pompe glicole/acqua, ventole condensatore, controlli &rarr;</span>
              <span class="cop-box" style="background:var(--teal3);color:var(--teal);" id="cop-real-box">EER impianto 2.8</span>
            </div>
            <div style="font-size:.95rem;color:var(--text3);margin-top:.4rem;">Il kW_el realmente assorbito dalla centrale frigorifera si calcola con l'EER/COP <b>di impianto</b> (compressore + ausiliari), non il solo compressore.</div>
          </div>
          <div id="cop-mensile-quick" style="font-size:1.0rem;color:var(--text3);line-height:1.7;"></div>
        </div>
      </div>
```

- [ ] **Step 3: Stop writing to the removed value badge**

In `public/js/ui-daily.js`, inside `updateLabels(p)`, delete this line:

```js
  document.getElementById('v-cop').textContent=itNum(p.cop,1);
```

- [ ] **Step 4: Verify**

Reload the app. "Chiller / Pompa di calore" shows the COP field plus the conversion-chain explainer boxes (they should still show live numbers like "EER 3.5", "COP_ice 2.98" — those come from `renderLabels()`/`updateLabels()` populating `cop-el-box` etc., untouched). Change COP to `4.0`, blur, confirm the explainer boxes and the daily simulation update. No console errors.

- [ ] **Step 5: Commit**

```bash
git add public/index.html public/js/ui-daily.js
git commit -m "Sposta il campo Chiller/COP nel form in cima"
```

---

## Task 7: Migrate "Tariffe & Rete" fields

**Files:**
- Modify: `public/index.html:136-149` (the "Tariffe energia" card)
- Modify: `public/index.html` (`#grid-tariffe`)

**Interfaces:**
- Consumes: `#grid-tariffe` (Task 2), `clampNumberInput` (Task 1).

- [ ] **Step 1: Move the three fields into `#grid-tariffe`**

In `public/index.html`, replace:

```html
  <details open>
    <summary>Tariffe &amp; Rete</summary>
    <div class="input-grid" id="grid-tariffe"></div>
  </details>
```

with:

```html
  <details open>
    <summary>Tariffe &amp; Rete</summary>
    <div class="input-grid" id="grid-tariffe">
      <div>
        <label for="r-tariffmode">Tariffa</label>
        <select id="r-tariffmode" onchange="resetRun()">
          <option value="f1f2f3" selected>Oraria F1/F2/F3 (reale)</option>
          <option value="fixed">Prezzo fisso</option>
        </select>
      </div>
      <div>
        <label for="r-price">Prezzo base / F2, &euro;/kWh</label>
        <input type="number" min="0.05" max="0.50" step="0.01" value="0.24" id="r-price" onchange="clampNumberInput(this);resetRun()">
      </div>
      <div>
        <label for="r-feedin">Feed-in (immissione, solo estate), &euro;/kWh</label>
        <input type="number" min="0.00" max="0.15" step="0.01" value="0.05" id="r-feedin" onchange="clampNumberInput(this);resetRun()">
      </div>
      <div id="tariff-info" style="font-size:1.0rem;color:var(--text3);line-height:1.6;grid-column:1/-1;"></div>
    </div>
  </details>
```

- [ ] **Step 2: Remove the old "Tariffe energia" card, keep the "Ghiaccio prima della rete" note**

In `public/index.html`, replace:

```html
      <div class="card">
        <div class="ct">Tariffe energia</div>
        <div class="cg">
          <div><div class="ch"><span class="cn">Tariffa</span></div>
            <select id="r-tariffmode" onchange="resetRun()">
              <option value="f1f2f3" selected>Oraria F1/F2/F3 (reale)</option>
              <option value="fixed">Prezzo fisso</option>
            </select>
          </div>
          <div><div class="ch"><span class="cn">Prezzo base / F2</span><span class="cv" id="v-price">0.24 &euro;/kWh</span></div><input type="range" min="0.05" max="0.50" step="0.01" value="0.24" id="r-price" oninput="resetRun()"></div>
          <div><div class="ch"><span class="cn">Feed-in (immissione, solo estate)</span><span class="cv" id="v-feedin">0.05 &euro;/kWh</span></div><input type="range" min="0.00" max="0.15" step="0.01" value="0.05" id="r-feedin" oninput="resetRun()"></div>
          <div id="tariff-info" style="font-size:1.0rem;color:var(--text3);line-height:1.6;"></div>
        </div>
      </div>

      <div class="ibar ibar-g" style="font-size:1.0rem;">
```

with:

```html
      <div class="ibar ibar-g" style="font-size:1.0rem;">
```

- [ ] **Step 3: Stop writing to the removed value badges**

In `public/js/ui-daily.js`, inside `updateLabels(p)`, replace:

```js
  document.getElementById('v-price').textContent=itNum(p.gridPrice,2)+' €/kWh';
  document.getElementById('v-feedin').textContent=itNum(p.feedIn,2)+' €/kWh';
```

with nothing (delete these two lines).

- [ ] **Step 4: Verify**

Reload the app. "Tariffe & Rete" shows the three fields plus `#tariff-info` (F1/F2/F3 breakdown text). Change "Prezzo base / F2" to `0.30`, blur, confirm `#tariff-info` and the daily cost figures update. No console errors.

- [ ] **Step 5: Commit**

```bash
git add public/index.html public/js/ui-daily.js
git commit -m "Sposta i campi Tariffe & Rete nel form in cima"
```

---

## Task 8: Migrate "Ipotesi economiche (CAPEX/OPEX)" fields

**Files:**
- Modify: `public/index.html:231-250` (the CAPEX/OPEX panel's parameter block)
- Modify: `public/index.html` (`#grid-econ`)
- Modify: `public/js/tabs.js:397-425` (`runCapex`)

**Interfaces:**
- Consumes: `#grid-econ` (Task 2), `clampNumberInput` (Task 1).

- [ ] **Step 1: Move the five fields into `#grid-econ`**

In `public/index.html`, replace:

```html
  <details>
    <summary>Ipotesi economiche (CAPEX/OPEX)</summary>
    <div class="input-grid" id="grid-econ"></div>
  </details>
```

with:

```html
  <details>
    <summary>Ipotesi economiche (CAPEX/OPEX)</summary>
    <div class="input-grid" id="grid-econ">
      <div>
        <label for="r-fvcost">Variazione costo FV, %</label>
        <input type="number" min="-30" max="30" step="5" value="0" id="r-fvcost" onchange="clampNumberInput(this);runCapex()">
      </div>
      <div>
        <label for="r-gridvar">Variazione tariffa energia, %</label>
        <input type="number" min="-30" max="50" step="5" value="0" id="r-gridvar" onchange="clampNumberInput(this);runCapex()">
      </div>
      <div>
        <label for="r-hosting">Tariffa hosting IT, &euro;/kWh</label>
        <input type="number" min="0.05" max="0.30" step="0.01" value="0.12" id="r-hosting" onchange="clampNumberInput(this);runCapex()">
      </div>
      <div>
        <label for="r-urbcost">Oneri urbanizzazione, &euro;/m&sup2;</label>
        <input type="number" min="0" max="150" step="5" value="50" id="r-urbcost" onchange="clampNumberInput(this);runCapex()">
      </div>
      <div>
        <label for="r-nmacchine">N&deg; macchine ghiaccio</label>
        <select id="r-nmacchine" onchange="runCapex()">
          <option value="1" selected>1 macchina (nessuna ridondanza)</option>
          <option value="2">2 macchine (ridondanza N+1)</option>
          <option value="3">3 macchine (ridondanza N+1)</option>
          <option value="4">4 macchine (ridondanza N+1)</option>
        </select>
      </div>
    </div>
  </details>
```

- [ ] **Step 2: Remove the parameter block from the CAPEX/OPEX panel**

In `public/index.html`, replace:

```html
<div id="panel-capex" class="panel">
  <div class="card" style="margin-bottom:1rem;">
    <div class="ct">Parametri analisi finanziaria</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr 1fr;gap:1.2rem;">
      <div><div class="ch"><span class="cn">Variazione costo FV</span><span class="cv" id="v-fvcost">0 %</span></div><input type="range" min="-30" max="30" step="5" value="0" id="r-fvcost" oninput="runCapex()"></div>
      <div><div class="ch"><span class="cn">Variazione tariffa energia</span><span class="cv" id="v-gridvar">0 %</span></div><input type="range" min="-30" max="50" step="5" value="0" id="r-gridvar" oninput="runCapex()"></div>
      <div><div class="ch"><span class="cn">Tariffa hosting IT</span><span class="cv" id="v-hosting">0.12 &euro;/kWh</span></div><input type="range" min="0.05" max="0.30" step="0.01" value="0.12" id="r-hosting" oninput="runCapex()"></div>
      <div><div class="ch"><span class="cn">Oneri urbanizzazione</span><span class="cv" id="v-urbcost">50 &euro;/m&sup2;</span></div><input type="range" min="0" max="150" step="5" value="50" id="r-urbcost" oninput="runCapex()"></div>
      <div><div class="ch"><span class="cn">N&deg; macchine ghiaccio</span></div>
        <select id="r-nmacchine" onchange="runCapex()">
          <option value="1" selected>1 macchina (nessuna ridondanza)</option>
          <option value="2">2 macchine (ridondanza N+1)</option>
          <option value="3">3 macchine (ridondanza N+1)</option>
          <option value="4">4 macchine (ridondanza N+1)</option>
        </select>
      </div>
    </div>
  </div>
  <div id="capex-content"></div>
</div>
```

with:

```html
<div id="panel-capex" class="panel">
  <div id="capex-content"></div>
</div>
```

- [ ] **Step 3: Stop writing to the removed value badges**

In `public/js/tabs.js`, inside `runCapex()`, replace:

```js
  document.getElementById('v-fvcost').textContent=(fvcostPct>0?'+':'')+fvcostPct+' %';
  document.getElementById('v-gridvar').textContent=(gridvarPct>0?'+':'')+gridvarPct+' %';
  var hostingFee=parseFloat(document.getElementById('r-hosting').value)||0.12;
  document.getElementById('v-hosting').textContent=itNum(hostingFee,2)+' €/kWh';
```

with:

```js
  var hostingFee=parseFloat(document.getElementById('r-hosting').value)||0.12;
```

Then, further down in the same function, replace:

```js
  var urbCostM2=parseFloat(document.getElementById('r-urbcost').value)||0;
  document.getElementById('v-urbcost').textContent=urbCostM2+' €/m²';
```

with:

```js
  var urbCostM2=parseFloat(document.getElementById('r-urbcost').value)||0;
```

- [ ] **Step 4: Verify**

Reload the app, switch to the "CAPEX / OPEX" tab. Confirm the tab shows only results now (no field row above `#capex-content`), and the "Ipotesi economiche" section in the top form (still collapsed by default — click it open) has the five fields. Change "N° macchine ghiaccio" to `2`, confirm the CAPEX/OPEX results update. Change "Variazione costo FV" to `10`, blur, confirm results update. No console errors.

- [ ] **Step 5: Commit**

```bash
git add public/index.html public/js/tabs.js
git commit -m "Sposta i parametri CAPEX/OPEX nel form in cima come Ipotesi economiche"
```

---

## Task 9: Dismantle the old sidebar, clean up orphaned CSS

**Files:**
- Modify: `public/index.html:46-224` (`#panel-giornaliera`)
- Modify: `public/style.css:43` (remove), `public/style.css:107` (edit)

**Interfaces:**
- Consumes: nothing new — this is cleanup after Tasks 3-8 emptied the old sidebar down to just the calendar card and the "Ghiaccio prima della rete" note.

At this point, `#panel-giornaliera`'s left column (`.gsb`'s first child) contains only:
1. The calendar card (from Task 3, Step 2)
2. The `.ibar.ibar-g` "Ghiaccio prima della rete" note (left in place by Task 7, Step 2)

- [ ] **Step 1: Read the current state of `#panel-giornaliera`'s opening structure**

Read `public/index.html` around the `<div id="panel-giornaliera" class="panel active">` opening tag to confirm the exact current content of the left column before editing (it should match the two items above, since Tasks 3-8 removed everything else). Use this to build the exact `old_string` for Step 2 — do not guess it, the exact whitespace must match what Tasks 3-8 actually left behind.

- [ ] **Step 2: Remove the `.gsb` wrapper, promote the calendar + note to the top of the results column**

Replace the structure so that `#panel-giornaliera` no longer has a `.gsb` two-column grid: the calendar card and the "Ghiaccio prima della rete" note become the first two children of the panel, directly followed by what is today the right column's content (starting at the `<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">` row with "Giorni selezionati", down through the closing of `#kpi-side` at line 221). Concretely:

```html
<div id="panel-giornaliera" class="panel active">
  <div class="card">
    <div class="ct" style="margin-bottom:6px;">Seleziona giorno</div>
    <div id="cal-container"></div>
  </div>
  <div class="ibar ibar-g" style="font-size:1.0rem;margin:.8rem 0;">
    <b>Ghiaccio prima della rete:</b> il chiller fa sempre ghiaccio col surplus FV finch&eacute; il tank non copre il fabbisogno di oggi + domani (tutte le ore notturne comprese). Nei mesi <b>estivi</b> (T media &gt;15&deg;C), superata quella soglia il surplus in pi&ugrave; viene venduto in rete. Nei mesi <b>invernali</b> non si vende mai: tutto il surplus resta ghiaccio.
  </div>
  <div style="display:flex;flex-direction:column;gap:.8rem;">
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
      <span style="font-size:1.0rem;color:var(--text3);">Giorni selezionati:</span>
      <div id="selected-badges" style="display:flex;gap:6px;flex-wrap:wrap;"></div>
      <button onclick="clearAll()" style="font-size:1.0rem;padding:2px 8px;border-radius:var(--r);border:0.5px solid var(--border2);background:var(--bg3);color:var(--text2);cursor:pointer;">Cancella tutto</button>
      <button onclick="exportCSV()" style="font-size:1.0rem;padding:2px 8px;border-radius:var(--r);border:0.5px solid var(--border2);background:var(--bg3);color:var(--teal);cursor:pointer;">&#11015; CSV</button>
      <span id="data-source-label" style="margin-left:auto;font-size:1.0rem;color:var(--text3);">dati: stima interna</span>
    </div>

    <div id="kpi-top" style="display:flex;flex-direction:column;gap:.6rem;"></div>

    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
        <div class="ct" style="margin:0;">Profilo orario &mdash; potenze (kW)</div>
        <span style="font-size:1.0rem;color:var(--text3);">kWh_el = elettrici &middot; kWh_th = termici</span>
      </div>
      <div id="charts-orari" style="display:flex;flex-direction:column;gap:8px;">
        <div style="text-align:center;padding:2rem;font-size:.95rem;color:var(--text3);">Seleziona un giorno dal calendario</div>
      </div>

      <div class="leg-box">
        <div class="leg-title">Legenda &mdash; tutte le linee del grafico</div>
        <div style="font-size:1.0rem;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:.3rem;">Flussi termici (kWh_th)</div>
        <div class="leg-grid" style="margin-bottom:.5rem;">
          <div class="leg-item"><div class="leg-line"><svg width="20" height="10"><rect x="0" y="2" width="20" height="6" fill="#ff6b35" opacity=".75" rx="2"/></svg></div><div class="leg-text"><b style="color:#ff6b35">Cooling rack</b> &mdash; Calore da dissipare = IT + servizi + involucro.</div></div>
          <div class="leg-item"><div class="leg-line"><svg width="20" height="10"><line x1="0" y1="5" x2="20" y2="5" stroke="#39c8c8" stroke-width="2"/></svg></div><div class="leg-text"><b style="color:#39c8c8">Ghiaccio prodotto</b> &mdash; Freddo accumulato con surplus FV (stop automatico).</div></div>
          <div class="leg-item"><div class="leg-line"><svg width="20" height="10"><line x1="0" y1="5" x2="20" y2="5" stroke="#a371f7" stroke-width="2" stroke-dasharray="4,3"/></svg></div><div class="leg-text"><b style="color:#a371f7">Ghiaccio usato</b> &mdash; Freddo prelevato per coprire deficit di cooling.</div></div>
          <div class="leg-item"><div class="leg-line"><svg width="20" height="10"><line x1="0" y1="5" x2="20" y2="5" stroke="#58a6ff" stroke-width="2"/></svg></div><div class="leg-text"><b style="color:#58a6ff">Ghiaccio disponibile</b> &mdash; Riserva totale ora per ora.</div></div>
        </div>
        <div style="font-size:1.0rem;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:.3rem;">Flussi elettrici (kWh_el)</div>
        <div class="leg-grid">
          <div class="leg-item"><div class="leg-line"><svg width="20" height="10"><line x1="0" y1="5" x2="20" y2="5" stroke="#f85149" stroke-width="2" stroke-dasharray="6,3"/></svg></div><div class="leg-text"><b style="color:#f85149">Rack IT</b> &mdash; Consumo elettrico IT costante 24h.</div></div>
          <div class="leg-item"><div class="leg-line"><svg width="20" height="10"><line x1="0" y1="5" x2="20" y2="5" stroke="#e3b341" stroke-width="2" stroke-dasharray="5,3"/></svg></div><div class="leg-text"><b style="color:#e3b341">Chiller cooling</b> &mdash; kW_el per dissipare il calore rack.</div></div>
          <div class="leg-item"><div class="leg-line"><svg width="20" height="10"><line x1="0" y1="5" x2="20" y2="5" stroke="#39c8c8" stroke-width="2" stroke-dasharray="5,3"/></svg></div><div class="leg-text"><b style="color:#39c8c8">Chiller ghiaccio</b> &mdash; kW_el usati per produrre ghiaccio.</div></div>
          <div class="leg-item"><div class="leg-line"><svg width="20" height="10"><line x1="0" y1="5" x2="20" y2="5" stroke="#1a202c" stroke-width="2.5"/></svg></div><div class="leg-text"><b style="color:#1a202c">Totale consumi</b> &mdash; Somma IT + chiller cooling + chiller ghiaccio.</div></div>
          <div class="leg-item"><div class="leg-line"><svg width="20" height="10"><rect x="0" y="2" width="20" height="6" fill="#39d353" opacity=".75" rx="2"/></svg></div><div class="leg-text"><b style="color:#39d353">FV lordo</b> &mdash; Potenza FV totale prodotta: prima IT+cooling, poi ghiaccio (fino a coprire oggi+domani).</div></div>
          <div class="leg-item"><div class="leg-line"><svg width="20" height="10"><line x1="0" y1="5" x2="20" y2="5" stroke="#58a6ff" stroke-width="2" stroke-dasharray="4,2"/></svg></div><div class="leg-text"><b style="color:#58a6ff">FV venduto rete</b> &mdash; Surplus oltre il fabbisogno oggi+domani, solo nei mesi estivi.</div></div>
          <div class="leg-item"><div class="leg-line"><svg width="20" height="10"><rect x="0" y="2" width="20" height="6" fill="#e3b341" opacity=".75" rx="2"/></svg></div><div class="leg-text"><b style="color:#e3b341">Prelievo rete</b> &mdash; Acquistato dalla rete quando FV non basta.</div></div>
        </div>
      </div>

      <div id="explainer-container"></div>
    </div>

    <div class="g2">
      <div class="card">
        <div class="ct">Bilancio energetico (kWh/giorno)</div>
        <div class="cw" style="height:190px;"><canvas id="cBilancio"></canvas></div>
      </div>
      <div class="card">
        <div class="ct">Kg ghiaccio &middot; profilo giornaliero</div>
        <div class="cw" style="height:190px;"><canvas id="cGhiaccioKg"></canvas></div>
        <div id="kg-ghiaccio-info" style="font-size:1.0rem;color:var(--text3);margin-top:.4rem;line-height:1.6;"></div>
      </div>
    </div>

    <div class="g2">
      <div class="card"><div class="ct">PUE orario</div><div class="cw" style="height:150px;"><canvas id="cPUE"></canvas></div></div>
      <div class="card"><div class="ct">Costo orario rete (&euro;/h)</div><div class="cw" style="height:150px;"><canvas id="cCostoOrario"></canvas></div></div>
    </div>

    <div class="ibar" id="info-day">&mdash;</div>
    <div id="tabella-oraria"></div>
    <div class="card" id="kpi-side"><div class="ct">Statistiche di fine giornata</div><div id="kpi-side-content"></div></div>
  </div>
</div>
```

Every `id` in this block is unchanged from today — this step only removes the `.gsb` grid wrapper and the now-empty left-column `<div style="display:flex;flex-direction:column;gap:.8rem;">`, keeping every element that renders results exactly as it was.

- [ ] **Step 3: Remove the orphaned `.gsb` CSS rule**

In `public/style.css`, delete this line entirely:

```css
.gsb{display:grid;grid-template-columns:340px 1fr;gap:1.1rem;}
```

Then find the responsive media query block:

```css
@media(max-width:960px){.gsb{grid-template-columns:1fr;}.g4,.g5,.g6{grid-template-columns:1fr 1fr;}}
```

and replace it with:

```css
@media(max-width:960px){.g4,.g5,.g6{grid-template-columns:1fr 1fr;}}
```

- [ ] **Step 4: Verify**

Reload the app. "Simulazione Giornaliera" now shows, top to bottom: the calendar card, the "Ghiaccio prima della rete" note, then the day-selection toolbar, KPI cards, charts, and the hourly table/end-of-day stats — all full width, no sidebar. Select a day from the calendar and confirm charts/tables still populate correctly. Resize the browser to a narrow (mobile) width and confirm nothing breaks (no horizontal scroll on the page body, sections stack). No console errors.

- [ ] **Step 5: Commit**

```bash
git add public/index.html public/style.css
git commit -m "Rimuove la sidebar: la tab Simulazione Giornaliera mostra solo risultati a piena larghezza"
```

---

## Task 10: Full regression pass

**Files:** none (verification only — no commit unless an issue is found and fixed)

- [ ] **Step 1: Console check**

Open the app fresh (hard reload). Confirm zero console errors on load.

- [ ] **Step 2: Every tab renders**

Click through all seven tabs (Simulazione Giornaliera, COP & Termodinamica, Profili Annuali, Heatmap 365gg, Ruolo in Rete, CAPEX/OPEX, Basi Teoriche). Confirm each renders without errors and without any leftover reference to a removed element (check console after each click).

- [ ] **Step 3: Cross-tab live update, the original bug this design also fixes**

While on the "CAPEX/OPEX" tab, open "Potenza FV" in the top form and change "Potenza esterna — PPA / campi terzi" from `0` to `5000`, then click elsewhere to blur. Confirm the CAPEX/OPEX numbers on screen change without needing to leave and re-enter the tab (this is the same live-refresh behavior added in commit `257da65`, now exercised through the new field).

- [ ] **Step 4: Clamp behaviour spot-check**

Pick three converted fields with different types of ranges — e.g. `r-nrack` (5-2000), `r-price` (0.05-0.50), `r-cop` (2.0-6.0). For each: type a value above `max`, blur, confirm it snaps to `max`; type a value below `min`, blur, confirm it snaps to `min`.

- [ ] **Step 5: Section collapse/expand**

Confirm all six `<details>` sections in the top form open and close on click, and that "Ipotesi economiche" starts collapsed on a fresh page load while the other five start open.

- [ ] **Step 6: Mobile width check**

Resize to ~375px width. Confirm the top form's `.input-grid` collapses to a single column per section (via `auto-fit,minmax(220px,1fr)`), no element overflows horizontally, and the tab bar remains usable (horizontal scroll on `.tabs` is expected and already existed before this change).

- [ ] **Step 7: Report**

Summarize the pass/fail of Steps 1-6. If anything fails, fix it in the relevant file, re-run the specific check that failed, then commit the fix with a message describing what regressed and why (e.g. `git commit -m "Fix <specific issue> found in redesign regression pass"`).

---

## Self-Review Notes (for whoever executes this plan)

- Every task keeps existing element `id`s — if `getParams()` in `simulation.js` ever throws `Cannot read property 'value' of null`, an id was dropped or misspelled during a migration step; compare against the "Files" table for that task.
- Tasks 3-8 each do an atomic "add to new location + remove from old location" — never leave both in place at once, or the app will have duplicate ids and `document.getElementById` will silently return the wrong element.
- Task 9 depends on the *exact* leftover content from Tasks 3-8's Step 2/removal steps. Its Step 1 explicitly says to re-read the file first rather than trust this plan's text verbatim, because whitespace/indentation from the preceding tasks' edits could differ slightly from what's predicted here.
