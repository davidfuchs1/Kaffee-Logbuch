// Bohnen-Symbol der Bewertung. Vom Nutzer abgenommen (Form 13.10.2026, Enden 14.10.2026) –
// nicht ohne Rückfrage ändern. Das App-Icon verwendet dieselben Pfade.
//
// ViewBox 0 0 24 24, um 20° gekippt. Zwei Hälften, die sich an beiden Enden
// berühren; dazwischen die dunkle Lücke (in der Mitte 1,3 breit, an den Enden
// spitz: beide Kanten verlassen den Scheitel in derselben Richtung).
// Die Außenform ist ein glattes Oval: Die Kanten liefen früher mit einem Knick
// (oben 11,4°, unten 14,3°) in einer Spitze zusammen, die als Zipfel herausstand.
// Nur die letzten 1,2 Einheiten links und rechts davon sind durch einen Bogen
// ersetzt; der Rest der Rundung ist unverändert (14.10.2026 abgenommen).
// Voll, halb und leer sind exakt gleich groß und haben dieselbe Lücke:
//   gefüllte Hälfte = Fläche ohne Strich
//   leere Hälfte    = Kontur nach innen, außen 0,6 und entlang der Lücke 0,3
// „Nach innen“ heißt: doppelte Strichstärke, auf die eigene Hälfte beschnitten.
import { fractionFor } from './daten.js';

var LEFT = 'M12,3.058 C13.58,7.007 9.18,13.874 12,20.925 C11.596,20.925 11.191,20.866 10.8,20.748 C7.506,19.76 5.5,16.531 5.5,12.5 C5.5,8.382 6.756,4.265 10.8,3.212 C11.193,3.109 11.597,3.058 12,3.058 Z';
var RIGHT = 'M12,3.058 C14.82,10.109 10.42,16.976 12,20.925 C12.404,20.925 12.809,20.866 13.2,20.748 C16.494,19.76 18.5,16.531 18.5,12.5 C18.5,8.382 17.244,4.265 13.2,3.212 C12.807,3.109 12.403,3.058 12,3.058 Z';
var OUTER = 'M12,3.058 C12.403,3.058 12.807,3.109 13.2,3.212 C17.244,4.265 18.5,8.382 18.5,12.5 C18.5,16.531 16.494,19.76 13.2,20.748 C12.809,20.866 12.404,20.925 12,20.925 C11.596,20.925 11.191,20.866 10.8,20.748 C7.506,19.76 5.5,16.531 5.5,12.5 C5.5,8.382 6.756,4.265 10.8,3.212 C11.193,3.109 11.597,3.058 12,3.058 Z';

function emptyHalf(side, d){
  return '<clipPath id="bohne-clip-'+side+'"><path d="'+d+'"/></clipPath>'+
    '<g id="bohne-leer-'+side+'" clip-path="url(#bohne-clip-'+side+')" fill="none" stroke="currentColor">'+
      '<path d="'+OUTER+'" stroke-width="1.2"/>'+
      '<path d="'+d+'" stroke-width="0.6"/>'+
    '</g>';
}

// Einmal ins Dokument einfügen; die Symbole verweisen darauf.
export function beanDefs(){
  return '<svg class="svg-defs" aria-hidden="true"><defs>'+
    '<path id="bohne-voll-links" d="'+LEFT+'"/>'+
    '<path id="bohne-voll-rechts" d="'+RIGHT+'"/>'+
    emptyHalf('links', LEFT)+
    emptyHalf('rechts', RIGHT)+
  '</defs></svg>';
}

function half(side, filled){
  return filled
    ? '<use href="#bohne-voll-'+side+'" class="bean-fill"/>'
    : '<use href="#bohne-leer-'+side+'"/>';
}

export function beanSVG(fraction){
  fraction = Math.max(0, Math.min(1, fraction));
  return '<svg viewBox="0 0 24 24" class="bean"><g transform="rotate(20 12 12)">'+
    half('links', fraction >= 0.5)+
    half('rechts', fraction >= 1)+
  '</g></svg>';
}
export function beansRow(rating){
  var html = '';
  for(var i=1;i<=5;i++){ html += beanSVG(fractionFor(rating,i)); }
  return html;
}
