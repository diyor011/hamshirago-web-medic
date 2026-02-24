/**
 * Order address — client location step
 */
export interface OrderAddress {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  house: string;
  floor: string;
  apartment: string;
  phone: string;
}

export const DEFAULT_ORDER_ADDRESS: Partial<OrderAddress> = {
  house: '',
  floor: '',
  apartment: '',
  phone: '',
};

export function isAddressComplete(a: Partial<OrderAddress>): boolean {
  return (
    typeof a.latitude === 'number' &&
    typeof a.longitude === 'number' &&
    (a.house?.trim().length ?? 0) > 0 &&
    (a.phone?.trim().length ?? 0) >= 9
  );
}
