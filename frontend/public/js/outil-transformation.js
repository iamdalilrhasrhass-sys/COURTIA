(function(){
  var b = document.getElementById('t-calc'); if (!b) return;
  function v(id){ return parseFloat(document.getElementById(id).value) || 0; }
  function pc(x){ return (Math.round(x*10)/10).toFixed(1).replace('.', ','); }
  b.addEventListener('click', function(){
    var leads = v('t-leads'), devis = v('t-devis'), contrats = v('t-contrats');
    var r = document.getElementById('t-resultat');
    if (!leads) { r.innerHTML = '<p class="note">Indiquez au moins un nombre de leads entrants.</p>'; return; }
    var txLeadDevis = devis / leads * 100;
    var txDevisContrat = devis ? contrats / devis * 100 : 0;
    var txGlobal = contrats / leads * 100;
    var perdus = devis - contrats;
    var devisPotentiels = devis;
    r.innerHTML =
      '<p><b>Lead → devis : ' + pc(txLeadDevis) + ' %</b> (' + Math.round(devis) + ' devis pour ' + Math.round(leads) + ' leads)</p>' +
      '<p><b>Devis → contrat : ' + pc(txDevisContrat) + ' %</b> (' + Math.round(contrats) + ' contrats signés)</p>' +
      '<p><b>Taux global lead → contrat : ' + pc(txGlobal) + ' %</b></p>' +
      '<p>Devis non convertis sur la période : <b>' + Math.round(perdus) + '</b>. ' +
      'Si vous récupérez un devis sur cinq parmi ceux-ci, cela représente ' + pc(perdus * 0.2) + ' contrats supplémentaires.</p>' +
      '<p class="note">Calcul arithmétique à partir de vos chiffres. Le taux de récupération de 20 % est un exemple explicitement ' +
      'affiché, pas une performance mesurée chez nous : remplacez-le par ce que vous observez.</p>' +
      '<p><a class="principal" href="/fonctionnalites/relance-devis-assurance">Piloter mes opportunités avec COURTIARK</a></p>';
  });
})();
