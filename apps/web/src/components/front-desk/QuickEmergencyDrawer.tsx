import React, { useState, useEffect } from 'react';
import { useI18n } from '../../lib/i18n';
import {
  useOutsourceContacts,
  EmergencyOutsourceContact,
} from '../../hooks/useOutsourceContacts';
import {
  X,
  Phone,
  PhoneCall,
  Copy,
  Check,
  AlertTriangle,
  RefreshCw,
  Wind,
  Wrench,
  Zap,
  Lock,
  ShieldAlert,
  Clock,
  WifiOff,
  ExternalLink,
} from 'lucide-react';

export interface QuickEmergencyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

type EmergencyCategory =
  | 'all'
  | 'air_conditioning'
  | 'plumbing'
  | 'electrical'
  | 'locksmith';

interface CategoryTab {
  key: EmergencyCategory;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CATEGORY_TABS: CategoryTab[] = [
  { key: 'all', labelKey: 'emergency.categoryAll', icon: ShieldAlert },
  { key: 'air_conditioning', labelKey: 'emergency.categoryAir', icon: Wind },
  { key: 'plumbing', labelKey: 'emergency.categoryPlumbing', icon: Wrench },
  { key: 'electrical', labelKey: 'emergency.categoryElectrical', icon: Zap },
  { key: 'locksmith', labelKey: 'emergency.categoryLocksmith', icon: Lock },
];

export const QuickEmergencyDrawer: React.FC<QuickEmergencyDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useI18n();
  const { contacts, loading, isOffline, refresh } = useOutsourceContacts();
  const [activeCategory, setActiveCategory] = useState<EmergencyCategory>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredContacts = contacts.filter((item: EmergencyOutsourceContact) => {
    if (activeCategory === 'all') return true;
    return item.category === activeCategory;
  });

  const handleCopyLine = async (id: string, lineId: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(lineId);
      } else {
        // Fallback for non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = lineId;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.warn('Failed to copy to clipboard', err);
    }
  };

  const getCategoryMeta = (cat: string) => {
    switch (cat) {
      case 'air_conditioning':
        return {
          icon: Wind,
          label: t('emergency.categoryAir'),
          badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
        };
      case 'plumbing':
        return {
          icon: Wrench,
          label: t('emergency.categoryPlumbing'),
          badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200',
        };
      case 'electrical':
        return {
          icon: Zap,
          label: t('emergency.categoryElectrical'),
          badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
        };
      case 'locksmith':
        return {
          icon: Lock,
          label: t('emergency.categoryLocksmith'),
          badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        };
      default:
        return {
          icon: ShieldAlert,
          label: cat,
          badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-8 sm:pl-10">
        <div className="w-screen max-w-lg bg-white border-l border-slate-200 shadow-xl flex flex-col animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-200 bg-white sticky top-0 z-10 flex flex-col gap-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                    <span role="img" aria-label="alert">🚨</span>
                    <span>{t('emergency.drawerTitle')}</span>
                  </h2>
                  {/* 24-Hour Alert Badge */}
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                    <Clock className="w-3 h-3 text-rose-600" />
                    <span>{t('emergency.badge24h')}</span>
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {t('emergency.drawerSubtitle')}
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors shrink-0"
                title={t('common.close')}
                aria-label={t('common.close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Offline Alert & Read-Only Notice Bar */}
            <div className="flex items-center justify-between text-xs bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5">
              <div className="flex items-center gap-1.5 text-slate-600">
                {isOffline ? (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="text-amber-800 font-medium">
                      {t('emergency.offlineNotice')}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-slate-600 font-medium">
                      {t('emergency.readOnly')}
                    </span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => refresh()}
                disabled={loading}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 px-1.5 py-0.5 rounded hover:bg-slate-200/70 transition-colors disabled:opacity-50"
                title={t('common.refresh')}
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                <span>{t('common.refresh')}</span>
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
              {CATEGORY_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeCategory === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveCategory(tab.key)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 border border-slate-200/60'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{t(tab.labelKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Drawer Body - Contact Cards */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3.5 bg-slate-50/50">
            {filteredContacts.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-lg p-8 text-center space-y-2">
                <AlertTriangle className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-sm font-semibold text-slate-800">
                  {t('emergency.empty')}
                </p>
                <p className="text-xs text-slate-500">
                  {t('matrix.noRoomsFoundHint')}
                </p>
              </div>
            ) : (
              filteredContacts.map((contact: EmergencyOutsourceContact) => {
                const catMeta = getCategoryMeta(contact.category);
                const CatIcon = catMeta.icon;
                const cleanPrimaryPhone = contact.phonePrimary.replace(/[^0-9+]/g, '');
                const cleanSecondaryPhone = contact.phoneSecondary
                  ? contact.phoneSecondary.replace(/[^0-9+]/g, '')
                  : null;

                return (
                  <div
                    key={contact.id}
                    className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs hover:border-slate-300 transition-all space-y-3"
                  >
                    {/* Card Top: Title & Badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-slate-900 leading-tight">
                            {contact.name}
                          </h3>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${catMeta.badgeClass}`}
                          >
                            <CatIcon className="w-3 h-3" />
                            <span>{catMeta.label}</span>
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {contact.serviceType}
                        </p>
                      </div>

                      {contact.rating && (
                        <span className="shrink-0 text-xs font-mono font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                          ★ {contact.rating.toFixed(1)}
                        </span>
                      )}
                    </div>

                    {/* Meta Details: Hours, Rates, Notes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span className="font-medium text-slate-800">
                          {contact.availableHours}
                        </span>
                      </div>

                      {contact.lineId && (
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <span className="font-semibold text-emerald-600">LINE:</span>
                          <span className="font-mono text-slate-800 font-medium">
                            {contact.lineId}
                          </span>
                        </div>
                      )}

                      {contact.priceRateNote && (
                        <div className="text-slate-500 col-span-1 sm:col-span-2 text-[11px]">
                          {t('emergency.priceRate', { rate: contact.priceRateNote })}
                        </div>
                      )}

                      {contact.notes && (
                        <div className="col-span-1 sm:col-span-2 text-[11px] bg-slate-50 border border-slate-200/80 rounded px-2.5 py-1.5 text-slate-600">
                          {t('emergency.notes', { notes: contact.notes })}
                        </div>
                      )}
                    </div>

                    {/* Action Bar: Click-to-Call & Copy LINE */}
                    <div className="pt-2 flex items-center gap-2 border-t border-slate-100">
                      {/* Click-to-Call Primary */}
                      <a
                        href={`tel:${cleanPrimaryPhone}`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
                        title={t('emergency.clickToCall')}
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span className="font-mono tracking-tight">
                          {t('emergency.clickToCall')} {contact.phonePrimary}
                        </span>
                      </a>

                      {/* Optional Secondary Phone Call */}
                      {cleanSecondaryPhone && (
                        <a
                          href={`tel:${cleanSecondaryPhone}`}
                          className="px-2.5 py-2 rounded-md border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors"
                          title={`${t('emergency.callSecondary')}: ${contact.phoneSecondary}`}
                        >
                          <PhoneCall className="w-3.5 h-3.5 text-slate-600" />
                        </a>
                      )}

                      {/* Copy LINE ID Button */}
                      {contact.lineId && (
                        <button
                          type="button"
                          onClick={() => handleCopyLine(contact.id, contact.lineId!)}
                          className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold border transition-all ${
                            copiedId === contact.id
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-bold'
                              : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                          title={t('emergency.copyLine')}
                        >
                          {copiedId === contact.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{t('emergency.copied')}</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-500" />
                              <span>{t('emergency.copyLine')}</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
