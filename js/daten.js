// Datenmodell und reine Hilfsfunktionen (kein Zugriff auf DOM oder Speicher).
// Format: docs/datenformat.md

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

// Altformate (v1 mit id/brewMin/brewSec) und unvollständige Einträge auf die v2-Felder bringen
export function toV2Entry(o){
  return {
    name: o.name || '',
    roastery: o.roastery || '',
    gramsIn: o.gramsIn || 0,
    gramsOut: o.gramsOut || 0,
    brewSeconds: o.brewSeconds != null ? o.brewSeconds : ((o.brewMin||0)*60 + (o.brewSec||0)),
    grind: o.grind != null ? o.grind : 10,
    rating: o.rating || 0,
    notes: o.notes || '',
    createdAt: o.createdAt || Date.now()
  };
}

export function sortEntries(entries, mode){
  return entries.slice().sort(function(a,b){
    if(mode === 'rating') return (b.rating||0) - (a.rating||0);
    return (b.createdAt||0) - (a.createdAt||0);
  });
}

// Import führt zusammen: vorhandene Name+Rösterei-Kombinationen werden übersprungen
export function mergeImport(existing, imported){
  if(!Array.isArray(imported)) throw new Error('ungültiges Format');
  var list = existing.slice();
  var existingKeys = {};
  list.forEach(function(x){ existingKeys[entryKey(x)] = true; });
  var added = 0;
  imported.forEach(function(item){
    if(!item || !item.name) return;
    var k = entryKey(item);
    if(!existingKeys[k]){
      list.push(toV2Entry(item));
      existingKeys[k] = true;
      added++;
    }
  });
  return {list: list, added: added};
}
