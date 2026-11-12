import type { DetailedBill } from '../hooks/useBilling';
import type { ExtendedReservation } from '../hooks/useReservations';

/**
 * Synchronizes a single bill with active in-house reservation details.
 * - Overrides guestName with the real guest name if present.
 * - Heals phantom 'paid' status to 'pending' if the reservation is not paid and the bill has 0 items / empty total.
 */
export function syncBillWithReservation(
  bill: DetailedBill,
  reservations: ExtendedReservation[]
): DetailedBill {
  const matchingRes = reservations.find(
    (r) =>
      (r.id === bill.reservationId || (bill.roomNumber && r.roomNumber === bill.roomNumber)) &&
      (r.status === 'checked_in' || r.status === 'extended')
  );

  if (!matchingRes) return bill;

  const realGuestName = matchingRes.guestName || matchingRes.guest?.fullName;
  const isFallbackName =
    !bill.guestName ||
    bill.guestName.startsWith('Guest (Room ') ||
    bill.guestName === 'Guest' ||
    bill.guestName === '—';

  const effectiveGuestName =
    realGuestName && realGuestName.trim() && realGuestName !== '—'
      ? realGuestName.trim()
      : isFallbackName
      ? realGuestName || bill.guestName
      : bill.guestName;

  const total = Number(bill.totalAmount || bill.subtotal || 0);
  const hasZeroItems = !bill.items || bill.items.length === 0;
  const resPaymentStatus = matchingRes.paymentStatus || (matchingRes as any).payment_status;
  const shouldBePending = resPaymentStatus !== 'paid' && total === 0 && hasZeroItems;

  return {
    ...bill,
    guestName: effectiveGuestName,
    status: shouldBePending ? 'pending' : bill.status,
  };
}

/**
 * Reconciles an array of bills with active reservations:
 * 1. Excludes stale dummy bills with 0 totalAmount that were marked as 'paid' during initial testing (unless healed by an active reservation).
 * 2. Synchronizes each bill with live in-house guest data.
 */
export function reconcileBillsWithReservations(
  bills: DetailedBill[],
  reservations: ExtendedReservation[]
): DetailedBill[] {
  return bills
    .filter((bill) => {
      const isDummyName =
        typeof bill.guestName === 'string' &&
        (bill.guestName.startsWith('Guest (Room ') || bill.guestName === 'Guest');
      const total = Number(bill.totalAmount || bill.subtotal || 0);
      const hasZeroItems = !bill.items || bill.items.length === 0;
      const isStaleDummyPaid = bill.status === 'paid' && total === 0 && hasZeroItems && isDummyName;

      if (isStaleDummyPaid) {
        const matchingRes = reservations.find(
          (r) =>
            (r.id === bill.reservationId || (bill.roomNumber && r.roomNumber === bill.roomNumber)) &&
            (r.status === 'checked_in' || r.status === 'extended')
        );
        // Exclude if there's no matching active reservation to heal it
        if (!matchingRes) return false;
      }
      return true;
    })
    .map((bill) => syncBillWithReservation(bill, reservations));
}
