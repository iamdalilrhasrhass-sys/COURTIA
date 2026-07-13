import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft, ArrowRight, CalendarDays, CheckSquare2, Database, Fingerprint,
  LayoutDashboard, Loader2, PhoneCall, RefreshCw, Search, ShieldCheck,
  SlidersHorizontal, UploadCloud, UsersRound,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { salesApi } from '../api/salesProspecting'
import CabinetDrawer from '../components/sales/CabinetDrawer'
import CallOutcomeWizard from '../components/sales/CallOutcomeWizard'
import SalesAuditPanel from '../components/sales/SalesAuditPanel'
import SalesCalendarPanel from '../components/sales/SalesCalendarPanel'
import SalesDashboard from '../components/sales/SalesDashboard'
import SalesImportPanel from '../components/sales/SalesImportPanel'
import SalesUsersPanel from '../components/sales/SalesUsersPanel'
import {
  formatDateTime, INTEREST_LABELS, PIPELINE_LABELS, SIZE_LABELS, STATUS_COLORS,
} from '../lib/salesProspecting'
import './salesProspecting.css'

const PAGE_SIZE = 30

const ADMIN_TABS = [
  { id: 'cockpit', label: 'Cockpit', icon: LayoutDashboard },
  { id: 'cabinets', label: 'Cabinets', icon: Database },
  { id: 'calendar', label: 'Agenda', icon: CalendarDays },
  { id: 'import', label: 'Import national', icon: UploadCloud },
  { id: 'team', label: 'Équipe', icon: UsersRound },
  { id: 'audit', label: 'Audit', icon: Fingerprint },
]

const PROSPECTOR_TABS = ADMIN_TABS.filter(({ id }) => ['cockpit', 'cabinets', 'calendar'].includes(id))

const EMPTY_FILTERS = {
  search: '', status: '', size_category: '', interest_level: '', assigned_to: '',
  sort: 'size_asc', page: 1, limit: PAGE_SIZE,
}

function cleanParams(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== '' && item !== undefined && item !== null))
}

function CabinetTable({ cabinets, loading, selected, onSelect, onSelectAll, onOpen }) {
  if (loading) return <div className="sales-loading"><Loader2 size={22} className="sales-spin" /> Chargement des cabinets…</div>
  if (!cabinets.length) return <div className="sales-empty-state"><Search size={26} /><strong>Aucun cabinet ne correspond aux filtres.</strong><span>Modifiez les critères ou importez une base nationale.</span></div>

  return (
    <div className="sales-table-wrap">
      <table className="sales-table sales-cabinet-table">
        <thead><tr>
          <th className="sales-check-cell"><input aria-label="Tout sélectionner" type="checkbox" checked={cabinets.length > 0 && cabinets.every((item) => selected.includes(item.id))} onChange={(event) => onSelectAll(event.target.checked)} /></th>
          <th>Cabinet</th><th>Taille</th><th>Localisation</th><th>Commercial</th><th>Statut</th><th>Dernier appel</th><th>Prochaine action</th>
        </tr></thead>
        <tbody>{cabinets.map((cabinet) => (
          <tr key={cabinet.id} onClick={() => onOpen(cabinet.id)}>
            <td className="sales-check-cell" onClick={(event) => event.stopPropagation()}><input aria-label={`Sélectionner ${cabinet.legal_name}`} type="checkbox" checked={selected.includes(cabinet.id)} onChange={(event) => onSelect(cabinet.id, event.target.checked)} /></td>
            <td><div className="sales-company-cell"><span>{(cabinet.trade_name || cabinet.legal_name || '?').slice(0, 1).toUpperCase()}</span><div><strong>{cabinet.trade_name || cabinet.legal_name}</strong>{cabinet.trade_name && <small>{cabinet.legal_name}</small>}<small>{cabinet.siren ? `SIREN ${cabinet.siren}` : cabinet.orias_number ? `ORIAS ${cabinet.orias_number}` : 'Identifiant à compléter'}</small></div></div></td>
            <td><strong>{SIZE_LABELS[cabinet.size_category] || cabinet.size_category}</strong><small className="sales-table-sub">Score {cabinet.size_score}{cabinet.size_is_estimated ? ' · estimé' : ''}</small></td>
            <td>{cabinet.city || '—'}<small className="sales-table-sub">{cabinet.department || cabinet.region || 'France'}</small></td>
            <td>{cabinet.assigned_username ? `@${cabinet.assigned_username}` : <span className="sales-muted">Non attribué</span>}</td>
            <td><span className={`sales-status tone-${STATUS_COLORS[cabinet.commercial_status] || 'slate'}`}>{PIPELINE_LABELS[cabinet.commercial_status] || cabinet.commercial_status}</span>{cabinet.interest_level && <small className="sales-table-sub">Intérêt {INTEREST_LABELS[cabinet.interest_level]}</small>}</td>
            <td>{formatDateTime(cabinet.last_call_at)}{cabinet.last_call_outcome && <small className="sales-table-sub">{cabinet.last_call_outcome}</small>}</td>
            <td>{formatDateTime(cabinet.next_followup_at)}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}

export default function Prospection() {
  const [tab, setTab] = useState('cockpit')
  const [user, setUser] = useState(null)
  const [metrics, setMetrics] = useState({})
  const [users, setUsers] = useState([])
  const [cabinets, setCabinets] = useState([])
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [draftSearch, setDraftSearch] = useState('')
  const [selected, setSelected] = useState([])
  const [detail, setDetail] = useState(null)
  const [activeCall, setActiveCall] = useState(null)
  const [conflicts, setConflicts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingList, setLoadingList] = useState(false)
  const [loadingNext, setLoadingNext] = useState(false)
  const [assignTo, setAssignTo] = useState('')

  const isAdmin = user?.role === 'super_admin'
  const tabs = isAdmin ? ADMIN_TABS : PROSPECTOR_TABS
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const loadDashboard = useCallback(async () => {
    const response = await salesApi.dashboard()
    setMetrics(response.data || {})
  }, [])

  const loadCabinets = useCallback(async (nextFilters = filters) => {
    setLoadingList(true)
    try {
      const response = await salesApi.listCabinets(cleanParams(nextFilters))
      setCabinets(response.data.cabinets || [])
      setTotal(Number(response.data.total) || 0)
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Chargement des cabinets impossible')
    } finally { setLoadingList(false) }
  }, [filters])

  const loadUsers = useCallback(async () => {
    if (!isAdmin) return
    const response = await salesApi.users()
    setUsers((response.data.users || []).filter((item) => item.role === 'prospecteur' && !item.suspended_at && !item.deleted_at))
  }, [isAdmin])

  const openCabinet = useCallback(async (id) => {
    try {
      const response = await salesApi.getCabinet(id)
      setDetail(response.data)
    } catch (error) {
      toast.error(error?.response?.data?.error === 'cabinet_not_assigned_to_user' ? 'Ce cabinet est déjà attribué à un autre prospecteur.' : error?.response?.data?.error || 'Fiche inaccessible')
    }
  }, [])

  const refreshEverything = useCallback(async () => {
    await Promise.all([loadDashboard(), loadCabinets(), loadUsers()])
    if (detail?.cabinet?.id) await openCabinet(detail.cabinet.id)
  }, [detail, loadCabinets, loadDashboard, loadUsers, openCabinet])

  useEffect(() => {
    let active = true
    async function bootstrap() {
      try {
        const response = await salesApi.me()
        if (!active) return
        setUser(response.data)
      } catch (error) {
        toast.error(error?.response?.data?.error || 'Accès à la prospection refusé')
      } finally { if (active) setLoading(false) }
    }
    bootstrap()
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!user) return
    const timer = window.setTimeout(() => {
      Promise.all([loadDashboard(), loadCabinets(), user.role === 'super_admin' ? salesApi.users().then((response) => setUsers((response.data.users || []).filter((item) => item.role === 'prospecteur' && !item.suspended_at && !item.deleted_at))) : Promise.resolve()]).catch(() => {})
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadCabinets, loadDashboard, user])

  useEffect(() => {
    if (tab !== 'cabinets' || !user) return undefined
    const timer = window.setTimeout(() => { loadCabinets() }, 0)
    return () => window.clearTimeout(timer)
  }, [filters, loadCabinets, tab, user])

  useEffect(() => {
    if (!user || draftSearch.trim().length < 3) return undefined
    const timer = window.setTimeout(() => {
      salesApi.searchConflicts(draftSearch.trim()).then((response) => setConflicts(response.data.cabinets || [])).catch(() => setConflicts([]))
    }, 350)
    return () => window.clearTimeout(timer)
  }, [draftSearch, user])

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value, page: key === 'page' ? value : 1 }))
    setSelected([])
  }

  function submitSearch(event) {
    event.preventDefault()
    updateFilter('search', draftSearch.trim())
    setConflicts([])
  }

  async function startCall(cabinet) {
    try {
      const response = await salesApi.startCall(cabinet.id)
      setActiveCall({ cabinet, call: response.data.call })
      setDetail(null)
    } catch (error) {
      const code = error?.response?.data?.error
      toast.error(code === 'cabinet_locked' ? 'Un autre prospecteur est déjà en train d’appeler ce cabinet.' : code === 'cabinet_not_assigned_to_user' ? 'Cette fiche ne vous est pas attribuée.' : code || 'Impossible de démarrer l’appel')
    }
  }

  async function callNext() {
    setLoadingNext(true)
    try {
      const response = await salesApi.nextCabinet()
      if (!response.data.cabinet) return toast('Aucun cabinet disponible pour le moment.')
      await startCall(response.data.cabinet)
    } catch (error) { toast.error(error?.response?.data?.error || 'Sélection impossible') }
    finally { setLoadingNext(false) }
  }

  async function cancelCall() {
    if (!activeCall) return
    try { await salesApi.releaseLock(activeCall.cabinet.id) } catch { /* le verrou expirera automatiquement */ }
    setActiveCall(null)
    await refreshEverything()
  }

  async function completeCall() {
    setActiveCall(null)
    await refreshEverything()
  }

  async function assignSelected() {
    if (!selected.length) return toast.error('Sélectionnez au moins un cabinet.')
    try {
      await salesApi.assign({ cabinet_ids: selected, to_user_id: assignTo ? Number(assignTo) : null, method: 'manual', justification: 'Attribution depuis la liste nationale' })
      toast.success(`${selected.length} cabinet(s) attribué(s)`)
      setSelected([])
      await refreshEverything()
    } catch (error) { toast.error(error?.response?.data?.error || 'Attribution impossible') }
  }

  async function autoAssign() {
    if (!users.length) return toast.error('Aucun prospecteur actif.')
    try {
      const response = await salesApi.autoAssign({ user_ids: users.map((item) => item.id), size_category: filters.size_category || undefined, strategy: 'round_robin' })
      toast.success(`${response.data.updated || 0} cabinets répartis équitablement`)
      await refreshEverything()
    } catch (error) { toast.error(error?.response?.data?.error || 'Répartition impossible') }
  }

  function openFilter(next) {
    if (next.open_id) { openCabinet(next.open_id); return }
    setTab('cabinets')
    setFilters((current) => ({ ...EMPTY_FILTERS, ...current, ...next, page: 1 }))
  }

  const conflictResults = useMemo(() => draftSearch.trim().length < 3 ? [] : conflicts.filter((item) => item.assigned_to && Number(item.assigned_to) !== Number(user?.id)).slice(0, 6), [conflicts, draftSearch, user?.id])

  if (loading) return <div className="sales-page"><div className="sales-loading fullscreen"><Loader2 size={26} className="sales-spin" /> Ouverture du cockpit sécurisé…</div></div>
  if (!user) return <div className="sales-page"><div className="sales-empty-state"><ShieldCheck size={30} /><strong>Accès non autorisé</strong><span>Votre compte ne possède pas le rôle commercial requis.</span></div></div>

  return (
    <div className="sales-page">
      <header className="sales-page-head">
        <div><span className="sales-kicker"><ShieldCheck size={15} /> Prospection France · accès cloisonné</span><h1>Courtiark Sales Command</h1><p>{isAdmin ? 'Vision nationale, attribution et pilotage complet de la conversion.' : `Bonjour ${user.first_name || user.username}. Votre portefeuille est isolé et prêt à appeler.`}</p></div>
        <button className="sales-button secondary" onClick={refreshEverything}><RefreshCw size={16} /> Actualiser</button>
      </header>

      <nav className="sales-main-tabs" aria-label="Sections prospection">
        {tabs.map(({ id, label, icon: Icon }) => <button key={id} className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)}><Icon size={16} />{label}</button>)}
      </nav>

      <main className="sales-page-body">
        {tab === 'cockpit' && <SalesDashboard metrics={metrics} user={user} onOpenFilter={openFilter} onCallNext={callNext} loadingNext={loadingNext} />}

        {tab === 'cabinets' && <section className="sales-panel sales-list-panel">
          <header className="sales-list-header"><div><span className="sales-kicker"><Database size={15} /> Base cabinets</span><h3>{total.toLocaleString('fr-FR')} cabinet{total > 1 ? 's' : ''}</h3></div>{!isAdmin && <button className="sales-button primary" disabled={loadingNext} onClick={callNext}><PhoneCall size={16} /> Prochain appel</button>}</header>

          <div className="sales-filter-zone">
            <form className="sales-search-form" onSubmit={submitSearch}><Search size={17} /><input value={draftSearch} onChange={(event) => setDraftSearch(event.target.value)} placeholder="Raison sociale, SIREN, ORIAS, ville, contact…" /><button type="submit">Rechercher</button></form>
            {!!conflictResults.length && <div className="sales-conflict-popover"><strong>Présence détectée dans la base</strong>{conflictResults.map((item) => <div key={item.id}><span>{item.legal_name} · {item.city || 'France'}</span><em>{item.locked_by_username ? `Appel en cours par @${item.locked_by_username}` : `Attribué à @${item.assigned_username}`}</em></div>)}</div>}
            <div className="sales-filters"><SlidersHorizontal size={16} />
              <select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}><option value="">Tous les statuts</option>{Object.entries(PIPELINE_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
              <select value={filters.size_category} onChange={(event) => updateFilter('size_category', event.target.value)}><option value="">Toutes les tailles</option>{Object.entries(SIZE_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
              <select value={filters.interest_level} onChange={(event) => updateFilter('interest_level', event.target.value)}><option value="">Tout intérêt</option>{Object.entries(INTEREST_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
              {isAdmin && <select value={filters.assigned_to} onChange={(event) => updateFilter('assigned_to', event.target.value)}><option value="">Tous les commerciaux</option><option value="unassigned">Non attribué</option>{users.map((item) => <option key={item.id} value={item.id}>@{item.username}</option>)}</select>}
              <select value={filters.sort} onChange={(event) => updateFilter('sort', event.target.value)}><option value="size_asc">Taille croissante</option><option value="size_desc">Taille décroissante</option><option value="priority">Priorité</option><option value="next_followup">Prochaine relance</option><option value="last_call">Dernier appel</option><option value="updated">Dernière modification</option></select>
              <button className="sales-text-button" onClick={() => { setFilters(EMPTY_FILTERS); setDraftSearch(''); setSelected([]) }}>Effacer</button>
            </div>
          </div>

          {isAdmin && <div className="sales-assignment-bar"><CheckSquare2 size={16} /><strong>{selected.length} sélectionné{selected.length > 1 ? 's' : ''}</strong><select value={assignTo} onChange={(event) => setAssignTo(event.target.value)}><option value="">Désattribuer</option>{users.map((item) => <option key={item.id} value={item.id}>Attribuer à @{item.username}</option>)}</select><button className="sales-button secondary" disabled={!selected.length} onClick={assignSelected}>Appliquer</button><span /><button className="sales-button secondary" onClick={autoAssign}><UsersRound size={15} /> Répartir équitablement</button></div>}

          <CabinetTable cabinets={cabinets} loading={loadingList} selected={selected} onSelect={(id, checked) => setSelected((current) => checked ? [...new Set([...current, id])] : current.filter((item) => item !== id))} onSelectAll={(checked) => setSelected(checked ? cabinets.map((item) => item.id) : [])} onOpen={openCabinet} />
          <footer className="sales-pagination"><span>Page {filters.page} sur {pageCount}</span><div><button disabled={filters.page <= 1} onClick={() => updateFilter('page', filters.page - 1)}><ArrowLeft size={15} /> Précédent</button><button disabled={filters.page >= pageCount} onClick={() => updateFilter('page', filters.page + 1)}>Suivant <ArrowRight size={15} /></button></div></footer>
        </section>}

        {tab === 'calendar' && <SalesCalendarPanel user={user} />}
        {tab === 'import' && isAdmin && <SalesImportPanel onImported={refreshEverything} />}
        {tab === 'team' && isAdmin && <SalesUsersPanel onUsersChanged={loadUsers} />}
        {tab === 'audit' && isAdmin && <SalesAuditPanel />}
      </main>

      {detail && <CabinetDrawer detail={detail} user={user} onClose={() => setDetail(null)} onStartCall={startCall} onRefresh={refreshEverything} />}
      {activeCall && <CallOutcomeWizard cabinet={activeCall.cabinet} call={activeCall.call} onComplete={completeCall} onCancel={cancelCall} />}
    </div>
  )
}
