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

// ---------- Fotos (IndexedDB) ----------
// localStorage ist für Bilder zu klein. Gespeichert werden die Bytes, nicht
// Blob-Objekte – das ist auf iOS die robustere Form. Die Vorschaubilder liegen
// getrennt, damit die Liste nicht alle großen Fotos laden muss.

function toBytes(blob){
  if(blob.arrayBuffer) return blob.arrayBuffer();
  return new Promise(function(resolve, reject){
    var r = new FileReader();
    r.onload = function(){ resolve(r.result); };
    r.onerror = function(){ reject(r.error); };
    r.readAsArrayBuffer(blob);
  });
}
function toBlob(row){
  return row ? new Blob([row.bytes], {type: row.typ}) : null;
}

export function photoStore(dbName){
  var FULL = 'fotos', THUMB = 'vorschau', dbPromise = null;

  function open(){
    if(!dbPromise){
      dbPromise = new Promise(function(resolve, reject){
        var req = indexedDB.open(dbName, 1);
        req.onupgradeneeded = function(){
          req.result.createObjectStore(FULL, {keyPath: 'id'});
          req.result.createObjectStore(THUMB, {keyPath: 'id'});
        };
        req.onsuccess = function(){ resolve(req.result); };
        req.onerror = function(){ dbPromise = null; reject(req.error); };
      });
    }
    return dbPromise;
  }
  // fn bekommt die Transaktion und liefert die Anfrage, deren Ergebnis zurückkommt
  function run(mode, fn){
    return open().then(function(db){
      return new Promise(function(resolve, reject){
        var tx = db.transaction([FULL, THUMB], mode), req = fn(tx);
        tx.oncomplete = function(){ resolve(req ? req.result : undefined); };
        tx.onerror = tx.onabort = function(){ reject(tx.error); };
      });
    });
  }

  return {
    // photo: {bild: Blob, klein: Blob}
    put: function(id, photo){
      return Promise.all([toBytes(photo.bild), toBytes(photo.klein)]).then(function(b){
        return run('readwrite', function(tx){
          tx.objectStore(FULL).put({id: id, typ: photo.bild.type || 'image/jpeg', bytes: b[0]});
          tx.objectStore(THUMB).put({id: id, typ: photo.klein.type || 'image/jpeg', bytes: b[1]});
        });
      });
    },
    // großes Foto oder null
    get: function(id){
      return run('readonly', function(tx){ return tx.objectStore(FULL).get(id); }).then(toBlob);
    },
    remove: function(id){
      return run('readwrite', function(tx){
        tx.objectStore(FULL).delete(id);
        tx.objectStore(THUMB).delete(id);
      });
    },
    // alle Vorschaubilder: [{id, klein}]
    thumbs: function(){
      return run('readonly', function(tx){ return tx.objectStore(THUMB).getAll(); }).then(function(rows){
        return rows.map(function(r){ return {id: r.id, klein: toBlob(r)}; });
      });
    },
    close: function(){
      if(!dbPromise) return Promise.resolve();
      return dbPromise.then(function(db){ db.close(); dbPromise = null; });
    }
  };
}

export var photos = photoStore('kaffee-logbuch');
