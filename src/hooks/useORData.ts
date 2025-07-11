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

  // Import CSV data function
  const importCSVData = useCallback((operations: OperationAssignment[]) => {
    const newSchedule: TimeBasedORSchedule = {};
    
    // Initialize empty schedule
    OPERATING_ROOMS.forEach(room => {
      newSchedule[room] = {};
    });
    
    // Add operations to schedule
    operations.forEach(operation => {
      const timeSlot = operation.scheduledTime;
      const room = operation.room;
      
      if (OPERATING_ROOMS.includes(room)) {
        newSchedule[room][timeSlot] = operation;
      }
    });
    
    setSchedule(newSchedule);
    setCurrentWorkflowStepKey('GPT_SUGGESTIONS_READY');
    
    toast({
      title: "CSV-Daten importiert",
      description: `${operations.length} Operationen wurden erfolgreich importiert.`,
      className: "bg-green-600 text-white"
    });
  }, [toast]);

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
  }, [allAssignmentsList, staff, toast, currentWorkflowStepKey, previousWorkflowStepKey, isLoading]);

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
    // New time-based functions
    importCSVData,
    addTimeSlot,
    detectTimeConflicts,
    getAvailableTimeSlots,
    getOperationsByTimeRange,
    currentDate,
    setCurrentDate,
  };
}
