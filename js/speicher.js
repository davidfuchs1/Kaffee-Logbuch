// Gerätespeicher: Einträge liegen im localStorage, nur auf diesem Gerät.
import { toState, emptyState } from './daten.js';

export var KEY_V3 = 'kaffee-logbuch-v3';
export var KEY_V2 = 'kaffee-logbuch-entries-v2';
export var KEY_V1 = 'kaffee-logbuch-entries-v1';
export var KEY_META = 'kaffee-logbuch-meta';
var KEY_DEFEKT = 'kaffee-logbuch-v3-defekt';

function parse(raw){
  try{ return toState(JSON.parse(raw)); }catch(e){ return null; }
}

// Lädt den Zustand. Gibt es noch keinen Stand v3, wird einmalig aus v2 oder v1
// umgewandelt. Die alten Keys bleiben dabei unangetastet – sie sind der Rückweg.
// Ergebnis: {state, hinweis} – hinweis ist 'umgestellt', 'defekt' oder null.
export function loadState(storage){
  storage = storage || localStorage;
  var hinweis = null;
  var raw = storage.getItem(KEY_V3);
  if(raw){
    var state = parse(raw);
    if(state) return {state: state, hinweis: null};
    // Unlesbaren Stand nicht überschreiben, sondern beiseitelegen
    storage.setItem(KEY_DEFEKT, raw);
    hinweis = 'defekt';
  }
  var alt = storage.getItem(KEY_V2) || storage.getItem(KEY_V1);
  var migrated = alt ? parse(alt) : null;
  if(migrated){
    saveState(migrated, storage);
    return {state: migrated, hinweis: hinweis || 'umgestellt'};
  }
  return {state: emptyState(), hinweis: hinweis};
}

export function saveState(state, storage){
  (storage || localStorage).setItem(KEY_V3, JSON.stringify(state));
}

export function loadMeta(storage){
  try{
    var m = JSON.parse((storage || localStorage).getItem(KEY_META));
    if(m && typeof m === 'object') return m;
  }catch(e){}
  return {lastBackupAt: null, changesSinceBackup: 0, firstChangeAt: null};
}
export function saveMeta(meta, storage){
  (storage || localStorage).setItem(KEY_META, JSON.stringify(meta));
}
