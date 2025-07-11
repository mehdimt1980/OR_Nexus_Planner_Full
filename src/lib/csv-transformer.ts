import type { 
  OperationAssignment, 
  OperationComplexity, 
  AssignmentStatus,
  OperatingRoomName,
  Department 
} from './or-planner-types';
import { OPERATING_ROOMS } from './or-planner-types';
import type { ValidationError } from './csv-validation';

export interface TransformationResult {
  operations: OperationAssignment[];
  errors: ValidationError[];
  warnings: ValidationError[];
  statistics: {
    totalRows: number;
    successfulTransformations: number;
    failedTransformations: number;
    skippedRows: number;
  };
}

export interface TransformationProgress {
  currentRow: number;
  totalRows: number;
  phase: 'parsing' | 'validating' | 'transforming' | 'complete';
  message: string;
}

// German status to internal status mapping
const GERMAN_STATUS_MAPPING: Record<string, AssignmentStatus> = {
  'OP geplant': 'planned',
  'OP abgeschlossen': 'completed',
  'OP-Protokoll nicht abgeschlossen': 'protocol_incomplete',
  'OP läuft': 'in_progress',
  'OP verspätet': 'planned', // Treat delayed as planned
  'OP abgesagt': 'empty', // Treat cancelled as empty
  'OP verschoben': 'planned', // Treat postponed as planned
};

// German procedure complexity mapping
const GERMAN_COMPLEXITY_KEYWORDS: Record<OperationComplexity, string[]> = {
  'Sehr Hoch': [
    'osteosynthese',
    'instrumentierung', 
    'thyreoidektomie',
    'wirbelsäule',
    'neurochirurg',
    'herzklappen',
    'bypass',
    'transplantation',
    'tumor groß',
    'resektion groß'
  ],
  'Hoch': [
    'cholezystektomie',
    'hernie',
    'mamma',
    'nephrolithopaxie',
    'laparoskop',
    'endoskop',
    'tep',
    'arthros',
    'tumor',
    'resektion',
    'hysterektomie',
    'sectio risiko',
    'tur-p',
    'nephrektomie'
  ],
  'Mittel': [
    'exzision',
    'lappenplastik',
    'metallentfernung',
    'appendektomie',
    'hernien',
    'gallenblas',
    'sectio',
    'hysteroskopie',
    'arthroskopie',
    'meniskus'
  ],
  'Niedrig': [
    'bet',
    'tumor kopf',
    'varizen',
    'lipom',
    'atherom',
    'zyste klein',
    'naevus',
    'fibrom',
    'exzision klein'
  ]
};

// Standard operation durations in minutes
const GERMAN_PROCEDURE_DURATIONS: Record<string, number> = {
  // UCH procedures
  'hüft-tep': 180,
  'knie-tep': 150,
  'knie-arthroskopie': 90,
  'meniskus': 60,
  'kreuzband': 120,
  'schulter-arthroskopie': 90,
  'osteosynthese': 120,
  'metallentfernung': 45,
  'wirbelsäule': 240,
  
  // ACH procedures
  'cholezystektomie': 120,
  'appendektomie': 90,
  'hernioplastik': 90,
  'sigmaresektion': 180,
  'hemikolektomie': 210,
  'gallenblasen': 120,
  
  // GYN procedures
  'hysterektomie': 150,
  'sectio': 45,
  'laparoskopie gyn': 90,
  'hysteroskopie': 30,
  'ovarial': 120,
  
  // URO procedures
  'tur-p': 90,
  'nephrektomie': 180,
  'ureteroskopie': 90,
  'nephrolithopaxie': 120,
  'zystoskopie': 30,
  
  // PCH procedures
  'mammareduktion': 180,
  'liposuktion': 120,
  'abdominoplastik': 240,
  'facelift': 180,
  'lipom': 30,
  
  // GCH procedures
  'varizen': 60,
  'av-fistel': 90,
  'bypass': 240,
  'angioplastie': 120,
};

/**
 * Main transformation function from CSV to OperationAssignment objects
 */
export function transformCSVToOperations(
  csvData: any[],
  progressCallback?: (progress: TransformationProgress) => void
): TransformationResult {
  const operations: OperationAssignment[] = [];
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  let successfulTransformations = 0;
  let failedTransformations = 0;
  let skippedRows = 0;

  // Progress tracking
  const updateProgress = (phase: TransformationProgress['phase'], currentRow: number, message: string) => {
    if (progressCallback) {
      progressCallback({
        currentRow,
        totalRows: csvData.length,
        phase,
        message
      });
    }
  };

  updateProgress('parsing', 0, 'Starte CSV-Transformation...');

  csvData.forEach((row, index) => {
    updateProgress('transforming', index + 1, `Verarbeite Zeile ${index + 1}: ${row.Eingriff || 'Unbekannter Eingriff'}`);

    try {
      // Skip empty rows
      if (!row || Object.keys(row).length === 0) {
        skippedRows++;
        return;
      }

      // Skip rows without essential data
      if (!row.Datum || !row.Zeit || !row.Eingriff) {
        skippedRows++;
        warnings.push({
          code: 'SKIPPED_INCOMPLETE_ROW',
          messageDE: `Zeile ${index + 1} übersprungen: Fehlende Grunddaten (Datum, Zeit oder Eingriff)`,
          messageEN: `Row ${index + 1} skipped: Missing essential data (Date, Time or Procedure)`,
          severity: 'warning',
          rowIndex: index
        });
        return;
      }

      const transformedOperation = transformSingleRow(row, index);
      
      if (transformedOperation.operation) {
        operations.push(transformedOperation.operation);
        successfulTransformations++;
      } else {
        failedTransformations++;
      }

      errors.push(...transformedOperation.errors);
      warnings.push(...transformedOperation.warnings);

    } catch (error) {
      failedTransformations++;
      errors.push({
        code: 'TRANSFORMATION_ERROR',
        messageDE: `Fehler bei der Transformation von Zeile ${index + 1}: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
        messageEN: `Error transforming row ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
        rowIndex: index
      });
    }
  });

  updateProgress('complete', csvData.length, `Transformation abgeschlossen: ${successfulTransformations} erfolgreich, ${failedTransformations} Fehler`);

  return {
    operations,
    errors,
    warnings,
    statistics: {
      totalRows: csvData.length,
      successfulTransformations,
      failedTransformations,
      skippedRows
    }
  };
}

/**
 * Transform a single CSV row to OperationAssignment
 */
function transformSingleRow(row: any, rowIndex: number): {
  operation: OperationAssignment | null;
  errors: ValidationError[];
  warnings: ValidationError[];
} {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  try {
    // Parse and validate room
    const roomResult = parseRoom(row['OP-Saal'], rowIndex);
    if (roomResult.error) {
      errors.push(roomResult.error);
      return { operation: null, errors, warnings };
    }

    // Parse and validate department
    const department = row['OP-Orgaeinheit'] as Department;
    if (!department) {
      errors.push({
        code: 'MISSING_DEPARTMENT',
        messageDE: `Zeile ${rowIndex + 1}: OP-Orgaeinheit fehlt`,
        messageEN: `Row ${rowIndex + 1}: Department missing`,
        severity: 'error',
        rowIndex
      });
      return { operation: null, errors, warnings };
    }

    // Parse date
    const dateResult = parseGermanDate(row.Datum, rowIndex);
    if (dateResult.error) {
      errors.push(dateResult.error);
      return { operation: null, errors, warnings };
    }

    // Parse time
    const timeResult = parseGermanTime(row.Zeit, rowIndex);
    if (timeResult.error) {
      errors.push(timeResult.error);
      return { operation: null, errors, warnings };
    }

    // Infer complexity
    const complexity = inferComplexityFromProcedure(row.Eingriff);
    
    // Estimate duration
    const estimatedDuration = estimateProcedureDuration(row.Eingriff);
    
    // Map status
    const status = mapRealStatusToInternal(row['OP-Status'] || 'OP geplant');

    // Create operation
    const operation: OperationAssignment = {
      id: `${roomResult.room}-${dateResult.date}-${timeResult.time}-${rowIndex}`,
      room: roomResult.room!,
      department,
      scheduledDate: dateResult.date!,
      scheduledTime: timeResult.time!,
      procedureName: row.Eingriff.trim(),
      primarySurgeon: row['1.Operateur']?.trim() || undefined,
      complexity,
      estimatedDuration,
      assignedStaff: [],
      gptSuggestedStaff: [],
      status,
      notes: row.Anmerkung?.trim() || undefined,
      shift: mapTimeToShift(timeResult.time!)
    };

    // Add warnings for unusual values
    if (estimatedDuration > 360) {
      warnings.push({
        code: 'LONG_PROCEDURE',
        messageDE: `Zeile ${rowIndex + 1}: Ungewöhnlich lange Operation (${estimatedDuration} min): ${row.Eingriff}`,
        messageEN: `Row ${rowIndex + 1}: Unusually long operation (${estimatedDuration} min): ${row.Eingriff}`,
        severity: 'warning',
        rowIndex
      });
    }

    const [hours] = timeResult.time!.split(':').map(Number);
    if (hours < 6 || hours > 20) {
      warnings.push({
        code: 'UNUSUAL_TIME',
        messageDE: `Zeile ${rowIndex + 1}: Operation außerhalb der üblichen Zeiten: ${timeResult.time}`,
        messageEN: `Row ${rowIndex + 1}: Operation outside usual hours: ${timeResult.time}`,
        severity: 'warning',
        rowIndex
      });
    }

    return { operation, errors, warnings };

  } catch (error) {
    errors.push({
      code: 'ROW_TRANSFORMATION_ERROR',
      messageDE: `Zeile ${rowIndex + 1}: Unerwarteter Fehler bei der Transformation`,
      messageEN: `Row ${rowIndex + 1}: Unexpected transformation error`,
      severity: 'error',
      rowIndex
    });
    return { operation: null, errors, warnings };
  }
}

/**
 * Maps German OP status to internal status
 */
export function mapRealStatusToInternal(germanStatus: string): AssignmentStatus {
  const normalizedStatus = germanStatus.trim();
  return GERMAN_STATUS_MAPPING[normalizedStatus] || 'planned';
}

/**
 * Parses German time format (HH:MM or H:MM)
 */
export function parseGermanTime(timeStr: string, rowIndex?: number): {
  time: string | null;
  error: ValidationError | null;
} {
  if (!timeStr) {
    return {
      time: null,
      error: {
        code: 'MISSING_TIME',
        messageDE: 'Zeit fehlt',
        messageEN: 'Time missing',
        severity: 'error',
        rowIndex
      }
    };
  }

  const trimmed = timeStr.trim();
  
  // Handle various German time formats
  const timeMatch = trimmed.match(/^(\d{1,2})[:.](\d{2})$/);
  if (!timeMatch) {
    return {
      time: null,
      error: {
        code: 'INVALID_TIME_FORMAT',
        messageDE: `Ungültiges Zeitformat: '${trimmed}'. Erwartet: HH:MM oder H:MM`,
        messageEN: `Invalid time format: '${trimmed}'. Expected: HH:MM or H:MM`,
        severity: 'error',
        rowIndex,
        value: trimmed
      }
    };
  }

  const hours = parseInt(timeMatch[1], 10);
  const minutes = parseInt(timeMatch[2], 10);

  if (hours > 23 || minutes > 59) {
    return {
      time: null,
      error: {
        code: 'INVALID_TIME_VALUE',
        messageDE: `Ungültige Zeit: ${hours}:${minutes}. Stunden müssen 0-23, Minuten 0-59 sein`,
        messageEN: `Invalid time: ${hours}:${minutes}. Hours must be 0-23, minutes 0-59`,
        severity: 'error',
        rowIndex,
        value: trimmed
      }
    };
  }

  // Format to HH:MM
  const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  return { time: formattedTime, error: null };
}

/**
 * Parses German date format (DD.MM.YYYY or YYYY-MM-DD)
 */
function parseGermanDate(dateStr: string, rowIndex?: number): {
  date: string | null;
  error: ValidationError | null;
} {
  if (!dateStr) {
    return {
      date: null,
      error: {
        code: 'MISSING_DATE',
        messageDE: 'Datum fehlt',
        messageEN: 'Date missing',
        severity: 'error',
        rowIndex
      }
    };
  }

  const trimmed = dateStr.trim();
  
  // Try DD.MM.YYYY format
  const germanDateMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (germanDateMatch) {
    const day = parseInt(germanDateMatch[1], 10);
    const month = parseInt(germanDateMatch[2], 10);
    const year = parseInt(germanDateMatch[3], 10);
    
    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 2020 || year > 2030) {
      return {
        date: null,
        error: {
          code: 'INVALID_DATE_VALUE',
          messageDE: `Ungültiges Datum: ${trimmed}`,
          messageEN: `Invalid date: ${trimmed}`,
          severity: 'error',
          rowIndex,
          value: trimmed
        }
      };
    }
    
    // Convert to ISO format YYYY-MM-DD
    const isoDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    return { date: isoDate, error: null };
  }
  
  // Try YYYY-MM-DD format
  const isoDateMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoDateMatch) {
    return { date: trimmed, error: null };
  }
  
  return {
    date: null,
    error: {
      code: 'INVALID_DATE_FORMAT',
      messageDE: `Ungültiges Datumsformat: '${trimmed}'. Erwartet: DD.MM.YYYY oder YYYY-MM-DD`,
      messageEN: `Invalid date format: '${trimmed}'. Expected: DD.MM.YYYY or YYYY-MM-DD`,
      severity: 'error',
      rowIndex,
      value: trimmed
    }
  };
}

/**
 * Parses room format and validates
 */
function parseRoom(roomStr: string, rowIndex?: number): {
  room: OperatingRoomName | null;
  error: ValidationError | null;
} {
  if (!roomStr) {
    return {
      room: null,
      error: {
        code: 'MISSING_ROOM',
        messageDE: 'OP-Saal fehlt',
        messageEN: 'Room missing',
        severity: 'error',
        rowIndex
      }
    };
  }

  const trimmed = roomStr.trim();
  const roomMatch = trimmed.match(/^SAAL\s*(\d+)$/i);
  
  if (!roomMatch) {
    return {
      room: null,
      error: {
        code: 'INVALID_ROOM_FORMAT',
        messageDE: `Ungültiges Saal-Format: '${trimmed}'. Erwartet: SAAL 1, SAAL 2, etc.`,
        messageEN: `Invalid room format: '${trimmed}'. Expected: SAAL 1, SAAL 2, etc.`,
        severity: 'error',
        rowIndex,
        value: trimmed
      }
    };
  }

  const roomNumber = roomMatch[1];
  const standardizedRoom = `SAAL ${roomNumber}` as OperatingRoomName;
  
  if (!OPERATING_ROOMS.includes(standardizedRoom)) {
    return {
      room: null,
      error: {
        code: 'UNKNOWN_ROOM',
        messageDE: `Unbekannter Saal: ${standardizedRoom}. Verfügbare Säle: ${OPERATING_ROOMS.join(', ')}`,
        messageEN: `Unknown room: ${standardizedRoom}. Available rooms: ${OPERATING_ROOMS.join(', ')}`,
        severity: 'error',
        rowIndex,
        value: trimmed
      }
    };
  }

  return { room: standardizedRoom, error: null };
}

/**
 * Infers operation complexity from German procedure name
 */
export function inferComplexityFromProcedure(procedureName: string): OperationComplexity {
  if (!procedureName) return 'Mittel';
  
  const normalizedProcedure = procedureName.toLowerCase().trim();
  
  // Check each complexity level
  for (const [complexity, keywords] of Object.entries(GERMAN_COMPLEXITY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (normalizedProcedure.includes(keyword)) {
        return complexity as OperationComplexity;
      }
    }
  }
  
  // Default complexity
  return 'Mittel';
}

/**
 * Estimates procedure duration based on German procedure name
 */
function estimateProcedureDuration(procedureName: string): number {
  if (!procedureName) return 90; // Default 90 minutes
  
  const normalizedProcedure = procedureName.toLowerCase().trim();
  
  // Check for specific procedures
  for (const [procedure, duration] of Object.entries(GERMAN_PROCEDURE_DURATIONS)) {
    if (normalizedProcedure.includes(procedure)) {
      return duration;
    }
  }
  
  // Estimate based on complexity
  const complexity = inferComplexityFromProcedure(procedureName);
  switch (complexity) {
    case 'Sehr Hoch': return 240;
    case 'Hoch': return 150;
    case 'Mittel': return 90;
    case 'Niedrig': return 45;
    default: return 90;
  }
}

/**
 * Maps time to shift for backward compatibility
 */
function mapTimeToShift(timeStr: string): 'BD1' | 'BD2' | 'BD3' | 'RD' {
  const [hours] = timeStr.split(':').map(Number);
  if (hours >= 6 && hours < 12) return 'BD1';
  if (hours >= 12 && hours < 16) return 'BD2';
  if (hours >= 16 && hours < 20) return 'BD3';
  return 'RD';
}

/**
 * Validates that the transformation was successful
 */
export function validateTransformationResult(result: TransformationResult): {
  isValid: boolean;
  criticalErrors: ValidationError[];
  summary: string;
} {
  const criticalErrors = result.errors.filter(e => e.severity === 'error');
  const hasHighErrorRate = (result.statistics.failedTransformations / result.statistics.totalRows) > 0.3;
  
  let summary = `Transformation: ${result.statistics.successfulTransformations}/${result.statistics.totalRows} erfolgreich`;
  if (criticalErrors.length > 0) {
    summary += `, ${criticalErrors.length} kritische Fehler`;
  }
  if (result.warnings.length > 0) {
    summary += `, ${result.warnings.length} Warnungen`;
  }

  return {
    isValid: criticalErrors.length === 0 && !hasHighErrorRate,
    criticalErrors,
    summary
  };
}
