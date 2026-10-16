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

// Punkt am Sicherungs-Knopf: ab 3 ungesicherten Änderungen, oder wenn eine Änderung länger als 14 Tage liegt
export function backupDue(meta, now){
  var changes = meta.changesSinceBackup || 0;
  if(changes >= 3) return true;
  if(changes === 0) return false;
  var since = meta.lastBackupAt || meta.firstChangeAt || 0;
  return since > 0 && daysSince(since, now) >= 14;
}

// ---------- Filter ----------
// Gilt nur für die Anzeige der Liste und wird nicht gespeichert.
//   text        Suchwörter; jedes muss in Name, Rösterei, Noten oder Notiz vorkommen
//   roasteries  normKey der Röstereien ('' = ohne Rösterei); eine davon genügt
//   flavors     Noten, klein geschrieben; flavorMode 'or' = eine davon, 'and' = alle
//   rating      '' = alle, sonst ein Schlüssel aus RATING_STEPS
//   since       Tage seit dem Eintragen, 0 = immer

export var RATING_STEPS = [
  {key: 'none', label: 'unbewertet', test: function(r){ return r === 0; }},
  {key: 'lt3',  label: 'unter 3',    test: function(r){ return r > 0 && r < 3; }},
  {key: '3',    label: 'ab 3',       test: function(r){ return r >= 3; }},
  {key: '4',    label: 'ab 4',       test: function(r){ return r >= 4; }},
  {key: '4.5',  label: 'ab 4,5',     test: function(r){ return r >= 4.5; }}
];
export var SINCE_STEPS = [
  {days: 0,   label: 'Immer',    chip: ''},
  {days: 30,  label: '30 Tage',  chip: 'letzte 30 Tage'},
  {days: 90,  label: '3 Monate', chip: 'letzte 3 Monate'},
  {days: 365, label: '1 Jahr',   chip: 'letztes Jahr'}
];

export function emptyFilter(){
  return {text: '', roasteries: [], flavors: [], flavorMode: 'or', rating: '', since: 0};
}

// Klein, ohne Akzente und Umlaut-Punkte: „Würzig“ -> „wurzig“, „Straße“ -> „strasse“
export function foldText(s){
  return (s||'').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').toLowerCase();
}
function searchWords(text){
  return foldText(text).split(/\s+/).filter(Boolean);
}
function ratingStep(key){
  return RATING_STEPS.filter(function(s){ return s.key === key; })[0] || null;
}
function sinceStep(days){
  return SINCE_STEPS.filter(function(s){ return s.days === days; })[0] || null;
}

export function filterEntries(entries, f, now){
  var words = searchWords(f.text);
  var step = ratingStep(f.rating);
  var from = f.since ? (now || Date.now()) - f.since * 86400000 : 0;
  return entries.filter(function(e){
    if(words.length){
      var hay = foldText([e.name, e.roastery, e.notes].concat(e.flavors).join(' '));
      for(var i=0;i<words.length;i++) if(hay.indexOf(words[i]) === -1) return false;
    }
    if(f.roasteries.length && f.roasteries.indexOf(normKey(e.roastery)) === -1) return false;
    if(f.flavors.length){
      var own = e.flavors.map(function(x){ return x.toLowerCase(); });
      var has = function(x){ return own.indexOf(x) !== -1; };
      if(f.flavorMode === 'and' ? !f.flavors.every(has) : !f.flavors.some(has)) return false;
    }
    if(step && !step.test(e.rating || 0)) return false;
    if(from && (e.createdAt || 0) < from) return false;
    return true;
  });
}

// Anzahl der aktiven Kriterien (für die Zahl am Filterknopf)
export function activeFilterCount(f){
  return (searchWords(f.text).length ? 1 : 0) + (f.roasteries.length ? 1 : 0) +
    (f.flavors.length ? 1 : 0) + (ratingStep(f.rating) ? 1 : 0) + (sinceStep(f.since) && f.since ? 1 : 0);
}

// Auswahl für das Filter-Blatt: [{key, label, count}], erste Schreibweise gewinnt
function countBy(entries, keysOf){
  var at = {}, out = [];
  entries.forEach(function(e){
    keysOf(e).forEach(function(p){
      if(!(p.key in at)) at[p.key] = out.push({key: p.key, label: p.label, count: 0}) - 1;
      out[at[p.key]].count++;
    });
  });
  return out;
}
// Röstereien alphabetisch, „ohne Rösterei“ zuletzt
export function roasteryCounts(entries){
  return countBy(entries, function(e){
    var k = normKey(e.roastery);
    return [{key: k, label: k ? e.roastery.trim().replace(/\s+/g, ' ') : 'ohne Rösterei'}];
  }).sort(function(a, b){
    if(!a.key || !b.key) return a.key ? -1 : 1;
    return a.label.localeCompare(b.label, 'de');
  });
}
// Noten, die an mindestens einem Kaffee stehen: häufigste zuerst, dann alphabetisch
export function flavorCounts(entries){
  return countBy(entries, function(e){
    return e.flavors.map(function(x){ return {key: x.toLowerCase(), label: x}; });
  }).sort(function(a, b){
    return (b.count - a.count) || a.label.localeCompare(b.label, 'de');
  });
}
export function ratingCounts(entries){
  return RATING_STEPS.map(function(s){
    return {key: s.key, label: s.label, count: entries.filter(function(e){ return s.test(e.rating || 0); }).length};
  });
}

// Entfernt gewählte Röstereien und Noten, die es in den Einträgen nicht mehr gibt
export function pruneFilter(f, entries){
  var r = roasteryCounts(entries).map(function(x){ return x.key; });
  var n = flavorCounts(entries).map(function(x){ return x.key; });
  return Object.assign({}, f, {
    roasteries: f.roasteries.filter(function(k){ return r.indexOf(k) !== -1; }),
    flavors: f.flavors.filter(function(k){ return n.indexOf(k) !== -1; })
  });
}

// Aktive Kriterien als Chips über der Liste: [{group, label}]
export function filterChips(f, entries){
  var out = [];
  function labels(list, keys){
    return keys.map(function(k){
      var hit = list.filter(function(x){ return x.key === k; })[0];
      return hit ? hit.label : k;
    });
  }
  if(searchWords(f.text).length) out.push({group: 'text', label: '„' + f.text.trim() + '“'});
  if(f.roasteries.length) out.push({group: 'roasteries', label: labels(roasteryCounts(entries), f.roasteries).join(', ')});
  if(f.flavors.length) out.push({group: 'flavors', label: labels(flavorCounts(entries), f.flavors).join(f.flavorMode === 'and' ? ' + ' : ', ')});
  var step = ratingStep(f.rating);
  if(step) out.push({group: 'rating', label: step.label});
  var since = sinceStep(f.since);
  if(since && f.since) out.push({group: 'since', label: since.chip});
  return out;
}
