// ============================================================
// COSTANTI FISICHE
// ============================================================
var LATENTE_WH = 334000/3600;   // ~92.78 Wh/kg
var RHO_ICE = 917;
var CO2_FACTOR = 0.233;
var CHILLER_AUX_OVERHEAD = 0.25; // +25% kWel per pompe glicole/acqua, ventole condensatore, controlli — oltre al solo compressore
var GIORNI_MESE=[31,28,31,30,31,30,31,31,30,31,30,31];
var NOMI_MESE=['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
var NOMI_MESE_FULL=['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

// ============================================================
// TARIFFE F1/F2/F3
// ============================================================
function getTariffMult(h){
  if(h>=8&&h<19) return 0.938;
  if((h>=7&&h<8)||(h>=19&&h<23)) return 1.00;
  return 0.906;
}

// ============================================================
// SUPERFICI — densità FV per tipo di montaggio a terra (kWp/m²)
// ============================================================
var DENSITA_GROUND={bancali:0.10,piazzali:0.13,pensiline:0.15};

// ============================================================
// RACK TYPES
// ============================================================
var RACK_TYPES={
  ai_gpu:{name:'AI/GPU (H100/B200)',kw:40,pue_base:1.30,method:'Rear-Door HX + Liquid',perRow:5},
  ai_mixed:{name:'AI Misto GPU+CPU',kw:25,pue_base:1.25,method:'Hot/Cold Aisle + ITES',perRow:6},
  hpc:{name:'HPC Computing',kw:20,pue_base:1.20,method:'In-Row + ITES',perRow:7},
  cloud:{name:'Cloud Standard',kw:10,pue_base:1.15,method:'Raised Floor + ITES',perRow:8},
  colo:{name:'Colocation Mixed',kw:7,pue_base:1.12,method:'Containment + ITES',perRow:8}
};

// ============================================================
// TEMPERATURE ORARIE MENSILI
// ============================================================
var TEMP_ORARIE=[
  [2,1,1,0,0,0,1,3,5,7,8,9,9,10,10,9,8,6,5,4,4,3,3,2],
  [3,2,2,1,1,1,2,4,6,8,10,11,12,12,12,11,10,8,7,6,5,4,4,3],
  [5,5,4,3,3,3,4,6,9,11,13,14,15,15,15,14,13,11,10,9,8,7,6,6],
  [9,8,7,7,6,6,7,9,12,14,16,17,18,18,18,17,16,14,13,12,11,10,10,9],
  [13,12,12,11,10,10,11,14,17,19,21,22,23,23,23,22,21,19,17,16,15,14,14,13],
  [17,16,16,15,15,14,16,18,21,23,25,27,28,28,28,27,26,24,22,21,20,19,18,17],
  [20,19,18,18,17,17,18,21,24,26,28,30,31,31,31,30,29,27,25,24,23,22,21,20],
  [20,19,18,18,17,17,18,21,24,26,28,30,31,31,30,30,28,26,25,23,22,21,21,20],
  [16,16,15,14,14,13,14,17,20,22,24,25,26,26,26,25,24,22,20,19,18,17,17,16],
  [12,11,11,10,10,9,10,12,15,17,19,20,21,21,20,19,18,16,15,14,13,13,12,12],
  [8,7,7,6,6,5,6,8,10,12,13,14,15,15,14,13,12,11,10,9,9,8,8,8],
  [3,3,2,2,1,1,2,3,5,7,9,10,10,10,10,9,8,7,6,5,4,4,3,3],
];
var TEMP_MEDIE=[4.2,5.8,9.5,13.2,17.8,22.1,24.8,24.3,20.1,15.2,9.8,5.5];
var _ALBE=[7.5,7.0,6.0,5.5,5.0,4.5,5.0,5.5,6.0,6.5,7.0,7.5];
var _TRAMONTI=[16.5,17.5,18.5,20.0,20.5,21.0,20.5,20.0,19.0,18.0,16.5,16.0];

var PROFILI_MENSILI=Array.from({length:12},function(_,m){
  var a=_ALBE[m],t=_TRAMONTI[m];
  var p=Array.from({length:24},function(_,h){return (h<a||h>=t)?0:Math.pow(Math.sin((h-a)/(t-a)*Math.PI),1.2);});
  var s=p.reduce(function(x,y){return x+y;},0);
  return p.map(function(v){return s>0?v/s:0;});
});

var FALLBACK_MENSILI=[
  {nome:'Gen',irr:67,kwp_kwh:2.05,giorni:31},{nome:'Feb',irr:86,kwp_kwh:2.62,giorni:28},
  {nome:'Mar',irr:126,kwp_kwh:3.83,giorni:31},{nome:'Apr',irr:148,kwp_kwh:4.50,giorni:30},
  {nome:'Mag',irr:178,kwp_kwh:5.42,giorni:31},{nome:'Giu',irr:196,kwp_kwh:5.96,giorni:30},
  {nome:'Lug',irr:209,kwp_kwh:6.35,giorni:31},{nome:'Ago',irr:192,kwp_kwh:5.83,giorni:31},
  {nome:'Set',irr:145,kwp_kwh:4.40,giorni:30},{nome:'Ott',irr:104,kwp_kwh:3.16,giorni:31},
  {nome:'Nov',irr:68,kwp_kwh:2.07,giorni:30},{nome:'Dic',irr:56,kwp_kwh:1.70,giorni:31},
];
