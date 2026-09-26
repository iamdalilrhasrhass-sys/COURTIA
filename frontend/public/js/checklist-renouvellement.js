(function(){
  var f = document.getElementById('chk-renouv'); if (!f) return;
  var cle = 'ck_checklist_renouv';
  function cases(){ return f.querySelectorAll('input[type=checkbox]'); }
  function resume(){
    var total = cases().length, faits = 0;
    cases().forEach(function(c){ if (c.checked) faits++; });
    document.getElementById('renouv-resume').textContent = faits + ' / ' + total + ' points renseignés';
  }
  try {
    var etat = JSON.parse(localStorage.getItem(cle) || '{}');
    cases().forEach(function(c){ if (etat[c.id]) c.checked = true; });
  } catch(e){}
  f.addEventListener('change', function(){
    var etat = {};
    cases().forEach(function(c){ if (c.checked) etat[c.id] = 1; });
    try { localStorage.setItem(cle, JSON.stringify(etat)); } catch(e){}
    resume();
  });
  resume();
  var r = document.getElementById('renouv-reset');
  if (r) r.addEventListener('click', function(){ try { localStorage.removeItem(cle); } catch(e){} cases().forEach(function(c){ c.checked = false; }); resume(); });
  var imp = document.getElementById('renouv-print');
  if (imp) imp.addEventListener('click', function(){ window.print(); });
})();
