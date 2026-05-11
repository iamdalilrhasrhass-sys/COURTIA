import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Bell, Settings, Home, FileText, AlertTriangle, Check, X, Star, Search } from 'lucide-react';
import {
  AuroraButton, AuroraCard, AuroraInput, AuroraTextarea, AuroraSelect,
  AuroraBadge, AuroraStat, AuroraSkeleton, AuroraAvatar,
  AuroraSpinner, AuroraEmptyState, AuroraDialog, AuroraTooltip,
  AuroraTabs, AuroraBreadcrumb, AuroraPagination, AuroraPageHeader,
  AuroraSectionTitle, AuroraDivider, useToast
} from '../components/aurora';

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 'var(--aurora-space-8)' }}>
      <AuroraSectionTitle gradient>{title}</AuroraSectionTitle>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--aurora-space-4)', alignItems: 'flex-start' }}>
        {children}
      </div>
    </div>
  );
}

export function DesignSystem() {
  const toast = useToast();
  const [tab, setTab] = useState('tab1');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectVal, setSelectVal] = useState('');

  return (
    <div style={{ padding: 'var(--aurora-space-6)', maxWidth: 1200, margin: '0 auto' }}>
      <AuroraPageHeader title="Aurora Design System" subtitle="Tous les composants COURTIA V2" />
      <AuroraBreadcrumb items={[{ label: 'Design System' }]} />
      <AuroraDivider spacing="lg" />

      <Section title="Buttons">
        <AuroraButton>Primary</AuroraButton>
        <AuroraButton variant="secondary">Secondary</AuroraButton>
        <AuroraButton variant="ghost">Ghost</AuroraButton>
        <AuroraButton variant="danger">Danger</AuroraButton>
        <AuroraButton disabled>Disabled</AuroraButton>
        <AuroraButton size="sm">Small</AuroraButton>
        <AuroraButton size="lg">Large</AuroraButton>
      </Section>

      <Section title="Inputs">
        <AuroraInput placeholder="Standard input" style={{ width: 250 }} />
        <AuroraInput placeholder="With icon" icon={Search} style={{ width: 250 }} />
        <AuroraInput placeholder="Error state" error="Champ requis" style={{ width: 250 }} />
        <AuroraSelect label="Select" placeholder="Choisir..." value={selectVal} onChange={setSelectVal} options={[{ value: 'a', label: 'Option A' }, { value: 'b', label: 'Option B' }]} style={{ width: 250 }} />
        <AuroraTextarea placeholder="Textarea avec limite" maxLength={200} style={{ width: 300 }} />
      </Section>

      <Section title="Badges">
        <AuroraBadge>Default</AuroraBadge>
        <AuroraBadge variant="success" dot>Success</AuroraBadge>
        <AuroraBadge variant="warning" dot pulse>Warning</AuroraBadge>
        <AuroraBadge variant="error">Error</AuroraBadge>
        <AuroraBadge variant="info">Info</AuroraBadge>
        <AuroraBadge variant="accent">Accent</AuroraBadge>
      </Section>

      <Section title="Stats">
        <AuroraStat label="Clients" value={247} previousValue={231} icon={User} />
        <AuroraStat label="Contrats" value={1842} previousValue={1900} icon={FileText} />
        <AuroraStat label="Loading" loading />
      </Section>

      <Section title="Avatars">
        <AuroraAvatar name="Jean Dupont" size="sm" />
        <AuroraAvatar name="Marie Martin" size="md" status="online" />
        <AuroraAvatar name="Pierre Durand" size="lg" status="busy" />
      </Section>

      <Section title="Feedback">
        <AuroraSpinner size="sm" />
        <AuroraSpinner size="md" />
        <AuroraSpinner size="lg" />
        <AuroraButton onClick={() => toast.success('Action réussie !')}>Toast Success</AuroraButton>
        <AuroraButton onClick={() => toast.error('Une erreur est survenue')}>Toast Error</AuroraButton>
        <AuroraButton onClick={() => toast.warning('Attention')}>Toast Warning</AuroraButton>
      </Section>

      <Section title="Skeleton">
        <AuroraSkeleton width={200} height={20} />
        <AuroraSkeleton variant="circle" height={48} />
        <AuroraSkeleton lines={3} width={300} />
      </Section>

      <Section title="Tabs">
        <AuroraTabs tabs={[{ value: 'tab1', label: 'Onglet 1', count: 5 }, { value: 'tab2', label: 'Onglet 2' }, { value: 'tab3', label: 'Onglet 3' }]} activeTab={tab} onChange={setTab} />
        <AuroraTabs variant="underline" tabs={[{ value: 'tab1', label: 'Underline 1' }, { value: 'tab2', label: 'Underline 2' }]} activeTab={tab} onChange={setTab} />
      </Section>

      <Section title="Pagination">
        <AuroraPagination page={page} totalPages={10} totalItems={97} onChange={setPage} />
      </Section>

      <Section title="Dialog">
        <AuroraButton onClick={() => setDialogOpen(true)}>Ouvrir Dialog</AuroraButton>
        <AuroraDialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Titre du Dialog" description="Description optionnelle" footer={<><AuroraButton variant="ghost" onClick={() => setDialogOpen(false)}>Annuler</AuroraButton><AuroraButton onClick={() => setDialogOpen(false)}>Confirmer</AuroraButton></>}>
          <p>Contenu du dialog. Vous pouvez mettre n'importe quoi ici.</p>
        </AuroraDialog>
      </Section>

      <Section title="Tooltip">
        <AuroraTooltip content="Info au survol"><AuroraButton variant="ghost">Hover me</AuroraButton></AuroraTooltip>
        <AuroraTooltip content="Position bottom" position="bottom"><AuroraButton variant="ghost">Bottom</AuroraButton></AuroraTooltip>
      </Section>

      <Section title="Empty State">
        <AuroraEmptyState icon={AlertTriangle} title="Aucune donnée" description="Commencez par ajouter un élément" action={<AuroraButton>Ajouter</AuroraButton>} />
      </Section>

      <Section title="Cards">
        <AuroraCard style={{ width: 300 }}>
          <h4 style={{ margin: '0 0 var(--aurora-space-2)' }}>Card Title</h4>
          <p style={{ margin: 0, color: 'var(--aurora-text-secondary)', fontSize: 'var(--aurora-font-sm)' }}>Card content with some description text.</p>
        </AuroraCard>
      </Section>
    </div>
  );
}

export default DesignSystem;