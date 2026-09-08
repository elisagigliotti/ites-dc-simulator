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
    msg.innerHTML='\u2705 Dati PVGIS caricati \u2014 EC JRC'+(ground?' (tetto + terreno)':' (tetto)');
    src.textContent='PVGIS v5.2 \u00b7 SARAH2 \u00b7 loss '+loss+'%';
    document.getElementById('data-source-label').textContent='dati: PVGIS v5.2';
    resetRun();
  }catch(e){
    dot.className='pvgis-dot dot-error';
    msg.innerHTML='\u26d4 Errore: <em>'+e.message+'</em>. Usando stime di fallback.';
    pvgisData=null;pvgisRoofData=null;pvgisGroundData=null;pvgisLoaded=false;
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
  if(name==='rete')runRete();
  if(name==='cop')runCOP();
  if(name==='profili')runProfili();
  if(name==='heatmap')runHeatmap();
  if(name==='capex')runCapex();
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
