/**
 * Vercel Serverless Function — proxy PVGIS /PVcalc
 * Route: /api/pvgis-monthly
 *
 * Risposta PVGIS verificata:
 *   E_d  = kWh/giorno per 1 kWp  (usato per profilo giornaliero)
 *   E_m  = kWh/mese  per 1 kWp  (usato per analisi mensile)
 *   H(i)_m = kWh/m²/mese irraggiamento piano inclinato
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const {
    lat = '43.85', lon = '12.98',
    kwp = '1', losses = '14',
    tilt = '5', azimuth = '145'
  } = req.query;

  // Converti azimut: convenzione Nord → PVGIS (0=Sud, +Ovest, -Est)
  const pvgisAspect = parseFloat(azimuth) - 180;

  const pvgisUrl =
    `https://re.jrc.ec.europa.eu/api/v5_2/PVcalc` +
    `?lat=${lat}&lon=${lon}` +
    `&peakpower=${kwp}` +
    `&loss=${losses}` +
    `&angle=${tilt}` +
    `&aspect=${pvgisAspect}` +
    `&mountingplace=building` +
    `&pvtechchoice=crystSi` +
    `&outputformat=json`;

  try {
    const pvRes = await fetch(pvgisUrl, {
      signal: AbortSignal.timeout(12000),
      headers: { 'User-Agent': 'ITES-Simulator/1.0' }
    });

    if (!pvRes.ok) {
      const errText = await pvRes.text();
      return res.status(502).json({
        error: 'PVGIS ha restituito un errore',
        pvgis_status: pvRes.status,
        detail: errText.slice(0, 500)
      });
    }

    const data = await pvRes.json();
    return res.status(200).json(data);

  } catch (err) {
    return res.status(503).json({
      error: 'PVGIS non raggiungibile',
      detail: err.message
    });
  }
}