// Blatt nach unten wegziehen, wie bei den Blättern in iOS.
//
// Das Blatt folgt dem Finger, sobald sein Inhalt ganz oben steht und die Bewegung
// nach unten geht. Losgelassen nach genug Weg oder mit Schwung schließt es,
// sonst federt es zurück. Steht der Inhalt nicht oben, wird normal gescrollt.

var WEG_PX = 140;        // ab so viel Weg schließt das Blatt (höchstens ein Viertel seiner Höhe)
var SCHWUNG = 0.5;       // oder ab dieser Geschwindigkeit in px/ms …
var SCHWUNG_WEG_PX = 40; // … wenn mindestens so weit gezogen wurde
var DAUER_MS = 200;

export function swipeToClose(overlay, close){
  var sheet = overlay.querySelector('.sheet');
  var startX = 0, startY = 0, startT = 0, dy = 0;
  var phase = null; // null = kein Finger, 'offen' = noch unentschieden, 'zieht', 'aus'

  function clear(){
    sheet.style.transition = '';
    sheet.style.transform = '';
    overlay.style.transition = '';
    overlay.style.backgroundColor = '';
  }

  sheet.addEventListener('touchstart', function(ev){
    if(ev.touches.length !== 1){ phase = 'aus'; return; }
    var t = ev.touches[0];
    startX = t.clientX; startY = t.clientY; startT = ev.timeStamp; dy = 0;
    // Schieberegler und gescrollte Textfelder behalten ihre eigene Geste
    var area = ev.target.closest('textarea');
    phase = (ev.target.closest('input[type=range]') || (area && area.scrollTop > 0)) ? 'aus' : 'offen';
  }, {passive: true});

  sheet.addEventListener('touchmove', function(ev){
    if(phase !== 'offen' && phase !== 'zieht') return;
    var t = ev.touches[0];
    var dx = t.clientX - startX;
    dy = t.clientY - startY;
    if(phase === 'offen'){
      if(Math.abs(dy) < 5 && Math.abs(dx) < 5) return;
      if(dy > 0 && Math.abs(dy) > Math.abs(dx) && sheet.scrollTop <= 0){
        phase = 'zieht';
        sheet.style.transition = 'none';
        overlay.style.transition = 'none';
      } else {
        phase = 'aus';
        return;
      }
    }
    if(ev.cancelable) ev.preventDefault();
    var y = Math.max(0, dy);
    sheet.style.transform = 'translateY(' + y + 'px)';
    // Hintergrund hellt sich mit dem Weg auf
    overlay.style.backgroundColor = 'rgba(10,7,5,' + (0.6 * (1 - Math.min(1, y / sheet.offsetHeight))).toFixed(3) + ')';
  }, {passive: false});

  function end(ev){
    if(phase !== 'zieht'){ phase = null; return; }
    phase = null;
    var speed = dy / Math.max(1, ev.timeStamp - startT);
    var weit = dy > Math.min(WEG_PX, sheet.offsetHeight / 4);
    var schnell = dy > SCHWUNG_WEG_PX && speed > SCHWUNG;
    sheet.style.transition = 'transform ' + DAUER_MS + 'ms ease-out';
    overlay.style.transition = 'background-color ' + DAUER_MS + 'ms ease-out';
    if(weit || schnell){
      sheet.style.transform = 'translateY(100%)';
      overlay.style.backgroundColor = 'rgba(10,7,5,0)';
      setTimeout(function(){ close(); clear(); }, DAUER_MS);
    } else {
      sheet.style.transform = '';
      overlay.style.backgroundColor = '';
      setTimeout(clear, DAUER_MS + 20);
    }
  }
  sheet.addEventListener('touchend', end);
  sheet.addEventListener('touchcancel', end);
}
