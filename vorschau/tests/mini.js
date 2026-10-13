// Kleiner Testläufer ohne Abhängigkeiten. Läuft im Browser (tests/test.html).
var faelle = [];

export function test(name, fn){ faelle.push({name: name, fn: fn}); }

export function wahr(wert, hinweis){
  if(!wert) throw new Error(hinweis || 'erwartet: wahr');
}
export function gleich(ist, soll, hinweis){
  var a = JSON.stringify(ist), b = JSON.stringify(soll);
  if(a !== b) throw new Error((hinweis ? hinweis + ' – ' : '') + 'ist ' + a + ', soll ' + b);
}
export function wirft(fn, hinweis){
  try{ fn(); }catch(e){ return; }
  throw new Error(hinweis || 'erwartet: Fehler');
}
export async function wirftAsync(fn, hinweis){
  try{ await fn(); }catch(e){ return; }
  throw new Error(hinweis || 'erwartet: Fehler');
}

export async function lauf(){
  var liste = document.getElementById('liste');
  var ergebnis = {ok: 0, uebersprungen: 0, fehler: [], fertig: false};
  for(var i=0;i<faelle.length;i++){
    var f = faelle[i], li = document.createElement('li');
    try{
      var r = await f.fn();
      if(r === 'uebersprungen'){
        ergebnis.uebersprungen++;
        li.className = 'skip'; li.textContent = '– ' + f.name + ' (übersprungen)';
      } else {
        ergebnis.ok++;
        li.className = 'ok'; li.textContent = '✓ ' + f.name;
      }
    }catch(e){
      ergebnis.fehler.push(f.name + ': ' + e.message);
      li.className = 'fehler'; li.textContent = '✗ ' + f.name + ' – ' + e.message;
    }
    liste.appendChild(li);
  }
  ergebnis.fertig = true;
  document.getElementById('summe').textContent =
    ergebnis.ok + ' bestanden, ' + ergebnis.fehler.length + ' fehlgeschlagen, ' + ergebnis.uebersprungen + ' übersprungen';
  document.body.classList.add(ergebnis.fehler.length ? 'rot' : 'gruen');
  window.__tests = ergebnis;
}
