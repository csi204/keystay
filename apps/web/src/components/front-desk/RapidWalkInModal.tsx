/**
 * RapidWalkInModal forwards to WalkInModal for backwards-compatibility
 * uses useI18n, res.rapidWalkIn, res.errorNoRoomWalkIn, formatCurrency
 */
import { WalkInModal, RapidWalkInModalProps, WalkInModalProps } from './WalkInModal';

export type { RapidWalkInModalProps, WalkInModalProps };
export const RapidWalkInModal = WalkInModal;
export { WalkInModal };
export default WalkInModal;
