/**
 * @fileOverview German Medical Utilities
 * Helper functions for German hospital operations, procedure complexity assessment,
 * and department-specific staff management.
 */

import type { Department, OperationComplexity } from '@/lib/or-planner-types';

// Helper function for department-specific staff filtering
export function getStaffByDepartment(
  availableStaff: string[], 
  departmentMapping: Record<string, string[]>
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  
  Object.entries(departmentMapping).forEach(([department, deptStaff]) => {
    result[department] = deptStaff.filter(staff => 
      availableStaff.includes(staff)
    );
  });
  
  return result;
}

// Helper function for complexity assessment based on German procedure names
export function assessGermanProcedureComplexity(procedureName: string): OperationComplexity {
  const lowerProc = procedureName.toLowerCase();
  
  // Sehr Hoch complexity patterns
  if (lowerProc.includes('thyreoidektomie') || 
      lowerProc.includes('major-amputation') || 
      lowerProc.includes('amputation') && lowerProc.includes('major') ||
      (lowerProc.includes('osteosynthese') && lowerProc.includes('acetabulum')) ||
      lowerProc.includes('transplantation') ||
      lowerProc.includes('herzklappen') ||
      lowerProc.includes('bypass')) {
    return 'Sehr Hoch';
  }
  
  // Hoch complexity patterns
  if ((lowerProc.includes('mamma') && lowerProc.includes('bet')) ||
      lowerProc.includes('ureterorenoskopie') ||
      lowerProc.includes('tapp') ||
      lowerProc.includes('kniegelenk') ||
      lowerProc.includes('hüftgelenk') ||
      lowerProc.includes('wirbelsäule') ||
      lowerProc.includes('hysterektomie') ||
      lowerProc.includes('sectio') ||
      lowerProc.includes('tur-p') ||
      lowerProc.includes('nephrektomie')) {
    return 'Hoch';
  }
  
  // Niedrig complexity patterns
  if ((lowerProc.includes('exzision') && lowerProc.includes('lokal')) ||
      lowerProc.includes('kleine') ||
      lowerProc.includes('biopsie') ||
      lowerProc.includes('zyste') ||
      lowerProc.includes('hautläsion') ||
      lowerProc.includes('naht') ||
      lowerProc.includes('blepharoplastik') ||
      lowerProc.includes('port-implantation')) {
    return 'Niedrig';
  }
  
  // Mittel complexity (default and specific patterns)
  if (lowerProc.includes('dupuytren') ||
      lowerProc.includes('cholezystektomie') ||
      lowerProc.includes('arthroskopie') ||
      lowerProc.includes('appendektomie') ||
      lowerProc.includes('hernie') ||
      lowerProc.includes('gallenblase') ||
      lowerProc.includes('varizen') ||
      lowerProc.includes('liposuktion')) {
    return 'Mittel';
  }
  
  // Default to Mittel for unknown procedures
  return 'Mittel';
}

// Get required skills for German medical procedures
export function getRequiredSkillsForProcedure(procedureName: string): string[] {
  const lowerProc = procedureName.toLowerCase();
  const skills: string[] = ['Instrumentierung']; // Base skill
  
  // Department-specific skills
  if (lowerProc.includes('dupuytren') || lowerProc.includes('hand')) {
    skills.push('Handchirurgie', 'Mikrochirurgie');
  }
  
  if (lowerProc.includes('thyreoidektomie') || lowerProc.includes('schilddrüse')) {
    skills.push('Endokrine_Chirurgie');
  }
  
  if (lowerProc.includes('mamma') || lowerProc.includes('sentinel')) {
    skills.push('Gynäkologie', 'Onkologie');
  }
  
  if (lowerProc.includes('amputation') || lowerProc.includes('patchplastik')) {
    skills.push('Gefäßchirurgie');
  }
  
  if (lowerProc.includes('ureterorenoskopie') || lowerProc.includes('tur-p')) {
    skills.push('Urologie', 'Endoskopie');
  }
  
  if (lowerProc.includes('osteosynthese') || lowerProc.includes('metallentfernung')) {
    skills.push('Unfallchirurgie', 'Orthopädie');
  }
  
  if (lowerProc.includes('laparoskopie') || lowerProc.includes('tapp')) {
    skills.push('Laparoskopie');
  }
  
  if (lowerProc.includes('endoskopie')) {
    skills.push('Endoskopie');
  }
  
  return [...new Set(skills)]; // Remove duplicates
}

// Determine primary department for procedure
export function getDepartmentForProcedure(procedureName: string): Department | null {
  const lowerProc = procedureName.toLowerCase();
  
  // ACH patterns
  if (lowerProc.includes('thyreoidektomie') ||
      lowerProc.includes('cholezystektomie') ||
      lowerProc.includes('appendektomie') ||
      lowerProc.includes('hernie') ||
      lowerProc.includes('gallenblase')) {
    return 'ACH';
  }
  
  // GCH patterns
  if (lowerProc.includes('amputation') ||
      lowerProc.includes('patchplastik') ||
      lowerProc.includes('endarteriektomie') ||
      lowerProc.includes('gefäß') ||
      lowerProc.includes('varizen')) {
    return 'GCH';
  }
  
  // PCH patterns
  if (lowerProc.includes('dupuytren') ||
      lowerProc.includes('lappenplastik') ||
      lowerProc.includes('liposuktion') ||
      lowerProc.includes('blepharoplastik') ||
      lowerProc.includes('plastisch')) {
    return 'PCH';
  }
  
  // URO patterns
  if (lowerProc.includes('ureterorenoskopie') ||
      lowerProc.includes('tur-p') ||
      lowerProc.includes('nephrolithopaxie') ||
      lowerProc.includes('nieren') ||
      lowerProc.includes('blase')) {
    return 'URO';
  }
  
  // GYN patterns
  if (lowerProc.includes('mamma') ||
      lowerProc.includes('sentinel') ||
      lowerProc.includes('hysterektomie') ||
      lowerProc.includes('sectio') ||
      lowerProc.includes('gynäkolog')) {
    return 'GYN';
  }
  
  // UCH patterns
  if (lowerProc.includes('osteosynthese') ||
      lowerProc.includes('metallentfernung') ||
      lowerProc.includes('wirbelsäule') ||
      lowerProc.includes('fraktur') ||
      lowerProc.includes('unfall')) {
    return 'UCH';
  }
  
  return null; // Unknown department
}

// Get estimated duration for German procedures (in minutes)
export function getEstimatedDuration(
  procedureName: string, 
  complexity: OperationComplexity
): number {
  const lowerProc = procedureName.toLowerCase();
  
  // Base duration by complexity
  const baseDurations: Record<OperationComplexity, number> = {
    'Sehr Hoch': 240, // 4 hours
    'Hoch': 150,      // 2.5 hours  
    'Mittel': 90,     // 1.5 hours
    'Niedrig': 45     // 45 minutes
  };
  
  let duration = baseDurations[complexity];
  
  // Procedure-specific adjustments
  if (lowerProc.includes('mikrochirurgie') || lowerProc.includes('dupuytren')) {
    duration += 30; // Complex hand surgery
  }
  
  if (lowerProc.includes('endoskopie') || lowerProc.includes('arthroskopie')) {
    duration -= 15; // Minimally invasive
  }
  
  if (lowerProc.includes('laparoskopie') || lowerProc.includes('tapp')) {
    duration -= 20; // Laparoscopic approach
  }
  
  if (lowerProc.includes('revision') || lowerProc.includes('komplex')) {
    duration += 45; // Revision surgery
  }
  
  if (lowerProc.includes('amputation') && lowerProc.includes('major')) {
    duration += 60; // Major amputation
  }
  
  return Math.max(30, duration); // Minimum 30 minutes
}

// German department names mapping
export const GERMAN_DEPARTMENT_NAMES: Record<Department, string> = {
  ACH: 'Allgemeinchirurgie',
  GCH: 'Gefäßchirurgie',
  PCH: 'Plastische Chirurgie',
  URO: 'Urologie',
  GYN: 'Gynäkologie',
  UCH: 'Unfallchirurgie'
};

// German complexity names
export const GERMAN_COMPLEXITY_NAMES: Record<OperationComplexity, string> = {
  'Sehr Hoch': 'Sehr hohe Komplexität',
  'Hoch': 'Hohe Komplexität',
  'Mittel': 'Mittlere Komplexität',
  'Niedrig': 'Niedrige Komplexität'
};

// Staffing requirements by complexity
export const STAFFING_REQUIREMENTS: Record<OperationComplexity, {
  minStaff: number;
  experienceLevel: string;
  specialistRequired: boolean;
  description: string;
}> = {
  'Sehr Hoch': {
    minStaff: 2,
    experienceLevel: 'Senior+',
    specialistRequired: true,
    description: 'Mindestens 2 erfahrene Spezialisten erforderlich'
  },
  'Hoch': {
    minStaff: 2,
    experienceLevel: 'Standard+',
    specialistRequired: true,
    description: 'Mindestens 2 qualifizierte Fachkräfte, 1 Spezialist'
  },
  'Mittel': {
    minStaff: 2,
    experienceLevel: 'Standard',
    specialistRequired: false,
    description: '2 Fachkräfte mit Standardqualifikation'
  },
  'Niedrig': {
    minStaff: 1,
    experienceLevel: 'Junior+',
    specialistRequired: false,
    description: '1-2 Fachkräfte, Springer möglich'
  }
};
