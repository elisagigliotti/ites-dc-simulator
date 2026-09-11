// ============================================================
// INFO PUE (tap-friendly: title="" non funziona su mobile/touch)
// ============================================================
var PUE_INFO_TXT='PUE = (IT + raffreddamento + ghiaccio prodotto) / IT, a prescindere dalla fonte.\n\nPiù FV in eccesso = più ghiaccio prodotto = PUE più alto, anche se l\'energia è gratuita.\n\nNon include costi o investimento (vedi tab CAPEX/OPEX).';
function showPueInfo(){alert(PUE_INFO_TXT);}

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

// ============================================================
// CALENDARIO
// ============================================================
var calMese=0;var selectedDays=[];var MAX_GIORNI=4;
var SEL_COLORS=['#1a5fa3','#6a2090','#b44010','#0a7050'];
var SEL_BG=['rgba(26,95,163,0.12)','rgba(106,32,144,0.12)','rgba(180,64,16,0.12)','rgba(10,112,80,0.12)'];
function toGiornoAnno(m,d){var g=0;for(var i=0;i<m;i++)g+=GIORNI_MESE[i];return g+d;}
function fvNorm(gg){var mi=giornoToMese(gg);var ms=getMensili();var mx=Math.max.apply(null,ms.map(function(m){return m.kwp_kwh||1;}));return (ms[mi.mese_idx].kwp_kwh||1)/mx;}
function renderCalendar(){
  var cont=document.getElementById('cal-container');if(!cont)return;
  var primo=new Date(2024,calMese,1).getDay(),off=(primo===0)?6:primo-1;
  var h='<div class="cal-wrap"><div class="cal-nav"><button onclick="calPrev()">\u2039</button><span class="cal-month-label">'+NOMI_MESE_FULL[calMese]+'</span><button onclick="calNext()">\u203a</button></div><div class="cal-grid">';
  ['L','M','M','G','V','S','D'].forEach(function(d){h+='<div class="cal-dow">'+d+'</div>';});
  for(var i=0;i<off;i++)h+='<div class="cal-day empty"></div>';
  for(var d=1;d<=GIORNI_MESE[calMese];d++){
    var gg=toGiornoAnno(calMese,d),si=selectedDays.indexOf(gg),fv=fvNorm(gg);
    var fc=fv>0.65?'fv-high':fv>0.35?'fv-mid':'fv-low',sc=si>=0?' selected sel-'+si:'';
    h+='<div class="cal-day '+fc+sc+'" onclick="toggleDay('+gg+')">'+d+'</div>';
  }
  h+='</div></div>';cont.innerHTML=h;
}
function calPrev(){calMese=(calMese+11)%12;renderCalendar();}
function calNext(){calMese=(calMese+1)%12;renderCalendar();}
function toggleDay(gg){
  var idx=selectedDays.indexOf(gg);
  if(idx>=0)selectedDays.splice(idx,1);
  else{if(selectedDays.length>=MAX_GIORNI)selectedDays.shift();selectedDays.push(gg);}
  renderCalendar();renderAll();
}
function clearAll(){
  selectedDays=[];renderCalendar();
  document.getElementById('kpi-top').innerHTML='';
  document.getElementById('charts-orari').innerHTML='<div style="text-align:center;padding:2rem;font-size:.95rem;color:var(--text3);">Seleziona un giorno dal calendario</div>';
  document.getElementById('info-day').innerHTML='\u2014';
  document.getElementById('kpi-side-content').innerHTML='';
  document.getElementById('explainer-container').innerHTML='';
  document.getElementById('kg-ghiaccio-info').innerHTML='';
  destroyC('cBilancio');destroyC('cGhiaccioKg');destroyC('cPUE');destroyC('cCostoOrario');
  Object.keys(charts).filter(function(k){return k.startsWith('cOrario');}).forEach(function(k){destroyC(k);});
  renderLabels();
}
function resetRun(){
  updateSuperficiUI();tankStates365=null;cache365=null;renderCalendar();
  if(selectedDays.length>0)renderAll();else renderLabels();
  // Le altre tab (COP, Profili, Heatmap, Rete, CAPEX/OPEX) si ricalcolano solo al cambio tab:
  // se una di queste è già aperta quando si tocca uno slider FV/impianto, va rinfrescata subito.
  var activePanel=document.querySelector('.panel.active');
  var activeName=activePanel&&activePanel.id.replace('panel-','');
  if(activeName==='cop')runCOP();
  if(activeName==='profili')runProfili();
  if(activeName==='heatmap')runHeatmap();
  if(activeName==='rete')runRete();
  if(activeName==='capex')runCapex();
}
function renderLabels(){var p=getParams();updateLabels(p);}

// ============================================================
// SUPERFICI — lotto Petra: aggiorna il tetto dello slider FV e la card riepilogo
// ============================================================
function updateSuperficiUI(){
  var sp=getSuperficiParams(),sf=calcSuperfici(sp);
  var slider=document.getElementById('r-kwp');
  var newMax=Math.max(1,Math.round(sf.fvPotenzialeMax));
  slider.max=newMax;
  if(parseFloat(slider.value)>newMax)slider.value=newMax;
  var kwpInterno=parseFloat(slider.value);
  var kwpRoof=Math.min(kwpInterno,sf.fvRoofMax),kwpGround=Math.max(0,kwpInterno-kwpRoof);
  var info=document.getElementById('superfici-info');
  document.getElementById('hdr-footprint-txt').textContent=itNum(Math.round(sp.footprint))+' m²';
  document.getElementById('hdr-suplotto-txt').textContent=itNum(Math.round(sp.supLotto))+' m²';
  document.getElementById('hdr-terreno-txt').textContent=itNum(Math.round(sf.terrenoLibero))+' m²';
  if(!info)return;
  info.innerHTML=
    'Terreno libero: <b>'+itNum(Math.round(sf.terrenoLibero))+' m²</b> tutto a FV ('+sp.groundType+')<br>'
    +'FV tetto max: <b>'+itNum(Math.round(sf.fvRoofMax))+' kWp</b> &middot; FV terra max: <b>'+itNum(Math.round(sf.fvGroundMax))+' kWp</b><br>'
    +'<b style="color:var(--teal);">FV potenziale totale: '+itNum(newMax)+' kWp</b><br>'
    +'Installato ora: '+itNum(Math.round(kwpInterno))+' kWp — tetto '+itNum(Math.round(kwpRoof))+' / terra '+itNum(Math.round(kwpGround))+' kWp'
    +(kwpInterno>=newMax-0.5?'<div style="color:var(--red);margin-top:4px;">&#9888; Hai raggiunto il potenziale massimo del layout scelto.</div>':'');
}

function updateLabels(p){
  document.getElementById('v-kwp').textContent=p.kwpInterno+' kWp';
  document.getElementById('v-kwp-ext').textContent=itNum(p.kwpEsterno)+' kWp';
  document.getElementById('hdr-fvkwp-txt').textContent=itNum(p.kwp)+' kWp';
  document.getElementById('hdr-fvbadge-txt').textContent=itNum(p.kwp/1000,1)+' MWp';
  document.getElementById('v-loss').textContent=Math.round(p.loss*100)+' %';
  document.getElementById('v-nrack').textContent=p.nRack;
  document.getElementById('v-setp').textContent=p.setP+' \u00b0C';
  document.getElementById('v-ua').textContent=p.ua+' W/K';
  document.getElementById('v-cop').textContent=itNum(p.cop,1);
  document.getElementById('v-price').textContent=itNum(p.gridPrice,2)+' \u20ac/kWh';
  document.getElementById('v-feedin').textContent=itNum(p.feedIn,2)+' \u20ac/kWh';
  var nFile=Math.ceil(p.nRack/p.rack.perRow),rpf=Math.min(p.nRack,p.rack.perRow);
  document.getElementById('rack-summary').innerHTML=
    'IT: <b style="color:var(--text);">'+fN(p.itKw)+' kW_el</b>'
    +' \u00b7 Calore: <b style="color:var(--red);">'+fN(p.itKw)+' kW_th (100%)</b><br>'
    +'Tipo: '+p.rack.name+'<br>'
    +'File: '+nFile+' \u00d7 '+rpf+' rack/fila';
  if(p.tariffMode==='f1f2f3'){
    document.getElementById('tariff-info').innerHTML='F1: <b style="color:var(--amber)">'+fN2(p.gridPrice*0.938)+' \u20ac</b> \u00b7 F2: <b style="color:var(--blue)">'+fN2(p.gridPrice)+' \u20ac</b> \u00b7 F3: <b style="color:var(--green)">'+fN2(p.gridPrice*0.906)+' \u20ac</b>';
  } else {
    document.getElementById('tariff-info').innerHTML='Prezzo fisso tutto il giorno';
  }
  var eerNom=p.cop,copIceNom=p.cop*0.85;
  document.getElementById('cop-el-box').textContent='1 kWh_el FV';
  document.getElementById('cop-th-box').textContent='EER '+itNum(eerNom,1);
  document.getElementById('cop-result-box').textContent=itNum(eerNom,1)+' kWh_th freddo';
  document.getElementById('cop-ice-el-box').textContent='1 kWh_el surplus';
  document.getElementById('cop-ice-th-box').textContent='COP_ice '+itNum(copIceNom,2);
  document.getElementById('cop-ice-result-box').textContent=itNum(copIceNom,2)+' kWh_th ghiaccio';
  document.getElementById('cop-real-box').textContent='EER impianto '+itNum(getEERreal(p.cop,15),2);
  var eerMesi=TEMP_MEDIE.map(function(t){return getEER(p.cop,t).toFixed(1);});
  document.getElementById('cop-mensile-quick').innerHTML=
    'EER mensile: '+NOMI_MESE.map(function(n,i){
      var v=parseFloat(eerMesi[i]);
      var c=v>=p.cop?'var(--green)':v>=p.cop*0.8?'var(--amber)':'var(--red)';
      return '<span style="color:'+c+'">'+n+' '+eerMesi[i]+'</span>';
    }).join(' | ');
}

// ============================================================
// SPIEGATORE CONTESTUALE
// ============================================================
function buildExplainerForDay(item,p,colore){
  var d=item.data,gg=item.gg;
  var events=[];
  var pvOn=d.hours.findIndex(function(r){return r.pvKw>0.5;});
  var pvOff=-1;for(var h=23;h>=0;h--){if(d.hours[h].pvKw>0.5){pvOff=h;break;}}
  if(pvOn>=0) events.push({time:pvOn+':00',color:'#39d353',text:'FV attivo. Le prime kWh_el coprono IT e servizi (priorit\u00e0 1), poi il cooling, poi tutto il resto diventa ghiaccio (mai vendita in rete).'});
  if(pvOff>=0) events.push({time:pvOff+':00',color:'#f97316',text:'Fine FV. Ritorno a 100% rete. Il ghiaccio prodotto oggi copre il cooling serale (carry-over).'});
  var maxPvH=0,maxPv=0;
  d.hours.forEach(function(r){if(r.pvKw>maxPv){maxPv=r.pvKw;maxPvH=r.h;}});
  if(maxPv>10){
    var iceH=d.hours[maxPvH];
    events.push({time:maxPvH+':00',color:'#16a34a',text:'Picco FV: '+Math.round(maxPv)+' kW. Chiller ghiaccio: '+Math.round(iceH.chillerIceKw)+' kW_el \u00d7 COP_ice impianto '+itNum(iceH.copIceReal,2)+' = '+Math.round(iceH.iceCharged)+' kWh_th ghiaccio.'});
  }
  var firstIce=d.hours.findIndex(function(r){return r.iceCharged>1;});
  if(firstIce>=0){
    var iceH2=d.hours[firstIce];
    events.push({time:firstIce+':00',color:'#0e7490',text:'Inizio produzione ghiaccio: '+Math.round(iceH2.chillerIceKw)+' kW_el chiller \u00d7 COP_ice impianto '+iceH2.copIceReal.toFixed(2)+' \u2192 '+Math.round(iceH2.iceCharged)+' kWh_th.'});
  }
  var firstSell=d.hours.findIndex(function(r,i){return i>firstIce&&firstIce>=0&&r.pvToGrid>1;});
  if(firstSell>=0){
    events.push({time:firstSell+':00',color:'#6366f1',text:'Tank saturo (copre oggi+domani): il surplus in più viene venduto in rete a '+itNum(p.feedIn,2)+' €/kWh (solo mese estivo).'});
  }
  var firstUse=d.hours.findIndex(function(r){return r.iceUsed>1;});
  if(firstUse>=0){
    events.push({time:firstUse+':00',color:'#7c3aed',text:'Primo utilizzo ghiaccio: FV non copre pi\u00f9 il cooling. Il ghiaccio accumulato evita il prelievo da rete (tariffa '+d.hours[firstUse].tariff.toFixed(3)+' \u20ac/kWh).'});
  }
  var maxCoolH=0,maxCool=0;
  d.hours.forEach(function(r){if(r.coolingNeed>maxCool){maxCool=r.coolingNeed;maxCoolH=r.h;}});
  if(maxCoolH!==maxPvH && maxCool>p.itKw){
    events.push({time:maxCoolH+':00',color:'#dc2626',text:'Picco cooling: '+Math.round(maxCool)+' kWh_th (T_est='+d.hours[maxCoolH].tExt+'\u00b0C). Chiller: '+Math.round(maxCool/d.hours[maxCoolH].eerReal)+' kW_el.'});
  }
  if(d.carryTomorrow>10){
    var kgCarry=Math.round(d.carryTomorrow*1000/LATENTE_WH);
    events.push({time:'23:59',color:'#0e7490',text:'Carry domani: '+itNum(kgCarry)+' kg ('+Math.round(d.carryTomorrow)+' kWh_th). Perdita attesa: ~12% nelle prossime 24h.'});
  }
  events.sort(function(a,b){return parseInt(a.time)-parseInt(b.time);});
  var html='<div class="explainer-box" style="border-color:'+colore+';background:linear-gradient(135deg,rgba(255,255,255,0.9),rgba(240,249,255,0.9));margin-bottom:.6rem;">'
    +'<div class="explainer-title" style="color:'+colore+';">'
    +'<span style="font-size:1rem;">&#128270;</span>'
    +' Spiegazione &mdash; <span style="font-weight:700;">'+giornoLabel(gg)+'</span>'
    +'</div>'
    +'<div class="explainer-events">';
  events.forEach(function(ev){
    html+='<div class="exp-event">'
      +'<div class="exp-time">'+ev.time+'</div>'
      +'<div class="exp-dot" style="background:'+ev.color+'"></div>'
      +'<div class="exp-desc">'+ev.text+'</div>'
      +'</div>';
  });
  html+='</div></div>';
  return html;
}

function buildExplainer(results,p){
  var cont=document.getElementById('explainer-container');
  if(!results||results.length===0){cont.innerHTML='';return;}
  var html='';
  results.forEach(function(item,i){html+=buildExplainerForDay(item,p,SEL_COLORS[i]);});
  cont.innerHTML=html;
}

// ============================================================
// RENDER ALL
// ============================================================
function renderAll(){
  var p=getParams();updateLabels(p);
  var badgeDiv=document.getElementById('selected-badges');
  if(selectedDays.length===0){
    badgeDiv.innerHTML='<span style="font-size:1.0rem;color:var(--text3);">Clicca sul calendario (max 4 giorni)</span>';
    document.getElementById('kpi-top').innerHTML='';
    document.getElementById('charts-orari').innerHTML='<div style="text-align:center;padding:2rem;font-size:.95rem;color:var(--text3);">Seleziona un giorno dal calendario</div>';
    document.getElementById('info-day').innerHTML='\u2014';
    document.getElementById('kpi-side-content').innerHTML='';
    document.getElementById('explainer-container').innerHTML='';
    destroyC('cBilancio');destroyC('cGhiaccioKg');destroyC('cPUE');destroyC('cCostoOrario');
    return;
  }
  if(!tankStates365) tankStates365=preSimula365(p);
  badgeDiv.innerHTML=selectedDays.map(function(gg,i){return '<span style="font-size:1.0rem;padding:2px 8px;border-radius:4px;background:'+SEL_COLORS[i]+';color:#fff;">'+giornoLabel(gg)+'</span>';}).join('');
  var results=selectedDays.map(function(gg){return{gg,data:simulaGiorno(gg,p)};});

  // KPI TOP
  document.getElementById('kpi-top').innerHTML=results.map(function(item,i){
    var d=item.data;
    var kgGhiaccio=Math.round(d.totIceUp*1000/LATENTE_WH);
    var kgCarry=Math.round(d.carryTomorrow*1000/LATENTE_WH);
    return '<div style="border:1px solid '+SEL_COLORS[i]+';border-radius:var(--rl);padding:.7rem .6rem;background:var(--bg2);">'
      +'<div style="font-size:1.0rem;font-weight:600;color:'+SEL_COLORS[i]+';text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">'+giornoLabel(item.gg)+'</div>'
      +'<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;">'
      +'<div class="kpi" style="padding:.4rem .1rem;"><div class="kv" style="color:var(--red);font-size:1.2rem;">'+fN1(d.totCooling/1000)+'</div><div class="ku" style="font-size:1.0rem;">MWh_th</div><div class="kl" style="font-size:1.0rem;">Cooling</div></div>'
      +'<div class="kpi" style="padding:.4rem .1rem;"><div class="kv" style="color:var(--green);font-size:1.2rem;">'+fN(d.totPv)+'</div><div class="ku" style="font-size:1.0rem;">kWh_el</div><div class="kl" style="font-size:1.0rem;">FV prodotto</div></div>'
      +'<div class="kpi" style="padding:.4rem .1rem;"><div class="kv" style="color:var(--teal);font-size:1.2rem;">'+itNum(kgGhiaccio)+'</div><div class="ku" style="font-size:1.0rem;">kg</div><div class="kl" style="font-size:1.0rem;">Ghiaccio prod.</div></div>'
      +'<div class="kpi" style="padding:.4rem .1rem;"><div class="kv" style="color:#0e7490;font-size:1.2rem;">'+itNum(kgCarry)+'</div><div class="ku" style="font-size:1.0rem;">kg</div><div class="kl" style="font-size:1.0rem;">Carry domani</div></div>'
      +'<div class="kpi" style="padding:.4rem .1rem;"><div class="kv" style="color:var(--amber);font-size:1.2rem;">'+fN1(d.totGrid/1000)+'</div><div class="ku" style="font-size:1.0rem;">MWh_el</div><div class="kl" style="font-size:1.0rem;">Rete</div></div>'
      +'<div class="kpi" style="padding:.4rem .1rem;"><div class="kv" style="color:var(--amber);font-size:1.2rem;">'+fN(d.totCost)+'</div><div class="ku" style="font-size:1.0rem;">\u20ac</div><div class="kl" style="font-size:1.0rem;">Costo</div></div>'
      +'<div class="kpi" style="padding:.4rem .1rem;cursor:pointer;" onclick="showPueInfo()"><div class="kv" style="color:var(--blue);font-size:1.2rem;">'+itNum(d.pueAvg,2)+'</div><div class="ku" style="font-size:1.0rem;"></div><div class="kl" style="font-size:1.0rem;">PUE ⓘ</div></div>'
      +'</div></div>';
  }).join('');

  // GRAFICI ORARI
  var chartsDiv=document.getElementById('charts-orari');
  Object.keys(charts).filter(function(k){return k.startsWith('cOrario');}).forEach(function(k){destroyC(k);});
  chartsDiv.innerHTML='';
  var labels=Array.from({length:24},function(_,h){return h+':00';});
  var n=results.length;
  var gridCols=n<=2?n:2;
  var gridStyle='display:grid;grid-template-columns:repeat('+gridCols+',1fr);gap:16px;margin-bottom:20px;';

  function makeOpts(yLabel,yMax){
    return {
      responsive:true,maintainAspectRatio:false,
      interaction:{mode:'index',intersect:false},
      plugins:{
        legend:{display:false},
        tooltip:{
          mode:'index',intersect:false,
          bodyFont:{size:13},titleFont:{size:13},padding:10,
          callbacks:{label:function(ctx){return '  '+ctx.dataset.label+':  '+itNum(ctx.parsed.y,1)+' kW';}}
        }
      },
      scales:{
        x:{grid:{color:'rgba(0,0,0,0.06)'},ticks:{color:'#1a202c',font:{size:13},autoSkip:true,maxTicksLimit:8}},
        y:{grid:{color:'rgba(0,0,0,0.08)'},ticks:{color:'#1a202c',font:{size:13}},min:0,max:yMax,
          title:{display:true,text:yLabel,color:'#1a202c',font:{size:13,weight:'bold'}}}
      }
    };
  }

  // Dataset termici
  var datasetsTh=function(data){return [
    {label:'Cooling rack (kWh_th)',data:data.hours.map(function(r){return r.coolingNeed;}),borderColor:'#ff6b35',backgroundColor:'rgba(255,107,53,.09)',fill:true,tension:.3,pointRadius:0,borderWidth:2.5},
    {label:'Ghiaccio prodotto (kWh_th)',data:data.hours.map(function(r){return r.iceCharged;}),borderColor:'#39c8c8',fill:false,tension:.3,pointRadius:0,borderWidth:2.5},
    {label:'Ghiaccio usato (kWh_th)',data:data.hours.map(function(r){return r.iceUsed;}),borderColor:'#a371f7',fill:false,tension:.3,pointRadius:0,borderWidth:2.5,borderDash:[6,3]},
    {label:'Ghiaccio disponibile (kWh_th)',data:data.hours.map(function(r){return r.iceAvailable;}),borderColor:'#58a6ff',fill:false,tension:.3,pointRadius:0,borderWidth:2.5}
  ];};

  // Dataset elettrici — AGGIORNATI con specie individuali + sommatoria
  var datasetsEl=function(data){return [
    // individuali tratteggiati
    {label:'Rack IT (kW_el)',data:data.hours.map(function(r){return p.dcBase;}),borderColor:'#f85149',fill:false,tension:0,pointRadius:0,borderWidth:2,borderDash:[8,4]},
    {label:'Chiller cooling (kW_el)',data:data.hours.map(function(r){return r.chillerCoolKw;}),borderColor:'#e3b341',fill:false,tension:.3,pointRadius:0,borderWidth:2,borderDash:[5,3]},
    {label:'Chiller ghiaccio (kW_el)',data:data.hours.map(function(r){return r.chillerIceKw;}),borderColor:'#39c8c8',fill:false,tension:.3,pointRadius:0,borderWidth:2,borderDash:[5,3]},
    // sommatoria — linea intera spessa
    {label:'Totale consumi (kW_el)',data:data.hours.map(function(r){return r.totalElecConsumed;}),borderColor:'#1a202c',fill:false,tension:.3,pointRadius:0,borderWidth:3},
    // FV e rete
    {label:'FV lordo (kW_el)',data:data.hours.map(function(r){return r.pvKw;}),borderColor:'#39d353',backgroundColor:'rgba(57,211,83,.09)',fill:true,tension:.4,pointRadius:0,borderWidth:2.5},
    {label:'FV venduto rete (kW_el)',data:data.hours.map(function(r){return r.pvToGrid;}),borderColor:'#58a6ff',fill:false,tension:.4,pointRadius:0,borderWidth:2,borderDash:[4,2]},
    {label:'Prelievo rete (kW_el)',data:data.hours.map(function(r){return r.totalGrid;}),borderColor:'#e3b341',backgroundColor:'rgba(227,179,65,.09)',fill:true,tension:.3,pointRadius:0,borderWidth:2.5},
  ];};

  function buildCustomLegend(container, dsDefinitions, chartIds){
    var leg=document.createElement('div');
    leg.style.cssText='display:flex;flex-wrap:wrap;gap:8px 20px;margin-bottom:12px;padding:10px 12px;background:rgba(0,0,0,0.03);border-radius:8px;';
    dsDefinitions.forEach(function(ds,dsIdx){
      var item=document.createElement('span');
      item.style.cssText='display:inline-flex;align-items:center;gap:7px;font-size:1.0rem;font-weight:600;color:#1a202c;cursor:pointer;user-select:none;padding:3px 6px;border-radius:4px;transition:opacity .15s;';
      var swatch=document.createElement('span');
      // Mostra linea tratteggiata per consumi individuali
      var isDashed=ds.borderDash&&ds.borderDash.length>0;
      swatch.style.cssText='display:inline-block;width:22px;height:4px;background:'+(isDashed?'transparent':ds.borderColor)+';border-radius:2px;flex-shrink:0;'+(isDashed?'border-top:3px dashed '+ds.borderColor+';':'');
      var txt=document.createElement('span');txt.textContent=ds.label;
      item.appendChild(swatch);item.appendChild(txt);
      var hidden=false;
      item.addEventListener('click',function(){
        hidden=!hidden;
        item.style.opacity=hidden?'0.30':'1';
        item.style.textDecoration=hidden?'line-through':'none';
        chartIds.forEach(function(cid){
          var ch=charts[cid];if(!ch)return;
          ch.data.datasets[dsIdx].hidden=hidden;ch.update();
        });
      });
      leg.appendChild(item);
    });
    container.appendChild(leg);
  }

  function buildSection(color, title, yLabel, dsFactory, prefix){
    var sec=document.createElement('div');sec.style.cssText='margin-bottom:28px;';
    var hdr=document.createElement('div');
    hdr.style.cssText='font-size:1rem;font-weight:800;color:'+color+';text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px;padding-bottom:6px;border-bottom:3px solid '+color+';';
    hdr.textContent=title;sec.appendChild(hdr);
    var legCont=document.createElement('div');sec.appendChild(legCont);
    var grid=document.createElement('div');grid.style.cssText=gridStyle;sec.appendChild(grid);
    chartsDiv.appendChild(sec);
    // Stessa scala Y su tutti i giorni del confronto, altrimenti non sono leggibili a colpo d'occhio.
    var sharedMax=0;
    results.forEach(function(item){
      dsFactory(item.data).forEach(function(ds){
        ds.data.forEach(function(v){if(v>sharedMax)sharedMax=v;});
      });
    });
    sharedMax=sharedMax>0?Math.ceil(sharedMax*1.05):undefined;
    results.forEach(function(item,i){
      var gg=item.gg,data=item.data;
      var cell=document.createElement('div');cell.style.cssText='min-width:0;';
      var lbl=document.createElement('div');
      lbl.style.cssText='font-size:.95rem;color:'+SEL_COLORS[i]+';font-weight:800;margin-bottom:6px;letter-spacing:.02em;';
      lbl.textContent=giornoLabel(gg);
      var cw=document.createElement('div');cw.style.cssText='position:relative;width:100%;height:280px;';
      var cv=document.createElement('canvas');cv.id=prefix+i;
      cw.appendChild(cv);cell.appendChild(lbl);cell.appendChild(cw);
      grid.appendChild(cell);
      charts[prefix+i]=new Chart(cv,{type:'line',data:{labels,datasets:dsFactory(data)},options:makeOpts(yLabel,sharedMax)});
    });
    var ids=results.map(function(_,i){return prefix+i;});
    buildCustomLegend(legCont, dsFactory({hours:Array(24).fill({coolingNeed:0,iceCharged:0,iceUsed:0,iceAvailable:0,chillerCoolKw:0,chillerIceKw:0,totalElecConsumed:0,pvKw:0,totalGrid:0,pvToGrid:0})}), ids);
  }

  buildSection('#c05621','Flussi termici (kWh_th)','kWh_th',datasetsTh,'cOrarioTh');
  var divider=document.createElement('div');
  divider.style.cssText='border-top:3px solid var(--border);margin-bottom:28px;';
  chartsDiv.appendChild(divider);
  buildSection('#276749','Flussi elettrici (kWh_el) &mdash; consumi individuali (tratteggiato) + sommatoria (intera)','kW_el',datasetsEl,'cOrarioEl');

  buildExplainer(results,p);

  // BILANCIO BAR
  destroyC('cBilancio');
  charts['cBilancio']=new Chart(document.getElementById('cBilancio'),{type:'bar',data:{
    labels:results.map(function(r){return giornoLabel(r.gg);}),
    datasets:[
      {label:'Cooling (kWh_th)',data:results.map(function(r){return Math.round(r.data.totCooling);}),backgroundColor:'rgba(248,81,73,.5)',borderColor:'#f85149',borderWidth:1,borderRadius:4},
      {label:'Cool da FV (kWh_th)',data:results.map(function(r){return Math.round(r.data.totCoolPv);}),backgroundColor:'rgba(57,211,83,.5)',borderColor:'#39d353',borderWidth:1,borderRadius:4},
      {label:'Ghiaccio prod. (kWh_th)',data:results.map(function(r){return Math.round(r.data.totIceUp);}),backgroundColor:'rgba(57,200,200,.5)',borderColor:'#39c8c8',borderWidth:1,borderRadius:4},
      {label:'Ghiaccio usato (kWh_th)',data:results.map(function(r){return Math.round(r.data.totIceDown);}),backgroundColor:'rgba(163,113,247,.5)',borderColor:'#a371f7',borderWidth:1,borderRadius:4}
    ]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{display:true,labels:{color:'#4a5568',font:{size:11},boxWidth:12}},tooltip:{mode:'index',intersect:false,callbacks:{label:function(ctx){return ctx.dataset.label+': '+itNum(ctx.parsed.y);}}}},scales:{x:{grid:{display:false},ticks:{color:'#718096',font:{size:12}}},y:{grid:{color:'rgba(0,0,0,0.06)'},ticks:{color:'#718096',font:{size:11},callback:function(v){return itNum(v);}}}}}});

  // KG GHIACCIO
  destroyC('cGhiaccioKg');
  var kgDatasets=results.map(function(item,i){
    var d=item.data;
    var kgCum=[];
    var runKg=Math.round(d.iceYesterday*1000/LATENTE_WH);
    d.hours.forEach(function(r){runKg+=r.iceChargedKg-r.iceUsedKg;runKg=Math.max(0,runKg);kgCum.push(runKg);});
    return{label:giornoLabel(item.gg)+' (kg)',data:kgCum,borderColor:SEL_COLORS[i],backgroundColor:SEL_BG[i],fill:results.length===1,tension:.4,pointRadius:0,borderWidth:2};
  });
  charts['cGhiaccioKg']=new Chart(document.getElementById('cGhiaccioKg'),{type:'line',data:{labels,datasets:kgDatasets},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{display:results.length>1,labels:{color:'#4a5568',font:{size:11},boxWidth:12}},tooltip:{mode:'index',intersect:false,callbacks:{label:function(ctx){return ctx.dataset.label+': '+itNum(ctx.parsed.y)+' kg';}}}},scales:{x:{grid:{color:'rgba(0,0,0,0.06)'},ticks:{color:'#718096',font:{size:11},autoSkip:true,maxTicksLimit:8}},y:{min:0,grid:{color:'rgba(0,0,0,0.06)'},ticks:{color:'#718096',font:{size:11},callback:function(v){return itNum(v);}},title:{display:true,text:'kg',color:'#718096',font:{size:11}}}}}});

  var kgInfoLines=results.map(function(item){
    var d=item.data;
    var kgProd=Math.round(d.totIceUp*1000/LATENTE_WH);
    var kgUsed=Math.round(d.totIceDown*1000/LATENTE_WH);
    var kgCarry=Math.round(d.carryTomorrow*1000/LATENTE_WH);
    var kgIeri=Math.round(d.iceYesterday*1000/LATENTE_WH);
    return '<b>'+giornoLabel(item.gg)+':</b> Ieri: '+itNum(kgIeri)+' kg | Prodotti: <b style="color:var(--teal);">'+itNum(kgProd)+' kg</b> | Usati: '+itNum(kgUsed)+' kg | Carry domani: <b style="color:#0e7490;">'+itNum(kgCarry)+' kg</b>';
  });
  document.getElementById('kg-ghiaccio-info').innerHTML=kgInfoLines.join('<br>');

  // PUE
  destroyC('cPUE');
  charts['cPUE']=new Chart(document.getElementById('cPUE'),{type:'line',data:{labels,datasets:results.map(function(item,i){return{label:giornoLabel(item.gg),data:item.data.hours.map(function(r){return r.pue;}),borderColor:SEL_COLORS[i],fill:false,tension:.3,pointRadius:0,borderWidth:2};})},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{display:results.length>1,labels:{color:'#4a5568',font:{size:11},boxWidth:12}},tooltip:{mode:'index',intersect:false,callbacks:{label:function(ctx){return 'PUE: '+itNum(ctx.parsed.y,2);}}}},scales:{x:{grid:{display:false},ticks:{color:'#718096',font:{size:11},autoSkip:true,maxTicksLimit:8}},y:{min:1,grid:{color:'rgba(0,0,0,0.06)'},ticks:{color:'#718096',font:{size:11}},title:{display:true,text:'PUE',color:'#718096',font:{size:11}}}}}});

  // COSTO ORARIO
  destroyC('cCostoOrario');
  var primo0=results[0],costiOrari=primo0.data.hours.map(function(r){return r.gridCost;});
  var tariffColors=primo0.data.hours.map(function(r){return r.tariff>p.gridPrice*1.1?'rgba(248,81,73,.7)':r.tariff<p.gridPrice*0.9?'rgba(57,211,83,.7)':'rgba(227,179,65,.7)';});
  charts['cCostoOrario']=new Chart(document.getElementById('cCostoOrario'),{type:'bar',data:{labels,datasets:[{label:'Costo/h',data:costiOrari,backgroundColor:tariffColors,borderWidth:0,borderRadius:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:function(ctx){return '\u20ac '+itNum(ctx.parsed.y,2)+'/h';},title:function(items){return items[0].label+' \u00b7 '+itNum(primo0.data.hours[items[0].dataIndex].tariff,3)+' \u20ac/kWh';}}}},scales:{x:{grid:{display:false},ticks:{color:'#718096',font:{size:11},autoSkip:true,maxTicksLimit:8}},y:{grid:{color:'rgba(0,0,0,0.06)'},ticks:{color:'#718096',font:{size:11},callback:function(v){return itNum(v,2);}},title:{display:true,text:'\u20ac/h',color:'#718096',font:{size:11}}}}}});

  // INFO DAY
  document.getElementById('info-day').innerHTML=results.map(function(item,i){
    var d=item.data;
    var cN=Math.round(d.totCost-d.totFeedIn);
    var cSF=Math.round((d.totCooling/Math.max(1.5,getEERreal(p.cop,15))+p.dcBase*24*(1+p.servPct))*p.gridPrice);
    var risp=cSF-cN;
    var kgProd=Math.round(d.totIceUp*1000/LATENTE_WH);
    return '<span style="color:'+SEL_COLORS[i]+';font-weight:600;">'+giornoLabel(item.gg)+'</span>'
      +' \u00b7 IT: <b>'+fN(Math.round(p.dcBase*24))+' kWh_el</b>'
      +' \u00b7 FV: '+fN(Math.round(d.totPv))+' kWh_el'
      +' \u00b7 Ghiaccio: \u2191'+itNum(kgProd)+' kg'
      +' carry: '+Math.round(d.carryTomorrow*1000/LATENTE_WH)+' kg'
      +' \u00b7 <b style="color:var(--amber);">Costo netto: '+fE(cN)+'</b>'
      +' <span style="color:var(--text3);text-decoration:line-through;">'+fE(cSF)+'</span>'
      +' <b style="color:'+(risp>0?'var(--green)':'var(--red)')+'"> '+(risp>0?'+':'')+fE(risp)+'</b>';
  }).join('<br>');

  // TABELLA ORA PER ORA — AGGIORNATA con nuove colonne
  var tblDiv=document.getElementById('tabella-oraria');
  if(tblDiv){
    var thead='<thead><tr style="border-bottom:2px solid var(--border);color:var(--text3);font-size:.88rem;">'
      +'<th style="padding:5px 8px;text-align:center;background:#f1f5f9;position:sticky;top:0;">Ora</th>'
      +'<th style="padding:5px 8px;text-align:right;background:#f1f5f9;position:sticky;top:0;">FV<br><span style="color:#39d353;font-weight:400;">(kW)</span></th>'
      +'<th style="padding:5px 8px;text-align:right;background:#f1f5f9;position:sticky;top:0;">Rack IT<br><span style="color:#f85149;font-weight:400;">(kW_el)</span></th>'
      +'<th style="padding:5px 8px;text-align:right;background:#f1f5f9;position:sticky;top:0;">Chiller<br>cooling<br><span style="color:#e3b341;font-weight:400;">(kW_el)</span></th>'
      +'<th style="padding:5px 8px;text-align:right;background:#f1f5f9;position:sticky;top:0;">Chiller<br>ghiaccio<br><span style="color:#39c8c8;font-weight:400;">(kW_el)</span></th>'
      +'<th style="padding:5px 8px;text-align:right;background:#f1f5f9;position:sticky;top:0;font-weight:800;color:#1a202c;">Totale<br>consumi<br>(kW_el)</th>'
      +'<th style="padding:5px 8px;text-align:right;background:#f1f5f9;position:sticky;top:0;">Ghiaccio<br>prod. (kWh_th)</th>'
      +'<th style="padding:5px 8px;text-align:right;background:#f1f5f9;position:sticky;top:0;">Ghiaccio<br>prod. (kg)</th>'
      +'<th style="padding:5px 8px;text-align:right;background:#f1f5f9;position:sticky;top:0;">Ghiaccio<br>usato (kg)</th>'
      +'<th style="padding:5px 8px;text-align:right;background:#f1f5f9;position:sticky;top:0;">Tank<br>(kg)</th>'
      +'<th style="padding:5px 8px;text-align:right;background:#f1f5f9;position:sticky;top:0;">Da rete<br><span style="color:#e3b341;font-weight:400;">(kW_el)</span></th>'
      +'<th style="padding:5px 8px;text-align:right;background:#f1f5f9;position:sticky;top:0;">Costo<br>(&euro;/h)</th>'
      +'<th style="padding:5px 8px;text-align:right;background:#f1f5f9;position:sticky;top:0;">Tariffa<br>(&euro;/kWh)</th>'
      +'</tr></thead>';

    var tablesHtml=results.map(function(item,idx){
      var d=item.data;
      var dayNum=item.gg;
      var runKgT=Math.round(d.iceYesterday*1000/LATENTE_WH);
      var accentColor=SEL_COLORS[idx];

      // Totali colonna per il footer
      var totFV=0,totIT=0,totCC=0,totCI=0,totTot=0,totThProd=0,totKgProd=0,totKgUsed=0,totRete=0,totCosto=0;

      var tblRows=d.hours.map(function(r,h){
        var ice_prod_kg=Math.round(r.iceChargedKg);
        var ice_cons_kg=Math.round(r.iceUsedKg);
        runKgT+=ice_prod_kg-ice_cons_kg;
        if(runKgT<0)runKgT=0;
        var fv_kw=Math.round(r.pvKw);
        var isNight=fv_kw===0;
        var isSelling=r.pvToGrid>1;
        var borderLeft=isNight?'border-left:3px solid #3a5070;':isSelling?'border-left:3px solid #58a6ff;':'border-left:3px solid #39d353;';
        var oraColor=isNight?'color:var(--text3);':'color:var(--text);';
        var trStyle='border-bottom:1px solid var(--border);'+borderLeft;
        var tdB='padding:4px 8px;text-align:right;';
        var tdL='padding:4px 8px;text-align:center;font-weight:600;font-family:\'IBM Plex Mono\',monospace;'+oraColor;
        // Accumula totali
        totFV+=r.pvKw;totIT+=p.dcBase;totCC+=r.chillerCoolKw;totCI+=r.chillerIceKw;
        totTot+=r.totalElecConsumed;totThProd+=r.iceCharged;totKgProd+=ice_prod_kg;
        totKgUsed+=ice_cons_kg;totRete+=r.totalGrid;totCosto+=r.gridCost;
        return '<tr style="'+trStyle+'">'
          +'<td style="'+tdL+'">'+String(h).padStart(2,'0')+':00</td>'
          +'<td style="'+tdB+';color:#39d353;">'+(fv_kw>0?fv_kw:'<span style="color:var(--text3);">—</span>')+'</td>'
          +'<td style="'+tdB+';color:#f85149;">'+Math.round(p.dcBase)+'</td>'
          +'<td style="'+tdB+';color:#e3b341;">'+Math.round(r.chillerCoolKw)+'</td>'
          +'<td style="'+tdB+';color:#39c8c8;">'+(r.chillerIceKw>0?Math.round(r.chillerIceKw):'<span style="color:var(--text3);">0</span>')+'</td>'
          +'<td style="'+tdB+';font-weight:700;color:#1a202c;">'+Math.round(r.totalElecConsumed)+'</td>'
          +'<td style="'+tdB+';color:#39c8c8;">'+(r.iceCharged>0.5?itNum(r.iceCharged,1):'<span style="color:var(--text3);">—</span>')+'</td>'
          +'<td style="'+tdB+';color:#39c8c8;">'+(ice_prod_kg>0?'<b>+'+ice_prod_kg+'</b>':'<span style="color:var(--text3);">—</span>')+'</td>'
          +'<td style="'+tdB+';color:#a371f7;">'+(ice_cons_kg>0?ice_cons_kg:'<span style="color:var(--text3);">—</span>')+'</td>'
          +'<td style="'+tdB+';font-weight:600;">'+(runKgT>0?itNum(runKgT):'<span style="color:var(--text3);">0</span>')+'</td>'
          +'<td style="'+tdB+';'+(r.totalGrid>0?'color:#e3b341;font-weight:600;':'color:var(--text3);')+'">'+Math.round(r.totalGrid)+'</td>'
          +'<td style="'+tdB+';color:var(--text);">'+itNum(r.gridCost,2)+'</td>'
          +'<td style="'+tdB+';color:var(--text3);font-size:.90rem;">'+itNum(r.tariff,3)+'</td>'
          +'</tr>';
      }).join('');

      // Riga totali
      var tariffaMedia=totRete>0?(totCosto/totRete):0;
      var tfoot='<tfoot><tr style="border-top:2px solid var(--border2);background:#f8fafc;font-weight:700;">'
        +'<td style="padding:5px 8px;font-family:\'IBM Plex Sans\',sans-serif;color:var(--text2);">TOTALE</td>'
        +'<td style="padding:5px 8px;text-align:right;color:#39d353;">'+fN1(totFV)+'</td>'
        +'<td style="padding:5px 8px;text-align:right;color:#f85149;">'+fN(totIT)+'</td>'
        +'<td style="padding:5px 8px;text-align:right;color:#e3b341;">'+fN1(totCC)+'</td>'
        +'<td style="padding:5px 8px;text-align:right;color:#39c8c8;">'+fN1(totCI)+'</td>'
        +'<td style="padding:5px 8px;text-align:right;color:#1a202c;">'+fN1(totTot)+'</td>'
        +'<td style="padding:5px 8px;text-align:right;color:#39c8c8;">'+fN1(totThProd)+'</td>'
        +'<td style="padding:5px 8px;text-align:right;color:#39c8c8;">'+fN(totKgProd)+'</td>'
        +'<td style="padding:5px 8px;text-align:right;color:#a371f7;">'+fN(totKgUsed)+'</td>'
        +'<td style="padding:5px 8px;text-align:right;color:var(--text3);font-size:.90rem;font-weight:400;">fine: '+itNum(runKgT)+' kg</td>'
        +'<td style="padding:5px 8px;text-align:right;color:#e3b341;">'+fN1(totRete)+'</td>'
        +'<td style="padding:5px 8px;text-align:right;color:var(--text);">'+fN2(totCosto)+'</td>'
        +'<td style="padding:5px 8px;text-align:right;color:var(--text3);font-size:.90rem;font-weight:400;">media: '+itNum(tariffaMedia,3)+'</td>'
        +'</tr></tfoot>';

      return '<div class="card" style="margin-top:1rem;border-top:3px solid '+accentColor+';">'
        +'<div class="ct" style="margin-bottom:8px;">Tabella ora per ora \u2014 <span style="color:'+accentColor+';">'+giornoLabel(dayNum)+'</span>'
        +' <span style="font-size:.85rem;color:var(--text3);font-weight:400;">(Tank inizio giornata: '+itNum(Math.round(d.iceYesterday*1000/LATENTE_WH))+' kg)</span></div>'
        +'<div style="overflow-x:auto;">'
        +'<table style="width:100%;border-collapse:collapse;font-size:.92rem;font-family:\'IBM Plex Mono\',monospace;">'
        +thead+tfoot
        +'<tbody>'+tblRows+'</tbody>'
        +'</table>'
        +'</div>'
        +'<div style="font-size:.90rem;color:var(--text3);margin-top:8px;line-height:2;">'
        +'<span style="display:inline-block;width:3px;height:14px;background:#39d353;border-radius:2px;vertical-align:middle;margin-right:4px;"></span> FV disponibile &nbsp;&nbsp;'
        +'<span style="display:inline-block;width:3px;height:14px;background:#58a6ff;border-radius:2px;vertical-align:middle;margin-right:4px;"></span> FV in vendita (tank saturo, estate) &nbsp;&nbsp;'
        +'<span style="display:inline-block;width:3px;height:14px;background:#3a5070;border-radius:2px;vertical-align:middle;margin-right:4px;"></span> ore notturne &nbsp;&nbsp;'
        +'<span style="color:#39c8c8;font-weight:600;">+kg</span> ghiaccio prodotto &nbsp;&nbsp;'
        +'<span style="color:#a371f7;font-weight:600;">kg</span> ghiaccio consumato'
        +'</div>'
        +'</div>';
    }).join('');
    tblDiv.innerHTML=tablesHtml;
  }

  // KPI SIDE (Statistiche di fine giornata) — con dettaglio costi
  var nCols=Math.min(results.length,2);
  document.getElementById('kpi-side-content').innerHTML='<div style="display:grid;grid-template-columns:repeat('+nCols+',1fr);gap:1.2rem;">'+results.map(function(item,idx){
    var d=item.data;
    var pvPct=Math.round(d.totPv/(d.totPv+d.totGrid)*100)||0;
    var co2s=Math.round(d.totPv*CO2_FACTOR);
    var cSF=Math.round((d.totCooling/Math.max(1.5,getEERreal(p.cop,15))+p.dcBase*24*(1+p.servPct))*p.gridPrice);
    var cN=Math.round(d.totCost-d.totFeedIn);
    var risp=cSF-cN;
    var kgProd=Math.round(d.totIceUp*1000/LATENTE_WH);
    var kgCarry=Math.round(d.carryTomorrow*1000/LATENTE_WH);
    // Calcolo costi suddivisi per categoria
    var costoIT=Math.round(d.hours.reduce(function(s,r){return s+((r.totalGrid-r.gridForChiller)*r.tariff);},0));
    var costoChillerCool=Math.round(d.hours.reduce(function(s,r){return s+(r.gridForChiller*r.tariff);},0));
    var rows=[
      ['─── CONSUMI ───','','','var(--text3)'],
      ['Rack IT (24h)',fN(Math.round(p.dcBase*24)),'kWh_el','#f85149'],
      ['Calore rack (100%)', '= '+fN(Math.round(p.dcBase*24)),'kWh_th','#ff6b35'],
      ['Fabbisogno cooling',fN1(d.totCooling/1000),'MWh_th','#ff6b35'],
      ['Chiller cooling (el)',fN1(d.totChillerCool),'kWh_el','#e3b341'],
      ['Chiller ghiaccio (el)',fN1(d.totChillerIce),'kWh_el','#39c8c8'],
      ['Totale consumi',fN1(d.totElec),'kWh_el','#1a202c'],
      ['','','',''],
      ['─── FV ───','','','var(--text3)'],
      ['FV prodotto',fN(Math.round(d.totPv)),'kWh_el','#39d353'],
      ['Cooling da FV',fN(Math.round(d.totCoolPv)),'kWh_th','#39d353'],
      ['FV venduto rete',fN(Math.round(d.totPvToGrid)),'kWh_el',d.totPvToGrid>0?'#58a6ff':'#718096'],
      ['','','',''],
      ['─── GHIACCIO ───','','','var(--text3)'],
      ['Ghiaccio prodotto',itNum(kgProd),'kg','#0e7490'],
      ['Ghiaccio prodotto (en.)',fN(Math.round(d.totIceUp)),'kWh_th','#39c8c8'],
      ['Ghiaccio usato',fN(Math.round(d.totIceDown)),'kWh_th','#a371f7'],
      ['Carry domani',itNum(kgCarry),'kg','#0e7490'],
      ['','','',''],
      ['─── COSTI ───','','','var(--text3)'],
      ['Prelievo rete',fN1(d.totGrid/1000),'MWh_el','#e3b341'],
      ['  di cui: costo IT',fE(costoIT),'','#f85149'],
      ['  di cui: costo chiller',fE(costoChillerCool),'','#e3b341'],
      ['Costo rete totale',fE(d.totCost),'','#e3b341'],
      ['Ricavo feed-in',fE(d.totFeedIn),'',d.totFeedIn>0?'#39d353':'#718096'],
      ['Costo netto',fE(cN),'','var(--red)'],
      ['Costo senza FV+ITES',fE(cSF),'','#718096'],
      ['Risparmio giornaliero',fE(risp),'',risp>0?'#39d353':'#f85149'],
      ['','','',''],
      ['─── EFFICIENZA ───','','','var(--text3)'],
      ['PUE medio',itNum(d.pueAvg,2),'','#58a6ff','showPueInfo()'],
      ['CO\u2082 evitata',co2s,'kg','#39d353'],
      ['FV autoconsumato',pvPct,'%','#39d353']
    ];
    var hdr='<div style="font-size:.88rem;font-weight:700;color:'+SEL_COLORS[idx]+';text-transform:uppercase;padding:3px 0 4px;border-bottom:2px solid '+SEL_COLORS[idx]+';margin-bottom:3px;">'+giornoLabel(item.gg)+'</div>';
    var rowsHtml=rows.map(function(row){
      var l=row[0],v=row[1],u=row[2],c=row[3],onClick=row[4];
      if(!l)return '<hr style="border:none;border-top:1px solid var(--border);margin:3px 0;">';
      if(l.startsWith('───'))return '<div style="font-size:.90rem;font-weight:700;color:'+c+';text-transform:uppercase;letter-spacing:.07em;padding:4px 0 2px;margin-top:2px;">'+l.replace(/─── | ───/g,'').trim()+'</div>';
      var isIndented=l.startsWith('  ');
      return '<div style="display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px solid var(--border);'+(isIndented?'padding-left:10px;':'')+(onClick?'cursor:pointer;':'')+'"'+(onClick?' onclick="'+onClick+'"':'')+'><span style="font-size:1.0rem;color:var(--text3);">'+l.trim()+(onClick?' ⓘ':'')+'</span><span style="font-size:1.0rem;font-family:\'IBM Plex Mono\',monospace;color:'+c+';">'+v+'<span style="color:var(--text3);font-size:.95rem;margin-left:2px;">'+u+'</span></span></div>';
    }).join('');
    return '<div style="border:1px solid '+SEL_COLORS[idx]+';border-radius:var(--r);padding:.7rem .8rem;">'+hdr+rowsHtml+'</div>';
  }).join('')+'</div>';
}
