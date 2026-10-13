// Oberfläche: Liste, Formular, Sichern/Wiederherstellen.
import { escapeHtml, fmtRatio, fmtDecimal, fractionFor, sortEntries, findDuplicate, toV3Entry, buildBackup, mergeImport } from './daten.js';
import { loadState, saveState } from './speicher.js';
import { beanSVG, beansRow } from './bohne.js';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function(){
    navigator.serviceWorker.register('service-worker.js').catch(function(){});
  });
}

var state = loadState().state;
var sortMode = 'date';
var editingId = null; // null = neuer Eintrag
var currentRating = 0;
var deleteArmed = false;

var listEl = document.getElementById('list');
var countLbl = document.getElementById('countLbl');

function render(){
  var entries = state.entries;
  countLbl.textContent = entries.length + (entries.length===1 ? ' Eintrag' : ' Einträge');

  if(entries.length === 0){
    listEl.innerHTML = '<div class="empty">'+
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 8h13a3 3 0 010 6h-1"/><path d="M4 8v7a3 3 0 003 3h6a3 3 0 003-3V8"/><path d="M8 2c0 1-1 1-1 2s1 1 1 2"/><path d="M12 2c0 1-1 1-1 2s1 1 1 2"/></svg>'+
      '<p>Noch kein Kaffee protokolliert.</p>'+
      '<div class="sub">Tippe unten rechts auf + für den ersten Eintrag.</div>'+
    '</div>';
    return;
  }

  listEl.innerHTML = sortEntries(entries, sortMode).map(function(e){
    var notesHtml = e.notes ? '<p class="card-notes">'+escapeHtml(e.notes)+'</p>' : '';
    var grindVal = e.grind!=null ? e.grind : 10;
    return '<div class="card" data-id="'+escapeHtml(e.id)+'">'+
      '<div class="card-top">'+
        '<div>'+
          '<p class="card-eyebrow">'+escapeHtml(e.roastery||'Rösterei unbekannt')+'</p>'+
          '<h3 class="card-name">'+escapeHtml(e.name||'Ohne Namen')+'</h3>'+
        '</div>'+
        '<div class="beans">'+beansRow(e.rating||0)+'</div>'+
      '</div>'+
      '<div class="card-meta">'+
        '<span class="badge ratio">'+fmtRatio(e.gramsIn,e.gramsOut)+'</span>'+
        '<span class="badge">'+(e.gramsIn||'–')+'g <span class="lbl">→</span> '+(e.gramsOut||'–')+'g</span>'+
        '<span class="badge">'+(e.brewSeconds||0)+' <span class="lbl">Sek</span></span>'+
        '<span class="badge">'+fmtDecimal(grindVal)+' <span class="lbl">Mahlgrad</span></span>'+
      '</div>'+
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
  var card = ev.target.closest('.card');
  if(!card) return;
  openSheet(card.dataset.id);
});

var overlay = document.getElementById('overlay');
var beanPicker = document.getElementById('beanPicker');
var ratingLbl = document.getElementById('ratingLbl');
var btnDelete = document.getElementById('btnDelete');
var dupWarning = document.getElementById('dupWarning');

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

function updateRatioLive(){
  var gIn = parseFloat(document.getElementById('fIn').value);
  var gOut = parseFloat(document.getElementById('fOut').value);
  document.getElementById('ratioLive').textContent = 'Verhältnis ' + fmtRatio(gIn, gOut);
}
document.getElementById('fIn').addEventListener('input', updateRatioLive);
document.getElementById('fOut').addEventListener('input', updateRatioLive);

document.getElementById('fGrind').addEventListener('input', function(){
  document.getElementById('grindLbl').textContent = fmtDecimal(parseFloat(this.value));
});

document.querySelectorAll('.step-btn').forEach(function(btn){
  btn.addEventListener('click', function(){
    var target = document.getElementById(btn.dataset.target);
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
document.getElementById('fName').addEventListener('input', hideDupWarning);
document.getElementById('fRoastery').addEventListener('input', hideDupWarning);

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

  document.getElementById('sheetTitle').textContent = e ? 'Kaffee bearbeiten' : 'Neuer Kaffee';
  document.getElementById('fName').value = e ? e.name : '';
  document.getElementById('fRoastery').value = e ? e.roastery : '';
  document.getElementById('fIn').value = e ? e.gramsIn : 18;
  document.getElementById('fOut').value = e ? e.gramsOut : 40;
  document.getElementById('fSec').value = e ? e.brewSeconds : 25;
  var grindVal = e ? (e.grind!=null ? e.grind : 10) : 10;
  document.getElementById('fGrind').value = grindVal;
  document.getElementById('grindLbl').textContent = fmtDecimal(grindVal);
  document.getElementById('fNotes').value = e ? e.notes : '';
  currentRating = e ? (e.rating||0) : 0;
  renderBeanPicker();
  updateRatioLive();

  document.getElementById('deleteRow').hidden = !e;
  overlay.classList.add('open');
}
function closeSheet(){
  overlay.classList.remove('open');
  editingId = null;
  resetDeleteButton();
}

document.getElementById('btnAdd').addEventListener('click', function(){ openSheet(null); });
document.getElementById('btnCancel').addEventListener('click', closeSheet);
overlay.addEventListener('click', function(ev){ if(ev.target === overlay) closeSheet(); });

document.getElementById('btnSave').addEventListener('click', function(){
  var name = document.getElementById('fName').value.trim();
  if(!name){ document.getElementById('fName').focus(); return; }
  var roastery = document.getElementById('fRoastery').value.trim();

  if(findDuplicate(state.entries, name, roastery, editingId)){
    dupWarning.hidden = false;
    return;
  }

  var old = editingId ? findEntry(editingId) : null;
  var grindRaw = parseFloat(document.getElementById('fGrind').value);
  var data = toV3Entry({
    id: old ? old.id : null,
    name: name,
    roastery: roastery,
    gramsIn: parseFloat(document.getElementById('fIn').value) || 0,
    gramsOut: parseFloat(document.getElementById('fOut').value) || 0,
    brewSeconds: parseInt(document.getElementById('fSec').value) || 0,
    grind: isNaN(grindRaw) ? 10 : Math.round(grindRaw*10)/10,
    rating: currentRating,
    notes: document.getElementById('fNotes').value.trim(),
    flavors: old ? old.flavors : [],
    photo: old ? old.photo : null,
    createdAt: old ? old.createdAt : Date.now(),
    updatedAt: Date.now()
  });

  if(old){
    state.entries[state.entries.indexOf(old)] = data;
  } else {
    state.entries.push(data);
  }
  saveState(state);
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
  state.entries = state.entries.filter(function(x){ return x.id !== editingId; });
  saveState(state);
  closeSheet();
  render();
  showToast('Eintrag gelöscht.');
});

document.getElementById('btnExport').addEventListener('click', function(){
  var blob = new Blob([JSON.stringify(buildBackup(state, {}), null, 2)], {type:'application/json'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  var stamp = new Date().toISOString().slice(0,10);
  a.href = url;
  a.download = 'kaffee-logbuch-backup-' + stamp + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Sicherung heruntergeladen.');
});

document.getElementById('btnImport').addEventListener('click', function(){
  document.getElementById('fileImport').click();
});
document.getElementById('fileImport').addEventListener('change', function(ev){
  var file = ev.target.files[0];
  if(!file) return;
  var reader = new FileReader();
  reader.onload = function(){
    try{
      var result = mergeImport(state, JSON.parse(reader.result));
      state = result.state;
      saveState(state);
      render();
      showToast(result.added + ' Einträge übernommen.');
    }catch(err){
      showToast('Datei konnte nicht gelesen werden.');
    }
    ev.target.value = '';
  };
  reader.readAsText(file);
});

var toastTimer;
function showToast(msg){
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ t.classList.remove('show'); }, 2400);
}

render();
