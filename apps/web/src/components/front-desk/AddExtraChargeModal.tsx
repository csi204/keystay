import React, { useState, useEffect } from 'react';
import { useI18n } from '../../lib/i18n';
import { X, Plus, AlertCircle, ShoppingBag, Sparkles } from 'lucide-react';

export interface ExtraChargePreset {
  id: string;
  category: 'minibar' | 'laundry' | 'damage' | 'service' | 'other';
  en: string;
  th: string;
  price: string;
}

export const EXTRA_CHARGE_PRESETS: ExtraChargePreset[] = [
  // Minibar
  { id: 'mb-water', category: 'minibar', en: 'Drinking Water', th: 'น้ำดื่ม', price: '20' },
  { id: 'mb-beer', category: 'minibar', en: 'Singha Beer', th: 'เบียร์สิงห์', price: '80' },
  { id: 'mb-soda', category: 'minibar', en: 'Canned Soft Drink / Coke', th: 'น้ำอัดลม / โค้ก', price: '40' },
  { id: 'mb-chips', category: 'minibar', en: 'Pringles Potato Chips', th: 'มันฝรั่งพริงเกิลส์', price: '60' },
  // Laundry
  { id: 'ld-express', category: 'laundry', en: 'Express Laundry Service', th: 'บริการซักรีดด่วนพิเศษ', price: '150' },
  { id: 'ld-shirt', category: 'laundry', en: 'Shirt Washing & Ironing', th: 'ซักรีดเสื้อเชิ้ต', price: '60' },
  { id: 'ld-pants', category: 'laundry', en: 'Trousers / Pants', th: 'ซักรีดกางเกง', price: '80' },
  // Service
  { id: 'sv-bed', category: 'service', en: 'Extra Bed with Breakfast', th: 'เตียงเสริมพร้อมอาหารเช้า', price: '500' },
  { id: 'sv-airport', category: 'service', en: 'Airport Shuttle Transfer', th: 'รถรับส่งสนามบิน', price: '300' },
  { id: 'sv-lateco', category: 'service', en: 'Late Check-out Hourly Fee', th: 'ค่าธรรมเนียมเช็คเอาท์เกินเวลา (รายชั่วโมง)', price: '200' },
  // Damage
  { id: 'dm-key', category: 'damage', en: 'Lost Key Card Replacement', th: 'ค่าปรับคีย์การ์ดสูญหาย', price: '200' },
  { id: 'dm-linen', category: 'damage', en: 'Stained Bed Linen', th: 'ค่าซักทำความสะอาดผ้าปูที่นอนเปื้อน', price: '300' },
  { id: 'dm-towel', category: 'damage', en: 'Damaged Bath Towel', th: 'ค่าปรับผ้าเช็ดตัวเสียหาย', price: '250' },
  // Other
  { id: 'ot-misc', category: 'other', en: 'Miscellaneous Charge', th: 'ค่าบริการเบ็ดเตล็ด', price: '100' },
];

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
  const { t, locale, formatCurrency } = useI18n();
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

  // Safe NaN-immune calculation
  const safeQty = Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
  const parsedPrice = parseFloat(unitPrice);
  const safePrice = Number.isFinite(parsedPrice) && parsedPrice >= 0 ? parsedPrice : 0;
  const total = (safeQty * safePrice).toFixed(2);

  const categoryPresets = EXTRA_CHARGE_PRESETS.filter((p) => p.category === category);

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
    if (parseFloat(unitPrice) < 0 || Number.isNaN(parseFloat(unitPrice))) {
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
            <ShoppingBag className="w-5 h-5 text-slate-900" />
            <h2 className="text-xl font-bold text-slate-900">
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
            <label className="block text-sm font-semibold text-slate-800 mb-1">
              {t('folio.chargeCategory')} *
            </label>
            <select
              value={category}
              onChange={(e) => {
                const newCat = e.target.value as 'minibar' | 'laundry' | 'damage' | 'service' | 'other';
                setCategory(newCat);
                // Optionally clear description or set default preset
                const firstPreset = EXTRA_CHARGE_PRESETS.find((p) => p.category === newCat);
                if (firstPreset) {
                  setDescription(locale === 'th' ? firstPreset.th : firstPreset.en);
                  setUnitPrice(firstPreset.price);
                }
              }}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="minibar">{t('category.minibar')}</option>
              <option value="laundry">{t('category.laundry')}</option>
              <option value="service">{t('category.service')}</option>
              <option value="damage">{t('category.damage')}</option>
              <option value="other">{t('category.other')}</option>
            </select>
          </div>

          {/* Quick presets for selected category */}
          {categoryPresets.length > 0 && (
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{locale === 'th' ? 'เลือกรายการด่วนยอดนิยม' : 'Quick Presets'}</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {categoryPresets.map((preset) => {
                  const label = locale === 'th' ? preset.th : preset.en;
                  const isSelected = description === label;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setDescription(label);
                        setUnitPrice(preset.price);
                      }}
                      className={`px-3 py-1.5 rounded text-xs sm:text-sm font-medium border transition-colors flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <span>{label}</span>
                      <span className="opacity-70 font-mono tabular-nums tracking-tight">
                        ฿{preset.price}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1">
              {t('folio.chargeDescription')} *
            </label>
            <input
              type="text"
              required
              placeholder={t('folio.chargeDescriptionPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-sm py-2 px-3 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1">
                {t('folio.chargeQuantity')} *
              </label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full text-sm py-2 px-3 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono tabular-nums tracking-tight"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1">
                {t('folio.chargeUnitPrice')} *
              </label>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="w-full text-sm py-2 px-3 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono tabular-nums tracking-tight"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-sm font-mono tabular-nums tracking-tight">
            <span className="text-slate-600 font-medium">{t('folio.chargeTotal')}:</span>
            <span className="text-base font-bold font-mono text-slate-900">{formatCurrency(total)}</span>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
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
