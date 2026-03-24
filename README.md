# Simulazione ITES — Data Center Bellocchi

Simulazione interattiva di Ice-cool Thermal Energy Storage (ITES) per Data Center,
con produzione FV calcolata da PVGIS (API ufficiale Commissione Europea).

## Deploy su Vercel (consigliato)

### 1. Pubblica su GitHub

```bash
git init
git add .
git commit -m "Initial commit — ITES simulator Bellocchi"
git branch -M main
git remote add origin https://github.com/TUO-USERNAME/ites-dc-simulator.git
git push -u origin main
```

### 2. Collega a Vercel

1. Vai su vercel.com → Sign up con il tuo account GitHub
2. Clicca "Add New Project"
3. Seleziona il repository ites-dc-simulator
4. Vercel rileva automaticamente la configurazione (vercel.json)
5. Clicca Deploy — in 60 secondi hai il link

### 3. Usa il link

```
https://ites-dc-simulator.vercel.app
```

## Struttura progetto

```
ites-dc-simulator/
├── vercel.json          ← Configurazione deploy Vercel
├── package.json
├── server.js            ← Server locale (opzionale, sviluppo)
├── api/
│   └── pvgis-monthly.js ← Serverless function proxy PVGIS
├── public/
│   └── index.html       ← App completa
└── README.md
```

## Come funziona il proxy PVGIS

L'API PVGIS non accetta chiamate dirette dal browser (CORS).

    Browser → /api/pvgis-monthly → Vercel Function → PVGIS API (EC JRC)

## Uso in locale

```bash
npm install
node server.js
# apri http://localhost:3000
```

## Parametri sito Bellocchi

- Latitudine: 43.85 N / Longitudine: 12.98 E
- Azimut: 145° (SSE) / Inclinazione: 5°
- Superficie FV: 4.000 m² / Potenza max: 1.040 kWp
- Perdite sistema: 14%

## Warning principali

- Simulazione di pre-fattibilità — non sostituisce progetto esecutivo
- COP costante — nella realtà varia con temperatura esterna ±20-30%
- Profilo DC semplificato — richiede analisi dettagliata DC reale
- PVGIS TMY — medie 2005-2020, variabilità reale ±10-15%/anno

## Fonti

- Produzione FV: PVGIS v5.2, EC JRC, database SARAH2
- Fisica ITES: Tesi PoliTO — F. Scarascia (2025)
- Geometria sito: Google Earth + documento specifica Bellocchi
