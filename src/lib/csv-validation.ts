import type { OperationAssignment, Department, OperatingRoomName } from './or-planner-types';
import { OPERATING_ROOMS, DEPARTMENTS } from './or-planner-types';

export interface ValidationError {
  code: string;
  messageDE: string;
  messageEN: string;
  severity: 'error' | 'warning' | 'info';
  rowIndex?: number;
  field?: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  summary: {
    totalRows: number;
    validRows: number;
    errorRows: number;
    warningRows: number;
  };
}

export interface ConflictDetails {
  type: 'time_overlap' | 'room_double_booking' | 'staff_conflict';
  room: string;
  timeSlot: string;
  conflictingOperations: OperationAssignment[];
  severity: 'high' | 'medium' | 'low';
}

// Required CSV fields for German hospital data
const REQUIRED_CSV_FIELDS = [
  'Datum',
  'Zeit', 
  'Eingriff',
  'OP-Orgaeinheit',
  'OP-Saal'
];

const OPTIONAL_CSV_FIELDS = [
  '1.Operateur',
  'OP-Status',
  'Anmerkung'
];

// German time format validation
const GERMAN_TIME_REGEX = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
const GERMAN_DATE_REGEX = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$|^\d{4}-\d{2}-\d{2}$/;

// Valid German OP statuses
const VALID_GERMAN_STATUSES = [
  'OP geplant',
  'OP abgeschlossen', 
  'OP-Protokoll nicht abgeschlossen',
  'OP läuft',
  'OP verspätet',
  'OP abgesagt'
];

/**
 * Validates the basic structure of CSV data
 */
export function validateCSVStructure(data: any[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Check if data exists
  if (!data || data.length === 0) {
    errors.push({
      code: 'CSV_EMPTY',
      messageDE: 'CSV-Datei ist leer oder enthält keine Daten',
      messageEN: 'CSV file is empty or contains no data',
      severity: 'error'
    });
    return {
      isValid: false,
      errors,
      warnings,
      summary: { totalRows: 0, validRows: 0, errorRows: 0, warningRows: 0 }
    };
  }

  // Check if first row has headers
  const firstRow = data[0];
  if (!firstRow || typeof firstRow !== 'object') {
    errors.push({
      code: 'INVALID_FORMAT',
      messageDE: 'Ungültiges CSV-Format. Erste Zeile sollte Spaltenüberschriften enthalten',
      messageEN: 'Invalid CSV format. First row should contain column headers',
      severity: 'error'
    });
    return {
      isValid: false,
      errors,
      warnings,
      summary: { totalRows: data.length, validRows: 0, errorRows: data.length, warningRows: 0 }
    };
  }

  // Check for required fields
  const availableFields = Object.keys(firstRow);
  const missingFields = REQUIRED_CSV_FIELDS.filter(field => !availableFields.includes(field));
  
  if (missingFields.length > 0) {
    errors.push({
      code: 'MISSING_REQUIRED_FIELDS',
      messageDE: `Fehlende Pflichtfelder: ${missingFields.join(', ')}`,
      messageEN: `Missing required fields: ${missingFields.join(', ')}`,
      severity: 'error',
      value: missingFields
    });
  }

  // Check for unexpected fields (warnings)
  const expectedFields = [...REQUIRED_CSV_FIELDS, ...OPTIONAL_CSV_FIELDS];
  const unexpectedFields = availableFields.filter(field => !expectedFields.includes(field));
  
  if (unexpectedFields.length > 0) {
    warnings.push({
      code: 'UNEXPECTED_FIELDS',
      messageDE: `Unerwartete Felder gefunden: ${unexpectedFields.join(', ')}`,
      messageEN: `Unexpected fields found: ${unexpectedFields.join(', ')}`,
      severity: 'warning',
      value: unexpectedFields
    });
  }

  // Validate each row
  let validRows = 0;
  let errorRows = 0;
  let warningRows = 0;

  data.forEach((row, index) => {
    const rowErrors = validateRowStructure(row, index);
    const hasErrors = rowErrors.some(e => e.severity === 'error');
    const hasWarnings = rowErrors.some(e => e.severity === 'warning');

    if (hasErrors) {
      errorRows++;
    } else if (hasWarnings) {
      warningRows++;
    } else {
      validRows++;
    }

    errors.push(...rowErrors.filter(e => e.severity === 'error'));
    warnings.push(...rowErrors.filter(e => e.severity === 'warning'));
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary: {
      totalRows: data.length,
      validRows,
      errorRows,
      warningRows
    }
  };
}

/**
 * Validates individual row structure
 */
function validateRowStructure(row: any, rowIndex: number): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check required fields are not empty
  REQUIRED_CSV_FIELDS.forEach(field => {
    if (!row[field] || String(row[field]).trim() === '') {
      errors.push({
        code: 'EMPTY_REQUIRED_FIELD',
        messageDE: `Pflichtfeld '${field}' ist leer`,
        messageEN: `Required field '${field}' is empty`,
        severity: 'error',
        rowIndex,
        field,
        value: row[field]
      });
    }
  });

  // Validate German time format
  if (row.Zeit && !GERMAN_TIME_REGEX.test(row.Zeit)) {
    errors.push({
      code: 'INVALID_TIME_FORMAT',
      messageDE: `Ungültiges Zeitformat '${row.Zeit}'. Erwartet: HH:MM (z.B. 08:30)`,
      messageEN: `Invalid time format '${row.Zeit}'. Expected: HH:MM (e.g. 08:30)`,
      severity: 'error',
      rowIndex,
      field: 'Zeit',
      value: row.Zeit
    });
  }

  // Validate German date format
  if (row.Datum && !GERMAN_DATE_REGEX.test(row.Datum)) {
    errors.push({
      code: 'INVALID_DATE_FORMAT',
      messageDE: `Ungültiges Datumsformat '${row.Datum}'. Erwartet: DD.MM.YYYY oder YYYY-MM-DD`,
      messageEN: `Invalid date format '${row.Datum}'. Expected: DD.MM.YYYY or YYYY-MM-DD`,
      severity: 'error',
      rowIndex,
      field: 'Datum',
      value: row.Datum
    });
  }

  // Validate department code
  if (row['OP-Orgaeinheit'] && !DEPARTMENTS.includes(row['OP-Orgaeinheit'] as Department)) {
    errors.push({
      code: 'INVALID_DEPARTMENT',
      messageDE: `Unbekannte Orgaeinheit '${row['OP-Orgaeinheit']}'. Gültige Werte: ${DEPARTMENTS.join(', ')}`,
      messageEN: `Unknown department '${row['OP-Orgaeinheit']}'. Valid values: ${DEPARTMENTS.join(', ')}`,
      severity: 'error',
      rowIndex,
      field: 'OP-Orgaeinheit',
      value: row['OP-Orgaeinheit']
    });
  }

  // Validate room format
  if (row['OP-Saal'] && !row['OP-Saal'].match(/^SAAL \d+$/i)) {
    errors.push({
      code: 'INVALID_ROOM_FORMAT',
      messageDE: `Ungültiges Saal-Format '${row['OP-Saal']}'. Erwartet: SAAL 1, SAAL 2, etc.`,
      messageEN: `Invalid room format '${row['OP-Saal']}'. Expected: SAAL 1, SAAL 2, etc.`,
      severity: 'error',
      rowIndex,
      field: 'OP-Saal',
      value: row['OP-Saal']
    });
  }

  // Validate OP status if provided
  if (row['OP-Status'] && !VALID_GERMAN_STATUSES.includes(row['OP-Status'])) {
    errors.push({
      code: 'INVALID_STATUS',
      messageDE: `Unbekannter OP-Status '${row['OP-Status']}'. Gültige Werte: ${VALID_GERMAN_STATUSES.join(', ')}`,
      messageEN: `Unknown OP status '${row['OP-Status']}'. Valid values: ${VALID_GERMAN_STATUSES.join(', ')}`,
      severity: 'warning',
      rowIndex,
      field: 'OP-Status',
      value: row['OP-Status']
    });
  }

  return errors;
}

/**
 * Validates individual operation data after transformation
 */
export function validateOperationData(operation: OperationAssignment): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate time range (operations should be between 6:00 and 22:00)
  if (operation.scheduledTime) {
    const [hours] = operation.scheduledTime.split(':').map(Number);
    if (hours < 6 || hours > 22) {
      errors.push({
        code: 'TIME_OUT_OF_RANGE',
        messageDE: `Operation um ${operation.scheduledTime} liegt außerhalb der normalen OP-Zeiten (06:00-22:00)`,
        messageEN: `Operation at ${operation.scheduledTime} is outside normal OR hours (06:00-22:00)`,
        severity: 'warning',
        field: 'scheduledTime',
        value: operation.scheduledTime
      });
    }
  }

  // Validate room assignment
  if (!OPERATING_ROOMS.includes(operation.room)) {
    errors.push({
      code: 'INVALID_ROOM_ASSIGNMENT',
      messageDE: `Ungültige Raumzuweisung: ${operation.room}`,
      messageEN: `Invalid room assignment: ${operation.room}`,
      severity: 'error',
      field: 'room',
      value: operation.room
    });
  }

  // Validate procedure name
  if (!operation.procedureName || operation.procedureName.trim().length < 3) {
    errors.push({
      code: 'INVALID_PROCEDURE_NAME',
      messageDE: 'Eingriffsname ist zu kurz oder fehlt',
      messageEN: 'Procedure name is too short or missing',
      severity: 'error',
      field: 'procedureName',
      value: operation.procedureName
    });
  }

  // Validate estimated duration
  if (operation.estimatedDuration && (operation.estimatedDuration < 15 || operation.estimatedDuration > 720)) {
    errors.push({
      code: 'INVALID_DURATION',
      messageDE: `Ungültige Operationsdauer: ${operation.estimatedDuration} Minuten (erwartet: 15-720 min)`,
      messageEN: `Invalid operation duration: ${operation.estimatedDuration} minutes (expected: 15-720 min)`,
      severity: 'warning',
      field: 'estimatedDuration',
      value: operation.estimatedDuration
    });
  }

  return errors;
}

/**
 * Detects time conflicts between operations
 */
export function detectTimeConflicts(operations: OperationAssignment[]): ConflictDetails[] {
  const conflicts: ConflictDetails[] = [];
  const operationsByRoom = new Map<string, OperationAssignment[]>();

  // Group operations by room
  operations.forEach(op => {
    if (!operationsByRoom.has(op.room)) {
      operationsByRoom.set(op.room, []);
    }
    operationsByRoom.get(op.room)!.push(op);
  });

  // Check for conflicts within each room
  operationsByRoom.forEach((roomOps, room) => {
    // Sort operations by time
    roomOps.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

    for (let i = 0; i < roomOps.length - 1; i++) {
      const currentOp = roomOps[i];
      const nextOp = roomOps[i + 1];

      // Calculate end time of current operation
      const currentEndTime = calculateEndTime(currentOp.scheduledTime, currentOp.estimatedDuration || 90);
      const nextStartTime = parseTimeToMinutes(nextOp.scheduledTime);

      // Check for overlap
      if (currentEndTime > nextStartTime) {
        const overlapMinutes = currentEndTime - nextStartTime;
        conflicts.push({
          type: 'time_overlap',
          room,
          timeSlot: `${currentOp.scheduledTime}-${nextOp.scheduledTime}`,
          conflictingOperations: [currentOp, nextOp],
          severity: overlapMinutes > 30 ? 'high' : overlapMinutes > 15 ? 'medium' : 'low'
        });
      }
    }

    // Check for exact same time slots (double booking)
    const timeSlotMap = new Map<string, OperationAssignment[]>();
    roomOps.forEach(op => {
      if (!timeSlotMap.has(op.scheduledTime)) {
        timeSlotMap.set(op.scheduledTime, []);
      }
      timeSlotMap.get(op.scheduledTime)!.push(op);
    });

    timeSlotMap.forEach((ops, timeSlot) => {
      if (ops.length > 1) {
        conflicts.push({
          type: 'room_double_booking',
          room,
          timeSlot,
          conflictingOperations: ops,
          severity: 'high'
        });
      }
    });
  });

  return conflicts;
}

/**
 * Validates room assignments based on department compatibility
 */
export function validateRoomAssignments(operations: OperationAssignment[]): ValidationError[] {
  const errors: ValidationError[] = [];
  
  operations.forEach((operation, index) => {
    // Check if room supports the department
    const roomDepartments = getRoomDepartments(operation.room);
    if (roomDepartments.length > 0 && !roomDepartments.includes(operation.department)) {
      errors.push({
        code: 'INCOMPATIBLE_ROOM_DEPARTMENT',
        messageDE: `${operation.room} ist normalerweise nicht für ${operation.department} vorgesehen. Unterstützte Abteilungen: ${roomDepartments.join(', ')}`,
        messageEN: `${operation.room} is not typically assigned to ${operation.department}. Supported departments: ${roomDepartments.join(', ')}`,
        severity: 'warning',
        rowIndex: index,
        field: 'room/department',
        value: `${operation.room}/${operation.department}`
      });
    }
  });

  return errors;
}

/**
 * Helper function to parse time string to minutes since midnight
 */
function parseTimeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Helper function to calculate end time in minutes
 */
function calculateEndTime(startTime: string, durationMinutes: number): number {
  return parseTimeToMinutes(startTime) + durationMinutes;
}

/**
 * Helper function to get departments supported by a room
 */
function getRoomDepartments(room: OperatingRoomName): Department[] {
  // This would be imported from or-planner-data.ts in real implementation
  const ROOM_DEPARTMENT_MAPPING: Record<OperatingRoomName, Department[]> = {
    'SAAL 1': ['UCH', 'ACH'],
    'SAAL 2': ['UCH', 'ACH'],
    'SAAL 3': ['GYN', 'URO'],
    'SAAL 4': ['GYN', 'URO'],
    'SAAL 5': ['GCH', 'PCH'],
    'SAAL 6': ['GCH', 'PCH'],
    'SAAL 7': ['UCH', 'GCH'],
    'SAAL 8': ['ACH', 'GCH'],
  };
  
  return ROOM_DEPARTMENT_MAPPING[room] || [];
}

/**
 * Comprehensive validation function that combines all validations
 */
export function validateCompleteImport(csvData: any[], operations: OperationAssignment[]): {
  structureValidation: ValidationResult;
  operationValidation: ValidationError[];
  timeConflicts: ConflictDetails[];
  roomValidation: ValidationError[];
  overallValid: boolean;
} {
  const structureValidation = validateCSVStructure(csvData);
  const operationValidation = operations.flatMap(op => validateOperationData(op));
  const timeConflicts = detectTimeConflicts(operations);
  const roomValidation = validateRoomAssignments(operations);

  const hasErrors = structureValidation.errors.length > 0 || 
                   operationValidation.some(e => e.severity === 'error') ||
                   timeConflicts.some(c => c.severity === 'high') ||
                   roomValidation.some(e => e.severity === 'error');

  return {
    structureValidation,
    operationValidation,
    timeConflicts,
    roomValidation,
    overallValid: !hasErrors
  };
}
