import type { 
  StaffMember, 
  OperationComplexity, 
  OperationAssignment, 
  ORSchedule, 
  Department,
  OperatingRoomName,
  AssignmentStatus,
  HospitalCSVRow 
} from './or-planner-types';
import { 
  OPERATING_ROOMS, 
  DEPARTMENTS, 
  CSV_STATUS_MAPPING,
  STANDARD_OPERATION_DURATIONS,
  TIME_SLOTS
} from './or-planner-types';

// Updated staff with department specializations
export const STAFF_MEMBERS: StaffMember[] = [
  { 
    id: 'staff_1', 
    name: 'Karin R.', 
    skills: ['Allgemein', 'Robotik'], 
    departmentSpecializations: ['UCH', 'GYN', 'URO'] 
  },
  { 
    id: 'staff_2', 
    name: 'Fatima R.', 
    skills: ['Allgemein', 'Herz-Thorax'], 
    departmentSpecializations: ['UCH', 'ACH'] 
  },
  { 
    id: 'staff_3', 
    name: 'Gerhard K.', 
    skills: ['Allgemein', 'Neuro'], 
    departmentSpecializations: ['UCH', 'ACH'] 
  },
  { 
    id: 'staff_4', 
    name: 'Ulla K.', 
    skills: ['Allgemein', 'Robotik', 'Endoskopie'], 
    departmentSpecializations: ['URO', 'GYN', 'GCH'] 
  },
  { 
    id: 'staff_5', 
    name: 'Michael B.', 
    skills: ['Allgemein'], 
    departmentSpecializations: ['UCH', 'ACH', 'GCH'] 
  },
  { 
    id: 'staff_6', 
    name: 'Sandra P.', 
    skills: ['Allgemein', 'Gynäkologie'], 
    departmentSpecializations: ['GYN', 'GCH'] 
  },
  { 
    id: 'staff_7', 
    name: 'Jürgen S.', 
    skills: ['Allgemein', 'Urologie'], 
    departmentSpecializations: ['URO', 'GCH'] 
  },
  { 
    id: 'staff_8', 
    name: 'Anja M.', 
    skills: ['Allgemein', 'Plastische Chirurgie'], 
    departmentSpecializations: ['PCH', 'GCH'] 
  },
  { 
    id: 'staff_9', 
    name: 'Thomas L.', 
    skills: ['Allgemein'], 
    departmentSpecializations: ['UCH', 'ACH', 'GCH', 'PCH'] 
  },
  { 
    id: 'staff_10', 
    name: 'Sabine W.', 
    skills: ['Allgemein', 'HNO'], 
    departmentSpecializations: ['UCH', 'GCH'] 
  },
];

// Mapping which departments typically use which rooms
export const ROOM_DEPARTMENT_MAPPING: Record<OperatingRoomName, Department[]> = {
  'SAAL 1': ['UCH', 'ACH'], // Major surgery rooms
  'SAAL 2': ['UCH', 'ACH'],
  'SAAL 3': ['GYN', 'URO'], // Specialized procedures
  'SAAL 4': ['GYN', 'URO'],
  'SAAL 5': ['GCH', 'PCH'], // Day surgery and minor procedures
  'SAAL 6': ['GCH', 'PCH'],
  'SAAL 7': ['UCH', 'GCH'], // Flexible use
  'SAAL 8': ['ACH', 'GCH'], // Flexible use
};

// Default department assignment if room mapping is not available
export const DEPARTMENT_PRIORITY: Record<Department, number> = {
  'UCH': 1, // Highest priority (major trauma/orthopedics)
  'ACH': 2, // General surgery
  'GYN': 3, // Gynecology
  'URO': 4, // Urology
  'GCH': 5, // General/day surgery
  'PCH': 6, // Plastic surgery
};

// Sample operations template matching real hospital data structure
const SAMPLE_OPERATIONS_TEMPLATE: {
  room: OperatingRoomName;
  department: Department;
  scheduledTime: string;
  procedureName: string;
  primarySurgeon: string;
  complexity: OperationComplexity;
  estimatedDuration: number;
}[] = [
  // SAAL 1 - UCH (Orthopedics/Trauma)
  { 
    room: 'SAAL 1', 
    department: 'UCH', 
    scheduledTime: '07:30', 
    procedureName: 'Hüft-TEP rechts', 
    primarySurgeon: 'Dr. Weber',
    complexity: 'Hoch',
    estimatedDuration: 180
  },
  { 
    room: 'SAAL 1', 
    department: 'UCH', 
    scheduledTime: '11:00', 
    procedureName: 'Knie-Arthroskopie links', 
    primarySurgeon: 'Dr. Schmidt',
    complexity: 'Mittel',
    estimatedDuration: 90
  },
  
  // SAAL 2 - ACH (General Surgery)
  { 
    room: 'SAAL 2', 
    department: 'ACH', 
    scheduledTime: '08:00', 
    procedureName: 'Laparoskopische Cholezystektomie', 
    primarySurgeon: 'Dr. Müller',
    complexity: 'Hoch',
    estimatedDuration: 120
  },
  { 
    room: 'SAAL 2', 
    department: 'ACH', 
    scheduledTime: '10:30', 
    procedureName: 'Appendektomie', 
    primarySurgeon: 'Dr. Hoffmann',
    complexity: 'Mittel',
    estimatedDuration: 90
  },
  
  // SAAL 3 - GYN (Gynecology)
  { 
    room: 'SAAL 3', 
    department: 'GYN', 
    scheduledTime: '07:30', 
    procedureName: 'Elektive Sectio', 
    primarySurgeon: 'Dr. Fischer',
    complexity: 'Hoch',
    estimatedDuration: 45
  },
  { 
    room: 'SAAL 3', 
    department: 'GYN', 
    scheduledTime: '09:00', 
    procedureName: 'Hysteroskopie', 
    primarySurgeon: 'Dr. Bauer',
    complexity: 'Mittel',
    estimatedDuration: 60
  },
  
  // SAAL 4 - URO (Urology)
  { 
    room: 'SAAL 4', 
    department: 'URO', 
    scheduledTime: '08:00', 
    procedureName: 'TUR-P', 
    primarySurgeon: 'Dr. Wagner',
    complexity: 'Hoch',
    estimatedDuration: 90
  },
  { 
    room: 'SAAL 4', 
    department: 'URO', 
    scheduledTime: '10:00', 
    procedureName: 'Ureteroskopie mit Steinextraktion', 
    primarySurgeon: 'Dr. Koch',
    complexity: 'Hoch',
    estimatedDuration: 120
  },
  
  // SAAL 5 - GCH (General/Day Surgery)
  { 
    room: 'SAAL 5', 
    department: 'GCH', 
    scheduledTime: '07:30', 
    procedureName: 'Varizen-Stripping', 
    primarySurgeon: 'Dr. Richter',
    complexity: 'Niedrig',
    estimatedDuration: 60
  },
  { 
    room: 'SAAL 5', 
    department: 'GCH', 
    scheduledTime: '09:00', 
    procedureName: 'Hernioplastik', 
    primarySurgeon: 'Dr. Klein',
    complexity: 'Mittel',
    estimatedDuration: 90
  },
  
  // SAAL 6 - PCH (Plastic Surgery)
  { 
    room: 'SAAL 6', 
    department: 'PCH', 
    scheduledTime: '08:00', 
    procedureName: 'Mammareduktion', 
    primarySurgeon: 'Dr. Lange',
    complexity: 'Hoch',
    estimatedDuration: 180
  },
  { 
    room: 'SAAL 6', 
    department: 'PCH', 
    scheduledTime: '12:00', 
    procedureName: 'Lipom-Exzision', 
    primarySurgeon: 'Dr. Zimmermann',
    complexity: 'Niedrig',
    estimatedDuration: 30
  },
  
  // SAAL 7 - Mixed UCH/GCH
  { 
    room: 'SAAL 7', 
    department: 'UCH', 
    scheduledTime: '09:00', 
    procedureName: 'Osteosynthese Radius', 
    primarySurgeon: 'Dr. Huber',
    complexity: 'Mittel',
    estimatedDuration: 120
  },
  
  // SAAL 8 - Mixed ACH/GCH
  { 
    room: 'SAAL 8', 
    department: 'ACH', 
    scheduledTime: '08:30', 
    procedureName: 'Sigmaresektion', 
    primarySurgeon: 'Dr. Schuster',
    complexity: 'Sehr Hoch',
    estimatedDuration: 240
  },
];

export const INITIAL_SCHEDULE_TEMPLATE = (targetDate: string = '2025-07-11'): ORSchedule => {
  const schedule = {} as ORSchedule;
  
  // Initialize all rooms
  OPERATING_ROOMS.forEach(room => {
    schedule[room] = {};
    schedule[room][targetDate] = [];
  });
  
  // Add sample operations
  SAMPLE_OPERATIONS_TEMPLATE.forEach(templateOp => {
    const operation: OperationAssignment = {
      id: `${templateOp.room}-${targetDate}-${templateOp.scheduledTime}`,
      room: templateOp.room,
      department: templateOp.department,
      scheduledDate: targetDate,
      scheduledTime: templateOp.scheduledTime,
      procedureName: templateOp.procedureName,
      primarySurgeon: templateOp.primarySurgeon,
      complexity: templateOp.complexity,
      estimatedDuration: templateOp.estimatedDuration,
      assignedStaff: [], // Initialize as empty - AI will suggest staff
      gptSuggestedStaff: [],
      status: 'planned' as AssignmentStatus,
      notes: undefined,
      // Add backward compatibility shift mapping for UI
      shift: mapTimeToShift(templateOp.scheduledTime)
    };
    
    schedule[templateOp.room][targetDate].push(operation);
  });
  
  return schedule;
};

// Helper function to map time to shift for backward compatibility
function mapTimeToShift(time: string): 'BD1' | 'BD2' | 'BD3' | 'RD' {
  const hour = parseInt(time.split(':')[0]);
  if (hour >= 6 && hour < 12) return 'BD1';
  if (hour >= 12 && hour < 16) return 'BD2';  
  if (hour >= 16 && hour < 20) return 'BD3';
  return 'RD';
}

// Function to parse CSV data into our operation format
export function parseHospitalCSV(csvData: HospitalCSVRow[]): ORSchedule {
  const schedule = {} as ORSchedule;
  
  // Initialize empty schedule
  OPERATING_ROOMS.forEach(room => {
    schedule[room] = {};
  });
  
  csvData.forEach((row, index) => {
    // Clean and validate room name
    const roomMatch = row['OP-Saal'].match(/SAAL (\d+)/);
    if (!roomMatch) {
      console.warn(`Invalid room format: ${row['OP-Saal']}`);
      return;
    }
    
    const room = `SAAL ${roomMatch[1]}` as OperatingRoomName;
    if (!OPERATING_ROOMS.includes(room)) {
      console.warn(`Unknown room: ${room}`);
      return;
    }
    
    // Parse and validate date
    const date = row.Datum;
    if (!date) {
      console.warn(`Missing date for row ${index}`);
      return;
    }
    
    // Initialize date for room if not exists
    if (!schedule[room][date]) {
      schedule[room][date] = [];
    }
    
    // Map CSV status to internal status
    const status = CSV_STATUS_MAPPING[row['OP-Status']] || 'planned';
    
    // Estimate duration based on procedure
    const procedureName = row.Eingriff;
    const estimatedDuration = STANDARD_OPERATION_DURATIONS[procedureName] || 
                             STANDARD_OPERATION_DURATIONS.default;
    
    // Determine complexity based on procedure name (simple heuristic)
    const complexity = determineComplexity(procedureName);
    
    const operation: OperationAssignment = {
      id: `${room}-${date}-${row.Zeit}`,
      room,
      department: row['OP-Orgaeinheit'],
      scheduledDate: date,
      scheduledTime: row.Zeit,
      procedureName,
      primarySurgeon: row['1.Operateur'],
      estimatedDuration,
      complexity,
      assignedStaff: [],
      gptSuggestedStaff: [],
      status,
      notes: row.Anmerkung,
      shift: mapTimeToShift(row.Zeit)
    };
    
    schedule[room][date].push(operation);
  });
  
  return schedule;
}

// Simple heuristic to determine operation complexity
function determineComplexity(procedureName: string): OperationComplexity {
  const name = procedureName.toLowerCase();
  
  if (name.includes('robot') || name.includes('davinci') || 
      name.includes('herzklappen') || name.includes('bypass') ||
      name.includes('neurochirurg') || name.includes('wirbelsäule')) {
    return 'Sehr Hoch';
  }
  
  if (name.includes('laparoskop') || name.includes('endoskop') ||
      name.includes('tep') || name.includes('arthros') ||
      name.includes('tumor') || name.includes('resektion')) {
    return 'Hoch';
  }
  
  if (name.includes('appendek') || name.includes('hernien') ||
      name.includes('gallenblas') || name.includes('sectio') ||
      name.includes('hysteroskop')) {
    return 'Mittel';
  }
  
  return 'Niedrig';
}

// Get staff members specialized for a specific department
export function getStaffForDepartment(department: Department): StaffMember[] {
  return STAFF_MEMBERS.filter(staff => 
    !staff.isSick && 
    (staff.departmentSpecializations?.includes(department) || false)
  );
}

// Get available rooms for a department
export function getRoomsForDepartment(department: Department): OperatingRoomName[] {
  return OPERATING_ROOMS.filter(room => 
    ROOM_DEPARTMENT_MAPPING[room]?.includes(department)
  );
}

// Helper functions for backward compatibility
export const getStaffMemberById = (id: string): StaffMember | undefined => 
  STAFF_MEMBERS.find(s => s.id === id);

export const getStaffMemberByName = (name: string): StaffMember | undefined => 
  STAFF_MEMBERS.find(s => s.name === name);

// Dynamic staff lists for AI (no longer static as staff availability can change)
export const getAvailableStaffForAI = (): string[] => 
  STAFF_MEMBERS.filter(s => !s.isSick).map(s => s.name);

export const getSickStaffForAI = (): string[] => 
  STAFF_MEMBERS.filter(s => s.isSick).map(s => s.name);
