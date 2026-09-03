// ============================================================
// TAB RETE
// ============================================================
function runRete(){
  var p=getParams();
  var res=simula365completa(p);
  var mesi=res.mesi,ann=res.ann;
  var selfSuffMese=mesi.map(function(m){return m.elec>0?(1-m.grid/m.elec)*100:0;});
  var selfSuffAnn=ann.elec>0?(1-ann.grid/ann.elec)*100:0;
  var role=selfSuffAnn>=70?'Alta autosufficienza':selfSuffAnn>=40?'Autosufficienza media':'Bassa autosufficienza';
  var roleColor=selfSuffAnn>=70?'var(--teal)':selfSuffAnn>=40?'var(--green)':'var(--amber)';
  var roleEmoji=selfSuffAnn>=70?'\ud83d\udd0b':selfSuffAnn>=40?'\u2696\ufe0f':'\ud83d\udce5';
  var costNoFV=(p.itKw*(1+p.servPct)+p.itKw/getEERreal(p.cop,15))*8760*p.gridPrice;
  var costNetto=ann.cost-ann.feedIn;
  var risparmio=costNoFV-costNetto;
  var meseEstivi=NOMI_MESE.filter(function(n,i){return isMesEstate(i);}).join(', ');
  document.getElementById('rete-content').innerHTML=
    '<div class="g3" style="margin-bottom:1rem;">'
    +'<div class="card" style="text-align:center;padding:24px;">'
    +'<div style="font-size:3rem;">'+roleEmoji+'</div>'
    +'<div style="font-size:1.3rem;font-weight:700;color:'+roleColor+';margin:6px 0;">'+role+'</div>'
    +'<div style="font-size:1.0rem;color:var(--text2);">'+itNum(selfSuffAnn,1)+'% dei consumi elettrici coperti da FV/ghiaccio, senza rete</div>'
    +'<div style="margin-top:6px;">Vendita in rete solo nei mesi estivi ('+meseEstivi+'), a tank saturo</div>'
    +'</div>'
    +'<div class="card">'
    +'<div class="ct">Bilancio economico annuo</div>'
    +'<div style="font-size:.92rem;color:var(--text2);line-height:2.1;">'
    +'Costo rete: <b style="color:var(--amber)">'+fE(ann.cost)+'</b><br>'
    +'Ricavo feed-in: <b style="color:var(--green)">'+fE(ann.feedIn)+'</b><br>'
    +'Costo netto: <b style="color:var(--red)">'+fE(costNetto)+'</b><br>'
    +'<hr style="margin:.4rem 0;">'
    +'Senza FV+ITES: <span style="color:var(--text3);text-decoration:line-through;">'+fE(costNoFV)+'</span><br>'
    +'<b>Risparmio annuo: <span style="color:var(--green);font-size:1.05rem;">'+fE(risparmio)+'</span></b><br>'
    +'<hr style="margin:.4rem 0;">'
    +'CO₂ evitata: <b style="color:var(--green)">'+itNum(Math.round(ann.co2Saved))+' t/anno</b><br>'
    +'CO₂ da rete: <b style="color:var(--red)">'+itNum(Math.round(ann.co2Grid))+' t/anno</b>'
    +'</div>'
    +'</div>'
    +'<div class="card">'
    +'<div class="ct">Effetto ITES sulla curva di carico</div>'
    +'<div style="font-size:.92rem;color:var(--text2);line-height:2.0;">'
    +'<span style="color:#39d353;font-weight:700;">&#9654;</span> <b>Ore centrali</b> (FV attivo): surplus → ghiaccio fino a coprire oggi+domani, poi (solo d\'estate) vendita in rete<br>'
    +'<span style="color:#a371f7;font-weight:700;">&#9654;</span> <b>Ore serali/notturne</b>: ghiaccio → cooling, evita sempre il prelievo da rete<br>'
    +'<span style="color:#39c8c8;font-weight:700;">&#9654;</span> <b>Inverno</b>: nessuna vendita, tutto il surplus resta ghiaccio<br>'
    +'<span style="color:var(--blue);font-weight:700;">&#9654;</span> <b>Effetto netto</b>: appiattimento della curva di carico, riduzione picchi'
    +'</div>'
    +'</div>'
    +'</div>'
    +'<div class="card" style="margin-bottom:1rem;">'
    +'<div class="ct">Autosufficienza energetica mensile (%) &mdash; quota di consumi coperta da FV/ghiaccio, senza rete</div>'
    +'<div class="cw" style="height:260px;"><canvas id="cNetGrid"></canvas></div>'
    +'</div>'
    +'<div class="g2" style="margin-bottom:1rem;">'
    +'<div class="card"><div class="ct">FV prodotto, prelievo e vendita rete (MWh/mese)</div><div class="cw" style="height:220px;"><canvas id="cFVvsRete"></canvas></div></div>'
    +'<div class="card"><div class="ct">CO₂ evitata vs emessa mensile (t)</div><div class="cw" style="height:220px;"><canvas id="cCO2"></canvas></div></div>'
    +'</div>';
    destroyC('cNetGrid');
  charts['cNetGrid']=new Chart(document.getElementById('cNetGrid'),{type:'bar',data:{labels:NOMI_MESE,datasets:[{label:'Autosufficienza (%)',data:selfSuffMese.map(function(n){return +n.toFixed(1);}),backgroundColor:selfSuffMese.map(function(n){return n>=70?'rgba(57,211,83,.55)':n>=40?'rgba(227,179,65,.55)':'rgba(248,81,73,.5)';}),borderColor:selfSuffMese.map(function(n){return n>=70?'#39d353':n>=40?'#e3b341':'#f85149';}),borderWidth:1,borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:function(ctx){return 'Autosufficienza: '+itNum(ctx.raw,1)+'%';}}}},scales:{x:{grid:{display:false},ticks:{color:'#718096',font:{size:12}}},y:{min:0,max:100,grid:{color:'rgba(0,0,0,0.06)'},ticks:{color:'#718096',font:{size:11}},title:{display:true,text:'%',color:'#718096',font:{size:11}}}}}});
  destroyC('cFVvsRete');
  charts['cFVvsRete']=new Chart(document.getElementById('cFVvsRete'),{type:'bar',data:{labels:NOMI_MESE,datasets:[{label:'FV prodotto',data:res.mesi.map(function(m){return +(m.pv/1000).toFixed(1);}),backgroundColor:'rgba(57,211,83,.5)',borderColor:'#39d353',borderWidth:1,borderRadius:3},{label:'Prelievo rete',data:res.mesi.map(function(m){return +(m.grid/1000).toFixed(1);}),backgroundColor:'rgba(227,179,65,.4)',borderColor:'#e3b341',borderWidth:1,borderRadius:3},{label:'Venduto rete',data:res.mesi.map(function(m){return +(m.pvToGrid/1000).toFixed(1);}),backgroundColor:'rgba(88,166,255,.4)',borderColor:'#58a6ff',borderWidth:1,borderRadius:3}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,labels:{color:'#4a5568',font:{size:11},boxWidth:12}}},scales:{x:{grid:{display:false},ticks:{color:'#718096',font:{size:12}}},y:{grid:{color:'rgba(0,0,0,0.06)'},ticks:{color:'#718096',font:{size:11}},title:{display:true,text:'MWh',color:'#718096',font:{size:11}}}}}});
  destroyC('cCO2');
  charts['cCO2']=new Chart(document.getElementById('cCO2'),{type:'bar',data:{labels:NOMI_MESE,datasets:[{label:'CO\u2082 evitata (t)',data:res.mesi.map(function(m){return +(m.pv/1000*CO2_FACTOR).toFixed(1);}),backgroundColor:'rgba(57,211,83,.5)',borderColor:'#39d353',borderWidth:1,borderRadius:3},{label:'CO\u2082 da rete (t)',data:res.mesi.map(function(m){return +(m.grid/1000*CO2_FACTOR).toFixed(1);}),backgroundColor:'rgba(248,81,73,.4)',borderColor:'#f85149',borderWidth:1,borderRadius:3}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,labels:{color:'#4a5568',font:{size:11},boxWidth:12}}},scales:{x:{grid:{display:false},ticks:{color:'#718096',font:{size:12}}},y:{grid:{color:'rgba(0,0,0,0.06)'},ticks:{color:'#718096',font:{size:11}},title:{display:true,text:'t CO\u2082',color:'#718096',font:{size:11}}}}}});
}

// ============================================================
// TAB COP
// ============================================================
function runCOP(){
  var p=getParams();
  var tempData=[];for(var t=-5;t<=40;t++)tempData.push({t,eer:getEER(p.cop,t),copIce:getCOPice(p.cop,t)});
  // Calcola valori stagionali per il sito (EER di impianto, con ausiliari, per il kW_el reale)
  var eerEstate=getEER(p.cop,TEMP_MEDIE[6]), eerInverno=getEER(p.cop,TEMP_MEDIE[0]);
  var eerEstateReal=getEERreal(p.cop,TEMP_MEDIE[6]), eerInvernoReal=getEERreal(p.cop,TEMP_MEDIE[0]);
  var chillerEstate=Math.round(p.dcBase/eerEstateReal), chillerInverno=Math.round(p.dcBase/eerInvernoReal);
  var kgPerKwhEstate=getCOPiceReal(p.cop,TEMP_MEDIE[6])*1000/LATENTE_WH;
  var kgPerKwhInverno=getCOPiceReal(p.cop,TEMP_MEDIE[0])*1000/LATENTE_WH;

  document.getElementById('cop-content').innerHTML=
    '<div class="ibar ibar-g" style="margin-bottom:1rem;font-size:.92rem;">'
    +'<b>Principio fondamentale:</b> 1 kWh_el in un server = 1 kWh_th di calore (100%). '
    +'Il chiller consuma kWh_el per <em>spostare</em> il calore. Con EER compressore='+itNum(p.cop,1)+', il kW_el <b>reale</b> assorbito dalla centrale (compressore + ausiliari, +25%) usa l\'EER di impianto = '+itNum(p.cop/(1+CHILLER_AUX_OVERHEAD),2)+'. '
    +'<b>Soglia di degradazione: 15°C</b> — sopra questa temperatura l\'EER cala del 2%/°C.'
    +'</div>'
    +'<div class="g2" style="margin-bottom:1rem;">'
    +'<div class="card">'
    +'<div class="ct">EER/COP vs Temperatura Esterna &mdash; soglia degradazione 15°C</div>'
    +'<div class="cw" style="height:260px;"><canvas id="cCOP"></canvas></div>'
    +'<div style="font-size:.85rem;color:var(--text3);margin-top:6px;line-height:1.7;">'
    +'<span style="color:var(--blue);font-weight:700;">▏ 15°C</span> = soglia di progetto &nbsp;·&nbsp; '
    +'Inverno Gen ('+TEMP_MEDIE[0]+'°C): EER <b style="color:var(--green);">'+itNum(eerInverno,2)+'</b> &nbsp;·&nbsp; '
    +'Estate Lug ('+TEMP_MEDIE[6]+'°C): EER <b style="color:var(--amber);">'+itNum(eerEstate,2)+'</b>'
    +'</div>'
    +'</div>'
    +'<div class="card">'
    +'<div class="ct">Catena energetica IT &rarr; Calore &rarr; Chiller</div>'
    +'<div style="font-size:.88rem;color:var(--text2);line-height:1.7;margin-bottom:.7rem;">'
    +'Tutta l\'energia elettrica dei server diventa calore (100%). Il chiller la sposta fuori con un moltiplicatore EER che varia con la temperatura esterna.'
    +'</div>'
    +'<div class="formula">Q_calore = P_IT &times; 1h &nbsp;&nbsp;(100%, fisicamente esatto)</div>'
    +'<div class="formula">P_chiller_el = Q_calore / EER_impianto(T_ext) &nbsp;&nbsp;EER_impianto = EER_compressore / 1,25</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin:.8rem 0;">'
    +'<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:var(--r);padding:.6rem .8rem;font-size:.88rem;">'
    +'<div style="font-weight:700;color:var(--green);margin-bottom:4px;">⛄ Inverno — Gen ('+TEMP_MEDIE[0]+'°C)</div>'
    +'EER compressore = <b>'+itNum(eerInverno,2)+'</b> &middot; impianto = <b>'+itNum(eerInvernoReal,2)+'</b><br>'
    +itNum(p.dcBase)+' kW_IT &rarr; <b>'+chillerInverno+' kW_el</b> chiller (reale)<br>'
    +'1 kWh_el surplus &rarr; <b>'+itNum(kgPerKwhInverno,1)+' kg</b> ghiaccio/h'
    +'</div>'
    +'<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:var(--r);padding:.6rem .8rem;font-size:.88rem;">'
    +'<div style="font-weight:700;color:var(--amber);margin-bottom:4px;">☀️ Estate — Lug ('+TEMP_MEDIE[6]+'°C)</div>'
    +'EER compressore = <b>'+itNum(eerEstate,2)+'</b> &middot; impianto = <b>'+itNum(eerEstateReal,2)+'</b><br>'
    +itNum(p.dcBase)+' kW_IT &rarr; <b>'+chillerEstate+' kW_el</b> chiller (reale)<br>'
    +'1 kWh_el surplus &rarr; <b>'+itNum(kgPerKwhEstate,1)+' kg</b> ghiaccio/h'
    +'</div>'
    +'</div>'
    +'<div style="font-size:.90rem;color:var(--text3);line-height:1.6;">'
    +'COP_ice = EER &times; 0,85 &nbsp;·&nbsp; EER/COP impianto = EER/COP compressore / 1,25 (ausiliari) &nbsp;·&nbsp; Degrado: &minus;2%/°C sopra 15°C &nbsp;·&nbsp; Sito Bellocchi: T media annua ≈ 14°C'
    +'</div>'
    +'</div>'
    +'<div class="card"><div class="ct">EER/COP medio mensile</div><div class="cw" style="height:200px;"><canvas id="cCOPmese"></canvas></div></div>'
    +'<div class="card">'
    +'<div class="ct">Conversione kWh_el &harr; kWh_th per mese</div>'
    +'<table><thead><tr><th>Mese</th><th>T° med</th><th>EER compressore</th><th>EER impianto</th><th>COP_ice impianto</th><th>1 kWh_el &rarr; kg ghiaccio</th></tr></thead><tbody>'
    +TEMP_MEDIE.map(function(t,m){
      var eer=getEER(p.cop,t),eerR=getEERreal(p.cop,t),ciR=getCOPiceReal(p.cop,t);
      var kgPerKwh=ciR*1000/LATENTE_WH;
      var deg=t>15;
      return '<tr style="'+(deg?'background:#fff7ed;':'')+'">'
        +'<td>'+NOMI_MESE[m]+'</td>'
        +'<td>'+(deg?'<b style="color:var(--amber)">':'')+t+'°C'+(deg?'</b>':'')+'</td>'
        +'<td style="color:'+(deg?'var(--amber)':'var(--green)')+'"><b>'+itNum(eer,2)+'</b></td>'
        +'<td style="color:var(--teal)">'+itNum(eerR,2)+'</td>'
        +'<td style="color:var(--blue)">'+itNum(ciR,2)+'</td>'
        +'<td style="color:var(--teal)">'+itNum(kgPerKwh,1)+' kg</td>'
        +'</tr>';
    }).join('')
    +'</tbody></table>'
    +'<div style="font-size:.90rem;color:var(--text3);margin-top:5px;">'
    +'<span style="background:#fff7ed;padding:1px 6px;border-radius:3px;border:1px solid #fed7aa;">arancio</span> = mesi con T &gt; 15°C, EER degradato rispetto al nominale'
    +'</div>'
    +'</div>'
    +'</div>';
  destroyC('cCOP');
  var idx15=tempData.findIndex(function(d){return d.t===15;});
  charts['cCOP']=new Chart(document.getElementById('cCOP'),{type:'line',data:{labels:tempData.map(function(d){return d.t+'\u00b0C';}),datasets:[
    {label:'EER Cooling',data:tempData.map(function(d){return d.eer;}),borderColor:'#39d353',backgroundColor:'rgba(57,211,83,.08)',fill:true,tension:.3,pointRadius:0,borderWidth:2},
    {label:'COP Ice (x0.85)',data:tempData.map(function(d){return d.copIce;}),borderColor:'#39c8c8',backgroundColor:'rgba(57,200,200,.08)',fill:true,tension:.3,pointRadius:0,borderWidth:2}
  ]},options:{responsive:true,maintainAspectRatio:false,
    plugins:{legend:{display:true,labels:{color:'#4a5568',font:{size:11},boxWidth:12}}},
    scales:{
      x:{
        grid:{color:function(ctx){return ctx.tick&&ctx.tick.label==='15\u00b0C'?'rgba(29,111,184,0.7)':'rgba(0,0,0,0.04)';},lineWidth:function(ctx){return ctx.tick&&ctx.tick.label==='15\u00b0C'?2:1;}},
        ticks:{color:function(ctx){return ctx.tick&&ctx.tick.label==='15\u00b0C'?'#1d6fb8':'#718096';},font:{size:11},autoSkip:true,maxTicksLimit:10}
      },
      y:{min:0,max:7,grid:{color:'rgba(0,0,0,0.06)'},ticks:{color:'#718096',font:{size:11}}}
    }
  }});
  destroyC('cCOPmese');
  charts['cCOPmese']=new Chart(document.getElementById('cCOPmese'),{type:'bar',data:{labels:NOMI_MESE,datasets:[{label:'EER medio',data:TEMP_MEDIE.map(function(t){return +getEER(p.cop,t).toFixed(2);}),backgroundColor:'rgba(57,211,83,.5)',borderColor:'#39d353',borderWidth:1,borderRadius:3},{label:'COP ice medio',data:TEMP_MEDIE.map(function(t){return +getCOPice(p.cop,t).toFixed(2);}),backgroundColor:'rgba(57,200,200,.5)',borderColor:'#39c8c8',borderWidth:1,borderRadius:3}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,labels:{color:'#4a5568',font:{size:11},boxWidth:12}}},scales:{x:{grid:{display:false},ticks:{color:'#718096',font:{size:12}}},y:{min:0,grid:{color:'rgba(0,0,0,0.06)'},ticks:{color:'#718096',font:{size:11}}}}}});
}

// ============================================================
// TAB PROFILI ANNUALI — con tabella 365 giorni
// ============================================================
function runProfili(){
  var p=getParams();var res=simula365completa(p);var mesi=res.mesi,ann=res.ann;
  var dimAnno=calcolaDimensionamento(p);
  var machineKwElAnno=Math.max.apply(null, dimAnno.map(function(s){return s.potenzaDiluitaKwEl;}));
  var tankM3Anno=Math.max.apply(null, dimAnno.map(function(s){return s.tankPiccoM3;}));
  var tankKgAnno=Math.max.apply(null, dimAnno.map(function(s){return s.tankPiccoKg;}));
  var stagionePeggiore=dimAnno.reduce(function(best,s){return s.tankPiccoKg>best.tankPiccoKg?s:best;},dimAnno[0]);
  document.getElementById('profili-content').innerHTML=
    '<div class="g4" style="margin-bottom:1rem;">'
    +'<div class="card kpi"><div class="kv" style="color:var(--red)">'+fN(ann.cooling/1000)+'</div><div class="ku">MWh_th/a</div><div class="kl">Cooling</div></div>'
    +'<div class="card kpi"><div class="kv" style="color:var(--green)">'+fN(ann.pv/1000)+'</div><div class="ku">MWh_el/a</div><div class="kl">FV</div></div>'
    +'<div class="card kpi"><div class="kv" style="color:var(--amber)">'+fN(ann.grid/1000)+'</div><div class="ku">MWh_el/a</div><div class="kl">Rete</div></div>'
    +'<div class="card kpi"><div class="kv" style="color:var(--teal)">'+fN(ann.iceUp/1000)+'</div><div class="ku">MWh_th/a</div><div class="kl">Ghiaccio prod.</div></div>'
    +'</div>'
    +'<div class="card" style="margin-bottom:1rem;border:1.5px solid var(--teal);">'
    +'<div class="ct" style="color:var(--teal);">Dimensionamento consigliato — macchina ghiaccio e serbatoio</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:1.2rem;">'
    +'<div class="kpi" style="padding:.4rem;"><div class="kv" style="color:var(--teal);">'+itNum(machineKwElAnno,1)+'</div><div class="ku">kW_el</div><div class="kl">Potenza macchina ghiaccio</div></div>'
    +'<div class="kpi" style="padding:.4rem;"><div class="kv" style="color:var(--teal);">'+itNum(tankM3Anno,1)+'</div><div class="ku">m&sup3; ('+itNum(tankKgAnno)+' kg)</div><div class="kl">Volume serbatoio</div></div>'
    +'</div>'
    +'<div style="font-size:1.0rem;color:var(--text3);margin-top:.6rem;">Basato sul giorno con il picco di ghiaccio più alto trovato scansionando i 365 giorni simulati &mdash; caso peggiore: <b>'+stagionePeggiore.nome+', '+stagionePeggiore.label+'</b>. Dettaglio per stagione e ipotesi di calcolo nel tab CAPEX / OPEX.</div>'
    +'</div>'
    +'<div class="g2" style="margin-bottom:1rem;">'
    +'<div class="card"><div class="ct">Cooling &amp; Fonti mensili (MWh)</div><div class="cw" style="height:250px;"><canvas id="cMensile"></canvas></div></div>'
    +'<div class="card"><div class="ct">Ghiaccio prodotto e usato mensile (MWh_th)</div><div class="cw" style="height:250px;"><canvas id="cGhiaccioMensile"></canvas></div></div>'
    +'</div>'
    +'<div class="card" style="margin-bottom:1rem;">'
    +'<div class="ct">Tabella mensile riepilogativa</div>'
    +'<div style="overflow-x:auto;"><table><thead><tr>'
    +'<th>Mese</th><th>T\u00b0 med</th><th>FV (MWh_el)</th><th>Cooling (MWh_th)</th><th>Cool da FV (MWh_th)</th>'
    +'<th>Ghiaccio \u2191 (MWh_th)</th><th>Ghiaccio \u2193 (MWh_th)</th><th>Rete (MWh_el)</th><th>Costo (k\u20ac)</th><th>CO\u2082 ev. (t)</th>'
    +'</tr></thead><tbody>'
    +mesi.map(function(m,i){return '<tr><td>'+NOMI_MESE[i]+'</td><td>'+TEMP_MEDIE[i]+'\u00b0C</td><td>'+fN1(m.pv/1000)+'</td><td style="color:var(--red)">'+fN1(m.cooling/1000)+'</td><td style="color:var(--green)">'+fN1(m.coolPv/1000)+'</td><td style="color:var(--teal)">'+fN1(m.iceUp/1000)+'</td><td style="color:var(--purple)">'+fN1(m.iceDown/1000)+'</td><td style="color:var(--amber)">'+fN1(m.grid/1000)+'</td><td>'+fN1(m.cost/1000)+'</td><td style="color:var(--green)">'+fN1(m.pv/1000*CO2_FACTOR)+'</td></tr>';}).join('')
    +'<tr style="border-top:2px solid var(--border2);font-weight:600;"><td>TOTALE</td><td>\u2014</td><td>'+fN(ann.pv/1000)+'</td><td style="color:var(--red)">'+fN(ann.cooling/1000)+'</td><td style="color:var(--green)">'+fN(ann.coolPv/1000)+'</td><td style="color:var(--teal)">'+fN(ann.iceUp/1000)+'</td><td style="color:var(--purple)">'+fN(ann.iceDown/1000)+'</td><td style="color:var(--amber)">'+fN(ann.grid/1000)+'</td><td>'+fN(ann.cost/1000)+'</td><td style="color:var(--green)">'+itNum(ann.co2Saved,1)+'</td></tr>'
    +'</tbody></table></div></div>'
    // ─── TABELLA 365 GIORNI ───
    +'<div class="card" style="margin-bottom:1rem;">'
    +'<div class="ct">Previsione giorno per giorno &mdash; 365 giorni</div>'
    +'<div class="ibar" style="margin-bottom:.8rem;font-size:1.0rem;">'
    +'<b>Lettura:</b> ogni riga = 1 giorno. '
    +'<span style="color:#f85149;">IT</span> = consumo rack &middot; '
    +'<span style="color:#39d353;">FV</span> = produzione solare &middot; '
    +'<span style="color:#e3b341;">Rete</span> = prelievo dalla rete &middot; '
    +'<span style="color:#58a6ff;">Feed-in</span> = energia venduta (solo mesi estivi, a tank saturo) &middot; '
    +'<span style="color:#39c8c8;">Ghiaccio</span> = energia termica accumulata &middot; '
    +'<span style="color:var(--amber);">Costo</span> = costo netto rete. '
    +'</div>'
    +'<div class="tbl365-wrap" id="tbl365-container">'
    +'<div style="text-align:center;padding:2rem;color:var(--text3);">Calcolo in corso\u2026</div>'
    +'</div></div>';

  // Grafici mensili
  destroyC('cMensile');
  charts['cMensile']=new Chart(document.getElementById('cMensile'),{type:'bar',data:{labels:NOMI_MESE,datasets:[{label:'Cooling (MWh_th)',data:mesi.map(function(m){return +(m.cooling/1000).toFixed(1);}),backgroundColor:'rgba(248,81,73,.3)',borderColor:'#f85149',borderWidth:1,borderRadius:3},{label:'Cool da FV (MWh_th)',data:mesi.map(function(m){return +(m.coolPv/1000).toFixed(1);}),backgroundColor:'rgba(57,211,83,.4)',borderColor:'#39d353',borderWidth:1,borderRadius:3},{label:'Rete (MWh_el)',data:mesi.map(function(m){return +(m.grid/1000).toFixed(1);}),backgroundColor:'rgba(227,179,65,.3)',borderColor:'#e3b341',borderWidth:1,borderRadius:3}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,labels:{color:'#4a5568',font:{size:11},boxWidth:12}}},scales:{x:{grid:{display:false},ticks:{color:'#718096',font:{size:12}}},y:{grid:{color:'rgba(0,0,0,0.06)'},ticks:{color:'#718096',font:{size:11},callback:function(v){return itNum(v,1);}}}}}});
  destroyC('cGhiaccioMensile');
  charts['cGhiaccioMensile']=new Chart(document.getElementById('cGhiaccioMensile'),{type:'bar',data:{labels:NOMI_MESE,datasets:[{label:'Ghiaccio prodotto (MWh_th)',data:mesi.map(function(m){return +(m.iceUp/1000).toFixed(1);}),backgroundColor:'rgba(57,200,200,.55)',borderColor:'#39c8c8',borderWidth:1,borderRadius:4},{label:'Ghiaccio usato (MWh_th)',data:mesi.map(function(m){return +(m.iceDown/1000).toFixed(1);}),backgroundColor:'rgba(163,113,247,.4)',borderColor:'#a371f7',borderWidth:1,borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,labels:{color:'#4a5568',font:{size:11},boxWidth:12}}},scales:{x:{grid:{display:false},ticks:{color:'#718096',font:{size:12}}},y:{grid:{color:'rgba(0,0,0,0.06)'},ticks:{color:'#718096',font:{size:11},callback:function(v){return itNum(v,1);}}}}}});

  // Costruisce tabella 365 giorni in modo asincrono per non bloccare il render
  setTimeout(function(){
    var g=res.giorni365;
    var thead365='<table class="tbl365"><thead><tr>'
      +'<th style="text-align:left;">Giorno</th>'
      +'<th style="color:#f85149;">IT<br><span style="font-weight:400;font-size:.88rem;">(kWh_el)</span></th>'
      +'<th style="color:#39d353;">FV<br><span style="font-weight:400;font-size:.88rem;">(kWh_el)</span></th>'
      +'<th style="color:#ff6b35;">Cooling<br><span style="font-weight:400;font-size:.88rem;">(kWh_th)</span></th>'
      +'<th style="color:#39c8c8;">Ghiaccio↑<br><span style="font-weight:400;font-size:.88rem;">(kWh_th)</span></th>'
      +'<th style="color:#a371f7;">Ghiaccio↓<br><span style="font-weight:400;font-size:.88rem;">(kWh_th)</span></th>'
      +'<th style="color:#e3b341;">Rete<br><span style="font-weight:400;font-size:.88rem;">(kWh_el)</span></th>'
      +'<th style="color:#58a6ff;">Feed-in<br><span style="font-weight:400;font-size:.88rem;">(kWh_el)</span></th>'
      +'<th style="color:#1a202c;">Tot. consumi<br><span style="font-weight:400;font-size:.88rem;">(kWh_el)</span></th>'
      +'<th style="color:var(--amber);">Costo<br><span style="font-weight:400;font-size:.88rem;">(&euro;/gg)</span></th>'
      +'<th>PUE</th>'
      +'</tr></thead><tbody>';

    var rows365='';
    var gg=0;
    var prevMese=-1;
    for(var m=0;m<12;m++){
      for(var d=0;d<GIORNI_MESE[m];d++){
        var itKwh=Math.round(p.dcBase*24);
        var pv=Math.round(g.pv[gg]);
        var cool=Math.round(g.cooling[gg]);
        var iceUp=Math.round(g.iceUp[gg]);
        var iceDown=Math.round(g.iceDown[gg]);
        var grid=Math.round(g.grid[gg]);
        var pvToGrid=Math.round(g.pvToGrid[gg]);
        var elec=Math.round(g.elec[gg]);
        var cost=g.cost[gg];
        var pueV=g.pue[gg];
        var isNewMonth=m!==prevMese;
        var trClass=isNewMonth?' class="month-sep"':'';
        prevMese=m;
        rows365+='<tr'+trClass+'>'
          +'<td>'+giornoLabel(gg+1)+'</td>'
          
          +'<td style="color:#f85149;">'+itNum(itKwh)+'</td>'
          +'<td style="color:#39d353;">'+(pv>0?itNum(pv):'<span style="color:var(--text3);">0</span>')+'</td>'
          +'<td style="color:#ff6b35;">'+itNum(cool)+'</td>'
          +'<td style="color:#39c8c8;">'+(iceUp>0?itNum(iceUp):'<span style="color:var(--text3);">—</span>')+'</td>'
          +'<td style="color:#a371f7;">'+(iceDown>0?itNum(iceDown):'<span style="color:var(--text3);">—</span>')+'</td>'
          +'<td style="color:#e3b341;">'+itNum(grid)+'</td>'
          +'<td style="color:#58a6ff;">'+(pvToGrid>0?itNum(pvToGrid):'<span style="color:var(--text3);">0</span>')+'</td>'
          +'<td style="color:#1a202c;font-weight:600;">'+itNum(elec)+'</td>'
          +'<td style="color:var(--amber);">'+itNum(cost,2)+'</td>'
          +'<td>'+itNum(pueV,2)+'</td>'
          +'</tr>';
        gg++;
      }
    }

    // Riga totale annuale
    var totIT=Math.round(p.dcBase*24*365);
    var totPV=Math.round(g.pv.reduce(function(a,b){return a+b;},0));
    var totCool=Math.round(g.cooling.reduce(function(a,b){return a+b;},0));
    var totIceUp=Math.round(g.iceUp.reduce(function(a,b){return a+b;},0));
    var totIceDown=Math.round(g.iceDown.reduce(function(a,b){return a+b;},0));
    var totGrid=Math.round(g.grid.reduce(function(a,b){return a+b;},0));
    var totPvToGrid=Math.round(g.pvToGrid.reduce(function(a,b){return a+b;},0));
    var totElec=Math.round(g.elec.reduce(function(a,b){return a+b;},0));
    var totCost=g.cost.reduce(function(a,b){return a+b;},0);
    var avgPue=g.pue.reduce(function(a,b){return a+b;},0)/g.pue.length;

    rows365+='<tr style="border-top:3px solid var(--border2);background:#f0f4f8;font-weight:700;">'
      +'<td style="font-family:\'IBM Plex Sans\',sans-serif;font-weight:700;">ANNO (12 mesi)</td>'
      
      +'<td style="color:#f85149;">'+itNum(totIT)+'</td>'
      +'<td style="color:#39d353;">'+itNum(totPV)+'</td>'
      +'<td style="color:#ff6b35;">'+itNum(totCool)+'</td>'
      +'<td style="color:#39c8c8;">'+itNum(totIceUp)+'</td>'
      +'<td style="color:#a371f7;">'+itNum(totIceDown)+'</td>'
      +'<td style="color:#e3b341;">'+itNum(totGrid)+'</td>'
      +'<td style="color:#58a6ff;">'+itNum(totPvToGrid)+'</td>'
      +'<td style="color:#1a202c;">'+itNum(totElec)+'</td>'
      +'<td style="color:var(--amber);">'+fN2(totCost)+'</td>'
      +'<td>'+itNum(avgPue,2)+'</td>'
      +'</tr>';

    document.getElementById('tbl365-container').innerHTML=thead365+rows365+'</tbody></table>';
  }, 150);
}

// ============================================================
// TAB HEATMAP
// ============================================================
function runHeatmap(){
  var p=getParams(),res=simula365completa(p),g=res.giorni365;

  function buildHM(data,title,colorFn,unitLabel,subtitle){
    var maxV=Math.max.apply(null,data),minV=Math.min.apply(null,data);

    // Una riga per mese — etichetta a sinistra, celle a destra
    var rows='';
    var gg=0;
    for(var m=0;m<12;m++){
      var nDays=GIORNI_MESE[m];
      var cells='';
      for(var d=0;d<nDays;d++){
        var v=data[gg+d];
        cells+='<div style="flex:0 0 auto;width:calc((100% - 48px) / 31);max-width:28px;min-width:10px;aspect-ratio:1;border-radius:2px;background:'+colorFn(v,minV,maxV)+'" title="'+NOMI_MESE_FULL[m]+' '+(d+1)+' — '+unitLabel+': '+itNum(Math.round(v))+'"></div>';
      }
      // Pad with empty cells to align all rows to 31 days
      for(var d2=nDays;d2<31;d2++){
        cells+='<div style="flex:0 0 auto;width:calc((100% - 48px) / 31);max-width:28px;min-width:10px;aspect-ratio:1;"></div>';
      }
      rows+='<div style="display:flex;align-items:center;gap:3px;margin-bottom:3px;">'
        +'<div style="width:28px;flex-shrink:0;font-size:.85rem;font-weight:700;color:var(--text2);text-align:right;padding-right:4px;">'+NOMI_MESE[m]+'</div>'
        +'<div style="display:flex;gap:2px;flex:1;">'+cells+'</div>'
        +'</div>';
      gg+=nDays;
    }

    // Numbering header 1..31
    var numHeader='<div style="display:flex;align-items:center;gap:3px;margin-bottom:4px;">'
      +'<div style="width:28px;flex-shrink:0;"></div>'
      +'<div style="display:flex;gap:2px;flex:1;">';
    for(var d3=1;d3<=31;d3++){
      numHeader+='<div style="flex:0 0 auto;width:calc((100% - 0px) / 31);max-width:28px;min-width:10px;text-align:center;font-size:.75rem;color:var(--text3);">'+(d3%5===1||d3===31?d3:'')+'</div>';
    }
    numHeader+='</div></div>';

    return '<div class="card" style="margin-bottom:1rem;">'
      +'<div class="ct">'+title+'</div>'
      +'<div style="font-size:1.0rem;color:var(--text3);margin-bottom:8px;">'+subtitle+'</div>'
      +'<div style="overflow-x:auto;">'
        +numHeader
        +rows
      +'</div>'
      +'<div style="display:flex;gap:6px;align-items:center;margin-top:8px;">'
        +'<div style="width:80px;height:7px;background:linear-gradient(90deg,'+colorFn(minV,minV,maxV)+','+colorFn(maxV,minV,maxV)+');border-radius:3px;"></div>'
        +'<span style="font-size:.9rem;color:var(--text3);">'+itNum(Math.round(minV))+' — '+itNum(Math.round(maxV))+' '+unitLabel+'</span>'
      +'</div>'
      +'</div>';
  }

  function costColor(v,mn,mx){var t=Math.max(0,Math.min(1,(v-mn)/(mx-mn+0.001)));return 'rgba('+(Math.round(57+t*191))+','+(Math.round(211-t*162))+','+(Math.round(83-t*34))+',0.8)';}
  function pvColor(v,mn,mx){var t=Math.max(0,Math.min(1,(v-mn)/(mx-mn+0.001)));return 'rgba('+(Math.round(57+t*180))+','+(Math.round(100+t*111))+','+Math.round(57*t)+',0.8)';}
  function kgColor(v,mn,mx){var t=Math.max(0,Math.min(1,(v-mn)/(mx-mn+0.001)));return 'rgba('+Math.round(14+t*43)+','+(Math.round(116+t*84))+','+(Math.round(144-t*44))+',0.9)';}

  document.getElementById('heatmap-content').innerHTML=
    '<div class="ibar ibar-g" style="margin-bottom:1rem;"><b>Ogni cella = 1 giorno.</b> 12 righe = 12 mesi, 31 colonne = giorni del mese. Passa il cursore per il valore esatto.</div>'
    +buildHM(g.tankKg,'Kg ghiaccio carry-over (fine giornata)',kgColor,'kg',
      'Blu scuro = più ghiaccio residuo. In estate il surplus FV è abbondante; in inverno il carry-over è minimo.')
    +buildHM(g.cost,'Costo Giornaliero Rete (€)',costColor,'€',
      'Verde = costo basso (FV abbondante) · Rosso = costo alto (poca produzione solare)')
    +buildHM(g.pv,'Produzione FV Giornaliera (kWh_el)',pvColor,'kWh',
      'Più chiaro/giallo = più produzione · Verde scuro = produzione bassa (inverno)');
}

// ============================================================
// TAB CAPEX
// ============================================================
function calcIRR(cashflows){
  // Se tutti i flussi post-anno 0 sono negativi, IRR non esiste
  var hasPositive=cashflows.slice(1).some(function(cf){return cf>0;});
  if(!hasPositive) return NaN;
  var r=0.10;
  for(var i=0;i<100;i++){
    var npv=0,dnpv=0;
    cashflows.forEach(function(cf,t){npv+=cf/Math.pow(1+r,t);dnpv+=-t*cf/Math.pow(1+r,t+1);});
    if(Math.abs(dnpv)<1e-10)break;
    var r2=r-npv/dnpv;
    if(!isFinite(r2)||r2<-0.99)return NaN;
    if(Math.abs(r2-r)<1e-6){r=r2;break;}
    r=r2;
  }
  return r;
}
function calcNPV(cashflows,rate){return cashflows.reduce(function(s,cf,t){return s+cf/Math.pow(1+rate,t);},0);}

function runCapex(){
  var p=getParams(),res=simula365completa(p),ann=res.ann;
  var fvcostPct=parseFloat(document.getElementById('r-fvcost').value)||0;
  var gridvarPct=parseFloat(document.getElementById('r-gridvar').value)||0;
  document.getElementById('v-fvcost').textContent=(fvcostPct>0?'+':'')+fvcostPct+' %';
  document.getElementById('v-gridvar').textContent=(gridvarPct>0?'+':'')+gridvarPct+' %';
  var hostingFee=parseFloat(document.getElementById('r-hosting').value)||0.12;
  document.getElementById('v-hosting').textContent=itNum(hostingFee,2)+' \u20ac/kWh';
  var nMacchine=parseInt(document.getElementById('r-nmacchine').value)||1;
  var fvCost=850*(1+fvcostPct/100);

  // Dimensionamento macchina ghiaccio (giorno peggiore per stagione) + multi-macchina
  var dimensionamento=calcolaDimensionamento(p);
  var machineKwElRichiesta=Math.max.apply(null, dimensionamento.map(function(s){return s.potenzaDiluitaKwEl;}));
  var tankM3Consigliato=Math.max.apply(null, dimensionamento.map(function(s){return s.tankPiccoM3;}));
  var tankKgConsigliato=Math.max.apply(null, dimensionamento.map(function(s){return s.tankPiccoKg;}));
  var machineKwElTotale=nMacchine>1 ? machineKwElRichiesta*nMacchine/(nMacchine-1) : machineKwElRichiesta;
  var machineKwElPerUnita=machineKwElTotale/nMacchine;
  var overheadMultiUnita=1+0.04*(nMacchine-1); // +4% per unit\u00e0 oltre la prima (tubazioni, valvole, BMS extra)
  var costoMacchinaGhiaccio=machineKwElTotale*400*overheadMultiUnita;

  var capex={};
  capex['Impianto FV interna ('+fN(p.kwpInterno)+' kWp)']=p.kwpInterno*fvCost;
  capex['Chiller/PdC ('+fN(p.heatKw)+' kW_th \u00d7 350)']=p.heatKw*350;
  capex['Macchina ghiaccio ('+nMacchine+'\u00d7'+fN(machineKwElPerUnita)+' kW_el \u00d7 400)']=costoMacchinaGhiaccio;
  capex['Distribuzione cooling (CDU, tubazioni)']=p.nRack*2500;
  capex['Adattamento capannone ex-frigo']=350000;
  capex['Infrastruttura elettrica']=p.itKw*180;
  capex['Rack + cablaggio']=p.nRack*4500;
  capex['BMS / Monitoring']=85000;
  capex['Ingegneria e permessi']=120000;
  var urbCostM2=parseFloat(document.getElementById('r-urbcost').value)||0;
  document.getElementById('v-urbcost').textContent=urbCostM2+' €/m²';
  capex['Oneri di urbanizzazione a scomputo ('+fN(p.supLotto)+' m² × '+urbCostM2+')']=p.supLotto*urbCostM2;
  var capexTot=Object.values(capex).reduce(function(a,b){return a+b;},0);
  var annCostAdj=ann.cost*(1+gridvarPct/100);
  var opex={};
  opex['Energia elettrica rete'+(gridvarPct!==0?' (var. '+gridvarPct+'%)':'')]=annCostAdj;
  opex['Manutenzione FV interna']=p.kwpInterno*12;
  opex['Manutenzione cooling']=p.heatKw*15;
  opex['Manutenzione generale (1.5%)']=capexTot*0.015;
  opex['Assicurazione (0.5%)']=capexTot*0.005;
  opex['Personale (3 FTE)']=180000;
  var opexTot=Object.values(opex).reduce(function(a,b){return a+b;},0);
  var itKwCapex=p.nRack*p.rack.kw;
  var revenue=itKwCapex*hostingFee*8760;
  var gridServ=ann.feedIn;
  var revTot=revenue+gridServ;
  var cashflow=revTot-opexTot;
  var payback=cashflow>0?(capexTot/cashflow):Infinity;
  var cfArr=[-capexTot];
  for(var y=1;y<=20;y++)cfArr.push(cashflow*Math.pow(1.02,y-1));
  var irr=calcIRR(cfArr),npv10=calcNPV(cfArr,0.10);

  // Differenza costi con/senza FV, per diverse taglie di impianto FV (kWp)
  var fvSizes=Array.from(new Set([0,500,1000,1500,2000,2500,3000,Math.round(p.kwpInterno)])).sort(function(a,b){return a-b;});
  var fvCompare=fvSizes.map(function(kwp){
    var r=simulaAnnualeAggregato(Object.assign({},p,{kwp:kwp+p.kwpEsterno}));
    return{kwp,cost:(r.cost-r.feedIn)*(1+gridvarPct/100),capexFv:kwp*fvCost};
  });
  // Scenario "solo rete" vero (zero FV interna E esterna), non la riga a 0 kWp interna (che include comunque l'esterna)
  var rNoFV=simulaAnnualeAggregato(Object.assign({},p,{kwp:0}));
  var costNoFV=(rNoFV.cost-rNoFV.feedIn)*(1+gridvarPct/100);
  var costNetto=ann.cost-ann.feedIn;
  fvCompare.forEach(function(row){
    row.risparmio=costNoFV-row.cost;
    row.risparmioPct=costNoFV>0?(row.risparmio/costNoFV*100):0;
    row.paybackFv=row.capexFv>0&&row.risparmio>0?row.capexFv/row.risparmio:Infinity;
  });

  document.getElementById('capex-content').innerHTML=
    '<div class="g3" style="margin-bottom:1rem;">'
    +'<div class="scenario-card" style="background:var(--red3);border-color:rgba(248,81,73,.3);"><div style="font-size:1.0rem;color:var(--text3);text-transform:uppercase;">Scenario A: Solo Rete</div><div style="font-size:1.4rem;font-weight:700;font-family:\'IBM Plex Mono\',monospace;color:var(--red);margin:8px 0;">'+fE(costNoFV)+'/anno</div><div style="font-size:1.0rem;color:var(--text2);">Nessun FV, nessun ITES</div></div>'
    +'<div class="scenario-card best"><div style="font-size:1.0rem;color:var(--text3);text-transform:uppercase;">Scenario B: FV + ITES</div><div style="font-size:1.4rem;font-weight:700;font-family:\'IBM Plex Mono\',monospace;color:var(--green);margin:8px 0;">'+fE(costNetto)+'/anno</div><div style="font-size:1.0rem;color:var(--text2);">Ghiaccio oggi+domani, vendita solo d\'estate</div></div>'
    +'<div class="scenario-card" style="background:var(--teal3);border-color:rgba(57,200,200,.3);"><div style="font-size:1.0rem;color:var(--text3);text-transform:uppercase;">Risparmio annuo</div><div style="font-size:1.4rem;font-weight:700;font-family:\'IBM Plex Mono\',monospace;color:var(--teal);margin:8px 0;">'+fE(costNoFV-costNetto)+'</div><div style="font-size:1.0rem;color:var(--text2);">'+Math.round((1-costNetto/costNoFV)*100)+'% riduzione</div></div>'
    +'</div>'
    +'<div class="g2" style="margin-bottom:1rem;">'
    +'<div class="card"><div class="ct">CAPEX &mdash; Investimento iniziale</div>'
    +Object.entries(capex).map(function(e){return '<div class="capex-row"><span class="capex-label">'+e[0]+'</span><span class="capex-val">'+fE(e[1])+'</span></div>';}).join('')
    +'<div class="capex-row" style="border-top:2px solid var(--border2);margin-top:6px;padding-top:8px;"><span style="font-weight:700;">TOTALE CAPEX</span><span style="font-weight:700;font-family:\'IBM Plex Mono\',monospace;color:var(--blue);font-size:1.1rem;">'+fE(capexTot)+'</span></div></div>'
    +'<div class="card"><div class="ct">OPEX &mdash; Costi operativi/anno</div>'
    +Object.entries(opex).map(function(e){return '<div class="capex-row"><span class="capex-label">'+e[0]+'</span><span class="capex-val">'+fE(Math.round(e[1]))+'</span></div>';}).join('')
    +'<div class="capex-row" style="border-top:2px solid var(--border2);margin-top:6px;padding-top:8px;"><span style="font-weight:700;">TOTALE OPEX</span><span style="font-weight:700;font-family:\'IBM Plex Mono\',monospace;color:var(--red);font-size:1.1rem;">'+fE(Math.round(opexTot))+'/anno</span></div></div>'
    +'</div>'
    +'<div class="g4" style="margin-bottom:1rem;">'
    +'<div class="card kpi"><div class="kv" style="color:var(--green);font-size:1.5rem;">'+fE(Math.round(revTot))+'</div><div class="ku">/anno</div><div class="kl">Ricavi</div></div>'
    +'<div class="card kpi"><div class="kv" style="color:'+(cashflow>0?'var(--green)':'var(--red)')+';font-size:1.5rem;">'+fE(Math.round(cashflow))+'</div><div class="ku">/anno</div><div class="kl">Flusso di cassa</div>'+(cashflow<=0?'<div style="font-size:.85rem;color:var(--red);margin-top:3px;">Aumentare rack o tariffa hosting</div>':'')+'</div>'
    +'<div class="card kpi"><div class="kv" style="color:var(--blue)">'+(payback<50?itNum(payback,1):'\u221e')+'</div><div class="ku">anni</div><div class="kl">Ritorno invest.</div></div>'
    +'<div class="card kpi"><div class="kv" style="color:var(--purple)">'+(isFinite(irr)&&irr>-0.5&&irr<50?itNum(irr*100,1)+'\u2009%':'\u2014')+'</div><div class="ku"></div><div class="kl">IRR 20 anni</div></div>'
    +'</div>'
    +'<div class="card" style="margin-bottom:1rem;">'
    +'<div class="ct">Differenza costi con e senza fotovoltaico &mdash; per taglia FV</div>'
    +'<div class="ibar" style="margin-bottom:.8rem;font-size:1.0rem;">'
    +'Costo netto rete annuo simulato (stessi IT/chiller/tariffe) per diverse taglie di impianto FV, a partire da 0 kWp (nessun FV, nessun ITES). Il ghiaccio copre sempre oggi+domani prima di tutto; il surplus oltre quella soglia si vende solo nei mesi estivi.'
    +'</div>'
    +'<div class="cw" style="height:220px;margin-bottom:1rem;"><canvas id="cFvCompare"></canvas></div>'
    +'<div style="overflow-x:auto;"><table><thead><tr>'
    +'<th>Taglia FV</th><th>Costo rete/anno</th><th>Risparmio vs 0 kWp</th><th>Risparmio %</th><th>CAPEX FV extra</th><th>Payback FV</th>'
    +'</tr></thead><tbody>'
    +fvCompare.map(function(row){
      var isCurrent=row.kwp===Math.round(p.kwpInterno);
      return '<tr style="'+(isCurrent?'background:var(--green3);font-weight:700;':'')+'">'
        +'<td>'+fN(row.kwp)+' kWp'+(isCurrent?' <span style="color:var(--green);font-size:.90rem;">(attuale)</span>':'')+'</td>'
        +'<td>'+fE(row.cost)+'</td>'
        +'<td style="color:'+(row.risparmio>0?'var(--green)':'var(--red)')+'">'+(row.risparmio>0?'+':'')+fE(row.risparmio)+'</td>'
        +'<td style="color:'+(row.risparmio>0?'var(--green)':'var(--red)')+'">'+itNum(row.risparmioPct,1)+'%</td>'
        +'<td style="color:var(--text3);">'+(row.capexFv>0?fE(row.capexFv):'&mdash;')+'</td>'
        +'<td>'+(isFinite(row.paybackFv)?itNum(row.paybackFv,1)+' anni':'&mdash;')+'</td>'
        +'</tr>';
    }).join('')
    +'</tbody></table></div>'
    +'</div>'
    +'<div class="card" style="margin-bottom:1rem;">'
    +'<div class="ct">Dimensionamento macchina ghiaccio e serbatoio</div>'
    +'<div class="ibar" style="margin-bottom:.8rem;font-size:1.0rem;">'
    +'Per ciascuna stagione, giorno con il picco di ghiaccio accumulato più alto trovato scansionando i 365 giorni simulati. <b>Potenza diluita</b> = ghiaccio del giorno spalmato sulle ore di sole (macchina più piccola, senza impennate). <b>Potenza di picco</b> = quella che servirebbe nell\'ora peggiore senza diluizione, per confronto. Volume calcolato da densità ghiaccio 917 kg/m³ (ghiaccio pieno, senza interstizi).'
    +'</div>'
    +'<div style="overflow-x:auto;"><table><thead><tr>'
    +'<th>Stagione</th><th>Giorno peggiore</th><th>Ghiaccio/giorno</th><th>Ore di sole</th><th>Potenza diluita</th><th>Potenza di picco</th><th>Volume serbatoio</th>'
    +'</tr></thead><tbody>'
    +dimensionamento.map(function(s){
      return '<tr>'
        +'<td>'+s.nome+'</td>'
        +'<td style="font-family:\'IBM Plex Sans\',sans-serif;color:var(--text3);">'+s.label+'</td>'
        +'<td>'+fN1(s.ghiaccioGiornoKwhTh)+' kWh_th</td>'
        +'<td>'+s.oreSole+' h</td>'
        +'<td style="color:var(--teal);font-weight:700;">'+itNum(s.potenzaDiluitaKwTh,1)+' kW_th &middot; '+itNum(s.potenzaDiluitaKwEl,1)+' kW_el</td>'
        +'<td style="color:var(--text3);">'+itNum(s.potenzaPiccoKwTh,1)+' kW_th &middot; '+itNum(s.potenzaPiccoKwEl,1)+' kW_el</td>'
        +'<td style="color:var(--blue);">'+itNum(s.tankPiccoM3,1)+' m&sup3; ('+itNum(s.tankPiccoKg)+' kg)</td>'
        +'</tr>';
    }).join('')
    +'</tbody></table></div>'
    +'<div style="font-size:.85rem;color:var(--text3);margin-top:.6rem;line-height:1.7;">'
    +'Taglia macchina scelta (max fra le stagioni, potenza diluita): <b style="color:var(--teal);">'+itNum(machineKwElRichiesta,1)+' kW_el</b> &middot; '
    +'con '+nMacchine+' unità'+(nMacchine>1?' (ridondanza N+1, ogni unità '+itNum(machineKwElPerUnita,1)+' kW_el)':'')+': totale installato <b style="color:var(--blue);">'+itNum(machineKwElTotale,1)+' kW_el</b><br>'
    +'Volume serbatoio consigliato (max fra le stagioni, picco reale nei 365 giorni): <b style="color:var(--teal);">'+itNum(tankM3Consigliato,1)+' m&sup3;</b> ('+itNum(tankKgConsigliato)+' kg di ghiaccio)'
    +'</div>'
    +'</div>'
    +'<div class="card"><div class="ct">Cash Flow cumulativo 20 anni</div><div class="cw" style="height:250px;"><canvas id="cCashflow"></canvas></div></div>';
  destroyC('cFvCompare');
  charts['cFvCompare']=new Chart(document.getElementById('cFvCompare'),{type:'bar',data:{labels:fvCompare.map(function(row){return fN(row.kwp)+' kWp';}),datasets:[{label:'Costo rete annuo (\u20ac)',data:fvCompare.map(function(row){return Math.round(row.cost);}),backgroundColor:fvCompare.map(function(row){return row.kwp===Math.round(p.kwpInterno)?'rgba(22,163,74,.6)':'rgba(227,179,65,.45)';}),borderColor:fvCompare.map(function(row){return row.kwp===Math.round(p.kwpInterno)?'#16a34a':'#e3b341';}),borderWidth:1,borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:function(ctx){return 'Costo rete: '+fE(ctx.parsed.y)+'/anno';}}}},scales:{x:{grid:{display:false},ticks:{color:'#718096',font:{size:11}}},y:{grid:{color:'rgba(0,0,0,0.06)'},ticks:{color:'#718096',font:{size:11},callback:function(v){return fK(v);}},title:{display:true,text:'\u20ac/anno',color:'#718096',font:{size:11}}}}}});
  setTimeout(function(){
    destroyC('cCashflow');
    var cfData=Array.from({length:21},function(_,y){return{cf:cfArr[y],cum:cfArr.slice(0,y+1).reduce(function(a,b){return a+b;},0)};});
    var cfEl=document.getElementById('cCashflow');
    if(cfEl) charts['cCashflow']=new Chart(cfEl,{type:'bar',data:{labels:Array.from({length:21},function(_,y){return 'A'+y;}),datasets:[{label:'Cash Flow',data:cfData.map(function(d){return d.cf;}),backgroundColor:cfData.map(function(d){return d.cf<0?'rgba(248,81,73,.5)':'rgba(57,211,83,.5)';}),borderColor:cfData.map(function(d){return d.cf<0?'#f85149':'#39d353';}),borderWidth:1,borderRadius:3},{label:'Cumulativo',data:cfData.map(function(d){return d.cum;}),type:'line',borderColor:'#58a6ff',fill:false,tension:.3,pointRadius:2,borderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{display:true,labels:{color:'#4a5568',font:{size:11},boxWidth:12}},tooltip:{callbacks:{label:function(ctx){return ctx.dataset.label+': \u20ac'+itNum(ctx.parsed.y/1000000,2)+'M';}}}},scales:{x:{grid:{display:false},ticks:{color:'#718096',font:{size:11}}},y:{grid:{color:'rgba(0,0,0,0.06)'},ticks:{color:'#718096',font:{size:11},callback:function(v){return itNum(v/1000000,1)+'M\u20ac';}}}}}});
  },80);
}
