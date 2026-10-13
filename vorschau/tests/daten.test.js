import { test, gleich, wahr, wirft } from './mini.js';
import {
  normKey, entryKey, escapeHtml, fmtRatio, fmtDecimal, fractionFor, makeId, toV3Entry, toState,
  sortEntries, findDuplicate, cleanFlavors, flavorChoices, addCustomFlavor, isStandardFlavor,
  STANDARD_FLAVORS, buildBackup, mergeImport, emptyState, backupStatus, backupDue, countChange, backupDone
} from '../js/daten.js';

// Beispiel aus der Übergabe (Format v2)
var SOMMER = {name:'Sommer', roastery:'Heilandt', gramsIn:18, gramsOut:40, brewSeconds:29, grind:2.9, rating:4, notes:'Sehr floral/fruchtig.', createdAt:1786355636748};
var V2_FELDER = ['name','roastery','gramsIn','gramsOut','brewSeconds','grind','rating','notes','createdAt'];
var TAG = 86400000;

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

// ---------- Migration ----------

test('toV3Entry: v2-Felder bleiben exakt erhalten', function(){
  var e = toV3Entry(SOMMER);
  V2_FELDER.forEach(function(f){ gleich(e[f], SOMMER[f], f); });
  gleich(e.flavors, []);
  gleich(e.photo, null);
  gleich(e.updatedAt, SOMMER.createdAt);
});
test('toV3Entry: id ist berechnet und stabil', function(){
  var a = toV3Entry(SOMMER).id, b = toV3Entry(JSON.parse(JSON.stringify(SOMMER))).id;
  gleich(a, b);
  wahr(/^k-[0-9a-z]+-[0-9a-z]+$/.test(a), a);
  gleich(makeId({name:' sommer ', roastery:'HEILANDT', createdAt:SOMMER.createdAt}), a, 'Schreibweise egal');
  wahr(makeId({name:'Winter', roastery:'Heilandt', createdAt:SOMMER.createdAt}) !== a, 'anderer Kaffee, andere id');
});
test('toV3Entry: v1 mit eigener id und brewMin/brewSec', function(){
  var e = toV3Entry({id:'x1', name:'Alt', roastery:'R', gramsIn:18, gramsOut:36, brewMin:1, brewSec:5, rating:3, createdAt:5});
  gleich(e.brewSeconds, 65);
  gleich(e.grind, 10);
  gleich(e.notes, '');
  wahr(e.id.indexOf('k-') === 0, 'alte id wird ersetzt');
});
test('toV3Entry: v3 bleibt unverändert', function(){
  var e = toV3Entry(Object.assign({}, SOMMER, {flavors:['Floral','Beeren'], photo:'f-1', updatedAt:99}));
  gleich(toV3Entry(e), e);
});
test('toState: Liste v2 -> Zustand v3', function(){
  var s = toState([SOMMER, Object.assign({}, SOMMER, {name:'Winter'})]);
  gleich(s.formatVersion, 3);
  gleich(s.customFlavors, []);
  gleich(s.entries.length, 2);
  wahr(s.entries[0].id !== s.entries[1].id);
});
test('toState: gleiche id zweimal wird eindeutig gemacht', function(){
  var s = toState([SOMMER, SOMMER]);
  gleich(s.entries[1].id, s.entries[0].id + '-2');
});
test('toState: Zustand v3 mit eigenen Noten', function(){
  var s = toState({formatVersion:3, customFlavors:['Marzipan',' marzipan ',''], entries:[SOMMER, null, 'x']});
  gleich(s.customFlavors, ['Marzipan']);
  gleich(s.entries.length, 1);
});
test('toState: Unsinn wird abgelehnt', function(){
  wirft(function(){ toState({name:'kein Format'}); });
  wirft(function(){ toState(null); });
  wirft(function(){ toState('text'); });
});

// ---------- Liste ----------

test('sortEntries: Neueste und Beste', function(){
  var l = [{name:'a', rating:2, createdAt:1}, {name:'b', rating:5, createdAt:2}, {name:'c', rating:0, createdAt:3}];
  gleich(sortEntries(l, 'date').map(function(e){ return e.name; }), ['c','b','a']);
  gleich(sortEntries(l, 'rating').map(function(e){ return e.name; }), ['b','a','c']);
  gleich(l[0].name, 'a', 'Original bleibt unverändert');
});
test('findDuplicate: Name + Rösterei nur einmal', function(){
  var s = toState([SOMMER]);
  wahr(findDuplicate(s.entries, ' sommer', 'HEILANDT ', null), 'gleiche Kombination');
  gleich(findDuplicate(s.entries, 'Sommer', 'Heilandt', s.entries[0].id), null, 'sich selbst beim Bearbeiten');
  gleich(findDuplicate(s.entries, 'Sommer', 'Kaffeemacher', null), null, 'andere Rösterei');
});

// ---------- Geschmacksnoten ----------

test('Standardnoten: zehn Stück wie festgelegt', function(){
  gleich(STANDARD_FLAVORS, ['Schokolade','Nuss','Karamell','Beeren','Zitrus','Steinobst','Floral','Würzig','Kakao','Milchschokolade']);
});
test('cleanFlavors: ohne Leere und Doppelte', function(){
  gleich(cleanFlavors([' Nuss ', 'nuss', '', null, 'Rote  Beeren']), ['Nuss', 'Rote Beeren']);
  gleich(cleanFlavors(undefined), []);
});
test('addCustomFlavor: merkt neue, erkennt vorhandene', function(){
  var s = emptyState();
  gleich(addCustomFlavor(s, '  Marzipan '), 'Marzipan');
  gleich(addCustomFlavor(s, 'marzipan'), 'Marzipan');
  gleich(addCustomFlavor(s, 'nuss'), 'Nuss', 'Standardnote wird nicht doppelt gemerkt');
  gleich(addCustomFlavor(s, '   '), '');
  gleich(s.customFlavors, ['Marzipan']);
});
test('flavorChoices: Standard, eigene, dann die des Eintrags', function(){
  var s = emptyState(); s.customFlavors = ['Marzipan'];
  var c = flavorChoices(s, ['Tabak', 'Nuss']);
  gleich(c.length, 12);
  gleich(c.slice(10), ['Marzipan', 'Tabak']);
  wahr(isStandardFlavor('kakao') && !isStandardFlavor('Marzipan'));
});

// ---------- Sicherung ----------

test('buildBackup + mergeImport: Hin- und Rückweg ergibt denselben Stand', function(){
  var s = toState([SOMMER, Object.assign({}, SOMMER, {name:'Winter', createdAt:SOMMER.createdAt + 1})]);
  s.customFlavors = ['Marzipan'];
  s.entries[0].flavors = ['Floral', 'Marzipan'];
  s.entries[0].photo = 'f-a';
  var datei = JSON.parse(JSON.stringify(buildBackup(s, {'f-a':'data:image/jpeg;base64,AAAA', 'f-verwaist':'data:image/jpeg;base64,BBBB'})));
  gleich(Object.keys(datei.photos), ['f-a'], 'nur verwendete Fotos');
  var r = mergeImport(emptyState(), datei);
  gleich(r.added, 2);
  gleich(r.state.entries, s.entries);
  gleich(r.state.customFlavors, ['Marzipan']);
  gleich(r.newPhotos, {'f-a':'data:image/jpeg;base64,AAAA'});
});
test('mergeImport: Backup v2 (Liste) wird gelesen', function(){
  var r = mergeImport(emptyState(), [SOMMER, {name:'Alt', roastery:'R', brewMin:0, brewSec:30}]);
  gleich(r.added, 2);
  gleich(r.state.entries[1].brewSeconds, 30);
  gleich(r.newPhotos, {});
});
test('mergeImport: überspringt vorhandene Name+Rösterei, verändert den alten Stand nicht', function(){
  var s = toState([SOMMER]);
  var vorher = JSON.stringify(s);
  var r = mergeImport(s, [{name:'sommer ', roastery:' heilandt', rating:1}, {name:'Winter', roastery:'Heilandt'}]);
  gleich(r.added, 1);
  gleich(r.skipped, 1);
  gleich(r.state.entries[0].rating, 4, 'vorhandener Eintrag bleibt');
  gleich(JSON.stringify(s), vorher);
});
test('mergeImport: Foto eines übersprungenen Eintrags wird nicht übernommen', function(){
  var s = toState([SOMMER]);
  var datei = buildBackup(toState([Object.assign({}, SOMMER, {photo:'f-x'})]), {'f-x':'data:image/jpeg;base64,AAAA'});
  gleich(mergeImport(s, datei).newPhotos, {});
});
test('mergeImport: Eintrag zeigt auf fehlendes Foto -> ohne Foto', function(){
  var r = mergeImport(emptyState(), {formatVersion:3, entries:[Object.assign({}, SOMMER, {photo:'f-weg'})], photos:{}});
  gleich(r.state.entries[0].photo, null);
});
test('mergeImport: Einträge ohne Namen und Unsinn', function(){
  gleich(mergeImport(emptyState(), [null, {roastery:'x'}, {name:'Ok'}]).added, 1);
  wirft(function(){ mergeImport(emptyState(), {name:'kein Format'}); });
});

// ---------- Erinnerung ----------

test('backupStatus: Texte', function(){
  var jetzt = 100 * TAG;
  gleich(backupStatus({lastBackupAt:null, changesSinceBackup:0}, jetzt), 'Noch nie gesichert');
  gleich(backupStatus({lastBackupAt:null, changesSinceBackup:2}, jetzt), 'Noch nie gesichert · 2 ungesicherte Änderungen');
  gleich(backupStatus({lastBackupAt:jetzt - 1000, changesSinceBackup:0}, jetzt), 'Letzte Sicherung heute · alles gesichert');
  gleich(backupStatus({lastBackupAt:jetzt - TAG, changesSinceBackup:1}, jetzt), 'Letzte Sicherung gestern · 1 ungesicherte Änderung');
  gleich(backupStatus({lastBackupAt:jetzt - 12*TAG, changesSinceBackup:3}, jetzt), 'Letzte Sicherung vor 12 Tagen · 3 ungesicherte Änderungen');
});
test('backupDue: ab 3 Änderungen oder nach 14 Tagen', function(){
  var jetzt = 100 * TAG;
  wahr(!backupDue({lastBackupAt:null, changesSinceBackup:0}, jetzt));
  wahr(!backupDue({lastBackupAt:jetzt - 30*TAG, changesSinceBackup:0}, jetzt), 'nichts geändert');
  wahr(!backupDue({lastBackupAt:jetzt - 2*TAG, changesSinceBackup:2}, jetzt));
  wahr(backupDue({lastBackupAt:jetzt - 2*TAG, changesSinceBackup:3}, jetzt));
  wahr(backupDue({lastBackupAt:jetzt - 14*TAG, changesSinceBackup:1}, jetzt));
  wahr(backupDue({lastBackupAt:null, changesSinceBackup:1, firstChangeAt:jetzt - 20*TAG}, jetzt), 'nie gesichert, alte Änderung');
});
test('countChange und backupDone', function(){
  var m = countChange({lastBackupAt:5, changesSinceBackup:0, firstChangeAt:null}, 1000);
  gleich(m, {lastBackupAt:5, changesSinceBackup:1, firstChangeAt:1000});
  gleich(countChange(m, 2000), {lastBackupAt:5, changesSinceBackup:2, firstChangeAt:1000});
  gleich(backupDone(3000), {lastBackupAt:3000, changesSinceBackup:0, firstChangeAt:null});
});
