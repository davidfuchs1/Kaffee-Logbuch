// Datenmodell und reine Hilfsfunktionen (kein Zugriff auf DOM oder Speicher).
// Format: docs/datenformat.md

export var FORMAT_VERSION = 3;

export var STANDARD_FLAVORS = [
  'Schokolade', 'Nuss', 'Karamell', 'Beeren', 'Zitrus',
  'Steinobst', 'Floral', 'Würzig', 'Kakao', 'Milchschokolade'
];

export function normKey(s){ return (s||'').trim().toLowerCase().replace(/\s+/g,' '); }
export function entryKey(e){ return normKey(e.name) + '||' + normKey(e.roastery); }

export function escapeHtml(str){
  return (str||'').replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}
export function fmtRatio(gIn, gOut){
  if(!gIn || !gOut) return '—';
  var r = gOut / gIn;
  return '1 : ' + r.toFixed(1).replace('.', ',');
}
export function fmtDecimal(n){
  n = (typeof n === 'number' && !isNaN(n)) ? n : 0;
  return n.toFixed(1).replace('.', ',');
}
export function fractionFor(rating, i){
  var f = rating - (i-1);
  if(f<0) f=0; if(f>1) f=1;
  return f;
}

// ---------- Einträge ----------

function hash32(str){ // FNV-1a
  var h = 0x811c9dc5;
  for(var i=0;i<str.length;i++){
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Die id wird berechnet statt gewürfelt: Dasselbe Backup ergibt auf jedem Gerät dieselben ids.
export function makeId(e){
  return 'k-' + (e.createdAt||0).toString(36) + '-' + hash32(entryKey(e)).toString(36);
}

export function cleanFlavor(s){ return (typeof s === 'string' ? s : '').trim().replace(/\s+/g,' '); }

// Liste von Noten ohne Leere und ohne Doppelte (Groß-/Kleinschreibung egal, erste Schreibweise gewinnt)
export function cleanFlavors(list){
  var seen = {}, out = [];
  (Array.isArray(list) ? list : []).forEach(function(s){
    var f = cleanFlavor(s), k = f.toLowerCase();
    if(f && !seen[k]){ seen[k] = true; out.push(f); }
  });
  return out;
}

// Bringt einen Eintrag aus jedem bisherigen Format auf v3.
// v1 hatte eigene ids und brewMin/brewSec, v2 keine id.
export function toV3Entry(o){
  var createdAt = o.createdAt || Date.now();
  var e = {
    id: '',
    name: o.name || '',
    roastery: o.roastery || '',
    gramsIn: o.gramsIn || 0,
    gramsOut: o.gramsOut || 0,
    brewSeconds: o.brewSeconds != null ? o.brewSeconds : ((o.brewMin||0)*60 + (o.brewSec||0)),
    grind: o.grind != null ? o.grind : 10,
    rating: o.rating || 0,
    notes: o.notes || '',
    flavors: cleanFlavors(o.flavors),
    photo: typeof o.photo === 'string' && o.photo ? o.photo : null,
    createdAt: createdAt,
    updatedAt: o.updatedAt || createdAt
  };
  e.id = (typeof o.id === 'string' && o.id.indexOf('k-') === 0) ? o.id : makeId(e);
  return e;
}

export function emptyState(){
  return {formatVersion: FORMAT_VERSION, entries: []};
}

function uniqueId(id, taken){
  var out = id, n = 2;
  while(taken[out]) out = id + '-' + (n++);
  taken[out] = true;
  return out;
}

// Speicherstand oder Backup-Inhalt in jedem bisherigen Format -> Zustand v3.
// Liste = v1/v2, Objekt mit entries = v3.
export function toState(data){
  var list;
  if(Array.isArray(data)) list = data;
  else if(data && Array.isArray(data.entries)) list = data.entries;
  else throw new Error('ungültiges Format');
  var taken = {};
  var entries = list.filter(function(x){ return x && typeof x === 'object'; }).map(function(x){
    var e = toV3Entry(x);
    e.id = uniqueId(e.id, taken);
    return e;
  });
  return {formatVersion: FORMAT_VERSION, entries: entries};
}

export function sortEntries(entries, mode){
  return entries.slice().sort(function(a,b){
    if(mode === 'rating') return (b.rating||0) - (a.rating||0);
    return (b.createdAt||0) - (a.createdAt||0);
  });
}

// Regel: Name + Rösterei gibt es nur einmal. Liefert den vorhandenen Eintrag oder null.
export function findDuplicate(entries, name, roastery, exceptId){
  var key = entryKey({name: name, roastery: roastery});
  for(var i=0;i<entries.length;i++){
    if(entries[i].id !== exceptId && entryKey(entries[i]) === key) return entries[i];
  }
  return null;
}

// ---------- Geschmacksnoten ----------

// Eigene Noten gehören nur zu dem Kaffee, an dem sie eingegeben wurden. Es gibt
// keine gemerkte Liste: Zur Auswahl stehen die Standardnoten und zusätzlich, was
// an diesem Kaffee schon steht oder gerade eingegeben wurde (extra).
export function flavorChoices(extra){
  return cleanFlavors(STANDARD_FLAVORS.concat(extra || []));
}

// Eingabe -> gültige Schreibweise: Gibt es die Note in der Auswahl schon (Groß-/Kleinschreibung
// egal), gewinnt die vorhandene. Leere Eingabe ergibt ''.
export function matchFlavor(name, choices){
  var f = cleanFlavor(name), k = f.toLowerCase();
  if(!f) return '';
  return choices.filter(function(s){ return s.toLowerCase() === k; })[0] || f;
}

// ---------- Sicherung ----------

// photos: {fotoId: dataURL}. In die Datei kommen nur Fotos, auf die ein Eintrag zeigt.
export function buildBackup(state, photos){
  var used = {};
  state.entries.forEach(function(e){
    if(e.photo && photos && photos[e.photo]) used[e.photo] = photos[e.photo];
  });
  return {
    formatVersion: FORMAT_VERSION,
    exportedAt: Date.now(),
    entries: state.entries.map(function(e){ return Object.assign({}, e); }),
    photos: used
  };
}

// Import führt zusammen. Liest Listen (v1/v2) und Sicherungen v3. Verändert state nicht.
// - Neue Name+Rösterei-Kombinationen werden übernommen (added).
// - Vorhandene bleiben, wie sie sind. Nur was ihnen fehlt, wird ergänzt (filled):
//   ein Foto, wenn sie keins haben, und Geschmacksnoten, wenn sie keine haben.
// - Der Rest wird übersprungen (skipped).
// newPhotos: Fotos aus der Datei, die übernommen werden.
export function mergeImport(state, data, now){
  var incoming = toState(data);
  var photos = (data && !Array.isArray(data) && data.photos && typeof data.photos === 'object') ? data.photos : {};
  var entries = state.entries.slice();
  var at = {}, ids = {};
  entries.forEach(function(e, i){ at[entryKey(e)] = i; ids[e.id] = true; });
  var added = 0, filled = 0, skipped = 0, newPhotos = {};
  incoming.entries.forEach(function(e){
    if(!e.name) return;
    var k = entryKey(e);
    var hasPhoto = !!e.photo && typeof photos[e.photo] === 'string';
    if(k in at){
      var cur = entries[at[k]], patch = {};
      if(!cur.photo && hasPhoto){ patch.photo = e.photo; newPhotos[e.photo] = photos[e.photo]; }
      if(!cur.flavors.length && e.flavors.length) patch.flavors = e.flavors;
      if(patch.photo || patch.flavors){
        patch.updatedAt = now || Date.now();
        entries[at[k]] = Object.assign({}, cur, patch);
        filled++;
      } else skipped++;
      return;
    }
    e.id = uniqueId(e.id, ids);
    if(hasPhoto) newPhotos[e.photo] = photos[e.photo];
    else e.photo = null;
    at[k] = entries.push(e) - 1;
    added++;
  });
  return {
    state: {formatVersion: FORMAT_VERSION, entries: entries},
    added: added,
    filled: filled,
    skipped: skipped,
    newPhotos: newPhotos
  };
}

// ---------- Erinnerung an die Sicherung ----------

export function daysSince(ts, now){
  return Math.floor(((now || Date.now()) - ts) / 86400000);
}

export function backupStatus(meta, now){
  var changes = meta.changesSinceBackup || 0;
  var last;
  if(!meta.lastBackupAt) last = 'Noch nie gesichert';
  else {
    var d = daysSince(meta.lastBackupAt, now);
    last = 'Letzte Sicherung ' + (d <= 0 ? 'heute' : d === 1 ? 'gestern' : 'vor ' + d + ' Tagen');
  }
  if(changes === 0) return meta.lastBackupAt ? last + ' · alles gesichert' : last;
  return last + ' · ' + (changes === 1 ? '1 ungesicherte Änderung' : changes + ' ungesicherte Änderungen');
}

// Zählt eine Änderung (Speichern, Löschen, Import). Liefert neue Meta-Daten.
export function countChange(meta, now){
  return {
    lastBackupAt: meta.lastBackupAt || null,
    changesSinceBackup: (meta.changesSinceBackup || 0) + 1,
    firstChangeAt: meta.changesSinceBackup ? (meta.firstChangeAt || now || Date.now()) : (now || Date.now())
  };
}
export function backupDone(now){
  return {lastBackupAt: now || Date.now(), changesSinceBackup: 0, firstChangeAt: null};
}

// Punkt am Zahnrad: ab 3 ungesicherten Änderungen, oder wenn eine Änderung länger als 14 Tage liegt
export function backupDue(meta, now){
  var changes = meta.changesSinceBackup || 0;
  if(changes >= 3) return true;
  if(changes === 0) return false;
  var since = meta.lastBackupAt || meta.firstChangeAt || 0;
  return since > 0 && daysSince(since, now) >= 14;
}
