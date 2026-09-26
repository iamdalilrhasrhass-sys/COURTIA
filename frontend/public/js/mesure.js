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

  /* --- identification de visite : identifiant aleatoire, jamais un empreinte de navigateur --- */
  function idSession(){
    var s = lire('session_id');
    if (!s) { s = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); poser('session_id', s); }
    return s;
  }
  function poserDurable(k, v){ try { localStorage.setItem('ck_p_' + k, v); } catch(e){} }
  function lireDurable(k){ try { return localStorage.getItem('ck_p_' + k) || ''; } catch(e){ return ''; } }
  function hote(ref){ try { return new URL(ref).hostname; } catch(e){ return ref || ''; } }
  function sourceCourante(){
    if (lire('utm_source')) return lire('utm_source');
    if (d.referrer && d.referrer.indexOf('courtiark.fr') === -1) return hote(d.referrer);
    if (lireDurable('source')) return lireDurable('source');
    return 'direct';
  }
  function mediumCourant(){
    if (lire('utm_medium')) return lire('utm_medium');
    if (d.referrer && d.referrer.indexOf('courtiark.fr') === -1) return 'referral';
    return lireDurable('medium') || 'none';
  }
  /* Premier contact : ecrit une seule fois, jamais ecrase. Dernier contact : mis a jour a chaque page. */
  if (!lireDurable('source')) {
    poserDurable('source', sourceCourante());
    poserDurable('medium', mediumCourant());
    poserDurable('campaign', lire('utm_campaign'));
    poserDurable('landing', location.pathname);
    poserDurable('referrer', d.referrer || '');
  }
  if (lire('utm_source')) poserDurable('source', lire('utm_source'));
  poserDurable('dernier_source', sourceCourante());
  poserDurable('dernier_medium', mediumCourant());
  poserDurable('dernier_landing', location.pathname);
  function attribution(){
    return { session_id: idSession(),
      first_touch_source: lireDurable('source'), first_touch_medium: lireDurable('medium'),
      first_touch_campaign: lireDurable('campaign'), first_touch_landing: lireDurable('landing'),
      first_touch_referrer: lireDurable('referrer'),
      last_touch_source: lireDurable('dernier_source'), last_touch_medium: lireDurable('dernier_medium'),
      last_touch_landing: lireDurable('dernier_landing') };
  }
  w.courtiaAttribution = attribution;
  /* Position du CTA dans la page : entete, corps ou bloc final. */
  function positionCta(el){
    var p = el, i = 0;
    while (p && i < 6) {
      if (p.className && String(p.className).indexOf('actions-entete') > -1) return 'entete';
      if (p.className && String(p.className).indexOf('cta') > -1) return 'corps';
      if (p.tagName === 'HEADER') return 'entete';
      if (p.tagName === 'FIGURE') return 'figure';
      p = p.parentElement; i++;
    }
    return 'page';
  }
  function envoyer(nom, charge){
    try {
      var att = attribution();
      var chargeUtile = { medium: lire('utm_medium'), campagne: lire('utm_campaign'), contenu: lire('utm_content'),
                          landing: lire('landing'), referrer: lire('referrer'), langue: d.documentElement.lang,
                          landing_page: location.pathname, timestamp: new Date().toISOString() };
      for (var a in att) { if (Object.prototype.hasOwnProperty.call(att, a)) chargeUtile[a] = att[a]; }
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
  if (!w.__ckVue) { w.__ckVue = 1; envoyer('seo_page_view'); if (location.pathname.indexOf('/demo') === 0) envoyer('demo_page_view'); }
  d.addEventListener('click', function(ev){
    var a = ev.target.closest ? ev.target.closest('a') : null; if (!a) return;
    var h = a.getAttribute('href') || '';
    var details = { cta_position: positionCta(a), cta_label: (a.textContent || '').trim().slice(0, 60), cta_target: h };
    if (h.indexOf('/demo/dashboard') === 0) envoyer('cta_demo_interactive_click', details);
    else if (h.indexOf('/register') === 0) envoyer('cta_trial_click', details);
    else if (h.indexOf('/demo') === 0) envoyer('cta_demo_click', details);
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
