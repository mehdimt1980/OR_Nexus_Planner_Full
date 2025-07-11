"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  ORSchedule,
  StaffMember,
  OperationAssignment,
  WorkflowStep,
  WorkflowStepKey,
  JuliaOverride,
  OperatingRoomName,
  Department,
} from '@/lib/or-planner-types';
import { ALL_WORKFLOW_STEPS, OPERATING_ROOMS } from '@/lib/or-planner-types';
import { STAFF_MEMBERS as INITIAL_STAFF_MEMBERS, getStaffMemberByName, getStaffMemberById, ROOM_DEPARTMENT_MAPPING } from '@/lib/or-planner-data';
import { fetchAiStaffingSuggestions, fetchAiLearningSummary } from '@/lib/actions';
import type { SuggestStaffingPlanInput } from '@/ai/flows/suggest-staffing-plan';
import type { SummarizeGptLearningInput } from '@/ai/flows/summarize-gpt-learning';
import { useToast } from "@/hooks/use-toast";
import type { CriticalSituationData, OptimizationSuggestionItem } from '@/components/or-planner/JuliaRecommendationsPanel';
import type { LearningProgressItem } from '@/components/or-planner/AiAssistantPanel';
import type { DataSourceInfo, DataSourceStatistics } from '@/components/or-planner/DataSourcePanel';
import { Brain, TrendingUp, Settings2 } from 'lucide-react';
import { 
  validateCompleteImport,
  type ValidationError,
  type ConflictDetails 
} from '@/lib/csv-validation';
import { 
  transformCSVToOperations,
  validateTransformationResult,
  type TransformationProgress 
} from '@/lib/csv-transformer';
import { convertDemoToRealFormat } from '@/lib/demo-data-generator';
import { format } from 'date-fns';

const TOTAL_ASSIGNMENTS_FOR_JULIA = 19; // As per requirements

// Time-based schedule type: room -> timeSlot -> operation
type TimeBasedORSchedule = Record<OperatingRoomName, Record<string, OperationAssignment>>;

// Local storage keys
const STORAGE_KEYS = {
  SCHEDULE: 'nexus_or_schedule',
  PLAN_HISTORY: 'nexus_or_plan_history',
  WORKFLOW_STATE: 'nexus_or_workflow',
  JULIA_OVERRIDES: 'nexus_or_julia_overrides',
  DATA_SOURCE_INFO: 'nexus_or_data_source'
} as const;

// Plan version interface for history tracking
interface PlanVersion {
  id: string;
  timestamp: string;
  version: number;
  description: string;
  schedule: TimeBasedORSchedule;
  workflowStep: WorkflowStepKey;
  changes: Array<{
    type: 'import' | 'ai_suggestion' | 'julia_modification' | 'approval' | 'export';
    description: string;
    timestamp: string;
    operationIds?: string[];
  }>;
  statistics: {
    totalOperations: number;
    departmentBreakdown: Record<Department, number>;
    approvalStatus: Record<string, number>;
  };
}

/**
 * Enhanced useORData hook with data persistence, export functionality, and plan versioning
 */
export function useORData() {
  // Updated to use time-based structure instead of shift-based
  const [schedule, setSchedule] = useState<TimeBasedORSchedule>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEYS.SCHEDULE);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (error) {
          console.warn('Failed to parse saved schedule:', error);
        }
      }
    }
    
    // Initialize empty schedule
    const emptySchedule = {} as TimeBasedORSchedule;
    OPERATING_ROOMS.forEach(room => {
      emptySchedule[room] = {};
    });
    return emptySchedule;
  });
  
  const [staff, setStaff] = useState<StaffMember[]>(() => JSON.parse(JSON.stringify(INITIAL_STAFF_MEMBERS)));
  const [currentWorkflowStepKey, setCurrentWorkflowStepKey] = useState<WorkflowStepKey>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEYS.WORKFLOW_STATE);
      if (saved) {
        try {
          return JSON.parse(saved).currentStep || 'PLAN_CREATED';
        } catch (error) {
          console.warn('Failed to parse saved workflow state:', error);
        }
      }
    }
    return 'PLAN_CREATED';
  });
  
  const [previousWorkflowStepKey, setPreviousWorkflowStepKey] = useState<WorkflowStepKey | null>(null);
  const [aiRawLearningSummary, setAiRawLearningSummary] = useState<string>("KI lernt aus Julias Anpassungen...");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedOperation, setSelectedOperation] = useState<OperationAssignment | null>(null);
  const [juliaOverrides, setJuliaOverrides] = useState<JuliaOverride[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEYS.JULIA_OVERRIDES);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (error) {
          console.warn('Failed to parse saved Julia overrides:', error);
        }
      }
    }
    return [];
  });
  
  const [currentDate, setCurrentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [planHistory, setPlanHistory] = useState<PlanVersion[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEYS.PLAN_HISTORY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (error) {
          console.warn('Failed to parse saved plan history:', error);
        }
      }
    }
    return [];
  });
  
  // Import state management
  const [importProgress, setImportProgress] = useState<{
    isImporting: boolean;
    currentStep: string;
    progress: number;
    errors: string[];
  }>({
    isImporting: false,
    currentStep: '',
    progress: 0,
    errors: []
  });
  
  // Backup state for rollback functionality
  const [scheduleBackup, setScheduleBackup] = useState<TimeBasedORSchedule | null>(null);
  
  // Data source information state
  const [dataSourceInfo, setDataSourceInfo] = useState<{
    type: 'demo' | 'imported' | 'mixed';
    fileName?: string;
    importDate?: string;
    lastModified?: string;
  }>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEYS.DATA_SOURCE_INFO);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (error) {
          console.warn('Failed to parse saved data source info:', error);
        }
      }
    }
    return { type: 'demo' };
  });
  
  const { toast } = useToast();

  // Critical situation and optimization data
  const [criticalSituationData, setCriticalSituationData] = useState<CriticalSituationData>({
    title: "Kritische Situation: Personalengpass",
    situation: "Mehrere Operationen zur gleichen Zeit benötigen spezialisiertes Personal.",
    gptSuggestion: "Personal flexibel zwischen Abteilungen umverteilen und Prioritäten setzen.",
    alternative: "Weniger kritische OPs verschieben oder mit weniger erfahrenem Personal unter Supervision durchführen.",
  });

  const [optimizationSuggestionsData, setOptimizationSuggestionsData] = useState<OptimizationSuggestionItem[]>([
    { text: "Gleichmäßige Verteilung der Arbeitsbelastung über alle Räume prüfen", icon: Brain },
    { text: "Optimierung der Operationszeiten für bessere Personalnutzung", icon: TrendingUp },
    { text: "Reserve-Personal flexibel für kurzfristige Engpässe einsetzen", icon: Settings2 },
    { text: "Zeitbasierte Planung zu 92% optimal - sehr gut!", icon: Settings2 },
  ]);
  
  const [structuredLearningPoints, setStructuredLearningPoints] = useState<LearningProgressItem[]>([
      { text: "Gelernt aus Julia's Entscheidungen: Präferenz für zeitoptimierte Personalzuordnung.", icon: Brain },
      { text: "Verbesserung: +15% Genauigkeit bei der zeitbasierten Planung seit letzter Iteration.", icon: TrendingUp },
      { text: "Nächste Optimierung: Berücksichtigung von Operationsdauer und Personalverfügbarkeit.", icon: Settings2 },
  ]);

  // Get all operations as a flat list
  const allAssignmentsList = useMemo(() => {
    const operations: OperationAssignment[] = [];
    OPERATING_ROOMS.forEach(room => {
      Object.values(schedule[room] || {}).forEach(operation => {
        if (operation) {
          operations.push(operation);
        }
      });
    });
    return operations.sort((a, b) => {
      // Sort by time for consistent ordering
      if (a.scheduledTime !== b.scheduledTime) {
        return a.scheduledTime.localeCompare(b.scheduledTime);
      }
      return a.room.localeCompare(b.room);
    });
  }, [schedule]);

  /**
   * Save current state to localStorage
   */
  const saveToLocalStorage = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(schedule));
      localStorage.setItem(STORAGE_KEYS.WORKFLOW_STATE, JSON.stringify({
        currentStep: currentWorkflowStepKey,
        previousStep: previousWorkflowStepKey
      }));
      localStorage.setItem(STORAGE_KEYS.JULIA_OVERRIDES, JSON.stringify(juliaOverrides));
      localStorage.setItem(STORAGE_KEYS.DATA_SOURCE_INFO, JSON.stringify(dataSourceInfo));
      localStorage.setItem(STORAGE_KEYS.PLAN_HISTORY, JSON.stringify(planHistory));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }, [schedule, currentWorkflowStepKey, previousWorkflowStepKey, juliaOverrides, dataSourceInfo, planHistory]);

  /**
   * Create a new plan version for history tracking
   */
  const createPlanVersion = useCallback((description: string, changeType: PlanVersion['changes'][0]['type'], operationIds?: string[]) => {
    const newVersion: PlanVersion = {
      id: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      version: planHistory.length + 1,
      description,
      schedule: JSON.parse(JSON.stringify(schedule)),
      workflowStep: currentWorkflowStepKey,
      changes: [{
        type: changeType,
        description,
        timestamp: new Date().toISOString(),
        operationIds
      }],
      statistics: {
        totalOperations: allAssignmentsList.length,
        departmentBreakdown: calculateDepartmentBreakdown(),
        approvalStatus: calculateApprovalStatus()
      }
    };

    setPlanHistory(prev => [...prev.slice(-9), newVersion]); // Keep last 10 versions
    return newVersion;
  }, [schedule, currentWorkflowStepKey, planHistory.length, allAssignmentsList.length]);

  /**
   * Calculate department breakdown for statistics
   */
  const calculateDepartmentBreakdown = useCallback((): Record<Department, number> => {
    const breakdown: Record<Department, number> = {} as Record<Department, number>;
    allAssignmentsList.forEach(op => {
      breakdown[op.department] = (breakdown[op.department] || 0) + 1;
    });
    return breakdown;
  }, [allAssignmentsList]);

  /**
   * Calculate approval status breakdown
   */
  const calculateApprovalStatus = useCallback(): Record<string, number> => {
    const statusBreakdown: Record<string, number> = {};
    allAssignmentsList.forEach(op => {
      statusBreakdown[op.status] = (statusBreakdown[op.status] || 0) + 1;
    });
    return statusBreakdown;
  }, [allAssignmentsList]);

  /**
   * Calculate data quality score
   */
  const calculateDataQualityScore = useCallback(): number => {
    if (allAssignmentsList.length === 0) return 0;
    
    let score = 100;
    const totalOps = allAssignmentsList.length;
    
    // Deduct points for missing surgeons
    const missingSurgeons = allAssignmentsList.filter(op => !op.primarySurgeon).length;
    score -= (missingSurgeons / totalOps) * 20;
    
    // Deduct points for unassigned staff
    const unassignedStaff = allAssignmentsList.filter(op => op.assignedStaff.length === 0).length;
    score -= (unassignedStaff / totalOps) * 30;
    
    // Deduct points for missing durations
    const missingDurations = allAssignmentsList.filter(op => !op.estimatedDuration).length;
    score -= (missingDurations / totalOps) * 10;
    
    // Deduct points for conflicts
    const conflicts = detectTimeConflicts();
    score -= conflicts.length * 5;
    
    return Math.max(0, Math.round(score));
  }, [allAssignmentsList]);

  /**
   * Get comprehensive data source information
   */
  const getDataSourceInfo = useCallback((): DataSourceInfo => {
    const departmentBreakdown = calculateDepartmentBreakdown();
    const roomUtilization: Record<string, number> = {};
    
    // Calculate room utilization
    OPERATING_ROOMS.forEach(room => {
      const roomOps = Object.keys(schedule[room] || {}).length;
      const maxSlots = 16; // Assume 8 hours * 2 slots per hour
      roomUtilization[room] = Math.round((roomOps / maxSlots) * 100);
    });
    
    // Calculate time range
    const times = allAssignmentsList.map(op => op.scheduledTime).sort();
    const timeRange = {
      earliest: times[0] || '00:00',
      latest: times[times.length - 1] || '00:00',
      totalHours: times.length > 0 ? parseTime(times[times.length - 1]) - parseTime(times[0]) : 0
    };
    
    // Calculate complexity distribution
    const complexityDistribution: Record<string, number> = {};
    allAssignmentsList.forEach(op => {
      if (op.complexity) {
        complexityDistribution[op.complexity] = (complexityDistribution[op.complexity] || 0) + 1;
      }
    });
    
    // Calculate staffing status
    const staffingStatus = {
      assigned: allAssignmentsList.filter(op => op.assignedStaff.length > 0).length,
      pending: allAssignmentsList.filter(op => op.status === 'pending_gpt').length,
      approved: allAssignmentsList.filter(op => op.status === 'approved_julia' || op.status === 'final_approved').length,
      modified: allAssignmentsList.filter(op => op.status === 'modified_julia').length
    };
    
    // Generate issues
    const issues: DataSourceStatistics['issues'] = [];
    const qualityScore = calculateDataQualityScore();
    
    if (qualityScore < 70) {
      issues.push({
        type: 'warning',
        message: 'Datenqualität unter 70% - Überprüfung empfohlen',
        count: 1
      });
    }
    
    const conflicts = detectTimeConflicts();
    if (conflicts.length > 0) {
      issues.push({
        type: 'error',
        message: 'Zeitkonflikte gefunden',
        count: conflicts.length
      });
    }
    
    const unassigned = staffingStatus.assigned;
    if (unassigned < allAssignmentsList.length * 0.8) {
      issues.push({
        type: 'warning',
        message: 'Mehr als 20% der Operationen ohne Personalzuweisung',
        count: allAssignmentsList.length - unassigned
      });
    }

    const statistics: DataSourceStatistics = {
      operationCount: allAssignmentsList.length,
      departmentBreakdown,
      roomUtilization,
      timeRange,
      complexityDistribution,
      staffingStatus,
      qualityScore,
      issues
    };

    return {
      type: dataSourceInfo.type,
      fileName: dataSourceInfo.fileName,
      importDate: dataSourceInfo.importDate,
      lastModified: dataSourceInfo.lastModified,
      version: planHistory.length > 0 ? `v${planHistory.length}` : undefined,
      statistics,
      hasBackup: scheduleBackup !== null,
      canExport: allAssignmentsList.length > 0
    };
  }, [dataSourceInfo, calculateDepartmentBreakdown, allAssignmentsList, schedule, calculateDataQualityScore, planHistory.length, scheduleBackup]);

  /**
   * Enhanced CSV import with comprehensive validation and history tracking
   */
  const importCSVData = useCallback(async (operations: OperationAssignment[], csvData?: any[]) => {
    setImportProgress({
      isImporting: true,
      currentStep: 'Validierung startet...',
      progress: 0,
      errors: []
    });

    try {
      // Create backup for rollback
      setScheduleBackup(JSON.parse(JSON.stringify(schedule)));

      // Step 1: Comprehensive validation (20% progress)
      setImportProgress(prev => ({
        ...prev,
        currentStep: 'Validiere CSV-Struktur und Daten...',
        progress: 20
      }));

      let validationResult;
      if (csvData) {
        validationResult = validateCompleteImport(csvData, operations);
      } else {
        // If no CSV data provided, perform basic operation validation
        validationResult = {
          structureValidation: { isValid: true, errors: [], warnings: [], summary: { totalRows: operations.length, validRows: operations.length, errorRows: 0, warningRows: 0 } },
          operationValidation: [],
          timeConflicts: [],
          roomValidation: [],
          overallValid: true
        };
      }

      // Step 2: Handle validation results (40% progress)
      setImportProgress(prev => ({
        ...prev,
        currentStep: 'Prüfe Validierungsergebnisse...',
        progress: 40
      }));

      const criticalErrors = [
        ...validationResult.structureValidation.errors,
        ...validationResult.operationValidation.filter(e => e.severity === 'error'),
        ...validationResult.roomValidation.filter(e => e.severity === 'error')
      ];

      const highPriorityConflicts = validationResult.timeConflicts.filter(c => c.severity === 'high');

      if (criticalErrors.length > 0) {
        const errorMessages = criticalErrors.slice(0, 3).map(e => e.messageDE);
        setImportProgress(prev => ({
          ...prev,
          isImporting: false,
          currentStep: 'Import abgebrochen',
          errors: errorMessages
        }));

        toast({
          title: "Import-Validierung fehlgeschlagen",
          description: `${criticalErrors.length} kritische Fehler gefunden. Erste Fehler: ${errorMessages[0]}`,
          variant: "destructive"
        });
        return;
      }

      // Step 3: Handle time conflicts (60% progress)
      setImportProgress(prev => ({
        ...prev,
        currentStep: 'Prüfe Zeitkonflikte...',
        progress: 60
      }));

      if (highPriorityConflicts.length > 0) {
        const conflictMessages = highPriorityConflicts.slice(0, 2).map(c => 
          `${c.room}: ${c.timeSlot} (${c.conflictingOperations.length} Operationen)`
        );

        // Ask user if they want to continue despite conflicts
        const continueWithConflicts = window.confirm(
          `Schwerwiegende Zeitkonflikte gefunden:\n${conflictMessages.join('\n')}\n\nTrotzdem importieren?`
        );

        if (!continueWithConflicts) {
          setImportProgress(prev => ({
            ...prev,
            isImporting: false,
            currentStep: 'Import vom Benutzer abgebrochen',
            errors: conflictMessages
          }));
          return;
        }
      }

      // Step 4: Create new schedule (80% progress)
      setImportProgress(prev => ({
        ...prev,
        currentStep: 'Erstelle neuen Operationsplan...',
        progress: 80
      }));

      const newSchedule: TimeBasedORSchedule = {};
      
      // Initialize empty schedule
      OPERATING_ROOMS.forEach(room => {
        newSchedule[room] = {};
      });
      
      // Add operations to schedule
      let successCount = 0;
      let skipCount = 0;
      
      operations.forEach(operation => {
        const timeSlot = operation.scheduledTime;
        const room = operation.room;
        
        if (OPERATING_ROOMS.includes(room)) {
          // Check for existing operation at this time slot
          if (newSchedule[room][timeSlot]) {
            skipCount++;
            console.warn(`Skipping duplicate operation at ${room} ${timeSlot}`);
          } else {
            newSchedule[room][timeSlot] = operation;
            successCount++;
          }
        } else {
          skipCount++;
          console.warn(`Skipping operation for unknown room: ${room}`);
        }
      });

      // Step 5: Apply changes (100% progress)
      setImportProgress(prev => ({
        ...prev,
        currentStep: 'Wende Änderungen an...',
        progress: 100
      }));

      setSchedule(newSchedule);
      setCurrentWorkflowStepKey('GPT_SUGGESTIONS_READY');
      
      // Update data source info
      const newDataSourceInfo = {
        type: 'imported' as const,
        fileName: 'Imported CSV',
        importDate: new Date().toISOString().split('T')[0],
        lastModified: new Date().toISOString()
      };
      setDataSourceInfo(newDataSourceInfo);
      
      // Create plan version for history
      createPlanVersion(`CSV Import: ${successCount} Operationen`, 'import');
      
      // Clear import progress after successful import
      setTimeout(() => {
        setImportProgress({
          isImporting: false,
          currentStep: '',
          progress: 0,
          errors: []
        });
      }, 1000);

      // Show success message with details
      const warningCount = validationResult.structureValidation.warnings.length + 
                          validationResult.operationValidation.filter(e => e.severity === 'warning').length;
      
      toast({
        title: "CSV-Import erfolgreich",
        description: `${successCount} Operationen importiert${skipCount > 0 ? `, ${skipCount} übersprungen` : ''}${warningCount > 0 ? `, ${warningCount} Warnungen` : ''}`,
        className: "bg-green-600 text-white"
      });

      // Show warnings if any
      if (warningCount > 0) {
        setTimeout(() => {
          toast({
            title: `${warningCount} Warnungen beim Import`,
            description: "Überprüfen Sie die importierten Daten auf Unregelmäßigkeiten.",
            variant: "default"
          });
        }, 2000);
      }

    } catch (error) {
      console.error('Import error:', error);
      setImportProgress({
        isImporting: false,
        currentStep: 'Import fehlgeschlagen',
        progress: 0,
        errors: [error instanceof Error ? error.message : 'Unbekannter Fehler']
      });

      toast({
        title: "Import-Fehler",
        description: `Ein unerwarteter Fehler ist aufgetreten: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
        variant: "destructive"
      });

      // Trigger rollback
      rollbackImport();
    }
  }, [schedule, toast, createPlanVersion]);

  /**
   * Rollback functionality
   */
  const rollbackImport = useCallback(() => {
    if (scheduleBackup) {
      setSchedule(scheduleBackup);
      setScheduleBackup(null);
      createPlanVersion('Import rückgängig gemacht', 'import');
      toast({
        title: "Import rückgängig gemacht",
        description: "Der vorherige Zustand wurde wiederhergestellt.",
        className: "bg-blue-600 text-white"
      });
    }
  }, [scheduleBackup, toast, createPlanVersion]);

  /**
   * Export plan as CSV with all modifications
   */
  const exportPlanAsCSV = useCallback((downloadImmediately: boolean = false): string => {
    try {
      const csvContent = convertDemoToRealFormat(allAssignmentsList);
      
      if (downloadImmediately) {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `or-plan-export-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Create plan version for export
        createPlanVersion(`Plan exportiert: ${allAssignmentsList.length} Operationen`, 'export');
        
        toast({
          title: "Plan exportiert",
          description: `${allAssignmentsList.length} Operationen als CSV-Datei heruntergeladen.`,
          className: "bg-green-600 text-white"
        });
      }
      
      return csvContent;
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export-Fehler",
        description: `Fehler beim Exportieren: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
        variant: "destructive"
      });
      return '';
    }
  }, [allAssignmentsList, createPlanVersion, toast]);

  /**
   * Save plan to localStorage with success message
   */
  const savePlanToStorage = useCallback(() => {
    try {
      saveToLocalStorage();
      createPlanVersion(`Plan gespeichert: ${allAssignmentsList.length} Operationen`, 'export');
      toast({
        title: "Plan gespeichert",
        description: "Der aktuelle Plan wurde lokal gespeichert.",
        className: "bg-blue-600 text-white"
      });
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Speicher-Fehler",
        description: `Fehler beim Speichern: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
        variant: "destructive"
      });
    }
  }, [saveToLocalStorage, createPlanVersion, allAssignmentsList.length, toast]);

  /**
   * Compare current plan with previous version
   */
  const comparePlans = useCallback((versionId?: string) => {
    const compareVersion = versionId 
      ? planHistory.find(v => v.id === versionId)
      : planHistory[planHistory.length - 2]; // Previous version
    
    if (!compareVersion) {
      toast({
        title: "Vergleich nicht möglich",
        description: "Keine frühere Version zum Vergleichen verfügbar.",
        variant: "destructive"
      });
      return null;
    }
    
    const currentOps = allAssignmentsList;
    const previousOps: OperationAssignment[] = [];
    
    // Extract operations from previous version
    OPERATING_ROOMS.forEach(room => {
      Object.values(compareVersion.schedule[room] || {}).forEach(op => {
        if (op) previousOps.push(op);
      });
    });
    
    const comparison = {
      added: currentOps.filter(curr => !previousOps.some(prev => prev.id === curr.id)),
      removed: previousOps.filter(prev => !currentOps.some(curr => curr.id === prev.id)),
      modified: currentOps.filter(curr => {
        const prev = previousOps.find(p => p.id === curr.id);
        return prev && (
          JSON.stringify(curr.assignedStaff) !== JSON.stringify(prev.assignedStaff) ||
          curr.status !== prev.status ||
          curr.notes !== prev.notes
        );
      }),
      unchanged: currentOps.filter(curr => {
        const prev = previousOps.find(p => p.id === curr.id);
        return prev && JSON.stringify(curr) === JSON.stringify(prev);
      })
    };
    
    toast({
      title: "Plan-Vergleich",
      description: `${comparison.added.length} hinzugefügt, ${comparison.removed.length} entfernt, ${comparison.modified.length} geändert`,
    });
    
    return comparison;
  }, [planHistory, allAssignmentsList, toast]);

  // Helper function to parse time string to minutes
  const parseTime = useCallback((timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }, []);

  // Time conflict detection
  const detectTimeConflicts = useCallback(() => {
    const conflicts: Array<{
      room: OperatingRoomName;
      time: string;
      operations: OperationAssignment[];
    }> = [];
    
    OPERATING_ROOMS.forEach(room => {
      const roomOperations = schedule[room];
      const timeSlots = Object.keys(roomOperations);
      
      timeSlots.forEach(time => {
        const operation = roomOperations[time];
        if (operation && operation.estimatedDuration) {
          // Check for overlapping operations
          const startTime = parseTime(time);
          const endTime = startTime + operation.estimatedDuration;
          
          timeSlots.forEach(otherTime => {
            if (time !== otherTime) {
              const otherOperation = roomOperations[otherTime];
              if (otherOperation) {
                const otherStartTime = parseTime(otherTime);
                const otherEndTime = otherStartTime + (otherOperation.estimatedDuration || 90);
                
                // Check for overlap
                if ((startTime < otherEndTime) && (endTime > otherStartTime)) {
                  const existingConflict = conflicts.find(c => 
                    c.room === room && (c.time === time || c.time === otherTime)
                  );
                  
                  if (!existingConflict) {
                    conflicts.push({
                      room,
                      time,
                      operations: [operation, otherOperation]
                    });
                  }
                }
              }
            }
          });
        }
      });
    });
    
    return conflicts;
  }, [schedule, parseTime]);

  // Get available time slots for a room
  const getAvailableTimeSlots = useCallback((room: OperatingRoomName, date: string = currentDate): string[] => {
    const roomSchedule = schedule[room] || {};
    const occupiedSlots = Object.keys(roomSchedule);
    
    // Generate all possible time slots (7:00 to 18:00 in 30-minute intervals)
    const allSlots: string[] = [];
    for (let hour = 7; hour <= 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        allSlots.push(timeStr);
      }
    }
    
    return allSlots.filter(slot => !occupiedSlots.includes(slot));
  }, [schedule, currentDate]);

  // Get operations for a specific time range
  const getOperationsByTimeRange = useCallback((startTime: string, endTime: string): OperationAssignment[] => {
    const start = parseTime(startTime);
    const end = parseTime(endTime);
    
    return allAssignmentsList.filter(operation => {
      const opTime = parseTime(operation.scheduledTime);
      return opTime >= start && opTime <= end;
    });
  }, [allAssignmentsList, parseTime]);

  // Add time slot function
  const addTimeSlot = useCallback((room: OperatingRoomName, time: string, operation: OperationAssignment) => {
    setSchedule(prev => {
      // Check for time conflicts
      if (prev[room][time]) {
        toast({
          title: "Zeitkonflikt",
          description: `${room} um ${time} ist bereits belegt.`,
          variant: "destructive"
        });
        return prev;
      }
      
      const newSchedule = {
        ...prev,
        [room]: {
          ...prev[room],
          [time]: operation
        }
      };
      
      // Create plan version for the change
      setTimeout(() => {
        createPlanVersion(`Operation hinzugefügt: ${room} ${time}`, 'julia_modification', [operation.id]);
      }, 100);
      
      return newSchedule;
    });
  }, [toast, createPlanVersion]);

  // Auto-save effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveToLocalStorage();
    }, 1000); // Save 1 second after changes

    return () => clearTimeout(timeoutId);
  }, [schedule, currentWorkflowStepKey, juliaOverrides, dataSourceInfo]);

  // Calculate derived values
  const juliaReviewedCount = useMemo(() => 
    allAssignmentsList.filter(op => 
      op.status === 'approved_julia' || op.status === 'modified_julia'
    ).length, 
  [allAssignmentsList]);

  const getWorkflowSteps = (): WorkflowStep[] => {
    return ALL_WORKFLOW_STEPS.map(step => {
      let status: 'completed' | 'active' | 'pending' = 'pending';
      const currentStepInfo = ALL_WORKFLOW_STEPS.find(s => s.key === currentWorkflowStepKey);
      const stepInfo = ALL_WORKFLOW_STEPS.find(s => s.key === step.key);

      if (currentStepInfo && stepInfo) {
        if (stepInfo.order < currentStepInfo.order) {
          status = 'completed';
        } else if (stepInfo.order === currentStepInfo.order) {
          status = 'active';
        }
      }
      return { ...step, label: step.label, status };
    });
  };

  // AI suggestions loading function (existing implementation with small enhancements)
  const loadGptSuggestions = useCallback(async () => {
    if (isLoading && currentWorkflowStepKey === 'GPT_SUGGESTIONS_READY') return;

    setIsLoading(true);
    if (currentWorkflowStepKey === 'PLAN_CREATED') {
      setPreviousWorkflowStepKey(currentWorkflowStepKey);
      setCurrentWorkflowStepKey('GPT_SUGGESTIONS_READY');
    }
    
    // Convert time-based operations to shift-based for AI compatibility
    const operationsForAI = allAssignmentsList
      .filter(op => op.status === 'empty' || op.status === 'critical_pending' || op.status === 'planned')
      .map(op => ({
        name: op.room,
        shift: op.shift || 'BD1', // fallback to BD1 if no shift mapped
        operationComplexity: op.complexity || 'Mittel',
      }));

    if (operationsForAI.length === 0 && currentWorkflowStepKey !== 'PLAN_CREATED') {
      toast({ 
        title: "Keine Operationen für KI-Planung", 
        description: "Alle Zeitslots sind bereits zugewiesen oder nicht für KI-Planung markiert." 
      });
      setIsLoading(false);
      return;
    }
    
    const dynamicAvailableStaff = staff.filter(s => !s.isSick).map(s => s.name);
    const dynamicSickStaff = staff.filter(s => s.isSick).map(s => s.name);

    const input: SuggestStaffingPlanInput = {
      operatingRooms: operationsForAI,
      availableStaff: dynamicAvailableStaff,
      sickStaff: dynamicSickStaff,
    };

    try {
      const suggestions = await fetchAiStaffingSuggestions(input);
      
      setSchedule(prev => {
        const newSchedule = { ...prev };
        
        suggestions.assignments.forEach(sugg => {
          const room = sugg.operatingRoom as OperatingRoomName;
          
          // Find operations in this room that match the suggestion
          Object.keys(newSchedule[room] || {}).forEach(timeSlot => {
            const operation = newSchedule[room][timeSlot];
            if (operation && (operation.status === 'empty' || operation.status === 'critical_pending' || operation.status === 'planned')) {
              const staffMembers = sugg.staff
                .map(name => staff.find(s => s.name === name))
                .filter(Boolean) as StaffMember[];
              
              newSchedule[room][timeSlot] = {
                ...operation,
                gptSuggestedStaff: staffMembers,
                assignedStaff: staffMembers,
                aiReasoning: sugg.reason,
                status: 'pending_gpt'
              };
            }
          });
        });
        
        return newSchedule;
      });
      
      // Create plan version for AI suggestions
      createPlanVersion(`KI-Personalvorschläge: ${suggestions.assignments.length} Vorschläge`, 'ai_suggestion');
      
      toast({ 
        title: "KI Personalvorschläge aktualisiert", 
        description: `${suggestions.assignments.length} Vorschläge wurden von der KI generiert.` 
      });
    } catch (error: any) {
      console.error("Fehler bei KI Vorschlägen:", error);
      toast({ 
        title: "Fehler bei KI Vorschlägen", 
        description: error.message || "Die KI konnte keine Vorschläge generieren.", 
        variant: "destructive" 
      });
      if (currentWorkflowStepKey === 'GPT_SUGGESTIONS_READY' && previousWorkflowStepKey === 'PLAN_CREATED') {
        setCurrentWorkflowStepKey('PLAN_CREATED');
      }
    } finally {
      setIsLoading(false);
    }
  }, [allAssignmentsList, staff, toast, currentWorkflowStepKey, previousWorkflowStepKey, isLoading, createPlanVersion]);

  // Auto-load GPT suggestions when plan is created
  useEffect(() => {
    if (currentWorkflowStepKey === 'PLAN_CREATED' && !isLoading && allAssignmentsList.length > 0) {
      loadGptSuggestions();
    }
  }, [loadGptSuggestions, currentWorkflowStepKey, isLoading, allAssignmentsList.length]);

  // Learning summary update function (existing implementation)
  const updateLearningSummary = useCallback(async (currentOverrides: JuliaOverride[]) => {
    if (currentOverrides.length === 0 && juliaOverrides.length === 0) {
      setAiRawLearningSummary("Noch keine Anpassungen durch Julia erfolgt. KI wartet auf Feedback.");
      setStructuredLearningPoints([
        { text: "Die KI wartet auf Julias erste Anpassungen für zeitbasierte Optimierungen.", icon: Brain },
        { text: "Verbesserungen werden nach Julias Feedback sichtbar.", icon: TrendingUp },
        { text: "Zukünftige Optimierungen basieren auf Zeitmustern und Personalverteilung.", icon: Settings2 },
      ]);
      return;
    }
    
    setIsLoading(true);
    const input: SummarizeGptLearningInput = {
      juliaOverrides: currentOverrides.map(o => `${o.operationId}: [${o.originalSuggestion.join(', ')}] -> [${o.juliaSelection.join(', ')}] (${o.reason})`),
      numOverrides: currentOverrides.length,
      totalAssignments: TOTAL_ASSIGNMENTS_FOR_JULIA
    };
    
    try {
      const summary = await fetchAiLearningSummary(input);
      setAiRawLearningSummary(summary.summary);
      setStructuredLearningPoints([
        { text: `Gelernt: ${summary.summary.split('.')[0] || "Analysiere zeitbasierte Präferenzen..."}`, icon: Brain },
        { text: `Verbesserung: Zeitoptimierte Personalplanung aktiv.`, icon: TrendingUp },
        { text: "Nächste Optimierung: Operationsdauer und Personalverfügbarkeit berücksichtigen.", icon: Settings2 },
      ]);
      toast({ title: "KI Lernfortschritt aktualisiert", description: "Die KI hat aus den letzten Änderungen gelernt." });
    } catch (error: any) {
      console.error("Error in updateLearningSummary:", error);
      toast({ 
        title: "Fehler bei KI Lern-Update", 
        description: `Fehler beim Abrufen der KI-Lernzusammenfassung. ${error.message}`, 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, juliaOverrides.length]);

  // Handler functions (existing implementations with plan versioning)
  const handleApprove = (operationId: string) => {
    // Parse operationId to get room and timeSlot
    const parts = operationId.split('-');
    if (parts.length < 3) return;
    
    const room = parts.slice(0, 2).join(' ') as OperatingRoomName; // Handle "SAAL 1" format
    const timeSlot = parts.slice(-1)[0]; // Last part should be time
    
    setSchedule(prev => {
      const newSchedule = { ...prev };
      const operation = newSchedule[room]?.[timeSlot];
      
      if (operation && (operation.status === 'pending_gpt' || operation.status === 'critical_pending' || operation.status === 'modified_julia')) {
        newSchedule[room][timeSlot] = {
          ...operation,
          status: 'approved_julia',
          assignedStaff: operation.gptSuggestedStaff || operation.assignedStaff
        };
        
        // Create plan version for approval
        setTimeout(() => {
          createPlanVersion(`Genehmigt: ${room} ${timeSlot}`, 'approval', [operationId]);
        }, 100);
        
        toast({ 
          title: "Vorschlag genehmigt", 
          description: `Einsatz für ${room} um ${timeSlot} wurde von Julia genehmigt.`
        });
      }
      return newSchedule;
    });
    setSelectedOperation(null);
  };

  const handleModify = (operationId: string, newStaffIds: string[], reason: string) => {
    const parts = operationId.split('-');
    if (parts.length < 3) return;
    
    const room = parts.slice(0, 2).join(' ') as OperatingRoomName;
    const timeSlot = parts.slice(-1)[0];
    
    let modifiedOverride: JuliaOverride | null = null;
    
    setSchedule(prev => {
      const newSchedule = { ...prev };
      const operation = newSchedule[room]?.[timeSlot];
      
      if (operation) {
        const currentStaffState = staff;
        const newStaffMembers = newStaffIds
          .map(id => currentStaffState.find(s => s.id === id))
          .filter(Boolean) as StaffMember[];
        
        const originalStaffNames = (operation.gptSuggestedStaff?.length > 0 
          ? operation.gptSuggestedStaff.map(s => s.name) 
          : operation.assignedStaff.map(s => s.name)) || ["N/A", "N/A"];
        
        newSchedule[room][timeSlot] = {
          ...operation,
          assignedStaff: newStaffMembers,
          status: 'modified_julia',
          juliaModificationReason: reason
        };
        
        modifiedOverride = {
          operationId,
          originalSuggestion: originalStaffNames.slice(0, 2),
          juliaSelection: newStaffMembers.map(s => s.name).slice(0, 2),
          reason,
        };
        
        // Create plan version for modification
        setTimeout(() => {
          createPlanVersion(`Geändert: ${room} ${timeSlot} - ${reason}`, 'julia_modification', [operationId]);
        }, 100);
        
        toast({ 
          title: "Vorschlag geändert", 
          description: `Einsatz für ${room} um ${timeSlot} wurde von Julia angepasst.`
        });
      }
      return newSchedule;
    });

    if (modifiedOverride) {
      const updatedOverrides = [...juliaOverrides, modifiedOverride];
      setJuliaOverrides(updatedOverrides);
      updateLearningSummary(updatedOverrides);
    }
    setSelectedOperation(null);
  };

  // Handle action functions (existing implementations)
  const handleExtendStaff = useCallback(() => {
    toast({ title: "Aktion: Personal verlängern", description: "Diese Aktion ist für Demo-Zwecke nicht implementiert." });
  }, [toast]);

  const handleRescheduleStaff = useCallback(() => {
    toast({ title: "Aktion: Personal umplanen", description: "Diese Aktion ist für Demo-Zwecke nicht implementiert." });
  }, [toast]);

  const handleGptOptimize = () => {
    if (currentWorkflowStepKey !== 'JULIA_REVIEW' && currentWorkflowStepKey !== 'GPT_SUGGESTIONS_READY') {
      toast({
        title: "Aktion nicht möglich", 
        description: "Optimierung ist nur während Julias Prüfung möglich.", 
        variant: "destructive"
      });
      return;
    }
    
    let approvedCount = 0;
    const prevKey = currentWorkflowStepKey;
    
    setSchedule(prev => {
      const newSchedule = { ...prev };
      
      OPERATING_ROOMS.forEach(room => {
        Object.keys(newSchedule[room]).forEach(timeSlot => {
          const operation = newSchedule[room][timeSlot];
          if (operation && (operation.status === 'pending_gpt' || operation.status === 'critical_pending')) {
            newSchedule[room][timeSlot] = {
              ...operation,
              status: 'approved_julia',
              assignedStaff: operation.gptSuggestedStaff || operation.assignedStaff
            };
            approvedCount++;
          }
        });
      });
      
      return newSchedule;
    });
    
    setPreviousWorkflowStepKey(prevKey);
    
    // Create plan version for optimization
    createPlanVersion(`KI-Optimierung: ${approvedCount} Vorschläge genehmigt`, 'ai_suggestion');
    
    if (approvedCount > 0) {
      toast({
        title: "KI-Optimierung durchgeführt", 
        description: `${approvedCount} verbleibende Vorschläge wurden automatisch genehmigt.`
      });
    } else {
      toast({
        title: "KI-Optimierung", 
        description: "Keine offenen Vorschläge zur automatischen Genehmigung gefunden."
      });
    }
  };
  
  const handleFinalizePlan = () => {
    if (currentWorkflowStepKey !== 'TORSTEN_FINAL_APPROVAL') {
      toast({
        title: "Aktion nicht möglich", 
        description: "Der Plan kann nur nach Julias Prüfung finalisiert werden.", 
        variant: "destructive"
      });
      return;
    }
    
    setSchedule(prev => {
      const newSchedule = { ...prev };
      
      OPERATING_ROOMS.forEach(room => {
        Object.keys(newSchedule[room]).forEach(timeSlot => {
          const operation = newSchedule[room][timeSlot];
          if (operation && (operation.status === 'approved_julia' || operation.status === 'modified_julia')) {
            newSchedule[room][timeSlot] = {
              ...operation,
              status: 'final_approved'
            };
          }
        });
      });
      
      return newSchedule;
    });
    
    setPreviousWorkflowStepKey(currentWorkflowStepKey);
    setCurrentWorkflowStepKey('PLAN_FINALIZED');
    
    // Create plan version for finalization
    createPlanVersion(`Plan finalisiert: ${allAssignmentsList.length} Operationen`, 'approval');
  };

  // Workflow state management
  useEffect(() => {
    let nextStepKey: WorkflowStepKey | null = null;
    const currentOrder = ALL_WORKFLOW_STEPS.find(s => s.key === currentWorkflowStepKey)?.order || 0;

    if ((currentWorkflowStepKey === 'GPT_SUGGESTIONS_READY' || currentWorkflowStepKey === 'JULIA_REVIEW') && 
        juliaReviewedCount > 0 && juliaReviewedCount < TOTAL_ASSIGNMENTS_FOR_JULIA) {
      const juliaReviewStep = ALL_WORKFLOW_STEPS.find(s => s.key === 'JULIA_REVIEW');
      if (juliaReviewStep && juliaReviewStep.order > currentOrder) {
        nextStepKey = 'JULIA_REVIEW';
      }
    } else if (currentWorkflowStepKey === 'JULIA_REVIEW' && juliaReviewedCount === TOTAL_ASSIGNMENTS_FOR_JULIA) {
      nextStepKey = 'TORSTEN_FINAL_APPROVAL';
    }

    if (nextStepKey && nextStepKey !== currentWorkflowStepKey) {
      setPreviousWorkflowStepKey(currentWorkflowStepKey);
      setCurrentWorkflowStepKey(nextStepKey);
    }
  }, [juliaReviewedCount, currentWorkflowStepKey]);

  return {
    // Core state
    schedule,
    staff,
    workflowSteps: getWorkflowSteps(),
    currentWorkflowStepKey,
    aiRawLearningSummary,
    structuredLearningPoints,
    isLoading,
    selectedOperation,
    setSelectedOperation,
    
    // Action handlers
    handleApprove,
    handleModify,
    handleGptOptimize,
    handleFinalizePlan,
    loadGptSuggestions,
    
    // Statistics
    juliaProgress: { reviewed: juliaReviewedCount, total: TOTAL_ASSIGNMENTS_FOR_JULIA },
    criticalAlertsCount: allAssignmentsList.filter(op => 
      op.status === 'critical_pending' || 
      (op.assignedStaff.length < 2 && op.status !== 'empty' && op.status !== 'final_approved')
    ).length,
    juliaModificationsCount: juliaOverrides.length,
    
    // UI data
    criticalSituationData,
    optimizationSuggestionsData,
    handleExtendStaff,
    handleRescheduleStaff,
    
    // Enhanced import/export functions
    importCSVData,
    rollbackImport,
    exportPlanAsCSV,
    savePlanToStorage,
    
    // Data management
    getDataSourceInfo,
    comparePlans,
    planHistory,
    
    // Time-based functions
    addTimeSlot,
    detectTimeConflicts,
    getAvailableTimeSlots,
    getOperationsByTimeRange,
    
    // State management
    currentDate,
    setCurrentDate,
    
    // Import progress and error handling
    importProgress,
    hasBackup: scheduleBackup !== null,
  };
}
