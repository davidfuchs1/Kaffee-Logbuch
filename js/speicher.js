// Gerätespeicher: Einträge liegen im localStorage, nur auf diesem Gerät.
import { toV2Entry } from './daten.js';

var STORAGE_KEY = 'kaffee-logbuch-entries-v2';
var OLD_STORAGE_KEY = 'kaffee-logbuch-entries-v1';

export function loadEntries(){
  try{
    var raw = localStorage.getItem(STORAGE_KEY);
    if(raw) return JSON.parse(raw);
    // einmalige, stille Migration aus der alten Datenstruktur (mit id/brewMin/brewSec)
    var oldRaw = localStorage.getItem(OLD_STORAGE_KEY);
    if(oldRaw){
      var migrated = JSON.parse(oldRaw).map(toV2Entry);
      saveEntries(migrated);
      return migrated;
    }
    return [];
  }catch(e){ return []; }
}
export function saveEntries(list){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
