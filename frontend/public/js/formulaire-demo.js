(function(){
  var f = document.getElementById('form-demo'); if (!f) return;
  var msg = document.getElementById('msg-demo'), btn = document.getElementById('btn-demo');
  var q = new URLSearchParams(location.search);
  var utm = {};
  ['utm_source','utm_medium','utm_campaign','utm_content','ref'].forEach(function(k){ if (q.get(k)) utm[k] = q.get(k); });
  if (window.courtiaTrack) { try { window.courtiaTrack('demo_form_view'); } catch(e){} }
  /* Debut de saisie : premiere interaction reelle avec un champ (pas au chargement). */
  var debut = 0;
  f.addEventListener('input', function(){
    if (!debut) { debut = 1; if (window.courtiaTrack) { try { window.courtiaTrack('demo_form_start'); } catch(e){} } }
  }, true);
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
    /* Attribution : premier contact et dernier contact, calcules cote site (aucun tiers). */
    if (typeof window.courtiaAttribution === 'function') {
      var att = window.courtiaAttribution();
      for (var k in att) { if (Object.prototype.hasOwnProperty.call(att, k)) d[k] = att[k]; }
    }
    if (window.courtiaTrack) { try { window.courtiaTrack('demo_form_submit'); } catch(e){} }
    if (btn) { btn.disabled = true; btn.textContent = 'Envoi…'; }
    fetch('/api/leads/demo-request', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(d)})
      .then(function(r){ return r.json().then(function(j){ return {statut:r.status, corps:j}; }); })
      .then(function(res){
        var b = res.corps || {};
        var id = (b.lead_id !== undefined && b.lead_id !== null) ? b.lead_id : (b.lead ? b.lead.id : undefined);
        var ok = (b.ok === true) || (b.success === true && id);
        if (ok) {
          msg.textContent = "Votre demande est bien enregistrée. L'équipe COURTIARK dispose maintenant des informations nécessaires pour vous recontacter.";
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
