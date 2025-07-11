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

// Enhanced staff member type with German hospital expertise
export interface GermanHospitalStaffMember extends StaffMember {
  departmentExpertise: string[]; // German department specializations
  germanSkills?: string[]; // German medical skills
  experienceLevel: 'Berufsanfänger' | 'Erfahren' | 'Experte' | 'Leitungsfunktion';
  certifications?: string[]; // Medical certifications
}

// Updated staff with German hospital department expertise
export const STAFF_MEMBERS: GermanHospitalStaffMember[] = [
  { 
    id: 'staff_1', 
    name: 'Karin R.', 
    skills: ['Allgemein', 'Robotik'], 
    departmentSpecializations: ['UCH', 'GYN', 'URO'],
    departmentExpertise: ['UCH', 'Orthopädie', 'Trauma'],
    germanSkills: ['Implantate', 'Instrumentierung', 'DaVinci-Robotik'],
    experienceLevel: 'Experte'
  },
  { 
    id: 'staff_2', 
    name: 'Fatima R.', 
    skills: ['Allgemein', 'Herz-Thorax'], 
    departmentSpecializations: ['UCH', 'ACH'],
    departmentExpertise: ['ACH', 'Allgemeinchirurgie', 'Notfallchirurgie'],
    germanSkills: ['Laparoskopie', 'Endoskopie', 'Herz-Thorax'],
    experienceLevel: 'Erfahren'
  },
  { 
    id: 'staff_3', 
    name: 'Gerhard K.', 
    skills: ['Allgemein', 'Neuro'], 
    departmentSpecializations: ['UCH', 'ACH'],
    departmentExpertise: ['UCH', 'Neurochirurgie', 'Wirbelsäule'],
    germanSkills: ['Mikrochirurgie', 'Neuro-Navigation', 'Wirbelsäulen-Instrumentierung'],
    experienceLevel: 'Experte'
  },
  { 
    id: 'staff_4', 
    name: 'Ulla K.', 
    skills: ['Allgemein', 'Robotik', 'Endoskopie'], 
    departmentSpecializations: ['URO', 'GYN', 'GCH'],
    departmentExpertise: ['URO', 'Urologie', 'Endoskopie'],
    germanSkills: ['TUR-P', 'Ureteroskopie', 'Nephroskopie', 'Laparoskopie'],
    experienceLevel: 'Erfahren'
  },
  { 
    id: 'staff_5', 
    name: 'Michael B.', 
    skills: ['Allgemein'], 
    departmentSpecializations: ['UCH', 'ACH', 'GCH'],
    departmentExpertise: ['ACH', 'Allgemeinchirurgie'],
    germanSkills: ['Grundversorgung', 'Allgemeine OP-Techniken'],
    experienceLevel: 'Berufsanfänger'
  },
  { 
    id: 'staff_6', 
    name: 'Sandra P.', 
    skills: ['Allgemein', 'Gynäkologie'], 
    departmentSpecializations: ['GYN', 'GCH'],
    departmentExpertise: ['GYN', 'Gynäkologie', 'Geburtshilfe'],
    germanSkills: ['Sectio', 'Hysterektomie', 'Laparoskopische Gynäkologie'],
    experienceLevel: 'Erfahren'
  },
  { 
    id: 'staff_7', 
    name: 'Jürgen S.', 
    skills: ['Allgemein', 'Urologie'], 
    departmentSpecializations: ['URO', 'GCH'],
    departmentExpertise: ['URO', 'Urologie'],
    germanSkills: ['Prostatachirurgie', 'Steinentfernung', 'Ureteroskopie'],
    experienceLevel: 'Erfahren'
  },
  { 
    id: 'staff_8', 
    name: 'Anja M.', 
    skills: ['Allgemein', 'Plastische Chirurgie'], 
    departmentSpecializations: ['PCH', 'GCH'],
    departmentExpertise: ['PCH', 'Plastische Chirurgie', 'Ästhetische Chirurgie'],
    germanSkills: ['Mikrochirurgie', 'Lappenplastik', 'Mammachirurgie'],
    experienceLevel: 'Experte'
  },
  { 
    id: 'staff_9', 
    name: 'Thomas L.', 
    skills: ['Allgemein'], 
    departmentSpecializations: ['UCH', 'ACH', 'GCH', 'PCH'],
    departmentExpertise: ['Allgemein', 'Springer'],
    germanSkills: ['Flexibler Einsatz', 'Grundversorgung', 'Dokumentation'],
    experienceLevel: 'Erfahren'
  },
  { 
    id: 'staff_10', 
    name: 'Sabine W.', 
    skills: ['Allgemein', 'HNO'], 
    departmentSpecializations: ['UCH', 'GCH'],
    departmentExpertise: ['UCH', 'HNO', 'Kopf-Hals-Chirurgie'],
    germanSkills: ['HNO-Instrumente', 'Endoskopie', 'Mikrochirurgie'],
    experienceLevel: 'Erfahren'
  },
];

// Department-specific staff requirements for German hospitals
export const DEPARTMENT_STAFF_REQUIREMENTS: Record<string, {
  preferredExpertise: string[];
  minimumExperienceLevel: string;
  requiredSkills: string[];
  complexityRequirements: Record<OperationComplexity, {
    leadRequirements: string[];
    supportRequirements: string[];
  }>;
}> = {
  'UCH': {
    preferredExpertise: ['UCH', 'Orthopädie', 'Trauma', 'Unfallchirurgie'],
    minimumExperienceLevel: 'Erfahren',
    requiredSkills: ['Implantate', 'Instrumentierung'],
    complexityRequirements: {
      'Sehr Hoch': {
        leadRequirements: ['UCH', 'Wirbelsäule', 'Neurochirurgie'],
        supportRequirements: ['UCH', 'Orthopädie']
      },
      'Hoch': {
        leadRequirements: ['UCH', 'Orthopädie'],
        supportRequirements: ['UCH', 'Allgemein']
      },
      'Mittel': {
        leadRequirements: ['UCH'],
        supportRequirements: ['Allgemein']
      },
      'Niedrig': {
        leadRequirements: ['UCH', 'Allgemein'],
        supportRequirements: ['Allgemein']
      }
    }
  },
  'ACH': {
    preferredExpertise: ['ACH', 'Allgemeinchirurgie', 'Bauchschirurgie'],
    minimumExperienceLevel: 'Erfahren',
    requiredSkills: ['Laparoskopie', 'Endoskopie'],
    complexityRequirements: {
      'Sehr Hoch': {
        leadRequirements: ['ACH', 'Onkologie', 'Tumorchirurgie'],
        supportRequirements: ['ACH', 'Allgemeinchirurgie']
      },
      'Hoch': {
        leadRequirements: ['ACH', 'Allgemeinchirurgie'],
        supportRequirements: ['ACH', 'Allgemein']
      },
      'Mittel': {
        leadRequirements: ['ACH'],
        supportRequirements: ['Allgemein']
      },
      'Niedrig': {
        leadRequirements: ['ACH', 'Allgemein'],
        supportRequirements: ['Allgemein']
      }
    }
  },
  'GYN': {
    preferredExpertise: ['GYN', 'Gynäkologie', 'Geburtshilfe'],
    minimumExperienceLevel: 'Erfahren',
    requiredSkills: ['Laparoskopische Gynäkologie', 'Sectio'],
    complexityRequirements: {
      'Sehr Hoch': {
        leadRequirements: ['GYN', 'Onkologische Gynäkologie'],
        supportRequirements: ['GYN', 'Gynäkologie']
      },
      'Hoch': {
        leadRequirements: ['GYN', 'Gynäkologie'],
        supportRequirements: ['GYN', 'Geburtshilfe']
      },
      'Mittel': {
        leadRequirements: ['GYN'],
        supportRequirements: ['Allgemein']
      },
      'Niedrig': {
        leadRequirements: ['GYN', 'Allgemein'],
        supportRequirements: ['Allgemein']
      }
    }
  },
  'URO': {
    preferredExpertise: ['URO', 'Urologie'],
    minimumExperienceLevel: 'Erfahren',
    requiredSkills: ['Endoskopie', 'TUR-P', 'Ureteroskopie'],
    complexityRequirements: {
      'Sehr Hoch': {
        leadRequirements: ['URO', 'Robotik', 'DaVinci'],
        supportRequirements: ['URO', 'Urologie']
      },
      'Hoch': {
        leadRequirements: ['URO', 'Urologie'],
        supportRequirements: ['URO', 'Endoskopie']
      },
      'Mittel': {
        leadRequirements: ['URO'],
        supportRequirements: ['Allgemein']
      },
      'Niedrig': {
        leadRequirements: ['URO', 'Allgemein'],
        supportRequirements: ['Allgemein']
      }
    }
  },
  'GCH': {
    preferredExpertise: ['GCH', 'Gefäßchirurgie'],
    minimumExperienceLevel: 'Erfahren',
    requiredSkills: ['Gefäßchirurgie', 'Mikroinstrumente'],
    complexityRequirements: {
      'Sehr Hoch': {
        leadRequirements: ['GCH', 'Mikrochirurgie'],
        supportRequirements: ['GCH', 'Gefäßchirurgie']
      },
      'Hoch': {
        leadRequirements: ['GCH', 'Gefäßchirurgie'],
        supportRequirements: ['GCH', 'Allgemein']
      },
      'Mittel': {
        leadRequirements: ['GCH'],
        supportRequirements: ['Allgemein']
      },
      'Niedrig': {
        leadRequirements: ['GCH', 'Allgemein'],
        supportRequirements: ['Allgemein']
      }
    }
  },
  'PCH': {
    preferredExpertise: ['PCH', 'Plastische Chirurgie', 'Ästhetische Chirurgie'],
    minimumExperienceLevel: 'Erfahren',
    requiredSkills: ['Mikrochirurgie', 'Lappenplastik'],
    complexityRequirements: {
      'Sehr Hoch': {
        leadRequirements: ['PCH', 'Mikrochirurgie', 'Rekonstruktive Chirurgie'],
        supportRequirements: ['PCH', 'Plastische Chirurgie']
      },
      'Hoch': {
        leadRequirements: ['PCH', 'Plastische Chirurgie'],
        supportRequirements: ['PCH', 'Ästhetische Chirurgie']
      },
      'Mittel': {
        leadRequirements: ['PCH'],
        supportRequirements: ['Allgemein']
      },
      'Niedrig': {
        leadRequirements: ['PCH', 'Allgemein'],
        supportRequirements: ['Allgemein']
      }
    }
  }
};

// Get staff members by department expertise
export function getStaffByDepartmentExpertise(department: string): GermanHospitalStaffMember[] {
  return STAFF_MEMBERS.filter(staff => 
    !staff.isSick && 
    staff.departmentExpertise.some(expertise => 
      expertise.toLowerCase().includes(department.toLowerCase()) ||
      department.toLowerCase().includes(expertise.toLowerCase())
    )
  );
}

// Get optimal staff pairing for specific department and complexity
export function getOptimalStaffPairing(
  department: Department, 
  complexity: OperationComplexity,
  excludeStaff: string[] = []
): { lead: GermanHospitalStaffMember | null, support: GermanHospitalStaffMember | null } {
  
  const requirements = DEPARTMENT_STAFF_REQUIREMENTS[department];
  if (!requirements) {
    return { lead: null, support: null };
  }

  const availableStaff = getStaffByDepartmentExpertise(department)
    .filter(staff => !excludeStaff.includes(staff.name));

  const complexityReq = requirements.complexityRequirements[complexity];
  
  // Find lead staff member
  const leadCandidates = availableStaff.filter(staff =>
    complexityReq.leadRequirements.some(req => 
      staff.departmentExpertise.includes(req) ||
      (staff.germanSkills && staff.germanSkills.some(skill => skill.includes(req)))
    )
  );

  // Sort by experience level
  const experienceOrder = { 'Leitungsfunktion': 4, 'Experte': 3, 'Erfahren': 2, 'Berufsanfänger': 1 };
  leadCandidates.sort((a, b) => experienceOrder[b.experienceLevel] - experienceOrder[a.experienceLevel]);
  
  const lead = leadCandidates[0] || null;
  
  // Find support staff member (excluding the lead)
  const supportCandidates = availableStaff
    .filter(staff => staff.id !== lead?.id)
    .filter(staff =>
      complexityReq.supportRequirements.some(req => 
        staff.departmentExpertise.includes(req) ||
        (staff.germanSkills && staff.germanSkills.some(skill => skill.includes(req)))
      )
    );

  supportCandidates.sort((a, b) => experienceOrder[b.experienceLevel] - experienceOrder[a.experienceLevel]);
  const support = supportCandidates[0] || null;

  return { lead, support };
}

// Get staff workload for a given day
export function getStaffWorkload(staffName: string, assignments: OperationAssignment[]): {
  operationCount: number;
  totalDuration: number;
  timeSlots: string[];
  departments: string[];
} {
  const staffAssignments = assignments.filter(op => 
    op.assignedStaff.some(staff => staff.name === staffName)
  );

  return {
    operationCount: staffAssignments.length,
    totalDuration: staffAssignments.reduce((sum, op) => sum + (op.estimatedDuration || 90), 0),
    timeSlots: staffAssignments.map(op => op.scheduledTime).sort(),
    departments: [...new Set(staffAssignments.map(op => op.department))]
  };
}

// Check if staff member is qualified for specific procedure
export function isStaffQualifiedForProcedure(
  staff: GermanHospitalStaffMember, 
  department: Department, 
  procedureName: string,
  complexity: OperationComplexity
): boolean {
  // Check department expertise
  const hasDepartmentExpertise = staff.departmentExpertise.some(expertise =>
    expertise === department || 
    expertise.toLowerCase().includes(department.toLowerCase())
  );

  if (!hasDepartmentExpertise && complexity !== 'Niedrig') {
    return false;
  }

  // Check experience level requirements
  const requirements = DEPARTMENT_STAFF_REQUIREMENTS[department];
  if (requirements) {
    const experienceOrder = { 'Leitungsfunktion': 4, 'Experte': 3, 'Erfahren': 2, 'Berufsanfänger': 1 };
    const minExperience = experienceOrder[requirements.minimumExperienceLevel as keyof typeof experienceOrder] || 1;
    const staffExperience = experienceOrder[staff.experienceLevel];
    
    if (staffExperience < minExperience && complexity === 'Sehr Hoch') {
      return false;
    }
  }

  // Check procedure-specific skills
  const procedureLower = procedureName.toLowerCase();
  if (staff.germanSkills) {
    const hasRelevantSkill = staff.germanSkills.some(skill =>
      procedureLower.includes(skill.toLowerCase()) ||
      skill.toLowerCase().includes(procedureLower.substring(0, 6)) // Partial match
    );
    
    if (hasRelevantSkill) {
      return true;
    }
  }

  // Default qualification based on department and experience
  return hasDepartmentExpertise;
}

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

// Helper functions for backward compatibility
export const getStaffMemberById = (id: string): GermanHospitalStaffMember | undefined => 
  STAFF_MEMBERS.find(s => s.id === id);

export const getStaffMemberByName = (name: string): GermanHospitalStaffMember | undefined => 
  STAFF_MEMBERS.find(s => s.name === name);

// Dynamic staff lists for AI (no longer static as staff availability can change)
export const getAvailableStaffForAI = (): GermanHospitalStaffMember[] => 
  STAFF_MEMBERS.filter(s => !s.isSick);

export const getSickStaffForAI = (): string[] => 
  STAFF_MEMBERS.filter(s => s.isSick).map(s => s.name);
