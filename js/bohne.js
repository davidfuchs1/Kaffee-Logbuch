// Bohnen-Symbol der Bewertung. ViewBox 0 0 24 24.
import { fractionFor } from './daten.js';

var LEFT_LOBE_PATH = 'M12,3 C12.4,8 10.4,15 12,21 C8,20.5 5.5,17 5.5,12.5 C5.5,8 7,3.5 12,3 Z';
var RIGHT_LOBE_PATH = 'M12,3 C17,3.5 18.5,8 18.5,12.5 C18.5,17 16,20.5 12,21 C11.6,15 13.6,8 12,3 Z';

export function beanSVG(fraction){
  fraction = Math.max(0, Math.min(1, fraction));
  var leftClass = fraction >= 0.5 ? 'lobe-fill' : 'lobe-empty';
  var rightClass = fraction >= 1 ? 'lobe-fill' : 'lobe-empty';
  return '<svg viewBox="0 0 24 24">'+
    '<path class="'+leftClass+'" d="'+LEFT_LOBE_PATH+'"/>'+
    '<path class="'+rightClass+'" d="'+RIGHT_LOBE_PATH+'"/>'+
  '</svg>';
}
export function beansRow(rating){
  var html = '';
  for(var i=1;i<=5;i++){ html += beanSVG(fractionFor(rating,i)); }
  return html;
}
