import React, { useState, useEffect } from 'react';
import { useI18n } from '../../lib/i18n';
import { X, Plus, AlertCircle, ShoppingBag } from 'lucide-react';

export interface AddExtraChargeModalProps {
  billId: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    billId: string,
    data: {
      description: string;
      category: 'room' | 'minibar' | 'laundry' | 'damage' | 'service' | 'other';
      quantity: number;
      unitPrice: string;
    }
  ) => Promise<{ success: boolean; error?: string }>;
}

export const AddExtraChargeModal: React.FC<AddExtraChargeModalProps> = ({
  billId,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const { t, formatCurrency } = useI18n();
  const [category, setCategory] = useState<
    'minibar' | 'laundry' | 'damage' | 'service' | 'other'
  >('minibar');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState('50');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDescription('');
      setQuantity(1);
      setUnitPrice('50');
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const total = (quantity * (parseFloat(unitPrice) || 0)).toFixed(2);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError(t('folio.errorDescription'));
      return;
    }
    if (quantity <= 0) {
      setError(t('folio.errorQuantity'));
      return;
    }
    if (parseFloat(unitPrice) < 0) {
      setError(t('folio.errorUnitPrice'));
      return;
    }

    setError(null);
    setIsSubmitting(true);
    const result = await onSubmit(billId, {
      category,
      description: description.trim(),
      quantity,
      unitPrice: unitPrice.trim(),
    });
    setIsSubmitting(false);

    if (result.success) {
      onClose();
    } else {
      setError(result.error || t('folio.errorAddCharge'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-slate-900" />
            <h2 className="text-sm font-bold text-slate-900">
              {t('folio.addExtraChargeTitle')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {t('folio.chargeCategory')} *
            </label>
            <select
              value={category}
              onChange={(e) =>
                setCategory(
                  e.target.value as 'minibar' | 'laundry' | 'damage' | 'service' | 'other'
                )
              }
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="minibar">{t('category.minibar')}</option>
              <option value="laundry">{t('category.laundry')}</option>
              <option value="service">{t('category.service')}</option>
              <option value="damage">{t('category.damage')}</option>
              <option value="other">{t('category.other')}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {t('folio.chargeDescription')} *
            </label>
            <input
              type="text"
              required
              placeholder={t('folio.chargeDescriptionPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {t('folio.chargeQuantity')} *
              </label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {t('folio.chargeUnitPrice')} *
              </label>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-500">{t('folio.chargeTotal')}:</span>
            <span className="font-bold text-slate-900 text-sm">{formatCurrency(total)}</span>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isSubmitting ? t('res.submitting') : t('folio.addChargeSubmit')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
