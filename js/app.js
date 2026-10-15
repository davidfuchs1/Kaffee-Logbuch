// Oberfläche: Liste, Formular, Fotos, Sicherung.
import {
  escapeHtml, fmtRatio, fmtDecimal, fractionFor, sortEntries, findDuplicate, toV3Entry,
  flavorChoices, matchFlavor, buildBackup, mergeImport,
  backupStatus, backupDue, countChange, backupDone,
  emptyFilter, filterEntries, activeFilterCount, roasteryCounts, flavorCounts, ratingCounts,
  pruneFilter, filterChips, SINCE_STEPS
} from './daten.js';
import { loadState, saveState, loadMeta, saveMeta, photos } from './speicher.js';
import { beanDefs, beanSVG, beansRow } from './bohne.js';
import { photoFromFile, photoFromDataUrl, blobToDataUrl } from './bilder.js';
import { swipeToClose } from './ziehen.js';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function(){
    navigator.serviceWorker.register('service-worker.js').catch(function(){});
  });
}
// iOS bitten, den Gerätespeicher nicht von sich aus zu leeren (Wirkung nicht garantiert)
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().catch(function(){});
}

function $(id){ return document.getElementById(id); }

var loaded = loadState();
var state = loaded.state;
var meta = loadMeta();
var sortMode = 'date';
var filter = emptyFilter(); // nur für diese Sitzung, wird nicht gespeichert
var editingId = null; // null = neuer Eintrag
var currentRating = 0;
var currentFlavors = [];
var formFlavors = []; // eigene Noten, die in diesem Formular zur Auswahl stehen
var deleteArmed = false;
var saving = false;

document.body.insertAdjacentHTML('afterbegin', beanDefs());

function persist(){
  try{ saveState(state); return true; }
  catch(e){ showToast('Speichern nicht möglich – Gerätespeicher voll?'); return false; }
}
// Zählt eine Änderung für die Erinnerung an die Sicherung
function changed(){
  meta = countChange(meta);
  saveMeta(meta);
  readyFile = null;
  updateBackupUi();
}

// ---------- Vorschaubilder ----------

var thumbUrls = {}; // Foto-id -> Adresse des Vorschaubilds

function setThumb(id, blob){
  if(thumbUrls[id]) URL.revokeObjectURL(thumbUrls[id]);
  thumbUrls[id] = URL.createObjectURL(blob);
}
function removePhoto(id){
  if(thumbUrls[id]){ URL.revokeObjectURL(thumbUrls[id]); delete thumbUrls[id]; }
  photos.remove(id).catch(function(){});
}

// ---------- Liste ----------

var listEl = $('list');
var countLbl = $('countLbl');

function render(){
  var all = state.entries;
  filter = pruneFilter(filter, all);
  var entries = filterEntries(all, filter);
  var active = activeFilterCount(filter);
  countLbl.textContent = active ? entries.length + ' von ' + all.length
    : all.length + (all.length===1 ? ' Eintrag' : ' Einträge');
  renderFilterUi(active);

  if(all.length === 0){
    listEl.innerHTML = '<div class="empty">'+
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 8h13a3 3 0 010 6h-1"/><path d="M4 8v7a3 3 0 003 3h6a3 3 0 003-3V8"/><path d="M8 2c0 1-1 1-1 2s1 1 1 2"/><path d="M12 2c0 1-1 1-1 2s1 1 1 2"/></svg>'+
      '<p>Noch kein Kaffee protokolliert.</p>'+
      '<div class="sub">Tippe unten rechts auf + für den ersten Eintrag.</div>'+
    '</div>';
    return;
  }
  if(entries.length === 0){
    listEl.innerHTML = '<div class="empty">'+
      '<p>Kein Kaffee passt zu diesen Filtern.</p>'+
      '<button type="button" class="btn-small" data-filter-reset>Filter zurücksetzen</button>'+
    '</div>';
    return;
  }

  listEl.innerHTML = sortEntries(entries, sortMode).map(function(e){
    var notesHtml = e.notes ? '<p class="card-notes">'+escapeHtml(e.notes)+'</p>' : '';
    var grindVal = e.grind!=null ? e.grind : 10;
    var photoHtml = e.photo ? '<div class="card-photo">'+
      (thumbUrls[e.photo] ? '<img src="'+thumbUrls[e.photo]+'" alt="">' : '')+'</div>' : '';
    var flavorsHtml = e.flavors.length ? '<div class="card-flavors">'+e.flavors.map(function(f){
      return '<span class="flavor">'+escapeHtml(f)+'</span>';
    }).join('')+'</div>' : '';
    return '<div class="card" data-id="'+escapeHtml(e.id)+'">'+
      '<div class="card-head">'+
        photoHtml+
        '<div class="card-title">'+
          '<p class="card-eyebrow">'+escapeHtml(e.roastery||'Rösterei unbekannt')+'</p>'+
          '<h3 class="card-name">'+escapeHtml(e.name||'Ohne Namen')+'</h3>'+
          '<div class="beans">'+beansRow(e.rating||0)+'</div>'+
        '</div>'+
      '</div>'+
      '<div class="card-meta">'+
        '<span class="badge ratio">'+fmtRatio(e.gramsIn,e.gramsOut)+'</span>'+
        '<span class="badge">'+(e.gramsIn||'–')+'g <span class="lbl">→</span> '+(e.gramsOut||'–')+'g</span>'+
        '<span class="badge">'+(e.brewSeconds||0)+' <span class="lbl">Sek</span></span>'+
        '<span class="badge">'+fmtDecimal(grindVal)+' <span class="lbl">Mahlgrad</span></span>'+
      '</div>'+
      flavorsHtml+
      notesHtml+
    '</div>';
  }).join('');
}

document.querySelectorAll('.sort button').forEach(function(btn){
  btn.addEventListener('click', function(){
    sortMode = btn.dataset.sort;
    document.querySelectorAll('.sort button').forEach(function(b){b.classList.remove('active');});
    btn.classList.add('active');
    render();
  });
});

listEl.addEventListener('click', function(ev){
  if(ev.target.closest('[data-filter-reset]')){ resetFilter(); return; }
  var card = ev.target.closest('.card');
  if(!card) return;
  openSheet(card.dataset.id);
});

// ---------- Filter ----------
// Jede Auswahl im Blatt wirkt sofort; die Liste dahinter zeigt das Ergebnis schon an.
// Schließen behält den Filter, „Zurücksetzen“ leert ihn.

var filterOverlay = $('filterOverlay');
var btnFilter = $('btnFilter');
var fSearch = $('fSearch');
var activeFiltersEl = $('activeFilters');
var CLEAR_GROUP = {
  text: {text: ''}, roasteries: {roasteries: []}, flavors: {flavors: []}, rating: {rating: ''}, since: {since: 0}
};

function setFilter(patch){
  filter = Object.assign({}, filter, patch);
  render();
}
function resetFilter(){
  filter = emptyFilter();
  fSearch.value = '';
  render();
}
function toggleKey(list, key){
  return list.indexOf(key) === -1 ? list.concat([key]) : list.filter(function(k){ return k !== key; });
}

function chipHtml(item, on, attr){
  return '<button type="button" class="chip'+(on?' on':'')+'" aria-pressed="'+on+'" '+attr+'="'+escapeHtml(item.key)+'">'+
    escapeHtml(item.label)+'<span class="anzahl">'+item.count+'</span></button>';
}

// Knopf mit Anzahl und die Zeile mit den aktiven Kriterien über der Liste
function renderFilterUi(active){
  btnFilter.hidden = state.entries.length === 0 && !active;
  btnFilter.classList.toggle('on', active > 0);
  btnFilter.setAttribute('aria-label', active ? 'Filtern, ' + active + ' aktiv' : 'Filtern');
  $('filterCount').hidden = !active;
  $('filterCount').textContent = active;
  var chips = filterChips(filter, state.entries);
  activeFiltersEl.hidden = !chips.length;
  activeFiltersEl.innerHTML = chips.map(function(c){
    return '<button type="button" class="af-chip" data-group="'+c.group+'" aria-label="'+escapeHtml(c.label)+' entfernen">'+
      '<span>'+escapeHtml(c.label)+'</span><span class="x" aria-hidden="true">×</span></button>';
  }).join('') + (chips.length > 1 ? '<button type="button" class="af-loeschen" data-filter-reset>alle löschen</button>' : '');
  if(filterOverlay.classList.contains('open')) renderFilterSheet();
}

function renderFilterSheet(){
  var all = state.entries;
  var r = roasteryCounts(all), n = flavorCounts(all);
  $('filterRoasteries').innerHTML = r.length ? r.map(function(x){
    return chipHtml(x, filter.roasteries.indexOf(x.key) !== -1, 'data-roastery');
  }).join('') : '<p class="leer">Noch keine Einträge.</p>';
  $('filterFlavors').innerHTML = n.length ? n.map(function(x){
    return chipHtml(x, filter.flavors.indexOf(x.key) !== -1, 'data-flavor');
  }).join('') : '<p class="leer">Noch keine Noten eingetragen.</p>';
  $('filterRating').innerHTML = [{key: '', label: 'Alle', count: all.length}].concat(ratingCounts(all)).map(function(x){
    return chipHtml(x, filter.rating === x.key, 'data-rating');
  }).join('');
  $('flavorMode').querySelectorAll('button').forEach(function(b){
    b.classList.toggle('active', b.dataset.mode === filter.flavorMode);
    b.setAttribute('aria-pressed', b.dataset.mode === filter.flavorMode);
  });
  $('filterSince').innerHTML = SINCE_STEPS.map(function(s){
    var on = filter.since === s.days;
    return '<button type="button" data-since="'+s.days+'" aria-pressed="'+on+'"'+(on?' class="active"':'')+'>'+s.label+'</button>';
  }).join('');
  var hits = filterEntries(all, filter).length;
  $('btnFilterShow').textContent = hits === 0 ? 'Kein Kaffee passt'
    : (hits === 1 ? '1 Kaffee anzeigen' : hits + ' Kaffees anzeigen');
}

function openFilter(){
  fSearch.value = filter.text;
  renderFilterSheet();
  filterOverlay.querySelector('.sheet').scrollTop = 0;
  filterOverlay.classList.add('open');
}
function closeFilter(){
  fSearch.blur();
  filterOverlay.classList.remove('open');
}

btnFilter.addEventListener('click', openFilter);
$('btnFilterShow').addEventListener('click', closeFilter);
$('btnFilterReset').addEventListener('click', resetFilter);
filterOverlay.addEventListener('click', function(ev){ if(ev.target === filterOverlay) closeFilter(); });
swipeToClose(filterOverlay, closeFilter);

fSearch.addEventListener('input', function(){ setFilter({text: fSearch.value}); });
fSearch.addEventListener('keydown', function(ev){
  if(ev.key === 'Enter'){ ev.preventDefault(); fSearch.blur(); }
});
$('filterRoasteries').addEventListener('click', function(ev){
  var chip = ev.target.closest('[data-roastery]');
  if(chip) setFilter({roasteries: toggleKey(filter.roasteries, chip.dataset.roastery)});
});
$('filterFlavors').addEventListener('click', function(ev){
  var chip = ev.target.closest('[data-flavor]');
  if(chip) setFilter({flavors: toggleKey(filter.flavors, chip.dataset.flavor)});
});
$('flavorMode').addEventListener('click', function(ev){
  var b = ev.target.closest('[data-mode]');
  if(b) setFilter({flavorMode: b.dataset.mode});
});
// Nochmal tippen auf die aktive Stufe = Alle
$('filterRating').addEventListener('click', function(ev){
  var chip = ev.target.closest('[data-rating]');
  if(chip) setFilter({rating: filter.rating === chip.dataset.rating ? '' : chip.dataset.rating});
});
$('filterSince').addEventListener('click', function(ev){
  var b = ev.target.closest('[data-since]');
  if(b) setFilter({since: Number(b.dataset.since)});
});
activeFiltersEl.addEventListener('click', function(ev){
  if(ev.target.closest('[data-filter-reset]')){ resetFilter(); return; }
  var chip = ev.target.closest('[data-group]');
  if(!chip) return;
  if(chip.dataset.group === 'text') fSearch.value = '';
  setFilter(CLEAR_GROUP[chip.dataset.group]);
});

// ---------- Formular ----------

var overlay = $('overlay');
var beanPicker = $('beanPicker');
var ratingLbl = $('ratingLbl');
var btnDelete = $('btnDelete');
var dupWarning = $('dupWarning');

function renderBeanPicker(){
  beanPicker.innerHTML = '';
  for(var i=1;i<=5;i++){
    (function(i){
      var b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = beanSVG(fractionFor(currentRating,i));
      b.addEventListener('click', function(ev){
        var rect = b.getBoundingClientRect();
        var half = (ev.clientX - rect.left) < rect.width/2;
        currentRating = half ? (i-0.5) : i;
        renderBeanPicker();
      });
      beanPicker.appendChild(b);
    })(i);
  }
  ratingLbl.textContent = currentRating>0 ? (fmtDecimal(currentRating)+' / 5') : 'Noch keine Bewertung';
}

// Geschmacksnoten: Standardnoten plus die eigenen dieses Kaffees, Mehrfachauswahl per Antippen.
// Eigene Noten werden nur am Kaffee gespeichert, nicht als Liste gemerkt.
var flavorChips = $('flavorChips');
var flavorNew = $('fFlavorNew');

function renderFlavorChips(){
  flavorChips.innerHTML = flavorChoices(formFlavors).map(function(f){
    var on = currentFlavors.indexOf(f) !== -1;
    return '<button type="button" class="chip'+(on?' on':'')+'" aria-pressed="'+on+'">'+escapeHtml(f)+'</button>';
  }).join('');
}
flavorChips.addEventListener('click', function(ev){
  var chip = ev.target.closest('.chip');
  if(!chip) return;
  var f = chip.textContent, i = currentFlavors.indexOf(f);
  if(i === -1) currentFlavors.push(f); else currentFlavors.splice(i, 1);
  renderFlavorChips();
});
function addFlavorFromInput(){
  var f = matchFlavor(flavorNew.value, flavorChoices(formFlavors));
  if(!f) return;
  formFlavors.push(f);
  if(currentFlavors.indexOf(f) === -1) currentFlavors.push(f);
  flavorNew.value = '';
  renderFlavorChips();
}
$('btnFlavorAdd').addEventListener('click', addFlavorFromInput);
flavorNew.addEventListener('keydown', function(ev){
  if(ev.key === 'Enter'){ ev.preventDefault(); addFlavorFromInput(); }
});

// Foto im Formular. Gespeichert wird erst mit dem Eintrag.
//   keep = unverändert, new = neu gewählt (liegt in formPhoto.neu), none = entfernt
var formPhoto = {mode: 'keep', neu: null, url: null};
var photoBox = $('photoBox');
var photoPreview = $('photoPreview');

function showFormPhoto(url){
  photoBox.classList.toggle('has', !!url);
  photoBox.setAttribute('aria-label', url ? 'Foto groß ansehen' : 'Foto hinzufügen');
  photoPreview.hidden = !url;
  if(url) photoPreview.src = url; else photoPreview.removeAttribute('src');
  $('btnPhotoRemove').hidden = !url;
  $('btnPhotoPick').textContent = url ? 'Foto ersetzen' : 'Foto wählen';
}
function resetFormPhoto(e){
  if(formPhoto.url) URL.revokeObjectURL(formPhoto.url);
  formPhoto = {mode: 'keep', neu: null, url: null};
  showFormPhoto(e && e.photo ? (thumbUrls[e.photo] || null) : null);
}
function pickPhoto(){ $('filePhoto').click(); }

$('btnPhotoPick').addEventListener('click', pickPhoto);
$('filePhoto').addEventListener('change', function(ev){
  var file = ev.target.files[0];
  ev.target.value = '';
  if(!file) return;
  photoFromFile(file).then(function(p){
    if(formPhoto.url) URL.revokeObjectURL(formPhoto.url);
    formPhoto = {mode: 'new', neu: p, url: URL.createObjectURL(p.klein)};
    showFormPhoto(formPhoto.url);
  }).catch(function(){
    showToast('Bild konnte nicht gelesen werden.');
  });
});
$('btnPhotoRemove').addEventListener('click', function(){
  if(formPhoto.url) URL.revokeObjectURL(formPhoto.url);
  formPhoto = {mode: 'none', neu: null, url: null};
  showFormPhoto(null);
});
photoBox.addEventListener('click', function(){
  if(!photoBox.classList.contains('has')){ pickPhoto(); return; }
  var e = editingId ? findEntry(editingId) : null;
  var big = formPhoto.mode === 'new' ? Promise.resolve(formPhoto.neu.bild)
          : (e && e.photo ? photos.get(e.photo) : Promise.resolve(null));
  big.then(function(blob){ if(blob) openViewer(blob); }).catch(function(){});
});

// Foto groß ansehen; Tippen schließt
var photoOverlay = $('photoOverlay');
var viewerUrl = null;
function openViewer(blob){
  viewerUrl = URL.createObjectURL(blob);
  $('photoLarge').src = viewerUrl;
  photoOverlay.classList.add('open');
}
photoOverlay.addEventListener('click', function(){
  photoOverlay.classList.remove('open');
  $('photoLarge').removeAttribute('src');
  if(viewerUrl){ URL.revokeObjectURL(viewerUrl); viewerUrl = null; }
});

function updateRatioLive(){
  var gIn = parseFloat($('fIn').value);
  var gOut = parseFloat($('fOut').value);
  $('ratioLive').textContent = 'Verhältnis ' + fmtRatio(gIn, gOut);
}
$('fIn').addEventListener('input', updateRatioLive);
$('fOut').addEventListener('input', updateRatioLive);

$('fGrind').addEventListener('input', function(){
  $('grindLbl').textContent = fmtDecimal(parseFloat(this.value));
});

document.querySelectorAll('.step-btn').forEach(function(btn){
  btn.addEventListener('click', function(){
    var target = $(btn.dataset.target);
    if(!target) return;
    var step = parseFloat(btn.dataset.step);
    var min = btn.dataset.min !== undefined ? parseFloat(btn.dataset.min) : -Infinity;
    var cur = parseFloat(target.value);
    if(isNaN(cur)) cur = 0;
    var next = Math.round((cur + step) * 10) / 10;
    if(next < min) next = min;
    target.value = next;
    target.dispatchEvent(new Event('input', {bubbles:true}));
  });
});

function hideDupWarning(){ dupWarning.hidden = true; }
$('fName').addEventListener('input', hideDupWarning);
$('fRoastery').addEventListener('input', hideDupWarning);

function resetDeleteButton(){
  deleteArmed = false;
  btnDelete.textContent = 'Eintrag löschen';
  btnDelete.classList.remove('confirming');
  clearTimeout(btnDelete._revertTimer);
}

function findEntry(id){
  return state.entries.filter(function(x){ return x.id === id; })[0] || null;
}

function openSheet(id){
  var e = id ? findEntry(id) : null;
  editingId = e ? e.id : null;
  resetDeleteButton();
  hideDupWarning();

  $('sheetTitle').textContent = e ? 'Kaffee bearbeiten' : 'Neuer Kaffee';
  $('fName').value = e ? e.name : '';
  $('fRoastery').value = e ? e.roastery : '';
  $('fIn').value = e ? e.gramsIn : 18;
  $('fOut').value = e ? e.gramsOut : 40;
  $('fSec').value = e ? e.brewSeconds : 25;
  var grindVal = e ? (e.grind!=null ? e.grind : 10) : 10;
  $('fGrind').value = grindVal;
  $('grindLbl').textContent = fmtDecimal(grindVal);
  $('fNotes').value = e ? e.notes : '';
  currentRating = e ? (e.rating||0) : 0;
  currentFlavors = e ? e.flavors.slice() : [];
  formFlavors = currentFlavors.slice();
  flavorNew.value = '';
  renderBeanPicker();
  renderFlavorChips();
  resetFormPhoto(e);
  updateRatioLive();

  $('deleteRow').hidden = !e;
  overlay.querySelector('.sheet').scrollTop = 0;
  overlay.classList.add('open');
}
function closeSheet(){
  overlay.classList.remove('open');
  editingId = null;
  resetDeleteButton();
  resetFormPhoto(null);
}

$('btnAdd').addEventListener('click', function(){ openSheet(null); });
$('btnCancel').addEventListener('click', closeSheet);
overlay.addEventListener('click', function(ev){ if(ev.target === overlay) closeSheet(); });
swipeToClose(overlay, closeSheet);

$('btnSave').addEventListener('click', async function(){
  if(saving) return;
  var name = $('fName').value.trim();
  if(!name){ $('fName').focus(); return; }
  var roastery = $('fRoastery').value.trim();

  if(findDuplicate(state.entries, name, roastery, editingId)){
    dupWarning.hidden = false;
    overlay.querySelector('.sheet').scrollTop = 0;
    return;
  }

  var old = editingId ? findEntry(editingId) : null;
  var grindRaw = parseFloat($('fGrind').value);
  var data = toV3Entry({
    id: old ? old.id : null,
    name: name,
    roastery: roastery,
    gramsIn: parseFloat($('fIn').value) || 0,
    gramsOut: parseFloat($('fOut').value) || 0,
    brewSeconds: parseInt($('fSec').value) || 0,
    grind: isNaN(grindRaw) ? 10 : Math.round(grindRaw*10)/10,
    rating: currentRating,
    notes: $('fNotes').value.trim(),
    flavors: flavorChoices(formFlavors).filter(function(f){ return currentFlavors.indexOf(f) !== -1; }),
    photo: old ? old.photo : null,
    createdAt: old ? old.createdAt : Date.now(),
    updatedAt: Date.now()
  });

  saving = true;
  try{
    if(formPhoto.mode === 'new'){
      var photoId = 'f-' + data.id + '-' + Date.now().toString(36);
      await photos.put(photoId, formPhoto.neu);
      setThumb(photoId, formPhoto.neu.klein);
      data.photo = photoId;
    } else if(formPhoto.mode === 'none'){
      data.photo = null;
    }
  }catch(err){
    saving = false;
    showToast('Foto konnte nicht gespeichert werden.');
    return;
  }
  saving = false;

  if(old){
    state.entries[state.entries.indexOf(old)] = data;
  } else {
    state.entries.push(data);
  }
  if(!persist()) return;
  if(old && old.photo && old.photo !== data.photo) removePhoto(old.photo);
  changed();
  closeSheet();
  render();
});

btnDelete.addEventListener('click', function(){
  if(!editingId) return;
  if(!deleteArmed){
    deleteArmed = true;
    btnDelete.textContent = 'Wirklich löschen? Nochmal tippen';
    btnDelete.classList.add('confirming');
    clearTimeout(btnDelete._revertTimer);
    btnDelete._revertTimer = setTimeout(resetDeleteButton, 3000);
    return;
  }
  var old = findEntry(editingId);
  state.entries = state.entries.filter(function(x){ return x.id !== editingId; });
  if(!persist()) return;
  if(old && old.photo) removePhoto(old.photo);
  changed();
  closeSheet();
  render();
  showToast('Eintrag gelöscht.');
});

// ---------- Sicherung und Einstellungen ----------

var settingsOverlay = $('settingsOverlay');
var btnExport = $('btnExport');
var readyFile = null; // erstellte Sicherung, die noch nicht übergeben ist
var exporting = false;

function updateBackupUi(){
  $('backupDot').hidden = !backupDue(meta);
  $('backupStatus').textContent = backupStatus(meta);
  btnExport.textContent = readyFile ? 'Sicherung speichern' : 'Jetzt sichern';
}

function openSettings(){
  updateBackupUi();
  settingsOverlay.querySelector('.sheet').scrollTop = 0;
  settingsOverlay.classList.add('open');
}
function closeSettings(){
  settingsOverlay.classList.remove('open');
  readyFile = null;
}
$('btnSettings').addEventListener('click', openSettings);
$('btnSettingsClose').addEventListener('click', closeSettings);
settingsOverlay.addEventListener('click', function(ev){ if(ev.target === settingsOverlay) closeSettings(); });
swipeToClose(settingsOverlay, closeSettings);

function dateStamp(){
  var d = new Date();
  function two(n){ return (n < 10 ? '0' : '') + n; }
  return d.getFullYear() + '-' + two(d.getMonth()+1) + '-' + two(d.getDate());
}

// Eine Datei mit allen Einträgen und den zugehörigen Fotos
async function buildBackupFile(){
  var images = {};
  for(var i=0;i<state.entries.length;i++){
    var id = state.entries[i].photo;
    if(!id) continue;
    var blob = await photos.get(id);
    if(blob) images[id] = await blobToDataUrl(blob);
  }
  var json = JSON.stringify(buildBackup(state, images));
  return new File([json], 'kaffee-logbuch-backup-' + dateStamp() + '.json', {type: 'application/json'});
}

function download(file){
  var url = URL.createObjectURL(file);
  var a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
}

// Übergibt die Datei an den Teilen-Dialog (iOS: „In Dateien sichern“), sonst als Download.
// Ergebnis: 'fertig', 'abgebrochen' oder 'nochmal' (iOS verlangt einen frischen Tipp).
async function handOver(file){
  if(navigator.canShare && navigator.canShare({files: [file]})){
    try{
      await navigator.share({files: [file]});
      return 'fertig';
    }catch(e){
      if(e.name === 'AbortError') return 'abgebrochen';
      if(e.name === 'NotAllowedError') return 'nochmal';
    }
  }
  download(file);
  return 'fertig';
}

btnExport.addEventListener('click', async function(){
  if(exporting) return;
  exporting = true;
  try{
    if(!readyFile){
      btnExport.disabled = true;
      btnExport.textContent = 'Sicherung wird erstellt …';
      readyFile = await buildBackupFile();
      btnExport.disabled = false;
    }
    var result = await handOver(readyFile);
    if(result === 'fertig'){
      readyFile = null;
      meta = backupDone();
      saveMeta(meta);
      showToast('Sicherung erstellt.');
    } else if(result === 'nochmal'){
      showToast('Sicherung ist fertig. Tippe noch einmal zum Speichern.');
    }
  }catch(err){
    readyFile = null;
    showToast('Sicherung konnte nicht erstellt werden.');
  }
  btnExport.disabled = false;
  exporting = false;
  updateBackupUi();
});

function readText(file){
  return new Promise(function(resolve, reject){
    var r = new FileReader();
    r.onload = function(){ resolve(r.result); };
    r.onerror = function(){ reject(r.error); };
    r.readAsText(file);
  });
}

$('btnImport').addEventListener('click', function(){ $('fileImport').click(); });
$('fileImport').addEventListener('change', async function(ev){
  var file = ev.target.files[0];
  ev.target.value = '';
  if(!file) return;
  var result;
  try{
    result = mergeImport(state, JSON.parse(await readText(file)));
  }catch(err){
    showToast('Datei konnte nicht gelesen werden.');
    return;
  }
  // Fotos zuerst ablegen; ein unlesbares Foto kostet nur das Bild, nicht den Eintrag
  var ids = Object.keys(result.newPhotos);
  for(var i=0;i<ids.length;i++){
    try{
      var p = await photoFromDataUrl(result.newPhotos[ids[i]]);
      await photos.put(ids[i], p);
      setThumb(ids[i], p.klein);
    }catch(err){
      result.state.entries.forEach(function(e){ if(e.photo === ids[i]) e.photo = null; });
    }
  }
  state = result.state;
  if(!persist()) return;
  if(result.added || result.filled) changed();
  render();
  var parts = [];
  if(result.added) parts.push((result.added === 1 ? '1 Eintrag' : result.added + ' Einträge') + ' übernommen');
  if(result.filled) parts.push(result.filled + ' um Foto oder Noten ergänzt');
  if(result.skipped) parts.push(result.skipped + ' schon vorhanden');
  if(!result.added && !result.filled) parts.unshift(result.skipped ? 'Keine neuen Einträge' : 'Die Datei enthält keine Einträge');
  showToast(parts.join(', ') + '.');
});

var toastTimer;
function showToast(msg){
  var t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ t.classList.remove('show'); }, 2400);
}

// ---------- Start ----------

// Weiche Kante unter der Oberkante nur zeigen, wenn Inhalt darunter durchläuft
window.addEventListener('scroll', function(){
  document.body.classList.toggle('gescrollt', window.scrollY > 4);
}, {passive: true});

render();
updateBackupUi();
if(loaded.hinweis === 'defekt') showToast('Gespeicherter Stand war unlesbar. Ältere Daten wurden geladen.');

photos.thumbs().then(function(list){
  list.forEach(function(t){ setThumb(t.id, t.klein); });
  if(list.length) render();
}).catch(function(){});
