import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, Maximize2, Minimize2, Paperclip, FileText, Trash2, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { ArkVoiceButton } from './ArkVoiceButton';
import { ArkSuggestionsChips } from './ArkSuggestionsChips';
import { lireReponseArk, messageErreurArk } from '../../lib/reponseArk';
import { getAuthToken } from '../../api/sessionPolicy';
import { useClientStore } from '../../stores/clientStore';

const API_BASE = '/api';
// Source de jeton canonique (courtia_token OU token) plutot qu'une cle unique :
// c'est le meme choix que le client API (src/api/sessionPolicy.js).
const getToken = () => getAuthToken();
const enteteAuth = () => 'Bearer ' + (getToken() || '');

// ── PIÈCES JOINTES (23/09/2026) ────────────────────────────────────────────
// La bulle n'acceptait QUE du texte et la voix : aucun bouton fichier, aucun
// dépôt possible, alors que le pipeline d'analyse existait côté serveur.
// Le courtier joint désormais un PDF ou une image ; ARK lit réellement le
// document, propose un diff champ par champ, et n'écrit dans la fiche client
// qu'après validation explicite. Aucune écriture automatique.
const EXTENSIONS_ACCEPTEES = '.pdf,.jpg,.jpeg,.png,.webp,.heic';
const TAILLE_MAX_MO = 15;
const MAX_FICHIERS = 5;

function tailleLisible(octets) {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(0)} Ko`;
  return `${(octets / 1024 / 1024).toFixed(1)} Mo`;
}

function libelleConfiance(c) {
  if (c >= 0.9) return { texte: 'très sûre', couleur: '#16a34a' };
  if (c >= 0.75) return { texte: 'sûre', couleur: '#16a34a' };
  if (c >= 0.6) return { texte: 'à vérifier', couleur: '#d97706' };
  return { texte: 'incertaine', couleur: '#dc2626' };
}

function nomClient(c) {
  if (!c) return '';
  return [c.prenom || c.first_name, c.nom || c.last_name].filter(Boolean).join(' ')
    || c.company_name
    || `Client ${c.id}`;
}

export function ArkBubbleV2() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const messagesRef = useRef(null);
  const inputFichiersRef = useRef(null);

  // Pièces jointes et analyse documentaire
  const [fichiers, setFichiers] = useState([]);
  const [glisser, setGlisser] = useState(false);
  const [analyse, setAnalyse] = useState(null);
  const [enAnalyse, setEnAnalyse] = useState(false);
  const [enApplication, setEnApplication] = useState(false);
  const [selections, setSelections] = useState({});
  const [erreur, setErreur] = useState(null);
  const [application, setApplication] = useState(null);
  const [clientForce, setClientForce] = useState(null);
  const [creerContrat, setCreerContrat] = useState(false);

  const selectedClient = useClientStore((s) => s.selectedClient);
  const clients = useClientStore((s) => s.clients);
  const fetchClients = useClientStore((s) => s.fetchClients);
  // ── DOSSIER CIBLÉ D'APRÈS LA PAGE CONSULTÉE (défaut mesuré le 23/09/2026) ────
  // Sur une fiche client (/clients/123), la bulle ne ciblait AUCUN dossier : le courtier
  // qui demandait « quel est le bonus-malus de ce client ? » recevait « je ne peux pas
  // répondre : je n'ai aucune donnée client » alors que la fiche était ouverte devant lui.
  // La page affichée devient donc le dossier ciblé par défaut ; le choix explicite du
  // courtier (liste déroulante) et le dossier forcé restent prioritaires.
  const { pathname } = useLocation();
  const clientIdRoute = (() => {
    const m = (pathname || '').match(/^\/clients\/(\d+)/);
    return m ? Number(m[1]) : null;
  })();
  useEffect(() => {
    if (clientIdRoute && clients.length === 0 && getToken()) {
      fetchClients(getToken()).catch(() => {});
    }
  }, [clientIdRoute, clients.length, fetchClients]);
  const clientRoute = clientIdRoute
    ? (clients.find((c) => Number(c.id) === clientIdRoute) || { id: clientIdRoute })
    : null;
  const clientCible = clientForce || clientRoute || (selectedClient && selectedClient.id ? selectedClient : null);

  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messages, analyse, enAnalyse]);

  const sendMessage = async (text) => {
    if (!text.trim()) return;
    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setStreaming(true);
    const controleur = new AbortController();
    // 30 s : au-delà, on rend la main au courtier au lieu de laisser la bulle
    // « tourner » indéfiniment sur un backend muet.
    const minuterie = setTimeout(() => controleur.abort(), 30000);
    try {
      const res = await fetch(`${API_BASE}/ark/chat`, {
        method: 'POST',
        headers: { Authorization: enteteAuth(), 'Content-Type': 'application/json' },
        // Le dossier ciblé doit être transmis : sans lui, ARK répondait « je n'ai aucune
        // donnée client » alors que la fiche était ouverte devant le courtier (défaut
        // mesuré en production le 23/09/2026). Seul l'IDENTIFIANT est envoyé ; le serveur
        // relit le dossier sous la portée du cabinet (aucune donnée fournie par le client).
        body: JSON.stringify({
          message: text,
          history: messages,
          ...(clientCible && clientCible.id ? { clientData: { id: clientCible.id } } : {}),
        }),
        signal: controleur.signal,
      });
      // Contrat de la réponse : figé et testé dans src/lib/reponseArk.js
      // (POST /api/ark/chat répond `{ reply }` en JSON, avec un code HTTP explicite).
      let data = null;
      try {
        data = await res.json();
      } catch (e) {
        data = null;
      }

      const { texte, erreur } = lireReponseArk(res.status, data);
      setMessages(prev => [...prev, { role: 'assistant', content: texte, error: erreur }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: messageErreurArk(e), error: true }]);
    } finally {
      clearTimeout(minuterie);
      setStreaming(false);
    }
  };

  useEffect(() => {
    if (open && fichiers.length > 0 && !clientCible && clients.length === 0) {
      const token = getToken();
      if (token) fetchClients(token).catch(() => {});
    }
  }, [open, fichiers.length, clientCible, clients.length, fetchClients]);

  const ajouterFichiers = useCallback((liste) => {
    const nouveaux = Array.from(liste || []);
    setErreur(null);
    setApplication(null);
    setFichiers((precedents) => {
      const cumul = [...precedents];
      for (const f of nouveaux) {
        if (cumul.length >= MAX_FICHIERS) {
          setErreur(`Maximum ${MAX_FICHIERS} documents par analyse.`);
          break;
        }
        if (f.size > TAILLE_MAX_MO * 1024 * 1024) {
          setErreur(`« ${f.name} » dépasse ${TAILLE_MAX_MO} Mo et a été écarté.`);
          continue;
        }
        cumul.push(f);
      }
      return cumul;
    });
  }, []);

  const retirerFichier = (index) => {
    setFichiers((prev) => prev.filter((_, i) => i !== index));
    setAnalyse(null);
    setApplication(null);
  };

  const lancerAnalyse = async () => {
    if (!fichiers.length) return;
    if (!clientCible || !clientCible.id) {
      setErreur("Sélectionnez d'abord le dossier client concerné.");
      return;
    }
    setEnAnalyse(true);
    setErreur(null);
    setAnalyse(null);
    setApplication(null);
    try {
      const form = new FormData();
      for (const f of fichiers) form.append('files', f);
      form.append('clientId', String(clientCible.id));
      const res = await fetch(`${API_BASE}/ark/documents/analyse`, {
        method: 'POST',
        headers: { Authorization: enteteAuth() },
        body: form,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || data.ok === false) {
        setErreur((data && (data.message || data.error)) || `Analyse impossible (HTTP ${res.status}).`);
        return;
      }
      setAnalyse(data);
      const init = {};
      for (const ligne of (data.diff && data.diff.lignes) || []) {
        init[`${ligne.extraction_id}:${ligne.champ}`] = ligne.preselectionne === true;
      }
      setSelections(init);
      const reussis = (data.fichiers || []).filter((f) => f.ok);
      const echecs = (data.fichiers || []).filter((f) => !f.ok);
      const nbLignes = ((data.diff && data.diff.lignes) || []).length;
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: `${reussis.length} document(s) lu(s), ${nbLignes} information(s) proposée(s).`
          + (echecs.length ? ` Fichiers refusés : ${echecs.map((e) => `${e.fichier} (${e.erreur})`).join(' ; ')}` : '')
          + ' Vérifiez puis appliquez.',
      }]);
    } catch (e) {
      setErreur("L'analyse documentaire est momentanément indisponible.");
    } finally {
      setEnAnalyse(false);
    }
  };

  const appliquer = async () => {
    if (!analyse || !analyse.diff || !clientCible) return;
    const parExtraction = {};
    for (const ligne of analyse.diff.lignes) {
      const cle = `${ligne.extraction_id}:${ligne.champ}`;
      if (!selections[cle]) continue;
      parExtraction[ligne.extraction_id] = parExtraction[ligne.extraction_id] || [];
      parExtraction[ligne.extraction_id].push({ champ: ligne.champ, appliquer: true, valeur: ligne.valeur_extraite });
    }
    const lots = Object.entries(parExtraction);
    // Défaut mesuré en production le 23/09/2026 : un courtier qui voulait SEULEMENT créer le
    // contrat (cas normal quand l'identité de la fiche est déjà remplie) était arrêté par
    // « Aucun champ sélectionné. » — la case contrôlait l'affichage, pas l'action.
    if (!lots.length && !creerContrat) {
      setErreur('Aucun champ sélectionné.');
      return;
    }
    setEnApplication(true);
    // Aucun champ coché mais contrat demandé : on cible la première extraction pour porter
    // la création du contrat (le serveur n'écrira aucune donnée de fiche).
    if (!lots.length && creerContrat && analyse.fichiers && analyse.fichiers[0] && analyse.fichiers[0].extractionId) {
      lots.push([String(analyse.fichiers[0].extractionId), []]);
    }
    setErreur(null);
    try {
      const resultats = [];
      for (const [extractionId, listSelections] of lots) {
        const res = await fetch(`${API_BASE}/ark/documents/extractions/${extractionId}/appliquer`, {
          method: 'POST',
          headers: { Authorization: enteteAuth(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId: clientCible.id, selections: listSelections, creer_contrat: creerContrat === true }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data || data.ok === false) {
          setErreur((data && (data.message || data.error)) || `Application impossible (HTTP ${res.status}).`);
          break;
        }
        resultats.push(data);
      }
      setApplication(resultats);
      const total = resultats.reduce((acc, r) => acc + (r.champs_appliques || []).length, 0);
      // DÉFAUT CORRIGÉ (revue adverse JEV, passe 4) : sur un échec PARTIEL, l'ancien code
      // vidait la liste des fichiers et n'annonçait que le total réussi — le courtier
      // pouvait croire que TOUT avait été enregistré. On distingue désormais ce qui a
      // été écrit de ce qui ne l'a PAS été, et l'analyse reste à l'écran tant que des
      // documents ne sont pas appliqués.
      const documentsEnEchec = lots.length - resultats.length;
      if (documentsEnEchec > 0) {
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: `${total} information(s) enregistrée(s). ATTENTION : ${documentsEnEchec} document(s) NON appliqué(s) — `
            + "aucune donnée de ces documents n'a été écrite. Corrigez puis relancez.",
        }]);
      } else {
        setFichiers([]);
        setAnalyse(null);
        setSelections({});
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: total
            ? `${total} information(s) enregistrée(s) dans la fiche client, avec traçabilité.`
            : 'Aucune information enregistrée.',
        }]);
      }
    } catch (e) {
      setErreur("L'enregistrement a échoué. Aucune donnée n'a été modifiée.");
    } finally {
      setEnApplication(false);
    }
  };

  const handleVoiceResult = (text) => { setInput(text); sendMessage(text); };
  const handleSuggestion = (text) => sendMessage(text);

  // Sur un écran de 390 px, une bulle de 380 px positionnée à 24 px du bord
  // débordait à gauche (titre tronqué). Largeur bornée par la fenêtre.
  const bubbleSize = expanded
    ? { width: 'min(480px, calc(100vw - 32px))', height: 'min(600px, calc(100vh - 140px))' }
    : { width: 'min(380px, calc(100vw - 32px))', height: 'min(500px, calc(100vh - 140px))' };

  return (
    <>
      <motion.button
        onClick={() => setOpen(true)}
        style={{ position: 'fixed', bottom: 24, right: 24, width: 56, height: 56, borderRadius: '50%', background: 'var(--aurora-gradient)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--aurora-shadow-lg)', zIndex: 999 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        animate={{ boxShadow: ['0 0 0 0 rgba(139, 92, 246, 0)', '0 0 0 12px rgba(139, 92, 246, 0.15)', '0 0 0 0 rgba(139, 92, 246, 0)'] }}
        transition={{ duration: 2, repeat: Infinity }}
        aria-label="Ouvrir ARK"
      >
        <Sparkles size={24} color="white" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onDragOver={(e) => { e.preventDefault(); setGlisser(true) }}
            onDragLeave={() => setGlisser(false)}
            onDrop={(e) => { e.preventDefault(); setGlisser(false); ajouterFichiers(e.dataTransfer.files) }}
            data-testid="ark-bubble"
            style={{ position: 'fixed', bottom: 96, right: 24, ...bubbleSize, background: 'var(--aurora-bg-elevated)', border: glisser ? '2px dashed #8b5cf6' : '1px solid var(--aurora-border-subtle)', borderRadius: 'var(--aurora-radius-xl)', boxShadow: 'var(--aurora-shadow-2xl)', display: 'flex', flexDirection: 'column', zIndex: 1000, overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--aurora-space-3) var(--aurora-space-4)', borderBottom: '1px solid var(--aurora-border-subtle)', background: 'var(--aurora-gradient)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--aurora-space-2)' }}>
                <Sparkles size={20} color="white" />
                <span style={{ fontWeight: 600, color: 'white' }}>ARK Assistant</span>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <motion.button onClick={() => setExpanded(!expanded)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 'var(--aurora-radius-sm)', padding: 6, cursor: 'pointer', color: 'white' }} whileHover={{ background: 'rgba(255,255,255,0.3)' }}>
                  {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </motion.button>
                <motion.button onClick={() => setOpen(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 'var(--aurora-radius-sm)', padding: 6, cursor: 'pointer', color: 'white' }} whileHover={{ background: 'rgba(255,255,255,0.3)' }}>
                  <X size={16} />
                </motion.button>
              </div>
            </div>

            <div ref={messagesRef} style={{ flex: 1, overflowY: 'auto', padding: 'var(--aurora-space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--aurora-space-3)' }}>
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', padding: 'var(--aurora-space-6)', color: 'var(--aurora-text-secondary)' }}>
                  <Sparkles size={32} style={{ marginBottom: 'var(--aurora-space-2)', opacity: 0.5 }} />
                  <div>Comment puis-je vous aider ?</div>
                  <div style={{ fontSize: 12, marginTop: 8, opacity: 0.85 }}>
                    Vous pouvez aussi joindre un document (PDF, JPG, PNG) : j'en lis le contenu et je prépare la fiche client.
                  </div>
                </div>
              )}
              {messages.map((msg, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%', padding: 'var(--aurora-space-3)', borderRadius: 'var(--aurora-radius-lg)', background: msg.role === 'user' ? 'var(--aurora-gradient)' : 'var(--aurora-bg-subtle)', color: msg.role === 'user' ? 'white' : 'var(--aurora-text-primary)', fontSize: 'var(--aurora-font-sm)', lineHeight: 1.5 }}>
                  {msg.content}
                  {streaming && i === messages.length - 1 && msg.role === 'assistant' && <motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.5, repeat: Infinity }}>▊</motion.span>}
                </motion.div>
              ))}
            </div>

            {analyse && (
              <div data-testid="ark-analyse" style={{ border: '1px solid var(--aurora-border-subtle)', borderRadius: 'var(--aurora-radius-lg)', padding: 'var(--aurora-space-3)', background: 'var(--aurora-bg-subtle)' }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>
                  {analyse.client ? `Dossier : ${analyse.client.nom}` : 'Dossier client'}
                </div>
                {(analyse.fichiers || []).map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: 12, marginBottom: 4 }}>
                    {f.ok ? <CheckCircle2 size={14} color="#16a34a" style={{ marginTop: 2 }} /> : <AlertTriangle size={14} color="#dc2626" style={{ marginTop: 2 }} />}
                    <span>
                      <strong>{f.fichier}</strong>
                      {f.ok
                        ? ` — ${f.typeLibelle}${f.resume ? ` : ${f.resume}` : ''} · ${f.champsDetectes} information(s) détectée(s), ${f.champsSurs} à confiance élevée`
                        : ` — refusé : ${f.erreur}`}
                    </span>
                  </div>
                ))}
                {(analyse.fichiers || []).flatMap((f) => f.avertissements || []).slice(0, 4).map((a, i) => (
                  <div key={`a${i}`} style={{ fontSize: 11, color: '#d97706' }}>⚠ {a}</div>
                ))}
                {((analyse.diff && analyse.diff.lignes) || []).length > 0 && (
                  <div style={{ marginTop: 10, overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                      <thead>
                        <tr style={{ textAlign: 'left', color: 'var(--aurora-text-secondary)' }}>
                          <th style={{ padding: '3px 4px' }} />
                          <th style={{ padding: '3px 4px' }}>CHAMP</th>
                          <th style={{ padding: '3px 4px' }}>ACTUEL</th>
                          <th style={{ padding: '3px 4px' }}>EXTRAIT</th>
                          <th style={{ padding: '3px 4px' }}>CONFIANCE</th>
                          <th style={{ padding: '3px 4px' }}>SOURCE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analyse.diff.lignes.map((l, i) => {
                          const cle = `${l.extraction_id}:${l.champ}`;
                          const conf = libelleConfiance(l.confiance);
                          return (
                            <tr key={i} style={{ borderTop: '1px solid var(--aurora-border-subtle)' }}>
                              <td style={{ padding: '3px 4px' }}>
                                <input
                                  type="checkbox"
                                  aria-label={`Appliquer ${l.libelle}`}
                                  checked={selections[cle] === true}
                                  onChange={(e) => setSelections((prev) => ({ ...prev, [cle]: e.target.checked }))}
                                />
                              </td>
                              <td style={{ padding: '3px 4px' }}>
                                {l.libelle}
                                {l.action === 'conflit' && <span title="Une valeur différente existe déjà dans la fiche" style={{ color: '#d97706' }}> conflit</span>}
                              </td>
                              <td style={{ padding: '3px 4px', color: 'var(--aurora-text-secondary)' }}>{l.valeur_actuelle === null || l.valeur_actuelle === '' ? '—' : String(l.valeur_actuelle)}</td>
                              <td style={{ padding: '3px 4px', fontWeight: 600 }}>{Array.isArray(l.valeur_extraite) ? JSON.stringify(l.valeur_extraite) : String(l.valeur_extraite)}</td>
                              <td style={{ padding: '3px 4px', color: conf.couleur }}>{Math.round(l.confiance * 100)} % ({conf.texte})</td>
                              <td style={{ padding: '3px 4px', color: 'var(--aurora-text-secondary)' }}>
                                {l.page ? `p.${l.page}` : ''}
                                {l.extrait ? <span title={l.extrait}> « {String(l.extrait).slice(0, 40)} »</span> : null}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <div style={{ marginTop: 8, fontSize: 11, color: 'var(--aurora-text-secondary)' }}>
                      Rien n'est enregistré avant votre validation. Les champs non cochés ne sont pas écrits.
                    </div>
                    {analyse.contrat_propose && analyse.contrat_propose.possible && (
                      <label style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginTop: 10, fontSize: 11, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={creerContrat}
                          onChange={(e) => setCreerContrat(e.target.checked)}
                        />
                        <span>
                          <strong>Créer le contrat dans COURTIARK</strong> à partir de ce document —
                          {' '}{analyse.contrat_propose.apercu.numero_contrat || 'sans numéro'}
                          {analyse.contrat_propose.apercu.compagnie ? ` · ${analyse.contrat_propose.apercu.compagnie}` : ''}
                          {analyse.contrat_propose.apercu.date_echeance ? ` · échéance ${analyse.contrat_propose.apercu.date_echeance}` : ''}
                          <span style={{ display: 'block', color: 'var(--aurora-text-secondary)' }}>
                            Le contrat sera créé marqué « à vérifier », avec la référence du document lu.
                          </span>
                        </span>
                      </label>
                    )}
                    <motion.button
                      onClick={appliquer}
                      disabled={enApplication}
                      style={{ marginTop: 10, width: '100%', padding: '8px 12px', borderRadius: 'var(--aurora-radius-md)', background: 'var(--aurora-gradient)', color: 'white', border: 'none', cursor: enApplication ? 'default' : 'pointer', fontWeight: 600, opacity: enApplication ? 0.7 : 1 }}
                      whileHover={enApplication ? {} : { scale: 1.01 }}
                    >
                      {enApplication ? 'Enregistrement…' : 'Appliquer les données sélectionnées'}
                    </motion.button>
                  </div>
                )}
              </div>
            )}

            {enAnalyse && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--aurora-text-secondary)', fontSize: 'var(--aurora-font-sm)' }}>
                <Loader2 size={16} />
                Analyse du document… (lecture réelle du fichier)
              </div>
            )}

            {application && application.length > 0 && (
              <div data-testid="ark-application" style={{ border: '1px solid var(--aurora-border-subtle)', borderRadius: 'var(--aurora-radius-lg)', padding: 'var(--aurora-space-3)', fontSize: 12, background: 'var(--aurora-bg-subtle)' }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Enregistré dans la fiche client</div>
                {application.some((r) => r.contrat && r.contrat.id) && (
                  <div style={{ marginBottom: 6, color: 'var(--aurora-text-secondary)' }}>
                    Contrat créé : <strong style={{ color: 'var(--aurora-text-primary)' }}>
                      #{application.filter((r) => r.contrat && r.contrat.id).map((r) => r.contrat.id).join(', #')}
                    </strong>
                  </div>
                )}
                {application.map((r, i) => (
                  <div key={i} style={{ marginBottom: 4 }}>
                    {Object.entries(r.valeurs_relues || {}).map(([k, v]) => (
                      <div key={k} style={{ color: 'var(--aurora-text-secondary)' }}>
                        {k} = <strong style={{ color: 'var(--aurora-text-primary)' }}>{v === null ? '—' : String(v)}</strong>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {erreur && (
              <div style={{ fontSize: 12, color: '#dc2626', display: 'flex', gap: 6 }}>
                <AlertTriangle size={14} style={{ marginTop: 2 }} /> {erreur}
              </div>
            )}

            {messages.length === 0 && !analyse && !fichiers.length && <ArkSuggestionsChips onSelect={handleSuggestion} />}

            <div style={{ padding: 'var(--aurora-space-3)', borderTop: '1px solid var(--aurora-border-subtle)' }}>
              {fichiers.length > 0 && (
                <div style={{ marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {!clientCible && (
                    <select
                      onChange={(e) => {
                        const c = clients.find((x) => String(x.id) === e.target.value);
                        if (c) setClientForce(c);
                      }}
                      defaultValue=""
                      aria-label="Dossier client concerné"
                      style={{ padding: '6px 8px', borderRadius: 'var(--aurora-radius-sm)', background: 'var(--aurora-bg-input)', color: 'var(--aurora-text-primary)', border: '1px solid var(--aurora-border-subtle)', fontSize: 12 }}
                    >
                      <option value="" disabled>Choisir le dossier client concerné…</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>{nomClient(c)}</option>
                      ))}
                    </select>
                  )}
                  {clientCible && (
                    <div style={{ fontSize: 11, color: 'var(--aurora-text-secondary)' }}>
                      Dossier ciblé : <strong>{nomClient(clientCible)}</strong>
                    </div>
                  )}
                  {fichiers.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '4px 6px', borderRadius: 'var(--aurora-radius-sm)', background: 'var(--aurora-bg-subtle)' }}>
                      {String(f.name).toLowerCase().endsWith('.pdf') ? <FileText size={14} /> : <Paperclip size={14} />}
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                      <span style={{ color: 'var(--aurora-text-secondary)' }}>{tailleLisible(f.size)}</span>
                      <button onClick={() => retirerFichier(i)} aria-label={`Retirer ${f.name}`} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--aurora-text-secondary)' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 'var(--aurora-space-2)', alignItems: 'center' }}>
                <input
                  ref={inputFichiersRef}
                  type="file"
                  multiple
                  accept={EXTENSIONS_ACCEPTEES}
                  onChange={(e) => { ajouterFichiers(e.target.files); e.target.value = '' }}
                  style={{ display: 'none' }}
                />
                <motion.button
                  onClick={() => inputFichiersRef.current && inputFichiersRef.current.click()}
                  title="Joindre un PDF ou une image"
                  aria-label="Joindre un PDF ou une image"
                  data-testid="ark-joindre"
                  style={{ width: 36, height: 36, borderRadius: 'var(--aurora-radius-md)', background: 'var(--aurora-bg-subtle)', border: '1px solid var(--aurora-border-subtle)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--aurora-text-primary)' }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Paperclip size={18} />
                </motion.button>
                <ArkVoiceButton onResult={handleVoiceResult} />
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    if (fichiers.length) lancerAnalyse();
                    else sendMessage(input);
                  }}
                  placeholder={fichiers.length ? "Dossier joint — Entrée pour analyser…" : 'Écrivez votre message...'}
                  style={{ flex: 1, minWidth: 0, padding: 'var(--aurora-space-2) var(--aurora-space-3)', background: 'var(--aurora-bg-input)', border: '1px solid var(--aurora-border-subtle)', borderRadius: 'var(--aurora-radius-md)', color: 'var(--aurora-text-primary)', fontSize: 'var(--aurora-font-sm)', outline: 'none' }}
                />
                <motion.button
                  onClick={() => (fichiers.length ? lancerAnalyse() : sendMessage(input))}
                  disabled={enAnalyse || (!fichiers.length && !input.trim()) || streaming}
                  aria-label={fichiers.length ? 'Analyser le document joint' : 'Envoyer le message'}
                  data-testid="ark-envoyer"
                  style={{ width: 36, height: 36, borderRadius: 'var(--aurora-radius-md)', background: (fichiers.length || input.trim()) ? 'var(--aurora-gradient)' : 'var(--aurora-bg-subtle)', border: 'none', cursor: (fichiers.length || input.trim()) ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', color: (fichiers.length || input.trim()) ? 'white' : 'var(--aurora-text-muted)' }}
                  whileHover={(fichiers.length || input.trim()) ? { scale: 1.05 } : {}}
                  whileTap={(fichiers.length || input.trim()) ? { scale: 0.95 } : {}}
                >
                  {fichiers.length ? <FileText size={18} /> : <Send size={18} />}
                </motion.button>
              </div>
              <div style={{ marginTop: 6, fontSize: 10, color: 'var(--aurora-text-secondary)' }}>
                PDF, JPG, PNG, WebP, HEIC · {TAILLE_MAX_MO} Mo max · {MAX_FICHIERS} documents. ARK lit le document ; rien n'est enregistré sans votre validation.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default ArkBubbleV2;
