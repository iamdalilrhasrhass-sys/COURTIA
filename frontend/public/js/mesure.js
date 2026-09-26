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
      var chargeUtile = { medium: lire('utm_medium'), campagne: lire('utm_campaign'), contenu: lire('utm_content'),
                          landing: lire('landing'), referrer: lire('referrer'), langue: d.documentElement.lang,
                          landing_page: location.pathname, timestamp: new Date().toISOString() };
      if (charge) { for (var k in charge) { if (Object.prototype.hasOwnProperty.call(charge, k)) chargeUtile[k] = charge[k]; } }
      var corps = { event_name: nom, source: lire('utm_source') || lire('referrer_externe') || 'organique',
        page_path: location.pathname,
        payload: chargeUtile };
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
    if (h.indexOf('/demo/dashboard') === 0) envoyer('cta_demo_interactive_click');
    else if (h.indexOf('/register') === 0) envoyer('cta_trial_click');
    else if (h.indexOf('/demo') === 0) envoyer('cta_demo_click');
    else if (h.indexOf('/tarifs') === 0) envoyer('pricing_view');
    else if (h.indexOf('/assistant-ark') > -1) envoyer('ark_demo_view');
    else if (h.indexOf('/contact') === 0) envoyer('contact_submit');
  }, true);
  /* Pages d'outils : mesurer le clic qui suit l'usage de l'outil, avec le nom de l'outil
     et la cible du CTA (demande de la phase index-cleanup). */
  if (location.pathname.indexOf('/outils/') === 0) {
    var slug = location.pathname.replace('/outils/', '').replace(/\/$/, '');
    d.addEventListener('click', function(ev){
      var a = ev.target.closest ? ev.target.closest('a') : null; if (!a) return;
      var h = a.getAttribute('href') || '';
      if (h.indexOf('/register') === 0 || h.indexOf('/demo') === 0 || h.indexOf('/fonctionnalites/') === 0 ||
          h.indexOf('/crm-') === 0 || h.indexOf('/logiciel-') === 0 || h.charAt(0) === '/') {
        envoyer('tool_cta_click', { tool_slug: slug, cta_target: h });
      }
    }, true);
  }
})();
