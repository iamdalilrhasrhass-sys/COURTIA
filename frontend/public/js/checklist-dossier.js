(function(){
  var f = document.getElementById('chk-dossier'); if (!f) return;
  var cle = 'ck_checklist_dossier';
  function cases(){ return f.querySelectorAll('input[type=checkbox]'); }
  function resume(){
    var total = cases().length, faits = 0;
    cases().forEach(function(c){ if (c.checked) faits++; });
    var pct = total ? Math.round(faits / total * 100) : 0;
    document.getElementById('chk-resume').textContent = faits + ' / ' + total + ' points renseignés (' + pct + ' %)';
  }
  try {
    var etat = JSON.parse(localStorage.getItem(cle) || '{}');
    cases().forEach(function(c){ if (etat[c.id]) c.checked = true; });
  } catch(e){}
  function sauver(){
    var etat = {};
    cases().forEach(function(c){ if (c.checked) etat[c.id] = 1; });
    try { localStorage.setItem(cle, JSON.stringify(etat)); } catch(e){}
    resume();
  }
  var commence = 0;
  function outil(nom){ if (window.courtiaTrack) { try { window.courtiaTrack(nom); } catch(e){} } }
  f.addEventListener('change', function(){
    if (!commence) { commence = 1; outil('tool_start'); }
    var total = cases().length, faits = 0;
    cases().forEach(function(c){ if (c.checked) faits++; });
    if (total && faits === total) outil('tool_complete');
  });
  f.addEventListener('change', sauver);
  resume();
  var r = document.getElementById('chk-reset');
  if (r) r.addEventListener('click', function(){ try { localStorage.removeItem(cle); } catch(e){} cases().forEach(function(c){ c.checked = false; }); resume(); });
  var imp = document.getElementById('chk-print');
  if (imp) imp.addEventListener('click', function(){ window.print(); });
})();
