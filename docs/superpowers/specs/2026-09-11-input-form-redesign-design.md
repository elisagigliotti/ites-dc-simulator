# Redesign input: form unico in cima, niente slider (sotto-progetto 1+2)

## Contesto

Oggi i parametri di input sono slider (`<input type="range">`) dentro una sidebar a
sinistra, visibile **solo** dentro la tab "Simulazione Giornaliera"
(`#panel-giornaliera`). Le altre tab (COP, Profili, Heatmap, Rete, CAPEX/OPEX) non hanno
la sidebar: leggono gli stessi elementi via `getParams()`, ma per l'utente i controlli
letteralmente spariscono quando non sei sulla tab "Simulazione Giornaliera" (`.panel{display:none}`
li nasconde). I parametri economici del CAPEX/OPEX (variazione costo FV, tariffa
hosting, oneri urbanizzazione, N. macchine) stanno invece dentro `#panel-capex`, non
nella sidebar.

Il file Excel fornito dall'utente (`Matrice dati-risultati simulazioni DC con BESS
Ghiaccio_r0a.xlsx`) non è un mockup grafico: è un elenco di parametri raggruppati per
categoria (dati sito, capannone, consumi elettrici, potenza FV, rack IT, tariffe/PPA,
ghiaccio) con alcune note concettuali. Le note su nuove tariffe F1/F2/F3+PPA e sulla
nuova logica di priorità del ghiaccio sono **fuori scope** qui — sono i sotto-progetti 3
e 4, da affrontare separatamente.

## Obiettivo

1. Un unico form di input, **sopra** la barra delle tab (non dentro nessun panel),
   sempre visibile su tutte le tab.
2. Tutti gli slider diventano campi numerici digitabili.
3. Le sezioni del form sono raggruppate per categoria, riprendendo l'organizzazione
   dell'Excel, e richiudibili.
4. I parametri economici del CAPEX/OPEX salgono nel form globale.
5. Il ricalcolo scatta al `change` (blur/Enter), non ad ogni tasto.

Fuori scope: qualunque modifica a `simulation.js`, alla logica di `tabs.js`, ai nomi/ID
dei campi esistenti, alle nuove tariffe F1/F2/F3+PPA, alla logica di priorità ghiaccio.

## Architettura della pagina

Nuovo scheletro di `index.html` (dall'alto in basso):

```
.hdr (header, invariato)
.pvgis-bar (invariato)
#input-form   <-- NUOVO: form unico, fuori da .tabs/.panel
  <details> Sito & Capannone
  <details> Potenza FV
  <details> Data Center — Rack IT
  <details> Chiller / Pompa di calore
  <details> Tariffe & Rete
  <details> Ipotesi economiche (CAPEX/OPEX)
.tabs (invariato)
#panel-giornaliera  <-- la colonna sinistra (sidebar) sparisce: resta solo
                        la colonna destra di oggi (calendario + risultati),
                        a piena larghezza
#panel-cop / #panel-profili / #panel-heatmap / #panel-rete  (invariati)
#panel-capex   <-- il blocco "Parametri analisi finanziaria" (righe 232-248
                    di index.html) viene RIMOSSO da qui: i suoi campi si
                    spostano dentro #input-form > <details>Ipotesi economiche
#panel-note (invariato)
```

`#panel-giornaliera` perde il wrapper `.gsb` (grid 340px+1fr): il contenuto che oggi è
nella colonna destra (righe 157-222 di `index.html`) diventa il body diretto del panel, a
piena larghezza. La colonna sinistra (righe 48-153) si smonta: i suoi campi migrano in
`#input-form`, le parti non-campo (il selettore calendario `#cal-container`, la frase
"Ghiaccio prima della rete: ...") restano nella tab ma si spostano in cima alla colonna
risultati (il calendario resta un elemento della tab "Simulazione Giornaliera", non è un
parametro di simulazione condiviso dalle altre tab).

## Mappatura sezioni → campi

| Sezione (`<details>`) | Campi (id invariato) | Provenienza attuale |
|---|---|---|
| **Sito & Capannone** | `r-suplotto`, `r-footprint`, `r-fvroof`, `r-fvground-type` | Card "FV: tetto+terreno" (righe 60-75) |
| **Potenza FV** | `r-kwp`, `r-kwp-ext`, `r-loss` | Card "Impianto FV" (righe 49-55, esclusa `#cal-container`) |
| **Data Center — Rack IT** | `r-racktype`, `r-nrack`, `r-setp`, `r-ua` | Card "Data Center — Rack IT" (righe 77-94) |
| **Chiller / Pompa di calore** | `r-cop` | Card "Pompa di Calore/Chiller" (righe 96-133) |
| **Tariffe & Rete** | `r-tariffmode`, `r-price`, `r-feedin` | Card "Tariffe energia" (righe 136-149, esclude `#tariff-info`) |
| **Ipotesi economiche (CAPEX/OPEX)** | `r-fvcost`, `r-gridvar`, `r-hosting`, `r-urbcost`, `r-nmacchine` | `#panel-capex` righe 232-248 |

Blocchi informativi calcolati (non sono input, restano dov'erano concettualmente utili,
ma se il loro campo genitore si è spostato, si spostano con lui nella stessa `<details>`):
`#superfici-info`, `#rack-summary`, `#cop-explain-panel`, `#cop-mensile-quick`,
`#tariff-info`. Le funzioni che li popolano (`updateSuperficiUI()`, parti di
`renderLabels()`/`updateLabels()`) non cambiano firma, solo l'elemento DOM di
destinazione resta lo stesso id — quindi non serve toccarle.

## Comportamento dei campi

- Ogni `<input type="range">` diventa `<input type="number">`, stessi `min`/`max`/`step`/
  `value` di oggi.
- Attributo evento: `oninput="resetRun()"` → `onchange="resetRun()"` (idem per i campi
  CAPEX: `oninput="runCapex()"` → `onchange="runCapex()"`). I `<select>` restano
  `onchange` (invariato) e gli `<input type="number">` già esistenti (`r-suplotto`,
  `r-footprint`, `r-fvroof`) passano anche loro da `oninput` a `onchange` per coerenza.
- Nuovo helper `clampNumberInput(el)` in `ui-daily.js`, chiamato da un wrapper prima di
  `resetRun()`/`runCapex()`: forza `el.value` dentro `[min,max]` se l'utente digita un
  valore fuori range. Una riga:
  ```js
  function clampNumberInput(el){
    var v=parseFloat(el.value);
    if(isNaN(v))v=parseFloat(el.min)||0;
    var min=parseFloat(el.min),max=parseFloat(el.max);
    if(!isNaN(min))v=Math.max(min,v);
    if(!isNaN(max))v=Math.min(max,v);
    el.value=v;
  }
  ```
  Ogni campo numerico richiama `onchange="clampNumberInput(this);resetRun()"` (o
  `runCapex()`).
- I vecchi `<span class="cv" id="v-...">` (badge col valore live accanto allo slider)
  vengono rimossi dove il campo diventa un `<input type="number">`: il numero è già
  visibile nel campo stesso, il badge duplicato non serve più. Le funzioni che li
  scrivevano (`updateLabels()` in `ui-daily.js`) perdono quelle righe; le righe che
  aggiornano badge **derivati/calcolati** (es. `#hdr-fvbadge-txt`, `#hdr-fvkwp-txt` in
  header, `#superfici-info`) restano.

## CSS

- `#input-form` è una card unica (stile `.card` esistente) con `<details>` figli.
- Stile `<summary>`: font-weight 700, uppercase, cursor pointer — visivamente equivalente
  all'attuale `.ct`, riusa le stesse variabili colore.
- Dentro ogni `<details>`, i campi si dispongono su una griglia responsive
  (`grid-template-columns:repeat(auto-fit,minmax(220px,1fr))`), non più in colonna
  singola stretta da 340px — il form ora è largo quanto la pagina, non una sidebar.
- `.gsb` non serve più in `#panel-giornaliera` (si rimuove l'uso, la regola CSS può
  restare per compatibilità se serve altrove, altrimenti si elimina se non referenziata).
- Media query `@media(max-width:960px){.gsb{...}}` da ripulire se `.gsb` non è più usata
  in nessun panel.

## Cosa NON cambia

- `simulation.js`, `tabs.js`: zero modifiche. `getParams()` legge gli stessi ID, ovunque
  essi vivano nel DOM.
- Nessun nuovo campo, nessuna nuova logica di calcolo, nessuna nuova tariffa.
- Il meccanismo di refresh "tab attiva" aggiunto in un commit precedente (`resetRun()`
  richiama `runCOP()/runProfili()/runHeatmap()/runRete()/runCapex()` in base al panel
  attivo) resta invariato e anzi resta necessario: l'utente può modificare un campo
  mentre guarda una tab diversa da quella a cui il campo "appartiene" concettualmente.

## Verifica

Manuale nel browser dopo l'implementazione:
1. Ogni sezione si apre/chiude (`<details>`), nessun JS necessario per il toggle.
2. Digitare un valore in un campo e uscirne (Tab o click altrove) aggiorna i risultati
   della tab corrente; digitare senza uscire dal campo NON ricalcola ad ogni carattere.
3. Digitare un valore fuori range (es. 999999 su PPA) e uscire dal campo: il valore
   visualizzato torna dentro `[min,max]`.
4. Tutte le tab (COP, Profili, Heatmap, Rete, CAPEX/OPEX) mostrano dati coerenti con i
   valori del form, sia entrandoci di nuovo sia modificando un campo mentre già ci si è
   sopra.
5. Nessun errore in console.
6. Verifica responsive: form leggibile e utilizzabile a larghezza mobile (~375px).

## Fuori scope (sotto-progetti successivi)

- Sotto-progetto 3: tariffe F1/F2/F3 storiche + formula prezzo PPA.
- Sotto-progetto 4: nuova logica di priorità di carica del ghiaccio (nota B32
  dell'Excel).
