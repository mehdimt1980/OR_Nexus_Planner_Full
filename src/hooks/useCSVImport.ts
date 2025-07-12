import { useState, useCallback, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import { GermanHospitalCSVParser } from '@/lib/csv-parser';
import { createScheduleFromCSV, groupOperationsByRoom } from '@/lib/or-planner-data';
import type { 
  CSVOperation, 
  CSVImportResult, 
  OperationAssignment,
  ORSchedule,
  TimeSlotConflict,
  Department,
  OperatingRoomName 
} from '@/lib/or-planner-types';

// Import state type definition
export type ImportStatus = 'idle' | 'validating' | 'processing' | 'success' | 'error';

export interface ImportState {
  status: ImportStatus;
  file: File | null;
  rawData: string | null;
  parsedData: CSVOperation[] | null;
  validatedOperations: OperationAssignment[] | null;
  errors: string[];
  warnings: string[];
  progress: number;
  startTime: number | null;
  endTime: number | null;
}

export interface ImportStatistics {
  totalOperations: number;
  byDepartment: Record<Department, number>;
  byRoom: Record<OperatingRoomName, number>;
  byComplexity: Record<string, number>;
  timeRange: {
    earliest: string;
    latest: string;
  };
  estimatedDuration: number;
  conflicts: TimeSlotConflict[];
}

export interface ImportActions {
  selectFile: (file: File) => Promise<void>;
  validateFile: () => Promise<boolean>;
  processFile: () => Promise<OperationAssignment[]>;
  clearImport: () => void;
  retryImport: () => Promise<void>;
  cancelImport: () => void;
}

export interface ImportComputed {
  canImport: boolean;
  hasErrors: boolean;
  hasWarnings: boolean;
  isProcessing: boolean;
  operationCount: number;
  isComplete: boolean;
  processingTime: number | null;
  statistics: ImportStatistics | null;
}

export interface UseCSVImportReturn {
  state: ImportState;
  actions: ImportActions;
  computed: ImportComputed;
}

// Constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];
const PROGRESS_STEPS = {
  FILE_READ: 20,
  STRUCTURE_VALIDATION: 40,
  DATA_PARSING: 60,
  DATA_VALIDATION: 80,
  TRANSFORMATION: 90,
  COMPLETE: 100
};

export function useCSVImport(): UseCSVImportReturn {
  // State management
  const [state, setState] = useState<ImportState>({
    status: 'idle',
    file: null,
    rawData: null,
    parsedData: null,
    validatedOperations: null,
    errors: [],
    warnings: [],
    progress: 0,
    startTime: null,
    endTime: null
  });

  // Refs for cleanup and cancellation
  const abortControllerRef = useRef<AbortController | null>(null);
  const fileReaderRef = useRef<FileReader | null>(null);

  // Utility function to update state
  const updateState = useCallback((updates: Partial<ImportState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Utility function to add error
  const addError = useCallback((error: string) => {
    updateState({ 
      errors: [...state.errors, error],
      status: 'error'
    });
    toast.error(error);
  }, [state.errors, updateState]);

  // Utility function to add warning
  const addWarning = useCallback((warning: string) => {
    updateState({ 
      warnings: [...state.warnings, warning]
    });
  }, [state.warnings, updateState]);

  // File validation function
  const validateFileBasics = useCallback((file: File): boolean => {
    // Check file type
    if (!ALLOWED_TYPES.includes(file.type) && !file.name.toLowerCase().endsWith('.csv')) {
      addError('Ungültiger Dateityp. Nur CSV-Dateien sind erlaubt.');
      return false;
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      addError(`Datei zu groß. Maximale Größe: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
      return false;
    }

    // Check if file is empty
    if (file.size === 0) {
      addError('Datei ist leer.');
      return false;
    }

    return true;
  }, [addError]);

  // CSV structure validation
  const validateCSVStructure = useCallback((content: string): boolean => {
    try {
      const lines = content.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        addError('CSV-Datei muss mindestens eine Kopfzeile und eine Datenzeile enthalten.');
        return false;
      }

      const headers = lines[0].split(';').map(h => h.trim());
      
      // Check minimum column count
      if (headers.length < 10) {
        addError(`Zu wenige Spalten gefunden (${headers.length}). Mindestens 10 erwartet.`);
        return false;
      }

      // Check for required columns
      const requiredColumns = ['Datum', 'Zeit', 'Eingriff', 'OP-Orgaeinheit', 'OP-Saal'];
      const missingColumns = requiredColumns.filter(col => !headers.includes(col));
      
      if (missingColumns.length > 0) {
        addError(`Erforderliche Spalten fehlen: ${missingColumns.join(', ')}`);
        return false;
      }

      // Check for data rows
      if (lines.length > 100) {
        addWarning(`Große Datei mit ${lines.length - 1} Datenzeilen. Import kann länger dauern.`);
      }

      return true;
    } catch (error) {
      addError('Fehler beim Validieren der CSV-Struktur.');
      return false;
    }
  }, [addError, addWarning]);

  // Detect conflicts between operations
  const detectConflicts = useCallback((operations: OperationAssignment[]): TimeSlotConflict[] => {
    const conflicts: TimeSlotConflict[] = [];
    const operationsByRoom: Record<string, OperationAssignment[]> = {};

    // Group by room and date
    operations.forEach(op => {
      const key = `${op.room}-${op.date}`;
      if (!operationsByRoom[key]) {
        operationsByRoom[key] = [];
      }
      operationsByRoom[key].push(op);
    });

    // Check for time overlaps within each room/date
    Object.entries(operationsByRoom).forEach(([key, roomOps]) => {
      const [room, date] = key.split('-') as [OperatingRoomName, string];
      
      for (let i = 0; i < roomOps.length; i++) {
        for (let j = i + 1; j < roomOps.length; j++) {
          const op1 = roomOps[i];
          const op2 = roomOps[j];
          
          // Check for time overlap
          const start1 = op1.timeSlot.start;
          const end1 = op1.timeSlot.end;
          const start2 = op2.timeSlot.start;
          const end2 = op2.timeSlot.end;
          
          if (start1 < end2 && start2 < end1) {
            conflicts.push({
              room,
              date,
              conflictingOperations: [op1, op2],
              reason: 'overlap'
            });
          }
        }
      }
    });

    return conflicts;
  }, []);

  // Calculate import statistics
  const calculateStatistics = useCallback((operations: OperationAssignment[]): ImportStatistics => {
    const byDepartment: Record<Department, number> = {} as Record<Department, number>;
    const byRoom: Record<OperatingRoomName, number> = {} as Record<OperatingRoomName, number>;
    const byComplexity: Record<string, number> = {};
    
    let earliest = operations[0]?.timeSlot.start || '';
    let latest = operations[0]?.timeSlot.start || '';
    let totalDuration = 0;

    operations.forEach(op => {
      // Count by department
      if (op.department) {
        byDepartment[op.department] = (byDepartment[op.department] || 0) + 1;
      }
      
      // Count by room
      byRoom[op.room] = (byRoom[op.room] || 0) + 1;
      
      // Count by complexity
      if (op.complexity) {
        byComplexity[op.complexity] = (byComplexity[op.complexity] || 0) + 1;
      }
      
      // Track time range
      if (op.timeSlot.start < earliest) earliest = op.timeSlot.start;
      if (op.timeSlot.start > latest) latest = op.timeSlot.start;
      
      // Sum duration
      totalDuration += op.timeSlot.duration || 60;
    });

    const conflicts = detectConflicts(operations);

    return {
      totalOperations: operations.length,
      byDepartment,
      byRoom,
      byComplexity,
      timeRange: { earliest, latest },
      estimatedDuration: totalDuration,
      conflicts
    };
  }, [detectConflicts]);

  // Action: Select File
  const selectFile = useCallback(async (file: File): Promise<void> => {
    try {
      // Reset state
      setState({
        status: 'validating',
        file,
        rawData: null,
        parsedData: null,
        validatedOperations: null,
        errors: [],
        warnings: [],
        progress: 0,
        startTime: Date.now(),
        endTime: null
      });

      // Basic file validation
      if (!validateFileBasics(file)) {
        return;
      }

      updateState({ progress: PROGRESS_STEPS.FILE_READ });

      // Read file content
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        fileReaderRef.current = reader;
        
        reader.onload = (e) => {
          const result = e.target?.result;
          if (typeof result === 'string') {
            resolve(result);
          } else {
            reject(new Error('Fehler beim Lesen der Datei'));
          }
        };
        
        reader.onerror = () => reject(new Error('Fehler beim Lesen der Datei'));
        reader.readAsText(file, 'UTF-8');
      });

      updateState({ 
        rawData: content,
        progress: PROGRESS_STEPS.STRUCTURE_VALIDATION 
      });

      // Validate CSV structure
      if (!validateCSVStructure(content)) {
        return;
      }

      updateState({ 
        status: 'idle',
        progress: PROGRESS_STEPS.STRUCTURE_VALIDATION 
      });

      toast.success('Datei erfolgreich geladen und validiert');

    } catch (error) {
      addError('Fehler beim Laden der Datei: ' + (error as Error).message);
    }
  }, [validateFileBasics, validateCSVStructure, updateState, addError]);

  // Action: Validate File
  const validateFile = useCallback(async (): Promise<boolean> => {
    if (!state.rawData) {
      addError('Keine Daten zum Validieren vorhanden');
      return false;
    }

    try {
      updateState({ status: 'validating', progress: PROGRESS_STEPS.DATA_PARSING });

      // Parse CSV using the German parser
      const parseResult = await GermanHospitalCSVParser.parseCSV(state.rawData);

      if (!parseResult.success) {
        updateState({ 
          errors: parseResult.errors || ['Unbekannter Parsing-Fehler'],
          status: 'error'
        });
        return false;
      }

      updateState({
        parsedData: parseResult.data || [],
        warnings: parseResult.warnings || [],
        progress: PROGRESS_STEPS.DATA_VALIDATION,
        status: 'idle'
      });

      return true;

    } catch (error) {
      addError('Fehler bei der Datenvalidierung: ' + (error as Error).message);
      return false;
    }
  }, [state.rawData, updateState, addError]);

  // Action: Process File
  const processFile = useCallback(async (): Promise<OperationAssignment[]> => {
    if (!state.parsedData) {
      throw new Error('Keine validierten Daten zum Verarbeiten vorhanden');
    }

    try {
      updateState({ 
        status: 'processing',
        progress: PROGRESS_STEPS.TRANSFORMATION 
      });

      // Convert CSV operations to OperationAssignments
      const operations = state.parsedData.map(csvOp => 
        GermanHospitalCSVParser.csvToOperationAssignment(csvOp)
      );

      // Detect conflicts
      const conflicts = detectConflicts(operations);
      if (conflicts.length > 0) {
        addWarning(`${conflicts.length} Zeitkonflikte erkannt. Bitte prüfen Sie die Planung.`);
      }

      updateState({
        validatedOperations: operations,
        progress: PROGRESS_STEPS.COMPLETE,
        status: 'success',
        endTime: Date.now()
      });

      toast.success(`${operations.length} Operationen erfolgreich verarbeitet`);
      return operations;

    } catch (error) {
      addError('Fehler bei der Datenverarbeitung: ' + (error as Error).message);
      throw error;
    }
  }, [state.parsedData, updateState, addError, addWarning, detectConflicts]);

  // Action: Clear Import
  const clearImport = useCallback(() => {
    // Cancel any ongoing operations
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (fileReaderRef.current) {
      fileReaderRef.current.abort();
    }

    setState({
      status: 'idle',
      file: null,
      rawData: null,
      parsedData: null,
      validatedOperations: null,
      errors: [],
      warnings: [],
      progress: 0,
      startTime: null,
      endTime: null
    });

    toast.info('Import zurückgesetzt');
  }, []);

  // Action: Retry Import
  const retryImport = useCallback(async (): Promise<void> => {
    if (!state.file) {
      addError('Keine Datei zum erneuten Verarbeiten vorhanden');
      return;
    }

    const file = state.file;
    clearImport();
    await selectFile(file);
  }, [state.file, clearImport, selectFile, addError]);

  // Action: Cancel Import
  const cancelImport = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (fileReaderRef.current) {
      fileReaderRef.current.abort();
    }

    updateState({ 
      status: 'idle',
      progress: 0 
    });

    toast.info('Import abgebrochen');
  }, [updateState]);

  // Computed values
  const computed = useMemo((): ImportComputed => {
    const canImport = state.status === 'idle' && 
                     state.rawData !== null && 
                     state.errors.length === 0;

    const hasErrors = state.errors.length > 0;
    const hasWarnings = state.warnings.length > 0;
    const isProcessing = state.status === 'validating' || state.status === 'processing';
    const operationCount = state.parsedData?.length || 0;
    const isComplete = state.status === 'success' && state.validatedOperations !== null;
    
    const processingTime = state.startTime && state.endTime 
      ? state.endTime - state.startTime 
      : null;

    const statistics = state.validatedOperations 
      ? calculateStatistics(state.validatedOperations)
      : null;

    return {
      canImport,
      hasErrors,
      hasWarnings,
      isProcessing,
      operationCount,
      isComplete,
      processingTime,
      statistics
    };
  }, [state, calculateStatistics]);

  // Actions object
  const actions: ImportActions = {
    selectFile,
    validateFile,
    processFile,
    clearImport,
    retryImport,
    cancelImport
  };

  return {
    state,
    actions,
    computed
  };
}

// Type exports for external use
export type { ImportState, ImportStatistics, ImportActions, ImportComputed };

// Utility hook for simplified CSV import workflow
export function useSimpleCSVImport() {
  const csvImport = useCSVImport();

  const importCSVFile = useCallback(async (file: File): Promise<OperationAssignment[]> => {
    try {
      await csvImport.actions.selectFile(file);
      
      if (!csvImport.computed.canImport) {
        throw new Error('Datei kann nicht importiert werden');
      }

      const isValid = await csvImport.actions.validateFile();
      if (!isValid) {
        throw new Error('Datenvalidierung fehlgeschlagen');
      }

      return await csvImport.actions.processFile();
    } catch (error) {
      csvImport.actions.clearImport();
      throw error;
    }
  }, [csvImport]);

  return {
    ...csvImport,
    importCSVFile
  };
}

// Hook for CSV import with automatic integration to OR data
export function useCSVImportWithIntegration(
  onImportSuccess?: (operations: OperationAssignment[]) => void
) {
  const csvImport = useCSVImport();

  const importAndIntegrate = useCallback(async (file: File) => {
    try {
      const operations = await csvImport.actions.processFile();
      
      if (onImportSuccess) {
        onImportSuccess(operations);
      }

      toast.success('CSV-Daten erfolgreich in den OP-Plan integriert');
      csvImport.actions.clearImport();
      
    } catch (error) {
      toast.error('Fehler bei der Integration: ' + (error as Error).message);
    }
  }, [csvImport, onImportSuccess]);

  return {
    ...csvImport,
    importAndIntegrate
  };
}
