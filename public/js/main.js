// ============================================================
// PVGIS
// ============================================================
async function fetchPvgisMonthly(loss,tilt,azimuth){
  var url='/api/pvgis-monthly?lat=43.85&lon=12.98&kwp=1&losses='+loss+'&tilt='+tilt+'&azimuth='+azimuth;
  var res=await fetch(url);if(!res.ok)throw new Error('HTTP '+res.status);
  var json=await res.json();
  var monthly=json.outputs&&json.outputs.monthly&&json.outputs.monthly.fixed;
  if(!monthly||monthly.length<12)throw new Error('Risposta PVGIS non valida');
  return monthly.map(function(m,i){return{nome:FALLBACK_MENSILI[i].nome,irr:Math.round(parseFloat(m['H(i)_m']||0)||FALLBACK_MENSILI[i].irr),kwp_kwh:parseFloat(parseFloat(m['E_d']||0).toFixed(4)),giorni:FALLBACK_MENSILI[i].giorni};});
}
// Media mensile pesata sui kWp installati in ciascuna delle due giaciture (tetto/terra).
function blendMensili(roofArr,groundArr,wRoof,wGround){
  var tot=wRoof+wGround||1;
  return roofArr.map(function(m,i){
    var g=groundArr[i];
    return{nome:m.nome,giorni:m.giorni,irr:(m.irr*wRoof+g.irr*wGround)/tot,kwp_kwh:(m.kwp_kwh*wRoof+g.kwp_kwh*wGround)/tot};
  });
}
// Temperatura oraria reale (seriescalc, anno 2019 non bisestile) per lo stesso
// punto usato per l'irraggiamento. Fallback silenzioso sulla tabella sintetica
// TEMP_ORARIE se PVGIS non risponde (vedi getTExtArr in utils.js).
async function fetchPvgisHourlyTemp(){
  var url='/api/pvgis-hourly?lat=43.85&lon=12.98&year=2019';
  var res=await fetch(url);if(!res.ok)throw new Error('HTTP '+res.status);
  var json=await res.json();
  var hourly=json.outputs&&json.outputs.hourly;
  if(!hourly||hourly.length<8700)throw new Error('Risposta PVGIS seriescalc non valida');
  var days=Array.from({length:365},function(){return new Array(24).fill(null);});
  var jan1=Date.UTC(2019,0,1);
  hourly.forEach(function(row){
    var t=row.time;
    var y=+t.slice(0,4),m=+t.slice(4,6),d=+t.slice(6,8),hh=+t.slice(9,11);
    var doy=Math.round((Date.UTC(y,m-1,d)-jan1)/86400000)+1; // 1..365
    if(doy>=1&&doy<=365)days[doy-1][hh]=parseFloat(row.T2m);
  });
  days.forEach(function(arr){
    for(var h=1;h<24;h++)if(arr[h]==null)arr[h]=arr[h-1];
    if(arr[0]==null)arr[0]=arr.find(function(v){return v!=null;})||10;
  });
  return days;
}
async function loadPVGIS(){
  var btn=document.getElementById('pvgis-btn'),dot=document.getElementById('pvgis-dot');
  var msg=document.getElementById('pvgis-msg'),src=document.getElementById('pvgis-src');
  btn.disabled=true;dot.className='pvgis-dot dot-loading';msg.textContent='Connessione a PVGIS\u2026';
  var loss=parseFloat(document.getElementById('r-loss').value);
  var sp=getSuperficiParams(),sf=calcSuperfici(sp);
  var kwp=parseFloat(document.getElementById('r-kwp').value);
  var kwpRoof=Math.min(kwp,sf.fvRoofMax),kwpGround=Math.max(0,kwp-kwpRoof);
  try{
    var roof=await fetchPvgisMonthly(loss,5,145);
    var ground=kwpGround>0?await fetchPvgisMonthly(loss,30,180):null;
    pvgisRoofData=roof;pvgisGroundData=ground;
    pvgisData=ground?blendMensili(roof,ground,kwpRoof,kwpGround):roof;
    pvgisLoaded=true;dot.className='pvgis-dot dot-ok';
    var tempNote='';
    try{
      pvgisHourlyTemp=await fetchPvgisHourlyTemp();
      tempNote=' + temperatura oraria reale';
    }catch(eTemp){
      pvgisHourlyTemp=null; // fallback silenzioso: resta la tabella sintetica TEMP_ORARIE
    }
    msg.innerHTML='\u2705 Dati PVGIS caricati \u2014 EC JRC'+(ground?' (tetto + terreno)':' (tetto)')+tempNote;
    src.textContent='PVGIS v5.2 \u00b7 SARAH2 \u00b7 loss '+loss+'%';
    document.getElementById('data-source-label').textContent='dati: PVGIS v5.2';
    tankStates365=null;cache365=null;
    resetRun();
  }catch(e){
    dot.className='pvgis-dot dot-error';
    msg.innerHTML='\u26d4 Errore: <em>'+e.message+'</em>. Usando stime di fallback.';
    pvgisData=null;pvgisRoofData=null;pvgisGroundData=null;pvgisLoaded=false;pvgisHourlyTemp=null;
  }
  btn.disabled=false;
}

// ============================================================
// TAB SWITCHING
// ============================================================
function sw(name){
  document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('active');});
  document.querySelectorAll('.panel').forEach(function(p){p.classList.remove('active');});
  document.querySelectorAll('.tab').forEach(function(t){if(t.getAttribute('onclick')&&t.getAttribute('onclick').includes("'"+name+"'"))t.classList.add('active');});
  document.getElementById('panel-'+name).classList.add('active');
  if(name==='giornaliera'&&selectedDays.length>0)renderAll();
  if(name==='rete')runRete();
  if(name==='cop')runCOP();
  if(name==='profili')runProfili();
  if(name==='heatmap')runHeatmap();
  if(name==='capex')runCapex();
  if(name==='caso1mw')runCaso1MW();
}

// ============================================================
// CSV EXPORT
// ============================================================
function exportCSV(){
  if(selectedDays.length===0){alert('Seleziona almeno un giorno dal calendario.');return;}
  var p=getParams();if(!tankStates365)tankStates365=preSimula365(p);
  var csv='Giorno,Ora,T_ext,FV_kW_el,FV_venduto_kW_el,Cooling_kW_th,Cooling_da_FV_kW_th,IT_kW_el,ChillerCooling_kW_el,ChillerGhiaccio_kW_el,Totale_consumi_kW_el,Ghiaccio_carica_kW_th,Ghiaccio_uso_kW_th,Ghiaccio_kg_cum,Rete_kW_el,Costo_EUR,PUE\n';
  selectedDays.forEach(function(gg){
    var d=simulaGiorno(gg,p);
    var kgCum=Math.round(d.iceYesterday*1000/LATENTE_WH);
    d.hours.forEach(function(r){
      kgCum+=r.iceChargedKg-r.iceUsedKg;
      kgCum=Math.max(0,kgCum);
      csv+=giornoLabel(gg)+','+r.h+','+r.tExt+','+r.pvKw+','+r.pvToGrid+','+r.coolingNeed+','+r.coolingCoveredByFV+','+p.dcBase+','+r.chillerCoolKw+','+r.chillerIceKw+','+r.totalElecConsumed+','+r.iceCharged+','+r.iceUsed+','+kgCum+','+r.totalGrid+','+r.gridCost+','+r.pue+'\n';
    });
  });
  var blob=new Blob([csv],{type:'text/csv'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='ITES_simulazione_v7.csv';a.click();URL.revokeObjectURL(url);
}

// ============================================================
// INIT
// ============================================================
calMese=0;updateSuperficiUI();renderLabels();renderCalendar();loadPVGIS();
