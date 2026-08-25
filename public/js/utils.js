var pvgisData=null,pvgisLoaded=false,tankStates365=null,cache365=null;
var pvgisRoofData=null,pvgisGroundData=null;
var charts={};
function destroyC(id){if(charts[id]){charts[id].destroy();delete charts[id];}}
function getMensili(){return pvgisData||FALLBACK_MENSILI;}
function giornoToMese(gg){var g=gg-1;for(var m=0;m<12;m++){if(g<GIORNI_MESE[m])return{mese_idx:m,giorno_m:g+1};g-=GIORNI_MESE[m];}return{mese_idx:11,giorno_m:31};}
function giornoLabel(gg){var r=giornoToMese(gg);return r.giorno_m+' '+NOMI_MESE[r.mese_idx];}
function itNum(n,dec){
  if(n===null||n===undefined||isNaN(n))return '—';
  dec=dec||0;
  var parts=n.toFixed(dec).split('.');
  parts[0]=parts[0].replace(/\B(?=(\d{3})+(?!\d))/g,'.');
  return dec>0?parts.join(','):parts[0];
}
function fN(n){return itNum(Math.round(n));}
function fN1(n){return itNum(n,1);}
function fN2(n){return itNum(n,2);}
function fE(n){return '\u20ac'+fN(Math.round(n));}
function fK(n){
  // Formats as compact k notation: 4800 -> "4,8k", 985373 -> "985k", 228600 -> "229k"
  if(n===null||n===undefined||isNaN(n))return '—';
  var k=n/1000;
  if(Math.abs(k)>=100) return itNum(Math.round(k))+'k';
  if(Math.abs(k)>=10)  return itNum(k,1)+'k';
  return itNum(k,2)+'k';
}
function fKEuro(n){
  // Cost in euros: keep full if <1000, else k
  if(Math.abs(n)<1000) return itNum(n,2);
  return itNum(n/1000,1)+'k';
}
