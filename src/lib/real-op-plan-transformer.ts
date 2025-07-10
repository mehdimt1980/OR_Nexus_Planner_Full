// src/lib/real-op-plan-transformer.ts

import type { RealOPPlanRow, ImportedOperation, COMPLEXITY_KEYWORDS, REAL_STATUS_MAPPING } from './real-op-plan-types';
import type { OperationComplexity, AssignmentStatus, OperatingRoomName } from './or-planner-types';
import { ROOM_DEPARTMENT_MAPPING, DEPARTMENT_SPECIALIZATIONS } from './or-planner-types';

const COMPLEXITY_KEYWORDS_MAP = {
  'Sehr Hoch': ['Osteosynthese', 'Instrumentierung', 'Thyreoidektomie', 'Acetabulumfraktur', 'Nephrektomie'],
  'Hoch': ['Cholezystektomie', 'Hernie', 'Mamma', 'Nephrolithopaxie', 'TAPP', 'TEPP', 'Prostataenukleation'],
  'Mittel': ['Exzision', 'Lappenplastik', 'Metallentfernung', 'Laparoskopie', 'Kontraktur', 'Patchplastik'],
  'Niedrig': ['BET', 'Tumor Kopf', 'Dupuytren']
} as const;

const STATUS_MAPPING: Record<string, AssignmentStatus> = {
  'OP geplant': 'empty',
  'OP-Protokoll nicht abgeschlossen': 'pending_gpt',
  'OP abgeschlossen': 'final_approved'
};

function inferComplexityFromProcedure(procedure: string): OperationComplexity {
  const cleanProcedure = procedure.toLowerCase();
  
  for (const [complexity, keywords] of Object.entries(COMPLEXITY_KEYWORDS_MAP)) {
    if (keywords.some(keyword => cleanProcedure.includes(keyword.toLowerCase()))) {
      return complexity as OperationComplexity;
    }
  }
  
  // Additional heuristics
  if (cleanProcedure.includes('minimalinvasiv') || cleanProcedure.includes('laparoskop')) {
    return 'Hoch';
  }
  if (cleanProcedure.includes('amputation') || cleanProcedure.includes('major')) {
    return 'Sehr Hoch';
  }
  if (cleanProcedure.includes('exzision') || cleanProcedure.includes('entfernung')) {
    return 'Mittel';
  }
  
  return 'Mittel'; // Default
}

function estimateDurationFromComplexity(complexity: OperationComplexity, procedure: string): number {
  const baseDurations = {
    'Sehr Hoch': 180, // 3 hours
    'Hoch': 120,      // 2 hours
    'Mittel': 90,     // 1.5 hours
    'Niedrig': 60     // 1 hour
  };
  
  let duration = baseDurations[complexity];
  
  // Procedure-specific adjustments
  const lowerProcedure = procedure.toLowerCase();
  
  if (lowerProcedure.includes('laparoskop') || lowerProcedure.includes('minimalinvasiv')) {
    duration += 30; // Minimally invasive takes longer
  }
  if (lowerProcedure.includes('tumor') || lowerProcedure.includes('mamma')) {
    duration += 20; // Cancer procedures take longer
  }
  if (lowerProcedure.includes('metallentfernung') || lowerProcedure.includes('exzision')) {
    duration -= 20; // Simple procedures are faster
  }
  
  return Math.max(30, duration); // Minimum 30 minutes
}

function mapStatusToInternal(opStatus: string): AssignmentStatus {
  return STATUS_MAPPING[opStatus] || 'empty';
}

function cleanSurgeonName(surgeon: string): string {
  if (!surgeon) return 'Unbekannt';
  
  // Remove extra quotes and clean up
  return surgeon.replace(/^"|"$/g, '').trim();
}

function validateRoomName(roomName: string): OperatingRoomName {
  // Ensure the room name is a valid OperatingRoomName
  const validRooms: OperatingRoomName[] = [
    'UCH', 'EPZ/HNO', 'ACH', 'GYN', 'GCH', 'URO', 'DaVinci', 'PCH',
    'SAAL 1', 'SAAL 2', 'SAAL 3', 'SAAL 4', 'SAAL 5', 'SAAL 6', 'SAAL 7', 'SAAL 8'
  ];
  
  if (validRooms.includes(roomName as OperatingRoomName)) {
    return roomName as OperatingRoomName;
  }
  
  // Try to map similar room names
  const upperRoom = roomName.toUpperCase();
  if (upperRoom.includes('SAAL')) {
    const match = upperRoom.match(/SAAL\s*(\d+)/);
    if (match) {
      const saalName = `SAAL ${match[1]}` as OperatingRoomName;
      if (validRooms.includes(saalName)) {
        return saalName;
      }
    }
  }
  
  // Default to first available room if no match
  console.warn(`Room name "${roomName}" not recognized, using SAAL 1`);
  return 'SAAL 1';
}

export function transformRealOPData(csvRow: RealOPPlanRow, index: number): ImportedOperation {
  // Validate required fields
  if (!csvRow.Zeit) {
    throw new Error(`Keine Zeit angegeben`);
  }
  if (!csvRow['OP-Saal']) {
    throw new Error(`Kein OP-Saal angegeben`);
  }
  if (!csvRow.Eingriff) {
    throw new Error(`Kein Eingriff angegeben`);
  }
  if (!csvRow['OP-Orgaeinheit']) {
    throw new Error(`Keine OP-Orgaeinheit angegeben`);
  }

  const validatedRoom = validateRoomName(csvRow['OP-Saal']);
  const complexity = inferComplexityFromProcedure(csvRow.Eingriff);
  const estimatedDuration = estimateDurationFromComplexity(complexity, csvRow.Eingriff);
  
  // Get department from room mapping or use the provided department
  const mappedDepartment = ROOM_DEPARTMENT_MAPPING[validatedRoom];
  const finalDepartment = mappedDepartment || csvRow['OP-Orgaeinheit'];
  
  const operation: ImportedOperation = {
    id: `${validatedRoom}-${csvRow.Zeit.replace(':', '')}-${index}`,
    room: validatedRoom,
    scheduledTime: csvRow.Zeit,
    procedureName: csvRow.Eingriff,
    department: finalDepartment,
    primarySurgeon: cleanSurgeonName(csvRow['1.Operateur']),
    complexity,
    assignedStaff: [], // Will be populated by AI
    status: mapStatusToInternal(csvRow['OP-Status']),
    notes: csvRow.Anmerkung || '',
    patientCase: csvRow.Fallnummer || '',
    estimatedDuration,
    rawData: csvRow
  };

  return operation;
}

export function validateCSVStructure(data: any[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data || data.length === 0) {
    errors.push('CSV-Datei ist leer');
    return { isValid: false, errors };
  }

  const requiredFields = ['Zeit', 'OP-Saal', 'Eingriff', 'OP-Orgaeinheit'];
  const firstRow = data[0];
  
  for (const field of requiredFields) {
    if (!(field in firstRow)) {
      errors.push(`Erforderliches Feld fehlt: ${field}`);
    }
  }

  // Check for valid time format in sample rows
  const sampleRows = data.slice(0, Math.min(5, data.length));
  for (let i = 0; i < sampleRows.length; i++) {
    const row = sampleRows[i];
    if (row.Zeit && !/^\d{2}:\d{2}$/.test(row.Zeit)) {
      errors.push(`Ungültiges Zeitformat in Zeile ${i + 1}: ${row.Zeit} (erwartet: HH:MM)`);
    }
  }

  return { isValid: errors.length === 0, errors };
}

// Helper function to get unique rooms and departments from imported data
export function extractMetadataFromImport(operations: ImportedOperation[]) {
  const rooms = [...new Set(operations.map(op => op.room))].sort();
  const departments = [...new Set(operations.map(op => op.department))].sort();
  const timeSlots = [...new Set(operations.map(op => op.scheduledTime))].sort();
  
  return { rooms, departments, timeSlots };
}

// Helper function to detect time conflicts in operations
export function detectTimeConflicts(operations: ImportedOperation[]): Array<{room: string, conflicts: Array<{op1: ImportedOperation, op2: ImportedOperation}>}> {
  const conflicts: Array<{room: string, conflicts: Array<{op1: ImportedOperation, op2: ImportedOperation}>}> = [];
  
  // Group by room
  const roomGroups = operations.reduce((groups, op) => {
    if (!groups[op.room]) groups[op.room] = [];
    groups[op.room].push(op);
    return groups;
  }, {} as Record<string, ImportedOperation[]>);
  
  Object.entries(roomGroups).forEach(([room, roomOps]) => {
    const roomConflicts: Array<{op1: ImportedOperation, op2: ImportedOperation}> = [];
    
    for (let i = 0; i < roomOps.length - 1; i++) {
      for (let j = i + 1; j < roomOps.length; j++) {
        const op1 = roomOps[i];
        const op2 = roomOps[j];
        
        if (op1.scheduledTime && op2.scheduledTime) {
          const op1Start = timeToMinutes(op1.scheduledTime);
          const op1End = op1Start + (op1.estimatedDuration || 60);
          const op2Start = timeToMinutes(op2.scheduledTime);
          const op2End = op2Start + (op2.estimatedDuration || 60);
          
          // Check for overlap
          if (!(op1End <= op2Start || op2End <= op1Start)) {
            roomConflicts.push({ op1, op2 });
          }
        }
      }
    }
    
    if (roomConflicts.length > 0) {
      conflicts.push({ room, conflicts: roomConflicts });
    }
  });
  
  return conflicts;
}

function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}
