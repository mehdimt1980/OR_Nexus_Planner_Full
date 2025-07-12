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

// Updated staff members with skills matching new department structure
export const STAFF_MEMBERS: StaffMember[] = [
  // Allgemeinchirurgie (ACH) specialists
  { id: 'staff_1', name: 'Karin R.', skills: ['Allgemeinchirurgie', 'Instrumentierung', 'Laparoskopie'], department: 'ACH' },
  { id: 'staff_2', name: 'Fatima R.', skills: ['Allgemeinchirurgie', 'Herz-Thorax', 'Instrumentierung'], department: 'ACH' },
  { id: 'staff_3', name: 'Michael B.', skills: ['Allgemeinchirurgie', 'Instrumentierung'], department: 'ACH' },
  
  // Gefäßchirurgie (GCH) specialists
  { id: 'staff_4', name: 'Gerhard K.', skills: ['Gefäßchirurgie', 'Instrumentierung', 'Endoskopie'], department: 'GCH' },
  { id: 'staff_5', name: 'Thomas L.', skills: ['Gefäßchirurgie', 'Instrumentierung'], department: 'GCH' },
  
  // Plastische Chirurgie (PCH) specialists
  { id: 'staff_6', name: 'Ulla K.', skills: ['Plastische Chirurgie', 'Handchirurgie', 'Instrumentierung', 'Mikrochirurgie'], department: 'PCH' },
  { id: 'staff_7', name: 'Anja M.', skills: ['Plastische Chirurgie', 'Instrumentierung'], department: 'PCH' },
  
  // Urologie (URO) specialists
  { id: 'staff_8', name: 'Jürgen S.', skills: ['Urologie', 'Endoskopie', 'Instrumentierung'], department: 'URO' },
  { id: 'staff_9', name: 'Marcus W.', skills: ['Urologie', 'Instrumentierung'], department: 'URO' },
  
  // Gynäkologie (GYN) specialists
  { id: 'staff_10', name: 'Sandra P.', skills: ['Gynäkologie', 'Laparoskopie', 'Instrumentierung'], department: 'GYN' },
  { id: 'staff_11', name: 'Sabine W.', skills: ['Gynäkologie', 'Instrumentierung'], department: 'GYN' },
  
  // Unfallchirurgie (UCH) specialists
  { id: 'staff_12', name: 'Dr. Hans M.', skills: ['Unfallchirurgie', 'Orthopädie', 'Instrumentierung'], department: 'UCH' },
  { id: 'staff_13', name: 'Petra K.', skills: ['Unfallchirurgie', 'Instrumentierung'], department: 'UCH' },
  
  // Additional flexible staff
  { id: 'staff_14', name: 'Julia W.', skills: ['Allgemeinchirurgie', 'Gefäßchirurgie', 'Instrumentierung'], department: 'ACH' },
  { id: 'staff_15', name: 'Robert F.', skills: ['Instrumentierung', 'Springer'], department: 'ACH' }, // Flexible springer
];

// Department to staff specialty mapping
export const DEPARTMENT_STAFF_REQUIREMENTS: Record<Department, string[]> = {
  ACH: ['Allgemeinchirurgie', 'Instrumentierung'],
  GCH: ['Gefäßchirurgie', 'Instrumentierung'],
  PCH: ['Plastische Chirurgie', 'Handchirurgie', 'Instrumentierung'],
  URO: ['Urologie', 'Instrumentierung'],
  GYN: ['Gynäkologie', 'Instrumentierung'],
  UCH: ['Unfallchirurgie', 'Orthopädie', 'Instrumentierung']
};

// Mapping departments to specialized skills
export const mapDepartmentToSpecialty = (department: Department): string[] => {
  return DEPARTMENT_STAFF_REQUIREMENTS[department] || ['Instrumentierung'];
};

// Get staff members by department
export const getStaffByDepartment = (department: Department): StaffMember[] => {
  return STAFF_MEMBERS.filter(staff => 
    staff.department === department || 
    staff.skills.some(skill => DEPARTMENT_STAFF_REQUIREMENTS[department]?.includes(skill))
  );
};

// Get qualified staff for specific operation
export const getQualifiedStaff = (
  department: Department, 
  requiredSkills: string[] = [], 
  excludeSick: boolean = true
): StaffMember[] => {
  return STAFF_MEMBERS.filter(staff => {
    if (excludeSick && staff.isSick) return false;
    
    // Check if staff has department skills
    const hasDepartmentSkills = staff.department === department || 
      staff.skills.some(skill => DEPARTMENT_STAFF_REQUIREMENTS[department]?.includes(skill));
    
    // Check if staff has required specific skills
    const hasRequiredSkills = requiredSkills.length === 0 || 
      requiredSkills.some(skill => staff.skills.includes(skill));
    
    return hasDepartmentSkills && hasRequiredSkills;
  });
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

// Helper functions (maintained for compatibility)
export const getStaffMemberById = (id: string): StaffMember | undefined => 
  STAFF_MEMBERS.find(s => s.id === id);

export const getStaffMemberByName = (name: string): StaffMember | undefined => 
  STAFF_MEMBERS.find(s => s.name === name);

export const getAvailableStaff = (excludeSick: boolean = true): StaffMember[] => 
  STAFF_MEMBERS.filter(staff => !excludeSick || !staff.isSick);

export const getSickStaff = (): StaffMember[] => 
  STAFF_MEMBERS.filter(staff => staff.isSick);

// Updated for AI integration
export const AVAILABLE_STAFF_FOR_AI = (): string[] => 
  getAvailableStaff().map(s => s.name);

export const SICK_STAFF_FOR_AI = (): string[] => 
  getSickStaff().map(s => s.name);

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
  OperationAssignment, 
  ORSchedule, 
  DailyORSchedule,
  CSVOperation,
  Department,
  OperatingRoomName 
};
