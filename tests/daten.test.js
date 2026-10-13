import { test, gleich, wahr, wirft } from './mini.js';
import { normKey, entryKey, escapeHtml, fmtRatio, fmtDecimal, fractionFor, toV2Entry, sortEntries, mergeImport } from '../js/daten.js';

// Beispiel aus der Übergabe (Format v2)
var SOMMER = {name:'Sommer', roastery:'Heilandt', gramsIn:18, gramsOut:40, brewSeconds:29, grind:2.9, rating:4, notes:'Sehr floral/fruchtig.', createdAt:1786355636748};

test('normKey: trimmt, klein, Leerzeichen zusammengefasst', function(){
  gleich(normKey('  Ethiopia   Guji '), 'ethiopia guji');
  gleich(normKey(null), '');
});
test('entryKey: Name + Rösterei', function(){
  gleich(entryKey({name:' Sommer', roastery:'HEILANDT '}), 'sommer||heilandt');
  gleich(entryKey({name:'Sommer'}), 'sommer||');
});
test('escapeHtml', function(){
  gleich(escapeHtml('<b>"A" & \'B\'</b>'), '&lt;b&gt;&quot;A&quot; &amp; &#39;B&#39;&lt;/b&gt;');
});
test('fmtRatio', function(){
  gleich(fmtRatio(18, 40), '1 : 2,2');
  gleich(fmtRatio(0, 40), '—');
  gleich(fmtRatio(18, NaN), '—');
});
test('fmtDecimal', function(){
  gleich(fmtDecimal(2.9), '2,9');
  gleich(fmtDecimal(10), '10,0');
  gleich(fmtDecimal(undefined), '0,0');
});
test('fractionFor: 3,5 von 5', function(){
  gleich([1,2,3,4,5].map(function(i){ return fractionFor(3.5, i); }), [1,1,1,0.5,0]);
});
test('toV2Entry: v2 bleibt unverändert', function(){
  gleich(toV2Entry(SOMMER), SOMMER);
});
test('toV2Entry: v1 mit brewMin/brewSec', function(){
  var e = toV2Entry({id:'x1', name:'Alt', roastery:'R', gramsIn:18, gramsOut:36, brewMin:1, brewSec:5, rating:3, createdAt:5});
  gleich(e.brewSeconds, 65);
  gleich(e.grind, 10);
  gleich(e.notes, '');
  wahr(!('id' in e), 'id entfällt');
});
test('sortEntries: Neueste und Beste', function(){
  var l = [{name:'a', rating:2, createdAt:1}, {name:'b', rating:5, createdAt:2}, {name:'c', rating:0, createdAt:3}];
  gleich(sortEntries(l, 'date').map(function(e){ return e.name; }), ['c','b','a']);
  gleich(sortEntries(l, 'rating').map(function(e){ return e.name; }), ['b','a','c']);
  gleich(l[0].name, 'a', 'Original bleibt unverändert');
});
test('mergeImport: überspringt vorhandene Name+Rösterei', function(){
  var r = mergeImport([SOMMER], [{name:'sommer ', roastery:' heilandt', rating:1}, {name:'Winter', roastery:'Heilandt', brewMin:0, brewSec:30}]);
  gleich(r.added, 1);
  gleich(r.list.length, 2);
  gleich(r.list[0], SOMMER);
  gleich(r.list[1].brewSeconds, 30);
});
test('mergeImport: Einträge ohne Namen und Nicht-Listen', function(){
  gleich(mergeImport([], [null, {roastery:'x'}, {name:'Ok'}]).added, 1);
  wirft(function(){ mergeImport([], {name:'kein Array'}); });
});
