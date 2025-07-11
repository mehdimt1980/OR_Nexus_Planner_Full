export type StaffMember = {
  id: string;
  name: string;
  isSick?: boolean;
  skills?: string[]; // For future advanced logic
  departmentSpecializations?: Department[]; // Which departments they can work in
};

// Updated to match real CSV room structure (SAAL 1-8)
export type OperatingRoomName = 'SAAL 1' | 'SAAL 2' | 'SAAL 3' | 'SAAL 4' | 'SAAL 5' | 'SAAL 6' | 'SAAL 7' | 'SAAL 8';
export const OPERATING_ROOMS: OperatingRoomName[] = ['SAAL 1', 'SAAL 2', 'SAAL 3', 'SAAL 4', 'SAAL 5', 'SAAL 6', 'SAAL 7', 'SAAL 8'];

// Departments from CSV OP-Orgaeinheit field
export type Department = 'UCH' | 'ACH' | 'GCH' | 'GYN' | 'URO' | 'PCH';
export const DEPARTMENTS: Department[] = ['UCH', 'ACH', 'GCH', 'GYN', 'URO', 'PCH'];

// Keep existing shift types for backward compatibility with current UI, but add time-based scheduling
export type Shift = 'BD1' | 'BD2' | 'BD3' | 'RD';
export const SHIFTS: Shift[] = ['BD1', 'BD2', 'BD3', 'RD'];
export const SHIFT_TIMES: Record<Shift, string> = {
  BD1: '06:00-14:00',
  BD2: '07:30-15:30',
  BD3: '12:00-20:00',
  RD: '20:00-06:00',
};

export type OperationComplexity = 'Sehr Hoch' | 'Hoch' | 'Mittel' | 'Niedrig';
export const COMPLEXITY_LEVELS: OperationComplexity[] = ['Sehr Hoch', 'Hoch', 'Mittel', 'Niedrig'];

// Updated status types to match CSV OP-Status field
export type AssignmentStatus = 
  | 'planned' // OP geplant
  | 'in_progress' // Currently ongoing
  | 'completed' // OP abgeschlossen
  | 'protocol_incomplete' // OP-Protokoll nicht abgeschlossen
  | 'pending_gpt' // AI suggestion pending
  | 'approved_julia' // Approved by Julia
  | 'modified_julia' // Modified by Julia
  | 'final_approved' // Final approval by Torsten
  | 'empty' // No operation scheduled
  | 'critical_pending'; // Critical situation requiring attention

export type OperationAssignment = {
  id: string; // Unique ID, e.g., `${room}-${date}-${time}`
  room: OperatingRoomName;
  department: Department; // From CSV OP-Orgaeinheit
  scheduledDate: string; // From CSV Datum field (YYYY-MM-DD format)
  scheduledTime: string; // From CSV Zeit field (HH:MM format)
  procedureName: string; // From CSV Eingriff field
  primarySurgeon?: string; // From CSV 1.Operateur field
  patientCase?: string; // Additional patient information
  estimatedDuration?: number; // Duration in minutes
  complexity?: OperationComplexity;
  assignedStaff: StaffMember[]; // Nursing staff assigned
  gptSuggestedStaff?: StaffMember[]; // AI suggested staff
  status: AssignmentStatus;
  notes?: string; // From CSV Anmerkung field
  aiReasoning?: string;
  juliaModificationReason?: string;
  // Keep shift for backward compatibility with existing UI components
  shift?: Shift; 
};

// Time-based schedule: room -> timeSlot -> operation
export type ORSchedule = Record<OperatingRoomName, Record<string, OperationAssignment>>; // room -> timeSlot -> operation

export type WorkflowStepKey =
  | 'PLAN_CREATED'
  | 'GPT_SUGGESTIONS_READY'
  | 'JULIA_REVIEW'
  | 'TORSTEN_FINAL_APPROVAL'
  | 'PLAN_FINALIZED';

export type WorkflowStep = {
  key: WorkflowStepKey;
  label: string;
  status: 'completed' | 'active' | 'pending';
  order: number;
};

export const ALL_WORKFLOW_STEPS: WorkflowStep[] = [
  { key: 'PLAN_CREATED', label: 'OP Plan erstellt', status: 'pending', order: 1 },
  { key: 'GPT_SUGGESTIONS_READY', label: 'KI Personalvorschläge', status: 'pending', order: 2 },
  { key: 'JULIA_REVIEW', label: 'Prüfung & Freigabe (Julia W.)', status: 'pending', order: 3 },
  { key: 'TORSTEN_FINAL_APPROVAL', label: 'Finale Freigabe (Torsten F.)', status: 'pending', order: 4 },
  { key: 'PLAN_FINALIZED', label: 'Plan Finalisiert', status: 'pending', order: 5 },
];

export interface JuliaOverride {
  operationId: string;
  originalSuggestion: string[]; // staff names array
  juliaSelection: string[]; // staff names array
  reason: string;
}

// CSV parsing types for hospital data
export type HospitalCSVRow = {
  Datum: string; // Date
  Zeit: string; // Time like "07:30", "09:47"
  Eingriff: string; // Procedure name in German
  'OP-Orgaeinheit': Department; // Department
  'OP-Saal': string; // Room like "SAAL 1", "SAAL 2"
  '1.Operateur': string; // Primary surgeon name
  'OP-Status': string; // "OP geplant", "OP abgeschlossen", "OP-Protokoll nicht abgeschlossen"
  Anmerkung?: string; // Notes
};

// Mapping CSV status to internal status
export const CSV_STATUS_MAPPING: Record<string, AssignmentStatus> = {
  'OP geplant': 'planned',
  'OP abgeschlossen': 'completed',
  'OP-Protokoll nicht abgeschlossen': 'protocol_incomplete',
};

// Time slot helpers for scheduling
export const TIME_SLOTS = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'
];

export const STANDARD_OPERATION_DURATIONS: Record<string, number> = {
  'Appendektomie': 90,
  'Cholezystektomie': 120,
  'Hüft-TEP': 180,
  'Knie-Arthroskopie': 60,
  'Tonsillektomie': 45,
  'Hysterektomie': 150,
  'Sectio': 45,
  'TUR-P': 90,
  'default': 90
};
