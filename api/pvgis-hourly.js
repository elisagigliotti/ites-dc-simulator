/**
 * Vercel Serverless Function — proxy PVGIS /seriescalc
 * Route: /api/pvgis-hourly
 *
 * Risposta PVGIS verificata:
 *   outputs.hourly[] = {time:"YYYYMMDD:HHMM", T2m, "G(i)", ...} — un anno reale
 *   (non TMY) di temperatura/irraggiamento ora per ora per lat/lon dati.
 *   pvcalculation=0: solo meteo, nessun calcolo di producibilità (non serve qui).
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { lat = '43.85', lon = '12.98', year = '2019' } = req.query;

  const pvgisUrl =
    `https://re.jrc.ec.europa.eu/api/v5_2/seriescalc` +
    `?lat=${lat}&lon=${lon}` +
    `&startyear=${year}&endyear=${year}` +
    `&pvcalculation=0` +
    `&outputformat=json`;

  try {
    const pvRes = await fetch(pvgisUrl, {
      signal: AbortSignal.timeout(15000),
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
