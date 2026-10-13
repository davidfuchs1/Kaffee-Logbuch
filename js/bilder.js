// Fotos: verkleinern und zwischen Blob und Text (für die Sicherungsdatei) umwandeln.
// Die App speichert immer ihre eigene, verkleinerte Kopie – nie einen Verweis auf die Fotos-App.

export var MAX_EDGE = 1280;   // längste Kante des gespeicherten Fotos
export var THUMB_EDGE = 240;  // Vorschaubild für die Liste
var QUALITY = 0.8;

function loadImage(blob){
  return new Promise(function(resolve, reject){
    var url = URL.createObjectURL(blob);
    var img = new Image();
    img.onload = function(){ URL.revokeObjectURL(url); resolve(img); };
    img.onerror = function(){ URL.revokeObjectURL(url); reject(new Error('Bild nicht lesbar')); };
    img.src = url;
  });
}

// Zeichnet das Bild verkleinert auf eine Fläche. Der Browser dreht dabei nach EXIF.
function scaled(img, maxEdge){
  var w = img.naturalWidth, h = img.naturalHeight;
  if(!w || !h) return Promise.reject(new Error('Bild nicht lesbar'));
  var f = Math.min(1, maxEdge / Math.max(w, h));
  var canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * f));
  canvas.height = Math.max(1, Math.round(h * f));
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise(function(resolve, reject){
    canvas.toBlob(function(b){ b ? resolve(b) : reject(new Error('Bild nicht umwandelbar')); }, 'image/jpeg', QUALITY);
  });
}

// Datei aus der Fotoauswahl -> {bild, klein} als JPEG
export async function photoFromFile(file){
  var img = await loadImage(file);
  return {bild: await scaled(img, MAX_EDGE), klein: await scaled(img, THUMB_EDGE)};
}

export function blobToDataUrl(blob){
  return new Promise(function(resolve, reject){
    var r = new FileReader();
    r.onload = function(){ resolve(r.result); };
    r.onerror = function(){ reject(r.error); };
    r.readAsDataURL(blob);
  });
}

export function dataUrlToBlob(dataUrl){
  var m = /^data:([^;,]+);base64,(.*)$/.exec(dataUrl || '');
  if(!m) throw new Error('kein Bild');
  var bin = atob(m[2]), bytes = new Uint8Array(bin.length);
  for(var i=0;i<bin.length;i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], {type: m[1]});
}

// Foto aus der Sicherungsdatei: Bild bleibt wie gesichert, das Vorschaubild wird neu erzeugt
export async function photoFromDataUrl(dataUrl){
  var bild = dataUrlToBlob(dataUrl);
  return {bild: bild, klein: await scaled(await loadImage(bild), THUMB_EDGE)};
}
