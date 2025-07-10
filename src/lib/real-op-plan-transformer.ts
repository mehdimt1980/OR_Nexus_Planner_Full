// src/lib/real-op-plan-transformer.ts

import type { RealOPPlanRow, ImportedOperation, COMPLEXITY_KEYWORDS, REAL_STATUS_MAPPING } from './real-op-plan-types';
import type { OperationComplexity, AssignmentStatus } from './or-planner-types';

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

  const complexity = inferComplexityFromProcedure(csvRow.Eingriff);
  const estimatedDuration = estimateDurationFromComplexity(complexity, csvRow.Eingriff);
  
  const operation: ImportedOperation = {
    id: `${csvRow['OP-Saal']}-${csvRow.Zeit.replace(':', '')}-${index}`,
    room: csvRow['OP-Saal'],
    scheduledTime: csvRow.Zeit,
    procedureName: csvRow.Eingriff,
    department: csvRow['OP-Orgaeinheit'],
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
