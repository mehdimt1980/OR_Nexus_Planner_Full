export type StaffMember = {
  id: string;
  name: string;
  isSick?: boolean;
  skills?: string[]; // For future advanced logic
  department?: Department;
  specializations?: string[];
};

// Updated to match CSV structure - 8 operating rooms (SAAL 1-8)
export type OperatingRoomName = 'SAAL 1' | 'SAAL 2' | 'SAAL 3' | 'SAAL 4' | 'SAAL 5' | 'SAAL 6' | 'SAAL 7' | 'SAAL 8';
export const OPERATING_ROOMS: OperatingRoomName[] = ['SAAL 1', 'SAAL 2', 'SAAL 3', 'SAAL 4', 'SAAL 5', 'SAAL 6', 'SAAL 7', 'SAAL 8'];

// Departments from CSV OP-Orgaeinheit field
export type Department = 'ACH' | 'GCH' | 'PCH' | 'URO' | 'GYN' | 'UCH';
export const DEPARTMENTS: Department[] = ['ACH', 'GCH', 'PCH', 'URO', 'GYN', 'UCH'];

// Time-based scheduling instead of shifts
export type TimeSlot = {
  start: string; // Format: "HH:MM" (e.g., "07:20")
  end: string;   // Format: "HH:MM" (e.g., "09:30")
  duration?: number; // Duration in minutes
};

// Operation statuses from CSV
export type OperationStatus = 'OP geplant' | 'OP abgeschlossen' | 'OP-Protokoll nicht abgeschlossen';
export const OPERATION_STATUSES: OperationStatus[] = ['OP geplant', 'OP abgeschlossen', 'OP-Protokoll nicht abgeschlossen'];

// Complexity assessment for German procedures
export type OperationComplexity = 'Sehr Hoch' | 'Hoch' | 'Mittel' | 'Niedrig';
export const COMPLEXITY_LEVELS: OperationComplexity[] = ['Sehr Hoch', 'Hoch', 'Mittel', 'Niedrig'];

// German procedure complexity mapping
export const PROCEDURE_COMPLEXITY_MAP: Record<string, OperationComplexity> = {
  // Cardiac/Thoracic Surgery
  'Herzklappen': 'Sehr Hoch',
  'Bypass': 'Sehr Hoch',
  'Transplantation': 'Sehr Hoch',
  
  // Orthopedic Surgery
  'Kniegelenk': 'Hoch',
  'Hüftgelenk': 'Hoch',
  'Wirbelsäule': 'Hoch',
  'Dupuytren': 'Mittel',
  
  // General Surgery
  'Appendektomie': 'Niedrig',
  'Cholezystektomie': 'Mittel',
  'Hernie': 'Niedrig',
  
  // Default fallback
  'default': 'Mittel'
};

// Complete CSV operation type with all fields
export type CSVOperation = {
  // Core scheduling fields
  datum: string;                    // "10.07.2025"
  zeit: string;                     // "7:20"
  eingriff: string;                 // "Dupuytren`sche Kontraktur Hand (L)"
  opOrgaeinheit: Department;        // "PCH"
  opSaal: OperatingRoomName;        // "SAAL 8"
  erstOperateur: string;            // "Michael Stoffels"
  opStatus: OperationStatus;        // "OP geplant"
  fallnummer: string;               // "4744545"
  anmerkung?: string;               // Operation notes
  
  // Patient information
  patientName?: string;
  patientId?: string;
  geburtsdatum?: string;
  geschlecht?: 'M' | 'W' | 'D';
  
  // Medical details
  diagnose?: string;
  icd10?: string;
  ops?: string;                     // OPS code
  antibiotikaprophylaxe?: string;
  allergie?: string;
  besonderheiten?: string;
  
  // Surgical team
  zweitOperateur?: string;
  assistenz?: string;
  instrumentierung?: string;
  springer?: string;
  anaesthesie?: string;
  anaesthesieart?: string;
  
  // Administrative
  aufnahmedatum?: string;
  entlassungsdatum?: string;
  versicherung?: string;
  kostentraeger?: string;
  dringlichkeit?: 'Elektiv' | 'Dringend' | 'Notfall';
  
  // Technical
  lagerung?: string;
  instrumentarium?: string;
  
  // Computed fields
  estimatedDuration?: number;       // in minutes
  complexity?: OperationComplexity;
  requiredSkills?: string[];
};

// Assignment status for workflow
export type AssignmentStatus = 'pending_gpt' | 'approved_julia' | 'modified_julia' | 'final_approved' | 'empty' | 'critical_pending';

// Updated operation assignment for time-based scheduling
export type OperationAssignment = {
  id: string; // Unique ID, e.g., `${room}-${timeSlot.start}-${date}`
  room: OperatingRoomName;
  timeSlot: TimeSlot;
  date: string; // Format: "YYYY-MM-DD"
  
  // Operation details (can be populated from CSV or manual entry)
  procedureName?: string;
  complexity?: OperationComplexity;
  department?: Department;
  surgeon?: string;
  patient?: {
    name?: string;
    id?: string;
    caseNumber?: string;
  };
  
  // Staff assignment
  assignedStaff: StaffMember[];
  gptSuggestedStaff?: StaffMember[];
  
  // Workflow and status
  status: AssignmentStatus;
  operationStatus?: OperationStatus;
  notes?: string;
  aiReasoning?: string;
  juliaModificationReason?: string;
  
  // Link to original CSV data if imported
  csvData?: CSVOperation;
};

// Updated schedule structure for time-based planning
export type DailyORSchedule = {
  date: string; // Format: "YYYY-MM-DD"
  rooms: Record<OperatingRoomName, OperationAssignment[]>; // Array of time-slotted operations per room
};

export type ORSchedule = Record<string, DailyORSchedule>; // Date-indexed schedule

// Workflow types (unchanged for compatibility)
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

// Utility types for CSV processing
export type CSVImportResult = {
  success: boolean;
  data?: CSVOperation[];
  errors?: string[];
  warnings?: string[];
  summary?: {
    totalOperations: number;
    byDepartment: Record<Department, number>;
    byRoom: Record<OperatingRoomName, number>;
    byStatus: Record<OperationStatus, number>;
    timeRange: {
      earliest: string;
      latest: string;
    };
  };
};

// Time slot utilities
export type TimeSlotConflict = {
  room: OperatingRoomName;
  date: string;
  conflictingOperations: OperationAssignment[];
  reason: 'overlap' | 'insufficient_gap' | 'room_unavailable';
};

// Staff availability for time-based scheduling
export type StaffAvailability = {
  staffId: string;
  date: string;
  availableSlots: TimeSlot[];
  unavailableSlots: TimeSlot[];
  assignedOperations: string[]; // operation assignment IDs
  maxConsecutiveHours?: number;
  breakRequirements?: TimeSlot[];
};

// Department-specific requirements
export type DepartmentRequirements = {
  department: Department;
  minimumStaffCount: number;
  requiredSpecializations: string[];
  preferredRooms: OperatingRoomName[];
  typicalDuration: number; // minutes
  setupTime: number; // minutes between operations
  cleanupTime: number; // minutes after operations
};

export const DEPARTMENT_REQUIREMENTS: Record<Department, DepartmentRequirements> = {
  ACH: {
    department: 'ACH',
    minimumStaffCount: 4,
    requiredSpecializations: ['Allgemeinchirurgie', 'Instrumentierung'],
    preferredRooms: ['SAAL 1', 'SAAL 2', 'SAAL 3'],
    typicalDuration: 90,
    setupTime: 15,
    cleanupTime: 30
  },
  GCH: {
    department: 'GCH',
    minimumStaffCount: 4,
    requiredSpecializations: ['Gefäßchirurgie', 'Instrumentierung'],
    preferredRooms: ['SAAL 4', 'SAAL 5'],
    typicalDuration: 120,
    setupTime: 20,
    cleanupTime: 30
  },
  PCH: {
    department: 'PCH',
    minimumStaffCount: 5,
    requiredSpecializations: ['Plastische Chirurgie', 'Handchirurgie', 'Instrumentierung'],
    preferredRooms: ['SAAL 6', 'SAAL 7'],
    typicalDuration: 75,
    setupTime: 15,
    cleanupTime: 25
  },
  URO: {
    department: 'URO',
    minimumStaffCount: 3,
    requiredSpecializations: ['Urologie', 'Instrumentierung'],
    preferredRooms: ['SAAL 8'],
    typicalDuration: 60,
    setupTime: 10,
    cleanupTime: 20
  },
  GYN: {
    department: 'GYN',
    minimumStaffCount: 4,
    requiredSpecializations: ['Gynäkologie', 'Instrumentierung'],
    preferredRooms: ['SAAL 3', 'SAAL 4'],
    typicalDuration: 80,
    setupTime: 15,
    cleanupTime: 25
  },
  UCH: {
    department: 'UCH',
    minimumStaffCount: 6,
    requiredSpecializations: ['Unfallchirurgie', 'Orthopädie', 'Instrumentierung'],
    preferredRooms: ['SAAL 1', 'SAAL 2'],
    typicalDuration: 110,
    setupTime: 20,
    cleanupTime: 35
  }
};

// Legacy compatibility for existing code
export type Shift = 'BD1' | 'BD2' | 'BD3' | 'RD';
export const SHIFTS: Shift[] = ['BD1', 'BD2', 'BD3', 'RD'];
export const SHIFT_TIMES: Record<Shift, string> = {
  BD1: '06:00-14:00',
  BD2: '07:30-15:30',
  BD3: '12:00-20:00',
  RD: '20:00-06:00',
};

// Utility function to convert time slot to shift (for legacy compatibility)
export function timeSlotToShift(timeSlot: TimeSlot): Shift {
  const startHour = parseInt(timeSlot.start.split(':')[0]);
  
  if (startHour >= 6 && startHour < 8) return 'BD1';
  if (startHour >= 8 && startHour < 12) return 'BD2';
  if (startHour >= 12 && startHour < 20) return 'BD3';
  return 'RD';
}

// Utility function to estimate complexity from German procedure name
export function estimateComplexityFromProcedure(procedureName: string): OperationComplexity {
  const lowerProcedure = procedureName.toLowerCase();
  
  for (const [keyword, complexity] of Object.entries(PROCEDURE_COMPLEXITY_MAP)) {
    if (lowerProcedure.includes(keyword.toLowerCase())) {
      return complexity;
    }
  }
  
  return PROCEDURE_COMPLEXITY_MAP.default;
}
