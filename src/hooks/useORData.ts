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
} from '@/lib/or-planner-types';
import { ALL_WORKFLOW_STEPS, OPERATING_ROOMS } from '@/lib/or-planner-types';
import { STAFF_MEMBERS as INITIAL_STAFF_MEMBERS, getStaffMemberByName, getStaffMemberById, ROOM_DEPARTMENT_MAPPING } from '@/lib/or-planner-data';
import { fetchAiStaffingSuggestions, fetchAiLearningSummary } from '@/lib/actions';
import type { SuggestStaffingPlanInput } from '@/ai/flows/suggest-staffing-plan';
import type { SummarizeGptLearningInput } from '@/ai/flows/summarize-gpt-learning';
import { useToast } from "@/hooks/use-toast";
import type { CriticalSituationData, OptimizationSuggestionItem } from '@/components/or-planner/JuliaRecommendationsPanel';
import type { LearningProgressItem } from '@/components/or-planner/AiAssistantPanel';
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

const TOTAL_ASSIGNMENTS_FOR_JULIA = 19; // As per requirements

// Time-based schedule type: room -> timeSlot -> operation
type TimeBasedORSchedule = Record<OperatingRoomName, Record<string, OperationAssignment>>;

export function useORData() {
  // Updated to use time-based structure instead of shift-based
  const [schedule, setSchedule] = useState<TimeBasedORSchedule>(() => {
    // Initialize empty schedule
    const emptySchedule = {} as TimeBasedORSchedule;
    OPERATING_ROOMS.forEach(room => {
      emptySchedule[room] = {};
    });
    return emptySchedule;
  });
  
  const [staff, setStaff] = useState<StaffMember[]>(() => JSON.parse(JSON.stringify(INITIAL_STAFF_MEMBERS)));
  const [currentWorkflowStepKey, setCurrentWorkflowStepKey] = useState<WorkflowStepKey>('PLAN_CREATED');
  const [previousWorkflowStepKey, setPreviousWorkflowStepKey] = useState<WorkflowStepKey | null>(null);
  const [aiRawLearningSummary, setAiRawLearningSummary] = useState<string>("KI lernt aus Julias Anpassungen...");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedOperation, setSelectedOperation] = useState<OperationAssignment | null>(null);
  const [juliaOverrides, setJuliaOverrides] = useState<JuliaOverride[]>([]);
  const [currentDate, setCurrentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
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

  // Update the importCSVData function parameter types
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
    if (csvData && csvData.length > 0) {
      validationResult = validateCompleteImport(csvData, operations);
    } else {
      // If no CSV data provided, perform basic operation validation
      validationResult = {
        structureValidation: { 
          isValid: true, 
          errors: [], 
          warnings: [], 
          summary: { 
            totalRows: operations.length, 
            validRows: operations.length, 
            errorRows: 0, 
            warningRows: 0 
          } 
        },
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
  }, [schedule, toast, rollbackImport]); // Add missing dependencies

  // Rollback functionality
  const rollbackImport = useCallback(() => {
    if (scheduleBackup) {
      setSchedule(scheduleBackup);
      setScheduleBackup(null);
      toast({
        title: "Import rückgängig gemacht",
        description: "Der vorherige Zustand wurde wiederhergestellt.",
        className: "bg-blue-600 text-white"
      });
    }
  }, [scheduleBackup, toast]);

  // Enhanced CSV import with transformation and validation
  const importCSVDataWithValidation = useCallback(async (csvData: any[]) => {
    setImportProgress({
      isImporting: true,
      currentStep: 'Starte Import...',
      progress: 0,
      errors: []
    });

    try {
      // Step 1: Transform CSV data (30% progress)
      const transformationResult = transformCSVToOperations(csvData, (progress: TransformationProgress) => {
        const progressPercent = Math.round((progress.currentRow / progress.totalRows) * 30);
        setImportProgress(prev => ({
          ...prev,
          currentStep: progress.message,
          progress: progressPercent
        }));
      });

      // Step 2: Validate transformation result (50% progress)
      setImportProgress(prev => ({
        ...prev,
        currentStep: 'Validiere Transformationsergebnis...',
        progress: 50
      }));

      const transformationValidation = validateTransformationResult(transformationResult);
      
      if (!transformationValidation.isValid) {
        throw new Error(`Transformation fehlgeschlagen: ${transformationValidation.summary}`);
      }

      // Step 3: Import the operations (remaining progress handled by importCSVData)
      setImportProgress(prev => ({
        ...prev,
        currentStep: 'Importiere Operationen...',
        progress: 70
      }));

      await importCSVData(transformationResult.operations, csvData);

    } catch (error) {
      console.error('CSV import with validation error:', error);
      setImportProgress({
        isImporting: false,
        currentStep: 'Import fehlgeschlagen',
        progress: 0,
        errors: [error instanceof Error ? error.message : 'Unbekannter Fehler']
      });

      toast({
        title: "CSV-Import fehlgeschlagen",
        description: error instanceof Error ? error.message : 'Ein unerwarteter Fehler ist aufgetreten.',
        variant: "destructive"
      });
    }
  }, [importCSVData, toast]);

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
      
      return {
        ...prev,
        [room]: {
          ...prev[room],
          [time]: operation
        }
      };
    });
  }, [toast]);

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
  }, [schedule]);

  // Helper function to parse time string to minutes
  const parseTime = useCallback((timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }, []);

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

  const loadGptSuggestions = useCallback(async () => {
    if (isLoading && currentWorkflowStepKey === 'GPT_SUGGESTIONS_READY') return;
  
    setIsLoading(true);
    if (currentWorkflowStepKey === 'PLAN_CREATED') {
      setPreviousWorkflowStepKey(currentWorkflowStepKey);
      setCurrentWorkflowStepKey('GPT_SUGGESTIONS_READY');
    }
    
    // Convert time-based operations to the correct input format for AI
    const operationsForAI = allAssignmentsList
      .filter(op => op.status === 'empty' || op.status === 'critical_pending' || op.status === 'planned')
      .map(op => ({
        id: op.id,
        room: op.room,
        department: op.department,
        scheduledTime: op.scheduledTime,
        procedureName: op.procedureName,
        primarySurgeon: op.primarySurgeon,
        operationComplexity: op.complexity || 'Mittel',
        estimatedDuration: op.estimatedDuration
      }));
  
    if (operationsForAI.length === 0 && currentWorkflowStepKey !== 'PLAN_CREATED') {
      toast({ 
        title: "Keine Operationen für KI-Planung", 
        description: "Alle Zeitslots sind bereits zugewiesen oder nicht für KI-Planung markiert." 
      });
      setIsLoading(false);
      return;
    }
    
    // Updated input format for the AI flow
    const input: SuggestStaffingPlanInput = {
      operations: operationsForAI,
      availableStaff: staff.filter(s => !s.isSick).map(s => ({
        name: s.name,
        departmentExpertise: s.departmentSpecializations || [],
        skills: s.skills || [],
        currentAssignments: [] // Could be populated with current assignments
      })),
      sickStaff: staff.filter(s => s.isSick).map(s => s.name),
      currentDate: currentDate
    };
  
    try {
      const suggestions = await fetchAiStaffingSuggestions(input);
      
      setSchedule(prev => {
        const newSchedule = { ...prev };
        
        suggestions.assignments.forEach(sugg => {
          const room = sugg.operationId.split('-')[0] + ' ' + sugg.operationId.split('-')[1] as OperatingRoomName;
          const timeSlot = sugg.operationId.split('-').slice(-1)[0];
          
          if (newSchedule[room] && newSchedule[room][timeSlot]) {
            const operation = newSchedule[room][timeSlot];
            const staffMembers = sugg.assignedStaff
              .map(staffAssignment => staff.find(s => s.name === staffAssignment.name))
              .filter(Boolean) as StaffMember[];
            
            newSchedule[room][timeSlot] = {
              ...operation,
              gptSuggestedStaff: staffMembers,
              assignedStaff: staffMembers,
              aiReasoning: sugg.reasoning,
              status: 'pending_gpt'
            };
          }
        });
        
        return newSchedule;
      });
      
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
  }, [allAssignmentsList, staff, toast, currentWorkflowStepKey, previousWorkflowStepKey, isLoading, currentDate]);

  useEffect(() => {
    if (currentWorkflowStepKey === 'PLAN_CREATED' && !isLoading && allAssignmentsList.length > 0) {
      loadGptSuggestions();
    }
  }, [loadGptSuggestions, currentWorkflowStepKey, isLoading, allAssignmentsList.length]);

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

  // Handle action functions
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
    schedule,
    staff,
    workflowSteps: getWorkflowSteps(),
    currentWorkflowStepKey,
    aiRawLearningSummary,
    structuredLearningPoints,
    isLoading,
    selectedOperation,
    setSelectedOperation,
    handleApprove,
    handleModify,
    handleGptOptimize,
    handleFinalizePlan,
    loadGptSuggestions,
    juliaProgress: { reviewed: juliaReviewedCount, total: TOTAL_ASSIGNMENTS_FOR_JULIA },
    criticalAlertsCount: allAssignmentsList.filter(op => 
      op.status === 'critical_pending' || 
      (op.assignedStaff.length < 2 && op.status !== 'empty' && op.status !== 'final_approved')
    ).length,
    juliaModificationsCount: juliaOverrides.length,
    criticalSituationData,
    optimizationSuggestionsData,
    handleExtendStaff,
    handleRescheduleStaff,
    // Enhanced import functions
    importCSVData,
    importCSVDataWithValidation,
    rollbackImport,
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
