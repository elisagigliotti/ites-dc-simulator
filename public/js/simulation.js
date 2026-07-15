// ============================================================
// PARAMETRI
// ============================================================
function getParams(){
  var rt=document.getElementById('r-racktype').value;
  var rack=RACK_TYPES[rt];
  var nRack=parseFloat(document.getElementById('r-nrack').value);
  var itKw=nRack*rack.kw;
  var gridPrice=parseFloat(document.getElementById('r-price').value);
  var tariffMode=document.getElementById('r-tariffmode').value;
  return{
    kwp:parseFloat(document.getElementById('r-kwp').value),
    loss:parseFloat(document.getElementById('r-loss').value)/100,
    rackType:rt,rack,nRack,itKw,
    dcBase:itKw,
    heatKw:itKw,
    servPct:0.015,
    setP:parseFloat(document.getElementById('r-setp').value),
    ua:parseFloat(document.getElementById('r-ua').value),
    cop:parseFloat(document.getElementById('r-cop').value),
    gridPrice,
    feedIn:parseFloat(document.getElementById('r-feedin').value),
    tariffMode
  };
}

function getTariff(h,p){
  if(p.tariffMode==='fixed') return p.gridPrice;
  return p.gridPrice*getTariffMult(h);
}

// ============================================================
// COP/EER con degradazione temperatura
// ============================================================
function getEER(copNom,tExt){return Math.max(2.0,copNom*(1-0.02*Math.max(0,tExt-15)));}
function getCOPice(copNom,tExt){return Math.max(1.8,copNom*0.85*(1-0.02*Math.max(0,tExt-15)));}
// EER/COP "di impianto": include pompe di circolazione, ventole condensatore e controlli oltre al solo compressore.
// Il compressore da solo (EER/COP nominale) sottostima il kW_el reale assorbito dalla centrale frigorifera.
function getEERreal(copNom,tExt){return getEER(copNom,tExt)/(1+CHILLER_AUX_OVERHEAD);}
function getCOPiceReal(copNom,tExt){return getCOPice(copNom,tExt)/(1+CHILLER_AUX_OVERHEAD);}

// ============================================================
// STAGIONE DI VENDITA — mesi con T media > 15°C = "estate": una volta che il
// tank copre il fabbisogno di oggi+domani, il surplus residuo viene venduto.
// Negli altri mesi ("inverno") si vende MAI: tutto il surplus diventa ghiaccio.
// ============================================================
function isMesEstate(mese){ return TEMP_MEDIE[mese] > 15; }

// Fabbisogno di cooling ora per ora per un dato mese (usato per stimare il
// residuo di oggi e il totale di domani nel calcolo del cap ghiaccio estivo).
function coolingNeedsArr(mese,p){
  return TEMP_ORARIE[mese].map(function(tExt){
    var heatIT=p.itKw, servKw=p.dcBase*p.servPct, heatEnv=p.ua*(tExt-p.setP)/1000;
    return Math.max(0, heatIT+servKw+heatEnv);
  });
}
// residuo[h] = somma del fabbisogno cooling dalle ore h+1 a 23 (resto della giornata)
function coolingResiduoOggi(mese,p){
  var needs=coolingNeedsArr(mese,p);
  var residuo=new Array(24).fill(0), cum=0;
  for(var h=23;h>=0;h--){ residuo[h]=cum; cum+=needs[h]; }
  return residuo;
}
function coolingTotaleGiorno(mese,p){
  return coolingNeedsArr(mese,p).reduce(function(a,b){return a+b;},0);
}
// Mese del "giorno dopo": stesso mese se non è l'ultimo giorno, altrimenti il successivo (Dic->Gen).
function meseGiornoDopo(mese,giornoDelMese){
  return (giornoDelMese < GIORNI_MESE[mese]-1) ? mese : (mese+1)%12;
}

// ============================================================
// SIMULAZIONE ORARIA — v9: il ghiaccio ha sempre priorità sulla rete.
// Estate (T media mese > 15°C): il chiller produce ghiaccio finché il tank non
// copre il fabbisogno di cooling di oggi (resto giornata) + domani (24h); solo
// dopo quella soglia il surplus residuo viene venduto in rete.
// Inverno: nessun cap, tutto il surplus FV diventa ghiaccio, mai vendita.
// ============================================================
function simulaOra(h,mese,p,tankKwhToday,iceYesterdayKwh,coolingResiduoArr,domaniTotale){
  var tExt=TEMP_ORARIE[mese][h];
  var heatIT=p.itKw;
  var servKw=p.dcBase*p.servPct;
  var heatEnv=p.ua*(tExt-p.setP)/1000;
  var coolingNeed=Math.max(0, heatIT+servKw+heatEnv);

  var mensili=getMensili();
  var lossCorr=(1-p.loss)/(1-0.14);
  var prof=PROFILI_MENSILI[mese];
  var sumP=prof.reduce(function(a,b){return a+b;},0);
  var pvKw=prof[h]/sumP*mensili[mese].kwp_kwh*p.kwp*lossCorr;

  var tariff=getTariff(h,p);
  var eer=getEER(p.cop,tExt);           // EER nominale compressore (teorico)
  var copIce=getCOPice(p.cop,tExt);
  var eerReal=getEERreal(p.cop,tExt);   // EER di impianto (con ausiliari) — usato per i kWel reali
  var copIceReal=getCOPiceReal(p.cop,tExt);

  // 1) FV copre IT + servizi
  var pvForIT=Math.min(pvKw, p.dcBase+servKw);
  var pvAfterIT=Math.max(0, pvKw-pvForIT);
  var itFromGrid=Math.max(0, p.dcBase+servKw-pvKw);

  // 2) FV copre il chiller per cooling
  var coolElNeed=coolingNeed/eerReal;
  var pvForCooling=Math.min(pvAfterIT, coolElNeed);
  var pvAfterCooling=Math.max(0, pvAfterIT-pvForCooling);
  var coolingCoveredByFV=pvForCooling*eerReal;
  var coolingFromGrid=Math.max(0, coolingNeed-coolingCoveredByFV);

  // 3) Usa ghiaccio di ieri per cooling residuo
  var coolResidualAfterFV=coolingFromGrid;
  var iceYestUsed=0;
  if(iceYesterdayKwh>0 && coolResidualAfterFV>0){
    var useYest=Math.min(iceYesterdayKwh, coolResidualAfterFV);
    iceYestUsed=useYest;
    coolResidualAfterFV-=useYest;
  }

  // 4) Usa ghiaccio di oggi per cooling residuo
  var iceTodayUsed=0;
  if(tankKwhToday>0 && coolResidualAfterFV>0){
    var useToday=Math.min(tankKwhToday, coolResidualAfterFV);
    iceTodayUsed=useToday;
    tankKwhToday-=useToday;
    coolResidualAfterFV-=useToday;
  }

  // 5) Rete per cooling residuo non coperto
  var gridForChiller=coolResidualAfterFV>0 ? coolResidualAfterFV/eerReal : 0;

  // 6) Ghiaccio: priorità assoluta sul surplus FV.
  //    Estate: cap = fabbisogno residuo di oggi + fabbisogno totale di domani.
  //            Raggiunto il cap, il surplus in più viene venduto in rete.
  //    Inverno: nessun cap, tutto il surplus diventa ghiaccio, mai vendita.
  var iceCharged=0;
  var pvElUsedForIce=0;
  var chillerIceKw=0;
  var pvToGrid=0;
  var estate=isMesEstate(mese);
  if(pvAfterCooling>0){
    if(estate){
      var tankAttuale=tankKwhToday+iceYesterdayKwh;
      var target=(coolingResiduoArr?coolingResiduoArr[h]:0)+(domaniTotale||0);
      var cap=Math.max(0, target-tankAttuale);
      var iceMaxFromPv=pvAfterCooling*copIceReal;
      iceCharged=Math.min(iceMaxFromPv, cap);
      pvElUsedForIce=iceCharged/copIceReal;
      chillerIceKw=pvElUsedForIce;
      tankKwhToday+=iceCharged;
      pvToGrid=Math.max(0, pvAfterCooling-pvElUsedForIce); // tank saturo: vendi il resto
    } else {
      pvElUsedForIce=pvAfterCooling;
      iceCharged=pvElUsedForIce*copIceReal;
      chillerIceKw=pvElUsedForIce;
      tankKwhToday+=iceCharged;
      pvToGrid=0; // inverno: mai vendita, tutto diventa ghiaccio
    }
  }

  var iceUsedTotal=iceYestUsed+iceTodayUsed;
  var chillerCoolKw=pvForCooling+gridForChiller; // kW_el totali per cooling
  var totalElecConsumed=(p.dcBase+servKw)+chillerCoolKw+pvElUsedForIce;
  var totalGrid=itFromGrid+gridForChiller;
  var gridCost=totalGrid*tariff;
  var feedInRev=pvToGrid*p.feedIn;
  var pue=p.dcBase>0?(totalElecConsumed/p.dcBase):1;

  return {
    h,tExt,tariff,eer,copIce,eerReal,copIceReal,
    itKw:p.dcBase,pvStart:pvKw>0.5,
    coolingNeed:Math.round(coolingNeed*10)/10,
    heatEnv:Math.round(heatEnv*10)/10,
    pvKw:Math.round(pvKw*10)/10,
    pvForIT:Math.round(pvForIT*10)/10,
    pvForCooling:Math.round(pvForCooling*10)/10,
    coolingCoveredByFV:Math.round(coolingCoveredByFV*10)/10,
    coolElNeed:Math.round(coolElNeed*10)/10,
    iceCharged:Math.round(iceCharged*10)/10,
    iceUsed:Math.round(iceUsedTotal*10)/10,
    iceYestUsed:Math.round(iceYestUsed*10)/10,
    iceTodayUsed:Math.round(iceTodayUsed*10)/10,
    tankKwhToday:Math.round(tankKwhToday*10)/10,
    iceAvailable:Math.round((tankKwhToday+iceYesterdayKwh)*10)/10,
    gridForChiller:Math.round(gridForChiller*10)/10,
    totalGrid:Math.round(totalGrid*10)/10,
    pvToGrid:Math.round(pvToGrid*10)/10,
    totalElecConsumed:Math.round(totalElecConsumed*10)/10,
    // componenti separati kW_el
    chillerCoolKw:Math.round(chillerCoolKw*10)/10,
    chillerIceKw:Math.round(chillerIceKw*10)/10,
    gridCost:Math.round(gridCost*100)/100,
    feedInRev:Math.round(feedInRev*100)/100,
    pue:Math.round(pue*100)/100,
    tankKgToday:Math.round(tankKwhToday*1000/LATENTE_WH/10)*10,
    iceChargedKg:Math.round(iceCharged*1000/LATENTE_WH),
    iceUsedKg:Math.round(iceUsedTotal*1000/LATENTE_WH)
  };
}

// ============================================================
// SIMULAZIONE GIORNO SINGOLO
// ============================================================
function simulaGiorno(gg,p){
  var mi=giornoToMese(gg);
  var mese=mi.mese_idx;
  var meseDomani=(mi.giorno_m<GIORNI_MESE[mese])?mese:(mese+1)%12;
  var coolingResiduoArr=coolingResiduoOggi(mese,p);
  var domaniTotale=coolingTotaleGiorno(meseDomani,p);
  var iceYesterday=tankStates365?Math.max(0,tankStates365[gg-1]):0;
  var tankToday=0;
  var iceYestRem=iceYesterday;
  var hours=[];
  for(var h=0;h<24;h++){
    iceYestRem=iceYestRem*(1-0.005);
    var r=simulaOra(h,mese,p,tankToday,iceYestRem,coolingResiduoArr,domaniTotale);
    iceYestRem=Math.max(0,iceYestRem-r.iceYestUsed);
    tankToday=r.tankKwhToday;
    hours.push(r);
  }
  var carryTomorrow=tankToday+iceYestRem;
  var totIceChargedKg=hours.reduce(function(s,r){return s+r.iceChargedKg;},0);
  return{
    hours,
    iceYesterday,
    tankFine:tankToday,
    iceYestRem,
    carryTomorrow,
    capKwh:Math.max(1,carryTomorrow+1),
    totPv:hours.reduce(function(s,r){return s+r.pvKw;},0),
    totGrid:hours.reduce(function(s,r){return s+r.totalGrid;},0),
    totCooling:hours.reduce(function(s,r){return s+r.coolingNeed;},0),
    totIceUp:hours.reduce(function(s,r){return s+r.iceCharged;},0),
    totIceDown:hours.reduce(function(s,r){return s+r.iceUsed;},0),
    totCoolPv:hours.reduce(function(s,r){return s+r.coolingCoveredByFV;},0),
    totCost:hours.reduce(function(s,r){return s+r.gridCost;},0),
    totFeedIn:hours.reduce(function(s,r){return s+r.feedInRev;},0),
    totPvToGrid:hours.reduce(function(s,r){return s+r.pvToGrid;},0),
    totElec:hours.reduce(function(s,r){return s+r.totalElecConsumed;},0),
    totIceChargedKg,
    pueAvg:hours.reduce(function(s,r){return s+r.pue;},0)/24,
    totGridChill:hours.reduce(function(s,r){return s+r.gridForChiller;},0),
    // totali per categoria kW_el
    totChillerCool:hours.reduce(function(s,r){return s+r.chillerCoolKw;},0),
    totChillerIce:hours.reduce(function(s,r){return s+r.chillerIceKw;},0),
    ghiaccioTonFine:tankToday*1000/(LATENTE_WH*1000)
  };
}

// ============================================================
// PRE-SIMULAZIONE 365 GIORNI
// ============================================================
function preSimula365(p){
  var states=new Array(366).fill(0);
  var carryOver=0;
  var gg=0;
  for(var m=0;m<12;m++){
    var coolingResiduoArr=coolingResiduoOggi(m,p);
    for(var d=0;d<GIORNI_MESE[m];d++){
      var meseDomani=meseGiornoDopo(m,d);
      var domaniTotale=coolingTotaleGiorno(meseDomani,p);
      states[gg]=carryOver;
      var iceYestRem=carryOver;
      var tankToday=0;
      for(var h=0;h<24;h++){
        iceYestRem=iceYestRem*(1-0.005);
        var r=simulaOra(h,m,p,tankToday,iceYestRem,coolingResiduoArr,domaniTotale);
        iceYestRem=Math.max(0,iceYestRem-r.iceYestUsed);
        tankToday=r.tankKwhToday;
      }
      carryOver=tankToday+iceYestRem;
      gg++;
    }
  }
  states[365]=carryOver;
  return states;
}

// Simulazione annuale aggregata "usa e getta" (non tocca la cache globale tankStates365/cache365).
// Usata per confrontare rapidamente scenari con parametri diversi (es. altre taglie FV).
function simulaAnnualeAggregato(p){
  var carryOver=0,totGrid=0,totCost=0,totPv=0,totElec=0,totIceUp=0,totFeedIn=0,totPvToGrid=0;
  for(var m=0;m<12;m++){
    var coolingResiduoArr=coolingResiduoOggi(m,p);
    for(var d=0;d<GIORNI_MESE[m];d++){
      var meseDomani=meseGiornoDopo(m,d);
      var domaniTotale=coolingTotaleGiorno(meseDomani,p);
      var iceYestRem=carryOver;
      var tankToday=0;
      for(var h=0;h<24;h++){
        iceYestRem=iceYestRem*(1-0.005);
        var r=simulaOra(h,m,p,tankToday,iceYestRem,coolingResiduoArr,domaniTotale);
        iceYestRem=Math.max(0,iceYestRem-r.iceYestUsed);
        tankToday=r.tankKwhToday;
        totGrid+=r.totalGrid;totCost+=r.gridCost;totPv+=r.pvKw;totElec+=r.totalElecConsumed;totIceUp+=r.iceCharged;
        totFeedIn+=r.feedInRev;totPvToGrid+=r.pvToGrid;
      }
      carryOver=tankToday+iceYestRem;
    }
  }
  return{grid:totGrid,cost:totCost,pv:totPv,elec:totElec,iceUp:totIceUp,feedIn:totFeedIn,pvToGrid:totPvToGrid};
}

function simula365completa(p){
  if(!tankStates365) tankStates365=preSimula365(p);
  if(cache365) return cache365;
  var mesi=Array.from({length:12},function(){return{pv:0,grid:0,cooling:0,iceUp:0,iceDown:0,coolPv:0,cost:0,feedIn:0,pvToGrid:0,elec:0};});
  var giorni365={tankKg:[],cost:[],pv:[],cooling:[],pue:[],grid:[],pvToGrid:[],elec:[],iceUp:[],iceDown:[]};
  var gg=0;
  for(var m=0;m<12;m++){
    for(var d=0;d<GIORNI_MESE[m];d++){
      gg++;
      var r=simulaGiorno(gg,p);
      mesi[m].pv+=r.totPv;mesi[m].grid+=r.totGrid;mesi[m].cooling+=r.totCooling;
      mesi[m].iceUp+=r.totIceUp;mesi[m].iceDown+=r.totIceDown;mesi[m].coolPv+=r.totCoolPv;
      mesi[m].cost+=r.totCost;mesi[m].feedIn+=r.totFeedIn;mesi[m].pvToGrid+=r.totPvToGrid;
      mesi[m].elec+=r.totElec;
      giorni365.tankKg.push(Math.round(r.carryTomorrow*1000/LATENTE_WH));
      giorni365.cost.push(r.totCost);
      giorni365.pv.push(r.totPv);
      giorni365.cooling.push(r.totCooling);
      giorni365.pue.push(r.pueAvg);
      giorni365.grid.push(r.totGrid);
      giorni365.pvToGrid.push(r.totPvToGrid);
      giorni365.elec.push(r.totElec);
      giorni365.iceUp.push(r.totIceUp);
      giorni365.iceDown.push(r.totIceDown);
    }
  }
  var ann={};Object.keys(mesi[0]).forEach(function(k){ann[k]=mesi.reduce(function(s,m){return s+m[k];},0);});
  ann.itAnn=p.dcBase*8760;
  ann.pue=ann.grid/ann.itAnn;
  ann.co2Saved=ann.pv*CO2_FACTOR/1000;
  ann.co2Grid=ann.grid*CO2_FACTOR/1000;
  cache365={mesi,ann,giorni365};
  return cache365;
}

// ============================================================
// DIMENSIONAMENTO MACCHINA GHIACCIO E SERBATOIO
// Per ciascuna delle 4 stagioni calendariali, trova il giorno con il picco di
// ghiaccio accumulato più alto (caso peggiore reale, trovato scansionando i
// 365 giorni simulati) e calcola per quel giorno:
//  - la potenza macchina "diluita" (ghiaccio del giorno / ore di sole), cioè
//    la taglia minima di macchina che, spalmando la produzione sulle ore di
//    luce invece di un'impennata, copre comunque il fabbisogno del giorno;
//  - la potenza di picco istantaneo che si avrebbe senza diluizione, per
//    confronto;
//  - il volume di serbatoio richiesto (m³, dal picco di ghiaccio accumulato).
// ============================================================
function cumGiornoInizio(){
  var cum=1, out=[];
  for(var m=0;m<12;m++){ out.push(cum); cum+=GIORNI_MESE[m]; }
  return out;
}
var STAGIONI_DEF=[
  {nome:'Inverno', mesi:[11,0,1]},
  {nome:'Primavera', mesi:[2,3,4]},
  {nome:'Estate', mesi:[5,6,7]},
  {nome:'Autunno', mesi:[8,9,10]}
];
function calcolaDimensionamento(p){
  var res=simula365completa(p);
  var g=res.giorni365;
  var inizioMese=cumGiornoInizio();
  return STAGIONI_DEF.map(function(st){
    var giorniStagione=[];
    st.mesi.forEach(function(m){
      for(var d=0;d<GIORNI_MESE[m];d++) giorniStagione.push(inizioMese[m]+d);
    });
    var ggPeggiore=giorniStagione.reduce(function(best,gg){
      return (g.tankKg[gg-1]>g.tankKg[best-1])?gg:best;
    }, giorniStagione[0]);
    var day=simulaGiorno(ggPeggiore,p);
    var oreSole=day.hours.filter(function(r){return r.pvKw>0.5;}).length||1;
    var picchioKwTh=Math.max.apply(null, day.hours.map(function(r){return r.iceCharged;}));
    var picchioKwEl=Math.max.apply(null, day.hours.map(function(r){return r.chillerIceKw;}));
    var tankPiccoKwhTh=Math.max.apply(null, day.hours.map(function(r){return r.iceAvailable;}));
    var tankPiccoKg=tankPiccoKwhTh*1000/LATENTE_WH;
    return{
      nome:st.nome,
      gg:ggPeggiore,
      label:giornoLabel(ggPeggiore),
      ghiaccioGiornoKwhTh:day.totIceUp,
      oreSole:oreSole,
      potenzaDiluitaKwTh: day.totIceUp/oreSole,
      potenzaDiluitaKwEl: day.totChillerIce/oreSole,
      potenzaPiccoKwTh: picchioKwTh,
      potenzaPiccoKwEl: picchioKwEl,
      tankPiccoKwhTh: tankPiccoKwhTh,
      tankPiccoKg: tankPiccoKg,
      tankPiccoM3: tankPiccoKg/RHO_ICE
    };
  });
}
