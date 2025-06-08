
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

export type OperatingRoomName = 'UCH' | 'EPZ/HNO' | 'ACH' | 'GYN' | 'GCH' | 'URO' | 'DaVinci' | 'PCH';
export const OPERATING_ROOMS: OperatingRoomName[] = ['UCH', 'EPZ/HNO', 'ACH', 'GYN', 'GCH', 'URO', 'DaVinci', 'PCH'];

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
};

export const ALL_WORKFLOW_STEPS: WorkflowStep[] = [
  { key: 'PLAN_CREATED', label: 'OP Plan erstellt', status: 'completed' },
  { key: 'GPT_SUGGESTIONS_READY', label: 'KI Personalvorschläge', status: 'pending' },
  { key: 'JULIA_REVIEW', label: 'Prüfung & Freigabe (Julia W.)', status: 'pending' },
  { key: 'TORSTEN_FINAL_APPROVAL', label: 'Finale Freigabe (Torsten F.)', status: 'pending' },
  { key: 'PLAN_FINALIZED', label: 'Plan Finalisiert', status: 'pending' },
];

export interface JuliaOverride {
  operationId: string;
  originalSuggestion: string[]; // staff names array
  juliaSelection: string[]; // staff names array
  reason: string;
}
