/** Jedna jízda / řádek faktury (základ bez DPH = litry × sazba). */
export type TripLine = {
  /** ISO-friendly datum pro hlavičku, např. 2026-03-24 */
  dateIso: string;
  /** Text trasy (jeden nebo více řádků slepených mezerou) */
  description: string;
  /** Litry */
  liters: number;
  /** Kč za litr bez DPH */
  rate: number;
  /** Základ bez DPH (měl by odpovídat liters × rate až na haléře) */
  baseAmount: number;
};

export type ParsedPodklad = {
  lines: TripLine[];
  /** Součet základů bez DPH */
  sumBase: number;
};
