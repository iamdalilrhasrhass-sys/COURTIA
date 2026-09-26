(function(){
  var b = document.getElementById('o-calc'); if(!b) return;
  function val(id){ return parseFloat(document.getElementById(id).value)||0; }
  b.addEventListener('click', function(){
    var collab = val('o-collab'), doss = val('o-dossiers'), saisie = val('o-saisie'),
        relance = val('o-relance'), nbrel = val('o-nbrel'), docs = val('o-docs'), cout = val('o-cout');
    var hSaisie = doss*saisie/60, hRelance = nbrel*relance/60, hDocs = doss*docs/60;
    var total = hSaisie+hRelance+hDocs;
    var coutMois = total*cout;
    function f(x){ return (Math.round(x*10)/10).toFixed(1).replace('.',','); }
    function m(x){ return Math.round(x).toLocaleString('fr-FR'); }
    document.getElementById('o-resultat').innerHTML =
      '<p><b>Charge administrative estimée : ' + f(total) + ' h par mois</b> (' + f(total/collab) + ' h par collaborateur).</p>' +
      '<ul><li>Saisie et mise à jour des dossiers : ' + f(hSaisie) + ' h</li>' +
      '<li>Relances (rédaction et suivi) : ' + f(hRelance) + ' h</li>' +
      '<li>Recherche de documents : ' + f(hDocs) + ' h</li></ul>' +
      '<p>Coût humain estimé : <b>' + m(coutMois) + '</b> par mois, soit <b>' + m(coutMois*12) + '</b> par an (hypothèse : coût horaire chargé de ' + m(cout) + ').</p>' +
      '<p class="note">Ce calcul est une estimation arithmétique à partir de vos propres valeurs : il ne constitue pas une promesse de gain. ' +
      'La part réellement automatisable dépend de votre organisation et des décisions qui restent humaines.</p>' +
      '<p><a class="principal" href="/register">Voir comment COURTIARK réduit cette charge</a></p>';
  });
})();
