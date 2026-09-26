#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Scripts externes du site public COURTIARK.

Ils sont ecrits dans frontend/public/js/ par seo/build.py. Aucun script en ligne :
la politique de securite du site (Content-Security-Policy script-src 'self', sans
'unsafe-inline') les autorise uniquement sous forme de fichiers.
"""

MESURE_JS = r"""
/* Mesure de l'acquisition : événements autorisés par l'API, aucune donnée personnelle, aucun traceur tiers. */
(function(){
  var d = document, w = window;
  function poser(k, v){ try { sessionStorage.setItem('ck_' + k, v); } catch(e){} }
  function lire(k){ try { return sessionStorage.getItem('ck_' + k) || ''; } catch(e){ return ''; } }
  var q = new URLSearchParams(location.search);
  ['utm_source','utm_medium','utm_campaign','utm_content','ref'].forEach(function(k){ if (q.get(k)) poser(k, q.get(k)); });
  poser('landing', location.pathname);
  if (d.referrer) poser('referrer', d.referrer);
  if (d.referrer && d.referrer.indexOf('courtiark.fr') === -1) poser('referrer_externe', d.referrer);
  function envoyer(nom, charge){
    try {
      var corps = { event_name: nom, source: lire('utm_source') || lire('referrer_externe') || 'organique',
        page_path: location.pathname,
        payload: { medium: lire('utm_medium'), campagne: lire('utm_campaign'), contenu: lire('utm_content'),
                   landing: lire('landing'), referrer: lire('referrer'), langue: d.documentElement.lang, charge: charge || null } };
      var blob = new Blob([JSON.stringify(corps)], {type:'application/json'});
      if (navigator.sendBeacon) navigator.sendBeacon('/api/leads/events', blob);
      else fetch('/api/leads/events', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(corps), keepalive:true});
    } catch(e){}
  }
  w.courtiaTrack = envoyer;
  if (!w.__ckVue) { w.__ckVue = 1; envoyer('seo_page_view'); }
  d.addEventListener('click', function(ev){
    var a = ev.target.closest ? ev.target.closest('a') : null; if (!a) return;
    var h = a.getAttribute('href') || '';
    if (h.indexOf('/register') === 0) envoyer('cta_trial_click');
    else if (h.indexOf('/demo') === 0) envoyer('cta_demo_click');
    else if (h.indexOf('/tarifs') === 0) envoyer('pricing_view');
    else if (h.indexOf('/assistant-ark') > -1) envoyer('ark_demo_view');
    else if (h.indexOf('/contact') === 0) envoyer('contact_submit');
  }, true);
})();
"""

FORMULAIRE_JS = r"""
(function(){
  var f = document.getElementById('form-demo'); if (!f) return;
  var msg = document.getElementById('msg-demo'), btn = document.getElementById('btn-demo');
  var q = new URLSearchParams(location.search);
  var utm = {};
  ['utm_source','utm_medium','utm_campaign','utm_content','ref'].forEach(function(k){ if (q.get(k)) utm[k] = q.get(k); });
  if (window.courtiaTrack) { try { window.courtiaTrack('demo_form_view'); } catch(e){} }
  f.addEventListener('submit', function(ev){
    ev.preventDefault();
    var d = {};
    new FormData(f).forEach(function(v,k){ d[k] = v; });
    if (!d.first_name || !d.last_name || !d.company_name || !d.email) { msg.textContent = 'Merci de compléter les champs obligatoires.'; return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(d.email)) { msg.textContent = "Cette adresse e-mail ne semble pas valide."; return; }
    if (d.phone && !/^[+0-9 ().-]{6,}$/.test(d.phone)) { msg.textContent = 'Le numéro de téléphone ne semble pas valide.'; return; }
    if (!document.getElementById('f-consent').checked) { msg.textContent = 'Merci de cocher la case pour que nous puissions vous répondre.'; return; }
    d.consent = true;
    d.source = utm.utm_source || 'site-courtiark';
    d.city = d.city || (d.pays === 'CH' ? 'Suisse' : 'France');
    d.message = (d.message || '') + ' [page: ' + location.pathname + ']' + (Object.keys(utm).length ? ' [utm: ' + JSON.stringify(utm) + ']' : '');
    if (window.courtiaTrack) { try { window.courtiaTrack('demo_form_submit'); } catch(e){} }
    if (btn) { btn.disabled = true; btn.textContent = 'Envoi…'; }
    fetch('/api/leads/demo-request', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(d)})
      .then(function(r){ return r.json().then(function(j){ return {statut:r.status, corps:j}; }); })
      .then(function(res){
        var b = res.corps || {};
        var id = (b.lead_id !== undefined && b.lead_id !== null) ? b.lead_id : (b.lead ? b.lead.id : undefined);
        var ok = (b.ok === true) || (b.success === true && id);
        if (ok) {
          msg.textContent = "Demande enregistrée. Nous revenons vers vous avec une proposition de créneau.";
          if (window.courtiaTrack) { try { window.courtiaTrack('demo_request_success', {identifiant: id}); } catch(e){} }
          f.reset();
        } else {
          msg.textContent = "La demande n'a pas pu être enregistrée. Écrivez-nous directement à contact@courtiark.fr.";
          if (window.courtiaTrack) { try { window.courtiaTrack('demo_request_failure', {code: res.statut}); } catch(e){} }
        }
        if (btn) { btn.disabled = false; btn.textContent = 'Demander une démonstration'; }
      })
      .catch(function(){
        msg.textContent = "L'envoi a échoué (réseau). Écrivez-nous à contact@courtiark.fr.";
        if (btn) { btn.disabled = false; btn.textContent = 'Demander une démonstration'; }
      });
  });
})();
"""

OUTIL_JS = r"""
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
"""
