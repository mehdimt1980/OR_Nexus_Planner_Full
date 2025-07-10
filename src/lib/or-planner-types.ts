
export type StaffMember = {
  id: string;
  name: string;
  isSick?: boolean;
  skills?: string[]; // For future advanced logic
};

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

export type OperatingRoomName = 'UCH' | 'EPZ/HNO' | 'ACH' | 'GYN' | 'GCH' | 'URO' | 'DaVinci' | 'PCH' | 'SAAL 1' | 'SAAL 2' | 'SAAL 3' | 'SAAL 4' | 'SAAL 5' | 'SAAL 6' | 'SAAL 7' | 'SAAL 8';
export const OPERATING_ROOMS: OperatingRoomName[] = ['UCH', 'EPZ/HNO', 'ACH', 'GYN', 'GCH', 'URO', 'DaVinci', 'PCH'];
export const REAL_OPERATING_ROOMS: OperatingRoomName[] = ['SAAL 1', 'SAAL 2', 'SAAL 3', 'SAAL 4', 'SAAL 5', 'SAAL 6', 'SAAL 7', 'SAAL 8'];

export type DepartmentName = 'UCH' | 'ACH' | 'GCH' | 'GYN' | 'URO' | 'PCH' | 'EPZ/HNO';
export const DEPARTMENTS: DepartmentName[] = ['UCH', 'ACH', 'GCH', 'GYN', 'URO', 'PCH', 'EPZ/HNO'];

// Real hospital room-department mapping based on typical usage
export const ROOM_DEPARTMENT_MAPPING: Record<string, DepartmentName> = {
  'SAAL 1': 'UCH',
  'SAAL 2': 'GCH', 
  'SAAL 3': 'ACH',
  'SAAL 4': 'GYN',
  'SAAL 5': 'GCH',
  'SAAL 6': 'URO',
  'SAAL 7': 'ACH',
  'SAAL 8': 'PCH',
  // Legacy demo rooms
  'UCH': 'UCH',
  'EPZ/HNO': 'EPZ/HNO',
  'ACH': 'ACH',
  'GYN': 'GYN',
  'GCH': 'GCH',
  'URO': 'URO',
  'DaVinci': 'URO',
  'PCH': 'PCH'
};

export const DEPARTMENT_SPECIALIZATIONS: Record<DepartmentName, { name: string; description: string; complexities: OperationComplexity[] }> = {
  'UCH': {
    name: 'Unfallchirurgie',
    description: 'Trauma surgery, orthopedics, fractures',
    complexities: ['Sehr Hoch', 'Hoch', 'Mittel']
  },
  'ACH': {
    name: 'Allgemeine Chirurgie', 
    description: 'General surgery, abdominal procedures',
    complexities: ['Hoch', 'Mittel', 'Niedrig']
  },
  'GCH': {
    name: 'Gefäßchirurgie',
    description: 'Vascular surgery, vessel procedures',
    complexities: ['Sehr Hoch', 'Hoch', 'Mittel']
  },
  'GYN': {
    name: 'Gynäkologie',
    description: 'Gynecology, breast surgery',
    complexities: ['Hoch', 'Mittel', 'Niedrig']
  },
  'URO': {
    name: 'Urologie',
    description: 'Urology, kidney procedures',
    complexities: ['Sehr Hoch', 'Hoch', 'Mittel']
  },
  'PCH': {
    name: 'Plastische Chirurgie',
    description: 'Plastic surgery, reconstructive procedures',
    complexities: ['Mittel', 'Niedrig']
  },
  'EPZ/HNO': {
    name: 'HNO/Endoskopie',
    description: 'ENT surgery, endoscopic procedures',
    complexities: ['Mittel', 'Niedrig']
  }
};

export type AssignmentStatus = 'pending_gpt' | 'approved_julia' | 'modified_julia' | 'final_approved' | 'empty' | 'critical_pending';

export type OperationAssignment = {
  id: string; // Unique ID, e.g., `${room}-${shift}`
  room: OperatingRoomName;
  shift: Shift;
  procedureName?: string;
  complexity?: OperationComplexity;
  assignedStaff: StaffMember[]; // Changed to array
  gptSuggestedStaff?: StaffMember[]; // Changed to array
  status: AssignmentStatus;
  notes?: string;
  aiReasoning?: string;
  juliaModificationReason?: string;
};

export type ORSchedule = Record<OperatingRoomName, Record<Shift, OperationAssignment | null>>;

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
  order: number; // Added for easier step comparison
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

    
