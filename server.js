/**
 * ITES Simulation — Proxy Server
 * Fa da proxy verso l'API PVGIS (CORS bloccato sul browser diretto)
 * Avvio: node server.js
 * Poi apri: http://localhost:3000
 */

const express = require('express');
const fetch   = require('node-fetch');
const path    = require('path');

const app  = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));

// ---- Proxy endpoint PVGIS monthly (PVcalc) ----
app.get('/api/pvgis/monthly', async (req, res) => {
  const { lat, lon, kwp, losses, tilt, azimuth } = req.query;

  // PVGIS converte azimut: 0=sud, positivo=ovest, negativo=est
  // Il nostro azimut è 145° rispetto al nord (SSE)
  // PVGIS aspect = azimut_nord - 180  → 145-180 = -35
  const pvgisAspect = parseFloat(azimuth) - 180;

  const url = `https://re.jrc.ec.europa.eu/api/v5_2/PVcalc?` +
    `lat=${lat}&lon=${lon}` +
    `&peakpower=${kwp}` +
    `&loss=${losses}` +
    `&angle=${tilt}` +
    `&aspect=${pvgisAspect}` +
    `&mountingplace=building` +
    `&pvtechchoice=crystSi` +
    `&outputformat=json`;

  try {
    const pvRes = await fetch(url, { timeout: 15000 });
    if (!pvRes.ok) {
      const errText = await pvRes.text();
      return res.status(502).json({ error: 'PVGIS error', detail: errText });
    }
    const data = await pvRes.json();
    res.json(data);
  } catch (e) {
    res.status(503).json({ error: 'PVGIS non raggiungibile', detail: e.message });
  }
});

// ---- Proxy endpoint PVGIS hourly TMY ----
app.get('/api/pvgis/tmy', async (req, res) => {
  const { lat, lon } = req.query;
  const url = `https://re.jrc.ec.europa.eu/api/v5_2/tmy?` +
    `lat=${lat}&lon=${lon}&outputformat=json`;

  try {
    const pvRes = await fetch(url, { timeout: 20000 });
    if (!pvRes.ok) {
      const errText = await pvRes.text();
      return res.status(502).json({ error: 'PVGIS TMY error', detail: errText });
    }
    const data = await pvRes.json();
    res.json(data);
  } catch (e) {
    res.status(503).json({ error: 'PVGIS non raggiungibile', detail: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n✅  Server ITES avviato → http://localhost:${PORT}\n`);
});
