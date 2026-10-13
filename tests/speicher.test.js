import { test, gleich, wahr } from './mini.js';
import { loadState, saveState, loadMeta, saveMeta, KEY_V1, KEY_V2, KEY_V3, KEY_DEFEKT } from '../js/speicher.js';
import { toState } from '../js/daten.js';

// Nachgestellter localStorage, damit die Tests die echten Daten nicht berühren
function speicher(inhalt){
  var d = Object.assign({}, inhalt);
  return {
    getItem: function(k){ return k in d ? d[k] : null; },
    setItem: function(k, v){ d[k] = String(v); },
    daten: d
  };
}

var V2 = [
  {name:'Sommer', roastery:'Heilandt', gramsIn:18, gramsOut:40, brewSeconds:29, grind:2.9, rating:4, notes:'Sehr floral/fruchtig.', createdAt:1786355636748},
  {name:'Winter', roastery:'Kaffeemacher', gramsIn:18, gramsOut:36, brewSeconds:27, grind:3.4, rating:3.5, notes:'', createdAt:1786355636749}
];
var V1 = [{id:1, name:'Uralt', roastery:'R', gramsIn:18, gramsOut:36, brewMin:0, brewSec:28, rating:2, createdAt:7}];

test('loadState: leerer Speicher', function(){
  var r = loadState(speicher({}));
  gleich(r.state.entries, []);
  gleich(r.hinweis, null);
});
test('loadState: stellt v2 um und lässt den alten Key unberührt', function(){
  var roh = JSON.stringify(V2);
  var s = speicher({[KEY_V2]: roh});
  var r = loadState(s);
  gleich(r.hinweis, 'umgestellt');
  gleich(r.state.entries.length, 2);
  gleich(r.state.entries[0].name, 'Sommer');
  gleich(s.daten[KEY_V2], roh, 'alter Key unverändert');
  wahr(KEY_V3 in s.daten, 'neuer Key geschrieben');
});
test('loadState: zweiter Start liest v3, auch wenn v2 noch da ist', function(){
  var s = speicher({[KEY_V2]: JSON.stringify(V2)});
  var erster = loadState(s).state;
  erster.entries[0].rating = 5;
  saveState(erster, s);
  var r = loadState(s);
  gleich(r.hinweis, null);
  gleich(r.state.entries[0].rating, 5);
});
test('loadState: stellt v1 um, wenn es kein v2 gibt', function(){
  var s = speicher({[KEY_V1]: JSON.stringify(V1)});
  var r = loadState(s);
  gleich(r.state.entries[0].brewSeconds, 28);
  gleich(s.daten[KEY_V1], JSON.stringify(V1));
});
test('loadState: v2 hat Vorrang vor v1', function(){
  var r = loadState(speicher({[KEY_V1]: JSON.stringify(V1), [KEY_V2]: JSON.stringify(V2)}));
  gleich(r.state.entries.length, 2);
});
test('loadState: unlesbarer Stand v3 wird beiseitegelegt, nicht überschrieben', function(){
  var s = speicher({[KEY_V3]: '{kaputt', [KEY_V2]: JSON.stringify(V2)});
  var r = loadState(s);
  gleich(r.hinweis, 'defekt');
  gleich(r.state.entries.length, 2, 'Rückfall auf v2');
  gleich(s.daten[KEY_DEFEKT], '{kaputt');
});
test('saveState + loadState: Hin- und Rückweg', function(){
  var s = speicher({});
  var z = toState(V2); z.customFlavors = ['Marzipan']; z.entries[0].flavors = ['Floral'];
  saveState(z, s);
  gleich(loadState(s).state, z);
});
test('Meta: Standard und Hin- und Rückweg', function(){
  var s = speicher({});
  gleich(loadMeta(s), {lastBackupAt:null, changesSinceBackup:0, firstChangeAt:null});
  saveMeta({lastBackupAt:5, changesSinceBackup:2, firstChangeAt:3}, s);
  gleich(loadMeta(s), {lastBackupAt:5, changesSinceBackup:2, firstChangeAt:3});
});

// Echtes Backup des Nutzers, falls es lokal unter backup/echt.json liegt (nie im Repo)
test('Echtes Backup: jeder Eintrag kommt mit allen Feldern an', async function(){
  var antwort;
  try{ antwort = await fetch('../backup/echt.json', {cache:'no-store'}); }catch(e){ return 'uebersprungen'; }
  if(!antwort.ok) return 'uebersprungen';
  var liste = await antwort.json();
  var z = toState(liste);
  var original = Array.isArray(liste) ? liste : liste.entries;
  gleich(z.entries.length, original.length, 'Anzahl');
  var felder = ['name','roastery','gramsIn','gramsOut','brewSeconds','grind','rating','notes','createdAt'];
  original.forEach(function(o, i){
    felder.forEach(function(f){ gleich(z.entries[i][f], o[f], o.name + ' / ' + f); });
  });
  var ids = {};
  z.entries.forEach(function(e){ wahr(!ids[e.id], 'id doppelt: ' + e.id); ids[e.id] = true; });
});
