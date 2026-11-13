import React, { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import {
  X,
  Sparkles,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  Layers,
  BedDouble,
  Bath,
  Coffee,
  HelpCircle,
  FileText,
} from 'lucide-react';

export interface AmenityPreset {
  id: string;
  nameTh: string;
  nameEn: string;
  category: 'bedding' | 'bath' | 'appliance' | 'food_drink' | 'other';
  isChargeable: boolean;
  unitPrice: number;
  unitNameTh: string;
  unitNameEn: string;
  descriptionTh: string;
  descriptionEn: string;
}

export const AMENITY_PRESETS: AmenityPreset[] = [
  // Free Amenities (0 THB - Housekeeping request only, no folio impact)
  {
    id: 'amenity-pillow',
    nameTh: 'หมอนหนุนเสริม (Extra Pillow)',
    nameEn: 'Extra Pillow',
    category: 'bedding',
    isChargeable: false,
    unitPrice: 0,
    unitNameTh: 'ใบ',
    unitNameEn: 'pillow',
    descriptionTh: 'หมอนหนุนใยสังเคราะห์นุ่มพิเศษ (บริการฟรี)',
    descriptionEn: 'Extra soft synthetic down pillow (Complimentary)',
  },
  {
    id: 'amenity-towel',
    nameTh: 'ผ้าเช็ดตัวเพิ่ม (Extra Bath Towel)',
    nameEn: 'Extra Bath Towel',
    category: 'bath',
    isChargeable: false,
    unitPrice: 0,
    unitNameTh: 'ผืน',
    unitNameEn: 'piece',
    descriptionTh: 'ผ้าขนหนูเช็ดตัวเนื้อหนาสีขาว (บริการฟรี)',
    descriptionEn: 'Plush white cotton bath towel (Complimentary)',
  },
  {
    id: 'amenity-hairdryer',
    nameTh: 'ไดร์เป่าผมเสริม (Extra Hairdryer)',
    nameEn: 'Extra Hairdryer',
    category: 'appliance',
    isChargeable: false,
    unitPrice: 0,
    unitNameTh: 'เครื่อง',
    unitNameEn: 'device',
    descriptionTh: 'ไดร์เป่าผมไอออนิก 1800W (บริการฟรี)',
    descriptionEn: 'Ionic 1800W hairdryer (Complimentary)',
  },
  {
    id: 'amenity-hangers',
    nameTh: 'ไม้แขวนเสื้อเพิ่ม (Extra Clothes Hangers)',
    nameEn: 'Extra Clothes Hangers',
    category: 'other',
    isChargeable: false,
    unitPrice: 0,
    unitNameTh: 'ชุด (4 ชิ้น)',
    unitNameEn: 'set',
    descriptionTh: 'ชุดไม้แขวนเสื้อไม้เนื้อแข็ง 4 อัน (บริการฟรี)',
    descriptionEn: 'Set of 4 hardwood coat hangers (Complimentary)',
  },
  {
    id: 'amenity-adapter',
    nameTh: 'ปลั๊กแปลงสากล (Universal Power Adapter)',
    nameEn: 'Universal Power Adapter',
    category: 'appliance',
    isChargeable: false,
    unitPrice: 0,
    unitNameTh: 'อัน',
    unitNameEn: 'piece',
    descriptionTh: 'หัวแปลงปลั๊กไฟนานาชาติพร้อมพอร์ต USB (บริการฟรี)',
    descriptionEn: 'Universal travel plug adapter with USB ports (Complimentary)',
  },

  // Chargeable Amenities (Billed directly to room folio)
  {
    id: 'amenity-extrabed',
    nameTh: 'เตียงเสริมพร้อมชุดเครื่องนอน (Extra Bed)',
    nameEn: 'Extra Bed with Linen',
    category: 'bedding',
    isChargeable: true,
    unitPrice: 300,
    unitNameTh: 'หลัง/คืน',
    unitNameEn: 'bed/night',
    descriptionTh: 'เตียงสปริงเสริมพับเก็บได้พร้อมผ้าปูและหมอน (คิดเงิน 300 ฿/คืน)',
    descriptionEn: 'Rollaway extra spring bed with fresh linen set (300 THB/night)',
  },
  {
    id: 'amenity-bathset',
    nameTh: 'เซ็ตชุดคลุมอาบน้ำพรีเมียม (Premium Bathrobe Set)',
    nameEn: 'Premium Bathrobe Set',
    category: 'bath',
    isChargeable: true,
    unitPrice: 150,
    unitNameTh: 'ชุด',
    unitNameEn: 'set',
    descriptionTh: 'ชุดคลุมอาบน้ำผ้าฝรั่งเศสพร้อมสลิปเปอร์ (คิดเงิน 150 ฿)',
    descriptionEn: 'Luxury waffle bathrobe with matching slippers (150 THB)',
  },
  {
    id: 'amenity-toiletries',
    nameTh: 'เซ็ตแปรงสีฟันและของใช้ส่วนตัว (Premium Toiletries Set)',
    nameEn: 'Premium Toiletries Set',
    category: 'bath',
    isChargeable: true,
    unitPrice: 50,
    unitNameTh: 'ชุด',
    unitNameEn: 'set',
    descriptionTh: 'เซ็ตแปรงสีฟัน มีดโกนหนวด แปรงผม ออร์แกนิก (คิดเงิน 50 ฿)',
    descriptionEn: 'Eco-friendly bamboo dental and grooming kit (50 THB)',
  },
  {
    id: 'amenity-coffee',
    nameTh: 'เซ็ตแคปซูลกาแฟพรีเมียม (Premium Coffee Capsules)',
    nameEn: 'Premium Coffee Capsules',
    category: 'food_drink',
    isChargeable: true,
    unitPrice: 80,
    unitNameTh: 'กล่อง (4 แคปซูล)',
    unitNameEn: 'box',
    descriptionTh: 'แคปซูลกาแฟอาราบิก้าแท้ 4 รสชาติ (คิดเงิน 80 ฿)',
    descriptionEn: 'Box of 4 signature Arabica espresso capsules (80 THB)',
  },
];

export interface RequestAmenitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId?: string;
  roomNumber?: string;
  reservationId?: string;
  billId?: string;
  onSubmitAmenity: (data: {
    amenityId: string;
    amenityName: string;
    quantity: number;
    unitPrice: number;
    isChargeable: boolean;
    notes?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  onAddFolioCharge?: (
    billId: string,
    data: {
      description: string;
      category: 'room' | 'minibar' | 'laundry' | 'damage' | 'service' | 'other';
      quantity: number;
      unitPrice: string;
    }
  ) => Promise<{ success: boolean; error?: string }>;
}

export const RequestAmenitiesModal: React.FC<RequestAmenitiesModalProps> = ({
  isOpen,
  onClose,
  roomId,
  roomNumber,
  reservationId,
  billId,
  onSubmitAmenity,
  onAddFolioCharge,
}) => {
  const { t, locale, formatCurrency } = useI18n();

  const [activeTab, setActiveTab] = useState<'free' | 'paid'>('free');
  const [selectedAmenityId, setSelectedAmenityId] = useState<string>('amenity-pillow');
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab('free');
      setSelectedAmenityId('amenity-pillow');
      setQuantity(1);
      setNotes('');
      setError(null);
      setSuccessMsg(null);
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

  const currentList = AMENITY_PRESETS.filter((item) =>
    activeTab === 'free' ? !item.isChargeable : item.isChargeable
  );

  const selectedAmenity =
    AMENITY_PRESETS.find((item) => item.id === selectedAmenityId) || currentList[0];

  const handleTabChange = (tab: 'free' | 'paid') => {
    setActiveTab(tab);
    const firstOfTab = AMENITY_PRESETS.find((item) =>
      tab === 'free' ? !item.isChargeable : item.isChargeable
    );
    if (firstOfTab) {
      setSelectedAmenityId(firstOfTab.id);
    }
  };

  const safeQuantity = Math.max(1, quantity);
  const totalPrice = safeQuantity * (selectedAmenity?.unitPrice || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAmenity) return;

    setError(null);
    setIsSubmitting(true);

    try {
      // 1. Submit amenity request to reservation service
      const amenityResult = await onSubmitAmenity({
        amenityId: selectedAmenity.id,
        amenityName: locale === 'th' ? selectedAmenity.nameTh : selectedAmenity.nameEn,
        quantity: safeQuantity,
        unitPrice: selectedAmenity.unitPrice,
        isChargeable: selectedAmenity.isChargeable,
        notes: notes.trim() || undefined,
      });

      if (!amenityResult.success) {
        setError(amenityResult.error || (locale === 'th' ? 'เกิดข้อผิดพลาดในการบันทึกคำขอ' : 'Request failed'));
        setIsSubmitting(false);
        return;
      }

      // 2. If chargeable, automatically roll into Folio bill items
      if (selectedAmenity.isChargeable && onAddFolioCharge && billId) {
        const folioResult = await onAddFolioCharge(billId, {
          description: `[Amenity] ${locale === 'th' ? selectedAmenity.nameTh : selectedAmenity.nameEn}`,
          category: 'service',
          quantity: safeQuantity,
          unitPrice: String(selectedAmenity.unitPrice),
        });

        if (!folioResult.success) {
          setError(
            folioResult.error ||
              (locale === 'th' ? 'บันทึกคำขอแล้ว แต่เกิดข้อผิดพลาดในการลงบิล Folio' : 'Failed to roll into folio')
          );
          setIsSubmitting(false);
          return;
        }
      }

      setSuccessMsg(
        selectedAmenity.isChargeable
          ? (locale === 'th' ? `บันทึกคำขอและลงบิล Folio เรียบร้อย (+${formatCurrency(totalPrice)})` : `Billed to folio (+${formatCurrency(totalPrice)})`)
          : (locale === 'th' ? 'ส่งคำขอไปยังแผนกแม่บ้านแล้ว (บริการฟรี ไม่มีค่าใช้จ่าย)' : 'Request sent to housekeeping (Complimentary)')
      );

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || (locale === 'th' ? 'เกิดข้อผิดพลาดในการเชื่อมต่อ' : 'Network error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Centered Modal Card */}
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden w-full max-w-xl z-10 animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
              <Sparkles className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {locale === 'th' ? 'ขอของใช้และบริการเสริม (Extra Amenities)' : 'Request Extra Amenities'}
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {roomNumber ? `${t('common.room')} ${roomNumber}` : ''}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Category Tabs: Free vs Paid */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => handleTabChange('free')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'free'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>{locale === 'th' ? 'ของใช้บริการฟรี (0 ฿ - แจ้งแม่บ้าน ไม่ลงบิล)' : 'Free Amenities (0 THB)'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('paid')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'paid'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span>{locale === 'th' ? 'บริการเสริมคิดเงิน (ลงบิล Folio อัตโนมัติ)' : 'Paid Amenities (Billed to Folio)'}</span>
            </button>
          </div>

          {/* Presets List Chips */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              {locale === 'th' ? 'เลือกรายการของใช้ / บริการเสริม' : 'Select Amenity Item'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[180px] overflow-y-auto pr-1">
              {currentList.map((item) => {
                const isSelected = selectedAmenityId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedAmenityId(item.id)}
                    className={`flex flex-col text-left p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-indigo-50/70 border-indigo-400 ring-1 ring-indigo-400/40 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-semibold text-xs text-slate-900 truncate">
                        {locale === 'th' ? item.nameTh : item.nameEn}
                      </span>
                      <span
                        className={`text-xs font-mono font-bold ${
                          item.isChargeable ? 'text-emerald-700' : 'text-slate-500'
                        }`}
                      >
                        {item.isChargeable
                          ? `${formatCurrency(item.unitPrice)}/${locale === 'th' ? item.unitNameTh : item.unitNameEn}`
                          : (locale === 'th' ? 'ฟรี' : 'Free')}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                      {locale === 'th' ? item.descriptionTh : item.descriptionEn}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantity Selector & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {locale === 'th' ? 'จำนวน (Quantity)' : 'Quantity'}
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-9 h-9 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors border border-slate-200"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 h-9 text-center font-mono font-bold text-sm bg-white text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-9 h-9 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors border border-slate-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs text-slate-500 ml-1">
                  {selectedAmenity ? (locale === 'th' ? selectedAmenity.unitNameTh : selectedAmenity.unitNameEn) : ''}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {locale === 'th' ? 'หมายเหตุเพิ่มเติม (Notes)' : 'Notes'}
              </label>
              <input
                type="text"
                placeholder={locale === 'th' ? 'เช่น ส่งด่วน, ขอนุ่มพิเศษ' : 'Special requests'}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full h-9 px-3 text-xs bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
              />
            </div>
          </div>

          {/* Pricing & Business Rule Summary Box */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-mono ${
              selectedAmenity?.isChargeable
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                : 'bg-indigo-50/60 border-indigo-200 text-indigo-950'
            }`}
          >
            <div className="space-y-0.5">
              <span className="font-semibold block font-sans">
                {selectedAmenity?.isChargeable
                  ? (locale === 'th' ? 'บริการเสริมคิดเงิน (Auto-Folio Billing)' : 'Paid Amenity')
                  : (locale === 'th' ? 'บริการฟรี (Housekeeping Only)' : 'Complimentary Amenity')}
              </span>
              <span className="text-[11px] text-slate-600 block font-sans">
                {selectedAmenity?.isChargeable
                  ? (locale === 'th' ? 'วิ่งรวมเข้าบิล Folio อัตโนมัติ พร้อมคิดภาษี VAT 7%' : 'Automatically rolls into folio bill with VAT 7%')
                  : (locale === 'th' ? 'แจ้งเตือนแม่บ้านส่งของ ไม่มีการคิดเงินลงบิล Folio' : 'Notifies housekeeping without affecting folio balance')}
              </span>
            </div>

            <div className="text-right">
              <span className="text-slate-500 block text-[10px] uppercase font-sans">
                {locale === 'th' ? 'ยอดเงินรวม' : 'Total'}
              </span>
              <span className="text-base font-bold tabular-nums">
                {selectedAmenity?.isChargeable ? formatCurrency(totalPrice) : '0.00 ฿'}
              </span>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{locale === 'th' ? 'กำลังบันทึก...' : 'Submitting...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{locale === 'th' ? 'ยืนยันขอของใช้เสริม' : 'Confirm Request'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RequestAmenitiesModal;
