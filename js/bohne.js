// Bohnen-Symbol der Bewertung. Vom Nutzer am 13.10.2026 abgenommen – nicht ohne Rückfrage ändern.
//
// ViewBox 0 0 24 24, um 20° gekippt. Zwei Hälften, die sich an beiden Spitzen
// berühren; dazwischen die dunkle Lücke (in der Mitte 1,3 breit, an den Enden
// spitz: beide Kanten verlassen die Spitze in derselben Richtung).
// Voll, halb und leer sind exakt gleich groß und haben dieselbe Lücke:
//   gefüllte Hälfte = Fläche ohne Strich
//   leere Hälfte    = Kontur nach innen, außen 0,6 und entlang der Lücke 0,3
// „Nach innen“ heißt: doppelte Strichstärke, auf die eigene Hälfte beschnitten.
import { fractionFor } from './daten.js';

var LEFT = 'M12,3 C13.58,6.95 9.18,13.95 12,21 C8,20.5 5.5,17 5.5,12.5 C5.5,8 7,3.5 12,3 Z';
var RIGHT = 'M12,3 C14.82,10.05 10.42,17.05 12,21 C16,20.5 18.5,17 18.5,12.5 C18.5,8 17,3.5 12,3 Z';
var OUTER = 'M12,3 C17,3.5 18.5,8 18.5,12.5 C18.5,17 16,20.5 12,21 C8,20.5 5.5,17 5.5,12.5 C5.5,8 7,3.5 12,3 Z';

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
