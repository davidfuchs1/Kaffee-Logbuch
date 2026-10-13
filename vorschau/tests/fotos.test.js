import { test, gleich, wahr, wirft } from './mini.js';
import { photoFromFile, photoFromDataUrl, blobToDataUrl, dataUrlToBlob, MAX_EDGE, THUMB_EDGE } from '../js/bilder.js';
import { photoStore } from '../js/speicher.js';

// Testbild wie ein Handyfoto im Hochformat
function testbild(breite, hoehe){
  var c = document.createElement('canvas');
  c.width = breite; c.height = hoehe;
  var x = c.getContext('2d');
  x.fillStyle = '#6b4a2b'; x.fillRect(0, 0, breite, hoehe);
  x.fillStyle = '#d4a24c'; x.fillRect(breite*0.2, hoehe*0.2, breite*0.6, hoehe*0.3);
  return new Promise(function(fertig){ c.toBlob(fertig, 'image/png'); });
}
function masse(blob){
  return new Promise(function(fertig, fehler){
    var url = URL.createObjectURL(blob), img = new Image();
    img.onload = function(){ URL.revokeObjectURL(url); fertig([img.naturalWidth, img.naturalHeight]); };
    img.onerror = fehler;
    img.src = url;
  });
}
async function bytes(blob){ return Array.from(new Uint8Array(await blob.arrayBuffer())); }

test('photoFromFile: verkleinert auf 1280 und 240, Seitenverhältnis bleibt', async function(){
  var p = await photoFromFile(await testbild(3000, 4000));
  gleich(await masse(p.bild), [960, MAX_EDGE]);
  gleich(await masse(p.klein), [180, THUMB_EDGE]);
  gleich(p.bild.type, 'image/jpeg');
  wahr(p.klein.size < p.bild.size);
});
test('photoFromFile: kleine Bilder werden nicht vergrößert', async function(){
  var p = await photoFromFile(await testbild(400, 300));
  gleich(await masse(p.bild), [400, 300]);
  gleich(await masse(p.klein), [240, 180]);
});
test('photoFromFile: keine Bilddatei -> Fehler', async function(){
  var fehler = false;
  try{ await photoFromFile(new Blob(['kein Bild'], {type:'text/plain'})); }catch(e){ fehler = true; }
  wahr(fehler);
});
test('blobToDataUrl + dataUrlToBlob: Hin- und Rückweg Byte für Byte', async function(){
  var p = await photoFromFile(await testbild(300, 400));
  var text = await blobToDataUrl(p.bild);
  wahr(text.indexOf('data:image/jpeg;base64,') === 0);
  var zurueck = dataUrlToBlob(text);
  gleich(zurueck.type, 'image/jpeg');
  gleich(await bytes(zurueck), await bytes(p.bild));
});
test('dataUrlToBlob: Unsinn wird abgelehnt', function(){
  wirft(function(){ dataUrlToBlob('kein bild'); });
  wirft(function(){ dataUrlToBlob(null); });
});
test('photoFromDataUrl: Bild bleibt wie gesichert, Vorschau wird neu erzeugt', async function(){
  var p = await photoFromFile(await testbild(600, 800));
  var q = await photoFromDataUrl(await blobToDataUrl(p.bild));
  gleich(await bytes(q.bild), await bytes(p.bild));
  gleich(await masse(q.klein), [180, 240]);
});

// Eigene Test-Datenbank, damit die echten Fotos unberührt bleiben
test('Foto-Speicher: ablegen, lesen, Vorschauliste, entfernen', async function(){
  var name = 'kaffee-logbuch-test';
  await new Promise(function(f){ var r = indexedDB.deleteDatabase(name); r.onsuccess = r.onerror = r.onblocked = f; });
  var s = photoStore(name);
  var p = await photoFromFile(await testbild(300, 400));
  gleich(await s.get('f-1'), null);
  gleich(await s.thumbs(), []);
  await s.put('f-1', p);
  await s.put('f-2', p);
  var gross = await s.get('f-1');
  gleich(gross.type, 'image/jpeg');
  gleich(await bytes(gross), await bytes(p.bild));
  var liste = await s.thumbs();
  gleich(liste.map(function(t){ return t.id; }), ['f-1', 'f-2']);
  gleich(await bytes(liste[0].klein), await bytes(p.klein));
  await s.remove('f-1');
  gleich(await s.get('f-1'), null);
  gleich((await s.thumbs()).length, 1);
  await s.close();
  await new Promise(function(f){ var r = indexedDB.deleteDatabase(name); r.onsuccess = r.onerror = r.onblocked = f; });
});
