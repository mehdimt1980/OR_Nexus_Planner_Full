import type { 
  StaffMember, 
  OperationComplexity, 
  OperationAssignment, 
  ORSchedule,
  DailyORSchedule,
  CSVOperation,
  Department,
  OperatingRoomName,
  TimeSlot,
  DepartmentRequirements
} from './or-planner-types';
import { 
  OPERATING_ROOMS, 
  DEPARTMENTS, 
  DEPARTMENT_REQUIREMENTS,
  timeSlotToShift 
} from './or-planner-types';
import { GermanHospitalCSVParser } from './csv-parser';

// Experience levels for staff qualification
export type ExperienceLevel = 'Junior' | 'Standard' | 'Senior' | 'Expert';

// Enhanced StaffMember type (extends base type)
export interface EnhancedStaffMember extends StaffMember {
  experience?: ExperienceLevel;
  shiftPreferences?: string[];
  maxConsecutiveHours?: number;
  crossTrained?: Department[];
}

// Enhanced staff members with realistic German hospital specializations
export const STAFF_MEMBERS: EnhancedStaffMember[] = [
  // ACH (Allgemeinchirurgie) - 6 staff members for 8 operations
  { 
    id: 'ach_1', 
    name: 'Dr. med. Schmidt K.', 
    skills: ['Allgemein', 'Laparoskopie', 'Endokrine_Chirurgie', 'Thyreoidektomie'], 
    department: 'ACH',
    experience: 'Senior',
    shiftPreferences: ['BD1', 'BD2'],
    maxConsecutiveHours: 10
  },
  { 
    id: 'ach_2', 
    name: 'Schwester Maria H.', 
    skills: ['Allgemein', 'Hernie_Reparatur', 'Instrumentierung'], 
    department: 'ACH',
    experience: 'Standard',
    shiftPreferences: ['BD2', 'BD3'],
    maxConsecutiveHours: 8
  },
  { 
    id: 'ach_3', 
    name: 'Pfleger Hans G.', 
    skills: ['Allgemein', 'Laparoskopie', 'Instrumentierung'], 
    department: 'ACH',
    experience: 'Expert',
    shiftPreferences: ['BD1', 'BD3'],
    maxConsecutiveHours: 12
  },
  { 
    id: 'ach_4', 
    name: 'Schwester Anna B.', 
    skills: ['Allgemein', 'Instrumentierung'], 
    department: 'ACH',
    experience: 'Junior',
    shiftPreferences: ['BD2'],
    maxConsecutiveHours: 8
  },
  { 
    id: 'ach_5', 
    name: 'Dr. Weber J.', 
    skills: ['Allgemein', 'Endokrine_Chirurgie', 'Hernie_Reparatur'], 
    department: 'ACH',
    experience: 'Senior',
    shiftPreferences: ['BD1'],
    maxConsecutiveHours: 10
  },
  { 
    id: 'ach_6', 
    name: 'Pfleger Thomas M.', 
    skills: ['Allgemein', 'Instrumentierung', 'Springer'], 
    department: 'ACH',
    experience: 'Standard',
    shiftPreferences: ['BD1', 'BD2', 'BD3'],
    maxConsecutiveHours: 9
  },

  // GCH (Gefäßchirurgie) - 4 staff members for 6 operations
  { 
    id: 'gch_1', 
    name: 'Pfleger Andreas M.', 
    skills: ['Allgemein', 'Gefäßchirurgie', 'Endovaskulär'], 
    department: 'GCH',
    experience: 'Expert',
    shiftPreferences: ['BD1', 'BD2'],
    maxConsecutiveHours: 12
  },
  { 
    id: 'gch_2', 
    name: 'Dr. Fischer R.', 
    skills: ['Allgemein', 'Gefäßchirurgie', 'Amputation', 'Endarteriektomie'], 
    department: 'GCH',
    experience: 'Senior',
    shiftPreferences: ['BD1'],
    maxConsecutiveHours: 10
  },
  { 
    id: 'gch_3', 
    name: 'Schwester Petra L.', 
    skills: ['Allgemein', 'Gefäßchirurgie', 'Instrumentierung'], 
    department: 'GCH',
    experience: 'Standard',
    shiftPreferences: ['BD2', 'BD3'],
    maxConsecutiveHours: 8
  },
  { 
    id: 'gch_4', 
    name: 'Pfleger Stefan W.', 
    skills: ['Allgemein', 'Instrumentierung', 'Endovaskulär'], 
    department: 'GCH',
    experience: 'Standard',
    shiftPreferences: ['BD1', 'BD3'],
    maxConsecutiveHours: 9
  },

  // PCH (Plastische Chirurgie) - 4 staff members for 5 operations
  { 
    id: 'pch_1', 
    name: 'Dr. Hoffmann L.', 
    skills: ['Allgemein', 'Plastische_Chirurgie', 'Mikrochirurgie', 'Handchirurgie'], 
    department: 'PCH',
    experience: 'Expert',
    shiftPreferences: ['BD1', 'BD2'],
    maxConsecutiveHours: 11
  },
  { 
    id: 'pch_2', 
    name: 'Schwester Ulla K.', 
    skills: ['Allgemein', 'Plastische_Chirurgie', 'Hauttransplantation'], 
    department: 'PCH',
    experience: 'Senior',
    shiftPreferences: ['BD2', 'BD3'],
    maxConsecutiveHours: 9
  },
  { 
    id: 'pch_3', 
    name: 'Pfleger Martin S.', 
    skills: ['Allgemein', 'Instrumentierung', 'Mikrochirurgie'], 
    department: 'PCH',
    experience: 'Standard',
    shiftPreferences: ['BD1', 'BD3'],
    maxConsecutiveHours: 8
  },
  { 
    id: 'pch_4', 
    name: 'Schwester Anja M.', 
    skills: ['Allgemein', 'Plastische_Chirurgie', 'Instrumentierung'], 
    department: 'PCH',
    experience: 'Standard',
    shiftPreferences: ['BD2'],
    maxConsecutiveHours: 8
  },

  // URO (Urologie) - 3 staff members for 4 operations
  { 
    id: 'uro_1', 
    name: 'Dr. Müller F.', 
    skills: ['Allgemein', 'Urologie', 'Endoskopie', 'Lasertherapie'], 
    department: 'URO',
    experience: 'Senior',
    shiftPreferences: ['BD1', 'BD2'],
    maxConsecutiveHours: 10
  },
  { 
    id: 'uro_2', 
    name: 'Pfleger Jürgen S.', 
    skills: ['Allgemein', 'Urologie', 'Instrumentierung'], 
    department: 'URO',
    experience: 'Expert',
    shiftPreferences: ['BD2', 'BD3'],
    maxConsecutiveHours: 11
  },
  { 
    id: 'uro_3', 
    name: 'Schwester Claudia R.', 
    skills: ['Allgemein', 'Endoskopie', 'Instrumentierung'], 
    department: 'URO',
    experience: 'Standard',
    shiftPreferences: ['BD1', 'BD3'],
    maxConsecutiveHours: 8
  },

  // GYN (Gynäkologie) - 3 staff members for 3 operations  
  { 
    id: 'gyn_1', 
    name: 'Dr. Wagner S.', 
    skills: ['Allgemein', 'Gynäkologie', 'Onkologie', 'Sentinel_Technik'], 
    department: 'GYN',
    experience: 'Senior',
    shiftPreferences: ['BD1'],
    maxConsecutiveHours: 10
  },
  { 
    id: 'gyn_2', 
    name: 'Schwester Sandra P.', 
    skills: ['Allgemein', 'Gynäkologie', 'Laparoskopie'], 
    department: 'GYN',
    experience: 'Expert',
    shiftPreferences: ['BD2', 'BD3'],
    maxConsecutiveHours: 10
  },
  { 
    id: 'gyn_3', 
    name: 'Pfleger Marcus E.', 
    skills: ['Allgemein', 'Instrumentierung', 'Onkologie'], 
    department: 'GYN',
    experience: 'Standard',
    shiftPreferences: ['BD1', 'BD2'],
    maxConsecutiveHours: 8
  },

  // UCH (Unfallchirurgie) - 3 staff members for 3 operations
  { 
    id: 'uch_1', 
    name: 'Dr. Becker H.', 
    skills: ['Allgemein', 'Unfallchirurgie', 'Osteosynthese', 'Wirbelsäule'], 
    department: 'UCH',
    experience: 'Expert',
    shiftPreferences: ['BD1', 'BD2'],
    maxConsecutiveHours: 12
  },
  { 
    id: 'uch_2', 
    name: 'Schwester Ingrid K.', 
    skills: ['Allgemein', 'Unfallchirurgie', 'Instrumentierung'], 
    department: 'UCH',
    experience: 'Senior',
    shiftPreferences: ['BD2', 'BD3'],
    maxConsecutiveHours: 9
  },
  { 
    id: 'uch_3', 
    name: 'Pfleger Robert F.', 
    skills: ['Allgemein', 'Instrumentierung', 'Orthopädie'], 
    department: 'UCH',
    experience: 'Standard',
    shiftPreferences: ['BD1', 'BD3'],
    maxConsecutiveHours: 8
  },

  // Flexible staff (can work across departments)
  { 
    id: 'flex_1', 
    name: 'Schwester Julia W.', 
    skills: ['Allgemein', 'Instrumentierung', 'Springer', 'Laparoskopie'], 
    department: 'ACH',
    experience: 'Senior',
    shiftPreferences: ['BD1', 'BD2', 'BD3'],
    maxConsecutiveHours: 10,
    crossTrained: ['GCH', 'PCH']
  },
  { 
    id: 'flex_2', 
    name: 'Pfleger Daniel Z.', 
    skills: ['Allgemein', 'Instrumentierung', 'Springer'], 
    department: 'GCH',
    experience: 'Standard',
    shiftPreferences: ['BD2', 'BD3'],
    maxConsecutiveHours: 9,
    crossTrained: ['ACH', 'URO']
  }
];

// Department-specific skill requirements
export const DEPARTMENT_SKILLS: Record<Department, string[]> = {
  ACH: ['Allgemein', 'Laparoskopie', 'Endokrine_Chirurgie', 'Hernie_Reparatur', 'Thyreoidektomie'],
  GCH: ['Allgemein', 'Gefäßchirurgie', 'Endovaskulär', 'Amputation', 'Endarteriektomie'],
  PCH: ['Allgemein', 'Plastische_Chirurgie', 'Mikrochirurgie', 'Hauttransplantation', 'Handchirurgie'],
  URO: ['Allgemein', 'Urologie', 'Endoskopie', 'Lasertherapie'],
  GYN: ['Allgemein', 'Gynäkologie', 'Onkologie', 'Sentinel_Technik', 'Laparoskopie'],
  UCH: ['Allgemein', 'Unfallchirurgie', 'Osteosynthese', 'Wirbelsäule', 'Orthopädie']
};

// Procedure complexity staffing requirements
export const PROCEDURE_STAFFING_REQUIREMENTS = {
  'Sehr Hoch': { 
    minStaff: 2, 
    requiredExperience: 'Senior',
    specialistRequired: true,
    description: 'Hochkomplexe Eingriffe - Mindestens 2 erfahrene Spezialisten'
  },
  'Hoch': { 
    minStaff: 2, 
    requiredExperience: 'Standard',
    specialistRequired: true,
    description: 'Komplexe Eingriffe - 2 qualifizierte Fachkräfte'
  },
  'Mittel': { 
    minStaff: 2, 
    requiredExperience: 'Standard',
    specialistRequired: false,
    description: 'Standard-Eingriffe - 2 Fachkräfte'
  },
  'Niedrig': { 
    minStaff: 1, 
    requiredExperience: 'Junior',
    specialistRequired: false,
    description: 'Einfache Eingriffe - 1-2 Fachkräfte'
  }
};

// Experience level hierarchy for qualification checks
export const EXPERIENCE_HIERARCHY: Record<ExperienceLevel, number> = {
  'Junior': 1,
  'Standard': 2,
  'Senior': 3,
  'Expert': 4
};

// German procedure to skill mapping for accurate staff assignment
export const PROCEDURE_SKILL_MAPPING: Record<string, string[]> = {
  // ACH procedures
  'Thyreoidektomie': ['Endokrine_Chirurgie', 'Instrumentierung'],
  'Cholezystektomie': ['Laparoskopie', 'Allgemein'],
  'Hernie': ['Hernie_Reparatur', 'Laparoskopie'],
  
  // GCH procedures  
  'Major-Amputation': ['Amputation', 'Gefäßchirurgie'],
  'Patchplastik': ['Gefäßchirurgie', 'Endovaskulär'],
  'Endarteriektomie': ['Endarteriektomie', 'Gefäßchirurgie'],
  
  // PCH procedures
  'Dupuytren': ['Handchirurgie', 'Mikrochirurgie'],
  'Lappenplastik': ['Plastische_Chirurgie', 'Hauttransplantation'],
  'Tumor-Exzision': ['Plastische_Chirurgie', 'Onkologie'],
  
  // URO procedures
  'Ureterorenoskopie': ['Urologie', 'Endoskopie'],
  'TURP': ['Urologie', 'Lasertherapie'],
  'Nephrolithopaxie': ['Urologie', 'Endoskopie'],
  
  // GYN procedures
  'Mamma-BET': ['Gynäkologie', 'Onkologie'],
  'Sentinel-Lymphknoten': ['Sentinel_Technik', 'Onkologie'],
  
  // UCH procedures
  'Osteosynthese': ['Osteosynthese', 'Unfallchirurgie'],
  'Metallentfernung': ['Unfallchirurgie', 'Orthopädie'],
  'Instrumentierung': ['Wirbelsäule', 'Instrumentierung']
};

// Enhanced staff filtering and management functions

// Department to staff specialty mapping (legacy compatibility)
export const DEPARTMENT_STAFF_REQUIREMENTS: Record<Department, string[]> = {
  ACH: DEPARTMENT_SKILLS.ACH,
  GCH: DEPARTMENT_SKILLS.GCH,
  PCH: DEPARTMENT_SKILLS.PCH,
  URO: DEPARTMENT_SKILLS.URO,
  GYN: DEPARTMENT_SKILLS.GYN,
  UCH: DEPARTMENT_SKILLS.UCH
};

// Mapping departments to specialized skills (legacy compatibility)
export const mapDepartmentToSpecialty = (department: Department): string[] => {
  return DEPARTMENT_SKILLS[department] || ['Allgemein', 'Instrumentierung'];
};

// Get staff members by department (enhanced)
export const getStaffByDepartment = (department: Department, includeFlexible: boolean = true): StaffMember[] => {
  return STAFF_MEMBERS.filter(staff => {
    // Direct department match
    if (staff.department === department) return true;
    
    // Cross-trained staff (if includeFlexible is true)
    if (includeFlexible && staff.crossTrained?.includes(department)) return true;
    
    // Staff with relevant skills for the department
    return staff.skills.some(skill => DEPARTMENT_SKILLS[department]?.includes(skill));
  });
};

// Get staff by experience level
export const getStaffByExperience = (
  minExperience: ExperienceLevel, 
  department?: Department
): StaffMember[] => {
  const minLevel = EXPERIENCE_HIERARCHY[minExperience];
  
  return STAFF_MEMBERS.filter(staff => {
    const staffLevel = EXPERIENCE_HIERARCHY[staff.experience || 'Standard'];
    const meetsExperience = staffLevel >= minLevel;
    
    if (!department) return meetsExperience;
    
    // Check if staff can work in the department
    return meetsExperience && (
      staff.department === department || 
      staff.crossTrained?.includes(department) ||
      staff.skills.some(skill => DEPARTMENT_SKILLS[department]?.includes(skill))
    );
  });
};

// Get qualified staff for specific operation (enhanced)
export const getQualifiedStaff = (
  department: Department, 
  requiredSkills: string[] = [], 
  complexity: OperationComplexity = 'Mittel',
  excludeSick: boolean = true,
  procedureName?: string
): StaffMember[] => {
  const requirements = PROCEDURE_STAFFING_REQUIREMENTS[complexity];
  const minExperienceLevel = EXPERIENCE_HIERARCHY[requirements.requiredExperience];
  
  // Get procedure-specific skills if procedure name is provided
  let procedureSkills: string[] = [];
  if (procedureName) {
    for (const [procedure, skills] of Object.entries(PROCEDURE_SKILL_MAPPING)) {
      if (procedureName.toLowerCase().includes(procedure.toLowerCase())) {
        procedureSkills = skills;
        break;
      }
    }
  }
  
  const allRequiredSkills = [...requiredSkills, ...procedureSkills];
  
  return STAFF_MEMBERS.filter(staff => {
    // Exclude sick staff if requested
    if (excludeSick && staff.isSick) return false;
    
    // Check experience level
    const staffExperienceLevel = EXPERIENCE_HIERARCHY[staff.experience || 'Standard'];
    if (staffExperienceLevel < minExperienceLevel) return false;
    
    // Check department compatibility
    const canWorkInDepartment = 
      staff.department === department || 
      staff.crossTrained?.includes(department) ||
      staff.skills.some(skill => DEPARTMENT_SKILLS[department]?.includes(skill));
    
    if (!canWorkInDepartment) return false;
    
    // Check specific skills if required
    if (allRequiredSkills.length > 0) {
      const hasRequiredSkills = allRequiredSkills.some(skill => 
        staff.skills.includes(skill)
      );
      if (!hasRequiredSkills) return false;
    }
    
    // For very high complexity, require specialist
    if (complexity === 'Sehr Hoch' && requirements.specialistRequired) {
      const isDepartmentSpecialist = staff.department === department;
      const hasSpecialistSkills = staff.skills.some(skill => 
        DEPARTMENT_SKILLS[department]?.includes(skill) && skill !== 'Allgemein'
      );
      if (!isDepartmentSpecialist && !hasSpecialistSkills) return false;
    }
    
    return true;
  });
};

// Get optimal staff pairing for an operation
export const getOptimalStaffPairing = (
  department: Department,
  complexity: OperationComplexity,
  procedureName?: string,
  timeSlot?: string
): StaffMember[] => {
  const qualifiedStaff = getQualifiedStaff(department, [], complexity, true, procedureName);
  const requirements = PROCEDURE_STAFFING_REQUIREMENTS[complexity];
  
  if (qualifiedStaff.length < requirements.minStaff) {
    return qualifiedStaff; // Return what we have, even if insufficient
  }
  
  // Sort by experience and department match
  const sortedStaff = qualifiedStaff.sort((a, b) => {
    // Prioritize department specialists
    const aDeptMatch = a.department === department ? 1 : 0;
    const bDeptMatch = b.department === department ? 1 : 0;
    if (aDeptMatch !== bDeptMatch) return bDeptMatch - aDeptMatch;
    
    // Then by experience level
    const aExp = EXPERIENCE_HIERARCHY[a.experience || 'Standard'];
    const bExp = EXPERIENCE_HIERARCHY[b.experience || 'Standard'];
    return bExp - aExp;
  });
  
  // Return optimal pairing
  return sortedStaff.slice(0, Math.max(requirements.minStaff, 2));
};

// Check staff availability for specific time slot
export const isStaffAvailable = (
  staff: StaffMember, 
  timeSlot: string, 
  date: string,
  existingSchedule?: ORSchedule
): boolean => {
  // Basic availability check
  if (staff.isSick) return false;
  
  // Check shift preferences (convert time to shift preference)
  if (staff.shiftPreferences && staff.shiftPreferences.length > 0) {
    const hour = parseInt(timeSlot.split(':')[0]);
    let preferredShift = '';
    if (hour >= 6 && hour < 8) preferredShift = 'BD1';
    else if (hour >= 7 && hour < 16) preferredShift = 'BD2';
    else if (hour >= 12 && hour < 21) preferredShift = 'BD3';
    
    if (preferredShift && !staff.shiftPreferences.includes(preferredShift as any)) {
      return false; // Not preferred shift
    }
  }
  
  // TODO: Check against existing schedule for conflicts
  // This would require checking the actual schedule for overlapping assignments
  
  return true;
};

// Get staff workload statistics
export const getStaffWorkloadStats = (staffId: string, schedule: ORSchedule): {
  totalHours: number;
  operationCount: number;
  utilizationRate: number;
  nextAvailableSlot: string | null;
} => {
  let totalHours = 0;
  let operationCount = 0;
  
  Object.values(schedule).forEach(dailySchedule => {
    Object.values(dailySchedule.rooms).forEach(roomOps => {
      roomOps.forEach(operation => {
        if (operation.assignedStaff.some(staff => staff.id === staffId)) {
          totalHours += operation.timeSlot.duration || 60;
          operationCount++;
        }
      });
    });
  });
  
  const staff = getStaffMemberById(staffId);
  const maxHours = staff?.maxConsecutiveHours || 8;
  const utilizationRate = Math.round((totalHours / (maxHours * 60)) * 100);
  
  return {
    totalHours: Math.round(totalHours / 60), // Convert to hours
    operationCount,
    utilizationRate,
    nextAvailableSlot: null // TODO: Calculate next available slot
  };
};

// Find staff shortages by department
export const findStaffShortages = (schedule: ORSchedule): Array<{
  department: Department;
  requiredStaff: number;
  availableStaff: number;
  shortage: number;
  criticalOperations: string[];
}> => {
  const shortages: Array<{
    department: Department;
    requiredStaff: number;
    availableStaff: number;
    shortage: number;
    criticalOperations: string[];
  }> = [];
  
  DEPARTMENTS.forEach(department => {
    const availableStaff = getStaffByDepartment(department, true)
      .filter(staff => !staff.isSick).length;
    
    let requiredStaff = 0;
    const criticalOperations: string[] = [];
    
    Object.values(schedule).forEach(dailySchedule => {
      Object.values(dailySchedule.rooms).forEach(roomOps => {
        roomOps.forEach(operation => {
          if (operation.department === department) {
            const requirements = PROCEDURE_STAFFING_REQUIREMENTS[operation.complexity || 'Mittel'];
            requiredStaff += requirements.minStaff;
            
            if (operation.complexity === 'Sehr Hoch' || operation.complexity === 'Hoch') {
              criticalOperations.push(`${operation.room} - ${operation.procedureName}`);
            }
          }
        });
      });
    });
    
    if (requiredStaff > availableStaff) {
      shortages.push({
        department,
        requiredStaff,
        availableStaff,
        shortage: requiredStaff - availableStaff,
        criticalOperations
      });
    }
  });
  
  return shortages.sort((a, b) => b.shortage - a.shortage);
};

// Group operations by room for scheduling
export const groupOperationsByRoom = (operations: CSVOperation[]): Record<OperatingRoomName, CSVOperation[]> => {
  const grouped: Record<OperatingRoomName, CSVOperation[]> = {} as Record<OperatingRoomName, CSVOperation[]>;
  
  // Initialize all rooms
  OPERATING_ROOMS.forEach(room => {
    grouped[room] = [];
  });
  
  // Group operations by room
  operations.forEach(operation => {
    if (grouped[operation.opSaal]) {
      grouped[operation.opSaal].push(operation);
    }
  });
  
  // Sort operations by time within each room
  Object.keys(grouped).forEach(room => {
    grouped[room as OperatingRoomName].sort((a, b) => {
      return a.zeit.localeCompare(b.zeit);
    });
  });
  
  return grouped;
};

// Group operations by department
export const groupOperationsByDepartment = (operations: CSVOperation[]): Record<Department, CSVOperation[]> => {
  const grouped: Record<Department, CSVOperation[]> = {} as Record<Department, CSVOperation[]>;
  
  // Initialize all departments
  DEPARTMENTS.forEach(dept => {
    grouped[dept] = [];
  });
  
  // Group operations by department
  operations.forEach(operation => {
    if (grouped[operation.opOrgaeinheit]) {
      grouped[operation.opOrgaeinheit].push(operation);
    }
  });
  
  return grouped;
};

// Create schedule from CSV operations
export const createScheduleFromCSV = (csvOperations: CSVOperation[]): ORSchedule => {
  const schedule: ORSchedule = {};
  
  // Group operations by date first
  const operationsByDate: Record<string, CSVOperation[]> = {};
  
  csvOperations.forEach(operation => {
    const [day, month, year] = operation.datum.split('.');
    const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    
    if (!operationsByDate[isoDate]) {
      operationsByDate[isoDate] = [];
    }
    operationsByDate[isoDate].push(operation);
  });
  
  // Create daily schedules
  Object.entries(operationsByDate).forEach(([date, dayOperations]) => {
    const dailySchedule: DailyORSchedule = {
      date,
      rooms: {} as Record<OperatingRoomName, OperationAssignment[]>
    };
    
    // Initialize all rooms for the day
    OPERATING_ROOMS.forEach(room => {
      dailySchedule.rooms[room] = [];
    });
    
    // Convert CSV operations to OperationAssignments
    dayOperations.forEach(csvOp => {
      const operationAssignment = GermanHospitalCSVParser.csvToOperationAssignment(csvOp);
      dailySchedule.rooms[csvOp.opSaal].push(operationAssignment);
    });
    
    // Sort operations by time within each room
    Object.keys(dailySchedule.rooms).forEach(room => {
      dailySchedule.rooms[room as OperatingRoomName].sort((a, b) => {
        return a.timeSlot.start.localeCompare(b.timeSlot.start);
      });
    });
    
    schedule[date] = dailySchedule;
  });
  
  return schedule;
};

// Create empty daily schedule template
export const createEmptyDailySchedule = (date: string): DailyORSchedule => {
  const dailySchedule: DailyORSchedule = {
    date,
    rooms: {} as Record<OperatingRoomName, OperationAssignment[]>
  };
  
  // Initialize all rooms as empty
  OPERATING_ROOMS.forEach(room => {
    dailySchedule.rooms[room] = [];
  });
  
  return dailySchedule;
};

// Add operation to schedule
export const addOperationToSchedule = (
  schedule: ORSchedule, 
  operation: OperationAssignment
): ORSchedule => {
  const updatedSchedule = { ...schedule };
  
  if (!updatedSchedule[operation.date]) {
    updatedSchedule[operation.date] = createEmptyDailySchedule(operation.date);
  }
  
  const dailySchedule = { ...updatedSchedule[operation.date] };
  const roomOperations = [...dailySchedule.rooms[operation.room]];
  
  // Insert operation in correct time order
  const insertIndex = roomOperations.findIndex(
    op => op.timeSlot.start > operation.timeSlot.start
  );
  
  if (insertIndex === -1) {
    roomOperations.push(operation);
  } else {
    roomOperations.splice(insertIndex, 0, operation);
  }
  
  dailySchedule.rooms[operation.room] = roomOperations;
  updatedSchedule[operation.date] = dailySchedule;
  
  return updatedSchedule;
};

// Get operations for specific date and room
export const getOperationsForDateAndRoom = (
  schedule: ORSchedule, 
  date: string, 
  room: OperatingRoomName
): OperationAssignment[] => {
  return schedule[date]?.rooms[room] || [];
};

// Get all operations for a specific date
export const getOperationsForDate = (
  schedule: ORSchedule, 
  date: string
): OperationAssignment[] => {
  if (!schedule[date]) return [];
  
  const allOperations: OperationAssignment[] = [];
  OPERATING_ROOMS.forEach(room => {
    allOperations.push(...schedule[date].rooms[room]);
  });
  
  return allOperations.sort((a, b) => a.timeSlot.start.localeCompare(b.timeSlot.start));
};

// Check for time conflicts in room
export const hasTimeConflict = (
  schedule: ORSchedule,
  date: string,
  room: OperatingRoomName,
  newTimeSlot: TimeSlot,
  excludeOperationId?: string
): boolean => {
  const existingOperations = getOperationsForDateAndRoom(schedule, date, room);
  
  return existingOperations.some(operation => {
    if (excludeOperationId && operation.id === excludeOperationId) {
      return false;
    }
    
    const existingStart = operation.timeSlot.start;
    const existingEnd = operation.timeSlot.end;
    const newStart = newTimeSlot.start;
    const newEnd = newTimeSlot.end;
    
    // Check for overlap
    return (newStart < existingEnd && newEnd > existingStart);
  });
};

// Calculate room utilization for a date
export const calculateRoomUtilization = (
  schedule: ORSchedule,
  date: string,
  room: OperatingRoomName
): {
  totalMinutes: number;
  usedMinutes: number;
  utilizationPercentage: number;
  operationCount: number;
} => {
  const operations = getOperationsForDateAndRoom(schedule, date, room);
  
  // Assume standard 8-hour operating day (480 minutes)
  const totalMinutes = 480;
  
  const usedMinutes = operations.reduce((total, operation) => {
    return total + (operation.timeSlot.duration || 60);
  }, 0);
  
  const utilizationPercentage = Math.round((usedMinutes / totalMinutes) * 100);
  
  return {
    totalMinutes,
    usedMinutes,
    utilizationPercentage,
    operationCount: operations.length
  };
};

// Get staff workload for a date
export const getStaffWorkload = (
  schedule: ORSchedule,
  date: string,
  staffId: string
): {
  assignedOperations: OperationAssignment[];
  totalMinutes: number;
  operationCount: number;
} => {
  const allOperations = getOperationsForDate(schedule, date);
  const assignedOperations = allOperations.filter(operation =>
    operation.assignedStaff.some(staff => staff.id === staffId)
  );
  
  const totalMinutes = assignedOperations.reduce((total, operation) => {
    return total + (operation.timeSlot.duration || 60);
  }, 0);
  
  return {
    assignedOperations,
    totalMinutes,
    operationCount: assignedOperations.length
  };
};

// Enhanced helper functions (updated for new structure)
export const getStaffMemberById = (id: string): EnhancedStaffMember | undefined => 
  STAFF_MEMBERS.find(s => s.id === id);

export const getStaffMemberByName = (name: string): EnhancedStaffMember | undefined => 
  STAFF_MEMBERS.find(s => s.name === name);

export const getAvailableStaff = (excludeSick: boolean = true): EnhancedStaffMember[] => 
  STAFF_MEMBERS.filter(staff => !excludeSick || !staff.isSick);

export const getSickStaff = (): EnhancedStaffMember[] => 
  STAFF_MEMBERS.filter(staff => staff.isSick);

// Updated for AI integration with enhanced data
export const AVAILABLE_STAFF_FOR_AI = (): string[] => 
  getAvailableStaff().map(s => s.name);

export const SICK_STAFF_FOR_AI = (): string[] => 
  getSickStaff().map(s => s.name);

// Get staff summary by department
export const getStaffSummaryByDepartment = (): Record<Department, {
  total: number;
  available: number;
  byExperience: Record<ExperienceLevel, number>;
  averageHours: number;
}> => {
  const summary = {} as Record<Department, {
    total: number;
    available: number;
    byExperience: Record<ExperienceLevel, number>;
    averageHours: number;
  }>;

  DEPARTMENTS.forEach(dept => {
    const deptStaff = getStaffByDepartment(dept);
    const availableStaff = deptStaff.filter(s => !s.isSick);
    
    const byExperience = {
      'Junior': deptStaff.filter(s => s.experience === 'Junior').length,
      'Standard': deptStaff.filter(s => s.experience === 'Standard').length,
      'Senior': deptStaff.filter(s => s.experience === 'Senior').length,
      'Expert': deptStaff.filter(s => s.experience === 'Expert').length
    } as Record<ExperienceLevel, number>;
    
    const averageHours = deptStaff.reduce((sum, staff) => 
      sum + (staff.maxConsecutiveHours || 8), 0) / deptStaff.length;
    
    summary[dept] = {
      total: deptStaff.length,
      available: availableStaff.length,
      byExperience,
      averageHours: Math.round(averageHours * 10) / 10
    };
  });

  return summary;
};

// Get staff recommendations for understaffed departments
export const getStaffRecommendations = (schedule: ORSchedule): Array<{
  department: Department;
  recommendation: string;
  priority: 'High' | 'Medium' | 'Low';
  actionItems: string[];
}> => {
  const shortages = findStaffShortages(schedule);
  const recommendations: Array<{
    department: Department;
    recommendation: string;
    priority: 'High' | 'Medium' | 'Low';
    actionItems: string[];
  }> = [];

  shortages.forEach(shortage => {
    const priority = shortage.shortage > 3 ? 'High' : shortage.shortage > 1 ? 'Medium' : 'Low';
    
    recommendations.push({
      department: shortage.department,
      recommendation: `Personalengpass in ${shortage.department}: ${shortage.shortage} zusätzliche Fachkräfte benötigt`,
      priority,
      actionItems: [
        `Temporäre Umverteilung aus anderen Abteilungen prüfen`,
        `Springer-Personal für ${shortage.department} einplanen`,
        shortage.criticalOperations.length > 0 ? 
          `Kritische OPs priorisieren: ${shortage.criticalOperations.slice(0, 2).join(', ')}` : 
          'Weniger kritische Eingriffe verschieben',
        `Verfügbarkeit von Cross-Training Personal überprüfen`
      ]
    });
  });

  return recommendations.sort((a, b) => {
    const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
};

// Enhanced compatibility functions for legacy support
export const getDepartmentWorkload = (
  schedule: ORSchedule,
  date: string,
  department: Department
): {
  operations: OperationAssignment[];
  totalMinutes: number;
  averageComplexity: number;
  roomsUsed: OperatingRoomName[];
  staffUtilization: number;
} => {
  const allOperations = getOperationsForDate(schedule, date);
  const departmentOperations = allOperations.filter(
    operation => operation.department === department
  );
  
  const totalMinutes = departmentOperations.reduce((total, operation) => {
    return total + (operation.timeSlot.duration || 60);
  }, 0);
  
  const complexityScores = departmentOperations.map(operation => {
    switch (operation.complexity) {
      case 'Sehr Hoch': return 4;
      case 'Hoch': return 3;
      case 'Mittel': return 2;
      case 'Niedrig': return 1;
      default: return 2;
    }
  });
  
  const averageComplexity = complexityScores.length > 0 
    ? complexityScores.reduce((sum, score) => sum + score, 0) / complexityScores.length
    : 0;
  
  const roomsUsed = [...new Set(departmentOperations.map(op => op.room))];
  
  // Calculate staff utilization
  const departmentStaff = getStaffByDepartment(department, true);
  const availableStaffHours = departmentStaff
    .filter(s => !s.isSick)
    .reduce((sum, staff) => sum + (staff.maxConsecutiveHours || 8), 0) * 60;
  
  const requiredStaffMinutes = departmentOperations.reduce((sum, op) => {
    const requirements = PROCEDURE_STAFFING_REQUIREMENTS[op.complexity || 'Mittel'];
    return sum + (requirements.minStaff * (op.timeSlot.duration || 60));
  }, 0);
  
  const staffUtilization = availableStaffHours > 0 
    ? Math.round((requiredStaffMinutes / availableStaffHours) * 100)
    : 0;
  
  return {
    operations: departmentOperations,
    totalMinutes,
    averageComplexity,
    roomsUsed,
    staffUtilization
  };
};

// Get department workload statistics
export const getDepartmentWorkload = (
  schedule: ORSchedule,
  date: string,
  department: Department
): {
  operations: OperationAssignment[];
  totalMinutes: number;
  averageComplexity: number;
  roomsUsed: OperatingRoomName[];
} => {
  const allOperations = getOperationsForDate(schedule, date);
  const departmentOperations = allOperations.filter(
    operation => operation.department === department
  );
  
  const totalMinutes = departmentOperations.reduce((total, operation) => {
    return total + (operation.timeSlot.duration || 60);
  }, 0);
  
  const complexityScores = departmentOperations.map(operation => {
    switch (operation.complexity) {
      case 'Sehr Hoch': return 4;
      case 'Hoch': return 3;
      case 'Mittel': return 2;
      case 'Niedrig': return 1;
      default: return 2;
    }
  });
  
  const averageComplexity = complexityScores.length > 0 
    ? complexityScores.reduce((sum, score) => sum + score, 0) / complexityScores.length
    : 0;
  
  const roomsUsed = [...new Set(departmentOperations.map(op => op.room))];
  
  return {
    operations: departmentOperations,
    totalMinutes,
    averageComplexity,
    roomsUsed
  };
};

// Legacy compatibility: Create initial empty schedule
export const INITIAL_SCHEDULE_TEMPLATE = (): ORSchedule => {
  // Return empty schedule - will be populated from CSV
  return {};
};

// Room capacity and preferences
export const ROOM_PREFERENCES: Record<Department, OperatingRoomName[]> = {
  ACH: ['SAAL 1', 'SAAL 2', 'SAAL 3'],
  GCH: ['SAAL 4', 'SAAL 5'],
  PCH: ['SAAL 6', 'SAAL 7'],
  URO: ['SAAL 8'],
  GYN: ['SAAL 3', 'SAAL 4'],
  UCH: ['SAAL 1', 'SAAL 2']
};

// Get preferred rooms for department
export const getPreferredRooms = (department: Department): OperatingRoomName[] => {
  return ROOM_PREFERENCES[department] || OPERATING_ROOMS;
};

// Check if room is preferred for department
export const isPreferredRoom = (department: Department, room: OperatingRoomName): boolean => {
  return getPreferredRooms(department).includes(room);
};

// Export types for external use
export type { 
  StaffMember,
  EnhancedStaffMember,
  ExperienceLevel,
  OperationAssignment, 
  ORSchedule, 
  DailyORSchedule,
  CSVOperation,
  Department,
  OperatingRoomName,
  OperationComplexity,
  TimeSlot
};
