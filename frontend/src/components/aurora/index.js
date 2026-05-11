/* ═══════════════════════════════════════════════════════════════════════════
   AURORA DESIGN SYSTEM — Complete Component Index
   COURTIA V2 • 25 Premium Components (20 base + 5 mobile)
   ═══════════════════════════════════════════════════════════════════════════ */

// ─────────────────────────────────────────────────────────────────────────────
// BASE PRIMITIVES (LOT 13)
// ─────────────────────────────────────────────────────────────────────────────

// Button
export { AuroraButton, default as AuroraButtonDefault } from './AuroraButton';

// Card
export { AuroraCard, default as AuroraCardDefault } from './AuroraCard';

// Input
export { AuroraInput, default as AuroraInputDefault } from './AuroraInput';

// Textarea
export { AuroraTextarea, default as AuroraTextareaDefault } from './AuroraTextarea';

// Select
export { AuroraSelect, default as AuroraSelectDefault } from './AuroraSelect';

// Badge
export { AuroraBadge, default as AuroraBadgeDefault } from './AuroraBadge';

// Stat
export { AuroraStat, default as AuroraStatDefault } from './AuroraStat';

// Skeleton
export { AuroraSkeleton, default as AuroraSkeletonDefault } from './AuroraSkeleton';

// Toast (with provider and hook)
export {
  AuroraToast,
  ToastProvider,
  useToast,
  default as AuroraToastDefault,
} from './AuroraToast';

// Dialog
export { AuroraDialog, default as AuroraDialogDefault } from './AuroraDialog';

// Tabs
export { AuroraTabs, default as AuroraTabsDefault } from './AuroraTabs';

// Tooltip
export { AuroraTooltip, default as AuroraTooltipDefault } from './AuroraTooltip';

// Spinner
export { AuroraSpinner, default as AuroraSpinnerDefault } from './AuroraSpinner';

// EmptyState
export { AuroraEmptyState, default as AuroraEmptyStateDefault } from './AuroraEmptyState';

// SectionTitle
export { AuroraSectionTitle, default as AuroraSectionTitleDefault } from './AuroraSectionTitle';

// Divider
export { AuroraDivider, default as AuroraDividerDefault } from './AuroraDivider';

// Avatar
export { AuroraAvatar, default as AuroraAvatarDefault } from './AuroraAvatar';

// PageHeader
export { AuroraPageHeader, default as AuroraPageHeaderDefault } from './AuroraPageHeader';

// Layout (La Bulle shell)
export { AuroraLayout, default as AuroraLayoutDefault } from './AuroraLayout';

// Breadcrumb
export { AuroraBreadcrumb, default as AuroraBreadcrumbDefault } from './AuroraBreadcrumb';

// Pagination
export { AuroraPagination, default as AuroraPaginationDefault } from './AuroraPagination';

// ─────────────────────────────────────────────────────────────────────────────
// MOBILE COMPONENTS (LOT 14)
// ─────────────────────────────────────────────────────────────────────────────

// Bottom Navigation
export {
  AuroraBottomNav,
  default as AuroraBottomNavDefault,
} from './AuroraBottomNav';

// Mobile Sheet (Bottom Drawer)
export {
  AuroraMobileSheet,
  default as AuroraMobileSheetDefault,
} from './AuroraMobileSheet';

// Mobile More Menu
export {
  AuroraMobileMore,
  default as AuroraMobileMoreDefault,
} from './AuroraMobileMore';

// Mobile Layout Wrapper
export {
  AuroraMobileLayout,
  useMediaQuery,
  default as AuroraMobileLayoutDefault,
} from './AuroraMobileLayout';

// Responsive Table/Cards
export {
  AuroraTableMobile,
  default as AuroraTableMobileDefault,
} from './AuroraTableMobile';

// Mobile Topbar (burger left + logo center + bell right)
export {
  AuroraMobileTopbar,
  default as AuroraMobileTopbarDefault,
} from './AuroraMobileTopbar';

// ─────────────────────────────────────────────────────────────────────────────
// CONVENIENCE RE-EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

// Grouped export for easy destructuring
export const AuroraComponents = {
  // Base
  Button: 'AuroraButton',
  Card: 'AuroraCard',
  Input: 'AuroraInput',
  Textarea: 'AuroraTextarea',
  Select: 'AuroraSelect',
  Badge: 'AuroraBadge',
  Stat: 'AuroraStat',
  Skeleton: 'AuroraSkeleton',
  Toast: 'AuroraToast',
  Dialog: 'AuroraDialog',
  Tabs: 'AuroraTabs',
  Tooltip: 'AuroraTooltip',
  Spinner: 'AuroraSpinner',
  EmptyState: 'AuroraEmptyState',
  SectionTitle: 'AuroraSectionTitle',
  Divider: 'AuroraDivider',
  Avatar: 'AuroraAvatar',
  PageHeader: 'AuroraPageHeader',
  Breadcrumb: 'AuroraBreadcrumb',
  Pagination: 'AuroraPagination',
  // Mobile
  BottomNav: 'AuroraBottomNav',
  MobileSheet: 'AuroraMobileSheet',
  MobileMore: 'AuroraMobileMore',
  MobileLayout: 'AuroraMobileLayout',
  TableMobile: 'AuroraTableMobile',
};
