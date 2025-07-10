// src/lib/real-op-plan-types.ts

export interface RealOPPlanRow {
  Datum: string;
  Zeit: string;
  Eingriff: string;
  Antibiotikaprophylaxe?: string;
  'OP-Orgaeinheit': string;
  'weitere geplante Orgaeinheiten'?: string;
  'OP-Saal': string;
  Nachname: string;
  Vorname: string;
  Geburtsdatum: string;
  Geburtsname?: string;
  Identitifikationsnummer?: string;
  'Vornamen bei Geburt'?: string;
  'Verwendeter Name'?: string;
  'Geburtsort (Code)'?: string;
  Fallnummer: string;
  'Patient-Orgaeinheit': string;
  Station: string;
  '1.Operateur': string;
  Aufnahmedatum: string;
  Aufnahmezeit: string;
  Falltyp: string;
  Fallstatus: string;
  Planungskontrolle?: string;
  Anmerkung?: string;
  'Maßnahmen'?: string;
  'OP-Status': string;
  'Prämedikationsstatus'?: string;
}

export interface ImportedOperation {
  id: string;
  room: string;
  scheduledTime: string;
  procedureName: string;
  department: string;
  primarySurgeon: string;
  complexity: import('./or-planner-types').OperationComplexity;
  assignedStaff: import('./or-planner-types').StaffMember[];
  status: import('./or-planner-types').AssignmentStatus;
  notes?: string;
  patientCase: string;
  estimatedDuration: number;
  rawData: RealOPPlanRow;
}

export const REAL_STATUS_MAPPING: Record<string, import('./or-planner-types').AssignmentStatus> = {
  'OP geplant': 'empty',
  'OP-Protokoll nicht abgeschlossen': 'pending_gpt',
  'OP abgeschlossen': 'final_approved'
};

export const COMPLEXITY_KEYWORDS = {
  'Sehr Hoch': ['Osteosynthese', 'Instrumentierung', 'Thyreoidektomie', 'Acetabulumfraktur', 'Nephrektomie'],
  'Hoch': ['Cholezystektomie', 'Hernie', 'Mamma', 'Nephrolithopaxie', 'TAPP', 'TEPP', 'Prostataenukleation'],
  'Mittel': ['Exzision', 'Lappenplastik', 'Metallentfernung', 'Laparoskopie', 'Kontraktur', 'Patchplastik'],
  'Niedrig': ['BET', 'Tumor Kopf', 'Dupuytren']
} as const;
