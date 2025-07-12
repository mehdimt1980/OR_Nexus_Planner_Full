"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  ORSchedule,
  DailyORSchedule,
  StaffMember,
  OperationAssignment,
  WorkflowStep,
  WorkflowStepKey,
  JuliaOverride,
  OperatingRoomName,
  Department,
  TimeSlot,
} from '@/lib/or-planner-types';
import { 
  ALL_WORKFLOW_STEPS, 
  OPERATING_ROOMS as NEW_OPERATING_ROOMS,
  DEPARTMENTS 
} from '@/lib/or-planner-types';
import { 
  STAFF_MEMBERS as INITIAL_STAFF_MEMBERS, 
  getStaffMemberByName, 
  getStaffMemberById,
  createEmptyDailySchedule,
  addOperationToSchedule,
  getOperationsForDate,
  getQualifiedStaff
} from '@/lib/or-planner-data';
import { fetchAiStaffingSuggestions, fetchAiLearningSummary } from '@/lib/actions';
import type { SuggestStaffingPlanInput } from '@/ai/flows/suggest-staffing-plan';
import type { SummarizeGptLearningInput } from '@/ai/flows/summarize-gpt-learning';
import { useToast } from "@/hooks/use-toast";
import type { CriticalSituationData, OptimizationSuggestionItem } from '@/components/or-planner/JuliaRecommendationsPanel';
import type { LearningProgressItem } from '@/components/or-planner/AiAssistantPanel';
import { Brain, TrendingUp, Settings2 } from 'lucide-react';

// Updated for 29 operations from CSV import
const TOTAL_ASSIGNMENTS_FOR_JULIA = 29;

export function useORData() {
  // CSV Import State
  const [csvImported, setCsvImported] = useState<boolean>(false);
  const [importedOperations, setImportedOperations] = useState<OperationAssignment[]>([]);
  const [scheduleReady, setScheduleReady] = useState<boolean>(false);
  
  // Core State (updated for CSV structure)
  const [schedule, setSchedule] = useState<ORSchedule>({});
  const [staff, setStaff] = useState<StaffMember[]>(() => JSON.parse(JSON.stringify(INITIAL_STAFF_MEMBERS)));
  const [currentWorkflowStepKey, setCurrentWorkflowStepKey] = useState<WorkflowStepKey>('PLAN_CREATED');
  const [previousWorkflowStepKey, setPreviousWorkflowStepKey] = useState<WorkflowStepKey | null>(null);
  const [aiRawLearningSummary, setAiRawLearningSummary] = useState<string>("KI lernt aus Julias Anpassungen...");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedOperation, setSelectedOperation] = useState<OperationAssignment | null>(null);
  const [juliaOverrides, setJuliaOverrides] = useState<JuliaOverride[]>([]);
  const { toast } = useToast();

  // Enhanced critical situation for new structure
  const [criticalSituationData, setCriticalSituationData] = useState<CriticalSituationData>({
    title: "Kritische Situation: Personalengpass SAAL 7",
    situation: "SAAL 7 (14:00): Für eine komplexe PCH-OP (Sehr Hoch) ist nur ein spezialisierter Pfleger verfügbar. Benötigt werden zwei mit Handchirurgie-Erfahrung.",
    gptSuggestion: "Anja M. (PCH-Spezialistin) mit Ulla K. (Handchirurgie, Mikrochirurgie) kombinieren. Optimale Skill-Abdeckung für komplexe plastische Eingriffe.",
    alternative: "Alternativ: Operation auf SAAL 6 verschieben wo bereits qualifiziertes PCH-Team eingeplant ist, oder Komplexität neu bewerten.",
  });

  const [optimizationSuggestionsData, setOptimizationSuggestionsData] = useState<OptimizationSuggestionItem[]>([
    { text: "SAAL 3 + SAAL 4: Gynäkologie-Team optimal auf 2 Säle verteilt", icon: Brain },
    { text: "ACH-Abteilung: 8 Operationen gleichmäßig über SAAL 1-3 verteilt", icon: TrendingUp },
    { text: "Reserve: Julia W. und Robert F. flexibel für kurzfristige Engpässe", icon: Settings2 },
    { text: "Effizienz: Plan zu 92% optimal - Verbesserung durch CSV-Import!", icon: Settings2 },
  ]);
  
  const [structuredLearningPoints, setStructuredLearningPoints] = useState<LearningProgressItem[]>([
      { text: "Gelernt: Deutsche Krankenhausdaten ermöglichen präzisere Personalplanung basierend auf realen Eingriffszeiten.", icon: Brain },
      { text: "Verbesserung: +15% Genauigkeit bei SAAL-spezifischer Personalzuordnung seit CSV-Integration.", icon: TrendingUp },
      { text: "Optimierung: Berücksichtigung von Abteilungs-Präferenzen für SAAL-Räume (PCH → SAAL 6-7, URO → SAAL 8).", icon: Settings2 },
  ]);

  const handleExtendStaff = useCallback(() => {
    toast({ title: "Aktion: Personal verlängern", description: "Diese Aktion ist für Demo-Zwecke nicht implementiert." });
  }, [toast]);

  const handleRescheduleStaff = useCallback(() => {
    toast({ title: "Aktion: Personal umplanen", description: "Diese Aktion ist für Demo-Zwecke nicht implementiert." });
  }, [toast]);

  // Updated to work with new schedule structure
  const allAssignmentsList = useMemo(() => {
    if (!scheduleReady || Object.keys(schedule).length === 0) {
      return importedOperations; // Return imported operations before schedule is ready
    }

    const allOperations: OperationAssignment[] = [];
    Object.values(schedule).forEach(dailySchedule => {
      NEW_OPERATING_ROOMS.forEach(room => {
        if (dailySchedule.rooms[room]) {
          allOperations.push(...dailySchedule.rooms[room]);
        }
      });
    });
    return allOperations;
  }, [schedule, scheduleReady, importedOperations]);

  const juliaReviewedCount = useMemo(() => 
    allAssignmentsList.filter(op => op.status === 'approved_julia' || op.status === 'modified_julia').length, 
    [allAssignmentsList]
  );

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
      return { ...step, status };
    });
  };

  // CSV Import Functions
  const handleCSVImport = useCallback((operations: OperationAssignment[]) => {
    try {
      setImportedOperations(operations);
      setCsvImported(true);
      
      // Create schedule from imported operations
      const newSchedule: ORSchedule = {};
      
      operations.forEach(operation => {
        if (!newSchedule[operation.date]) {
          newSchedule[operation.date] = createEmptyDailySchedule(operation.date);
        }
        newSchedule[operation.date] = addOperationToSchedule(newSchedule, operation);
      });
      
      setSchedule(newSchedule);
      setScheduleReady(true);
      
      // Update workflow
      setPreviousWorkflowStepKey(currentWorkflowStepKey);
      setCurrentWorkflowStepKey('GPT_SUGGESTIONS_READY');
      
      toast({ 
        title: "CSV Import erfolgreich", 
        description: `${operations.length} Operationen importiert und bereit für KI-Personalplanung.`,
        className: "bg-green-600 text-white"
      });
      
    } catch (error) {
      console.error('CSV import error:', error);
      toast({ 
        title: "Fehler beim CSV Import", 
        description: "Die Operationen konnten nicht in den Workflow integriert werden.",
        variant: "destructive"
      });
    }
  }, [currentWorkflowStepKey, toast]);

  const updateScheduleFromOperations = useCallback((operations: OperationAssignment[]) => {
    return handleCSVImport(operations);
  }, [handleCSVImport]);

  const transitionToNextWorkflowStep = useCallback(() => {
    const currentOrder = ALL_WORKFLOW_STEPS.find(s => s.key === currentWorkflowStepKey)?.order || 0;
    const nextStep = ALL_WORKFLOW_STEPS.find(s => s.order === currentOrder + 1);
    
    if (nextStep) {
      setPreviousWorkflowStepKey(currentWorkflowStepKey);
      setCurrentWorkflowStepKey(nextStep.key);
    }
  }, [currentWorkflowStepKey]);

  const resetForNewImport = useCallback(() => {
    setSchedule({});
    setImportedOperations([]);
    setCsvImported(false);
    setScheduleReady(false);
    setJuliaOverrides([]);
    setAiRawLearningSummary("KI lernt aus Julias Anpassungen...");
    setCurrentWorkflowStepKey('PLAN_CREATED');
    setPreviousWorkflowStepKey(null);
    toast({ title: "System zurückgesetzt", description: "Bereit für neuen CSV-Import." });
  }, [toast]);

  // Updated AI suggestions for new structure
  const loadGptSuggestions = useCallback(async () => {
    if (isLoading && currentWorkflowStepKey === 'GPT_SUGGESTIONS_READY') return;
    if (!csvImported || !scheduleReady) {
      console.log('Waiting for CSV import before loading AI suggestions');
      return;
    }

    setIsLoading(true);
    if (currentWorkflowStepKey === 'PLAN_CREATED') {
      setPreviousWorkflowStepKey(currentWorkflowStepKey);
      setCurrentWorkflowStepKey('GPT_SUGGESTIONS_READY');
    }
    
    // Updated for new structure - convert time-based operations to AI input format
    const operationsForAI = allAssignmentsList
      .filter(op => op.status === 'empty' || op.status === 'critical_pending')
      .map(op => ({
        name: op.room,
        shift: op.timeSlot?.start || '08:00', // Use time as shift identifier
        operationComplexity: op.complexity || 'Mittel',
        department: op.department || 'ACH',
        procedure: op.procedureName || 'Standard-OP'
      }));

    if (operationsForAI.length === 0 && currentWorkflowStepKey !== 'PLAN_CREATED') {
      toast({ 
        title: "Keine Operationen für KI-Planung", 
        description: "Alle Slots sind bereits zugewiesen oder nicht für KI-Planung markiert." 
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
        const newSchedule = JSON.parse(JSON.stringify(prev));
        
        suggestions.assignments.forEach(sugg => {
          // Find operation by room and time/shift
          let targetOp: OperationAssignment | null = null;
          
          Object.values(newSchedule).forEach(dailySchedule => {
            const roomOps = dailySchedule.rooms[sugg.operatingRoom as OperatingRoomName] || [];
            const foundOp = roomOps.find(op => 
              op.timeSlot?.start === sugg.shift || 
              op.room === sugg.operatingRoom
            );
            if (foundOp && !targetOp) {
              targetOp = foundOp;
            }
          });
          
          if (targetOp) {
            const staffMembers = sugg.staff
              .map(name => {
                const staffMember = staff.find(s => s.name === name);
                return staffMember ? { 
                  id: staffMember.id, 
                  name: staffMember.name, 
                  skills: staffMember.skills,
                  department: staffMember.department 
                } : null;
              })
              .filter(Boolean) as StaffMember[];
            
            targetOp.gptSuggestedStaff = staffMembers;
            targetOp.assignedStaff = staffMembers; 
            targetOp.aiReasoning = sugg.reason;
            
            if (targetOp.status === 'empty' || targetOp.status === 'critical_pending') {
              targetOp.status = 'pending_gpt';
            }
          }
        });
        
        return newSchedule;
      });
      
      toast({ 
        title: "KI Personalvorschläge aktualisiert", 
        description: `${suggestions.assignments.length} Vorschläge wurden von der KI ${currentWorkflowStepKey === 'PLAN_CREATED' ? 'generiert' : 'neu bewertet'}.` 
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
  }, [allAssignmentsList, staff, toast, currentWorkflowStepKey, previousWorkflowStepKey, isLoading, csvImported, scheduleReady]);

  useEffect(() => {
    if (currentWorkflowStepKey === 'GPT_SUGGESTIONS_READY' && csvImported && scheduleReady && !isLoading) {
      loadGptSuggestions();
    }
  }, [loadGptSuggestions, currentWorkflowStepKey, csvImported, scheduleReady, isLoading]);

  // Preserved learning summary function
  const updateLearningSummary = useCallback(async (currentOverrides: JuliaOverride[]) => {
    if (currentOverrides.length === 0 && juliaOverrides.length === 0) {
      setAiRawLearningSummary("Noch keine Anpassungen durch Julia erfolgt. KI wartet auf Feedback.");
      setStructuredLearningPoints([
        { text: "Die KI wartet auf Julias erste Anpassungen, um den Lernprozess zu starten.", icon: Brain },
        { text: "Verbesserungen werden nach Julias Feedback sichtbar.", icon: TrendingUp },
        { text: "Zukünftige Optimierungen basieren auf erkannten Mustern.", icon: Settings2 },
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
        { text: `Gelernt: ${summary.summary.split('.')[0] || "Analysiere Julias Präferenzen..."}`, icon: Brain },
        { text: `Verbesserung: Aktivitätsbasiertes Lernen fortlaufend.`, icon: TrendingUp },
        { text: "Nächste Optimierung: Verfeinerung der Abteilungs-spezifischen Personalzuordnung.", icon: Settings2 },
      ]);
      toast({ title: "KI Lernfortschritt aktualisiert", description: "Die KI hat aus den letzten Änderungen gelernt." });
    } catch (error: any) {
      console.error("Error in updateLearningSummary:", error);
      toast({ 
        title: "Fehler bei KI Lern-Update", 
        description: `Fehler beim Abrufen der KI-Lernzusammenfassung. Originalfehler: ${error.message}`, 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, juliaOverrides.length]);

  useEffect(() => {
    if (juliaOverrides.length === 0 && currentWorkflowStepKey !== 'PLAN_CREATED' && currentWorkflowStepKey !== 'GPT_SUGGESTIONS_READY') {
        updateLearningSummary([]);
    }
  }, [juliaOverrides.length, currentWorkflowStepKey, updateLearningSummary]);

  // Preserved approval functions (updated for new ID format)
  const handleApprove = (operationId: string) => {
    setSchedule(prev => {
      const newSchedule = JSON.parse(JSON.stringify(prev));
      let targetOp: OperationAssignment | null = null;
      
      // Find operation by ID across all dates and rooms
      Object.values(newSchedule).forEach(dailySchedule => {
        NEW_OPERATING_ROOMS.forEach(room => {
          const roomOps = dailySchedule.rooms[room] || [];
          const foundOp = roomOps.find(op => op.id === operationId);
          if (foundOp) {
            targetOp = foundOp;
          }
        });
      });
      
      if (targetOp && (targetOp.status === 'pending_gpt' || targetOp.status === 'critical_pending' || targetOp.status === 'modified_julia')) {
        targetOp.status = 'approved_julia';
        if (targetOp.gptSuggestedStaff && targetOp.gptSuggestedStaff.length > 0) {
          targetOp.assignedStaff = targetOp.gptSuggestedStaff;
        }
        toast({ title: "Vorschlag genehmigt", description: `Einsatz für ${targetOp.room} wurde von Julia genehmigt.`});
      }
      return newSchedule;
    });
    setSelectedOperation(null);
  };

  const handleModify = (operationId: string, newStaffIds: string[], reason: string) => {
    let modifiedOverride: JuliaOverride | null = null;
    
    setSchedule(prev => {
      const newSchedule = JSON.parse(JSON.stringify(prev));
      let targetOp: OperationAssignment | null = null;
      
      // Find operation by ID
      Object.values(newSchedule).forEach(dailySchedule => {
        NEW_OPERATING_ROOMS.forEach(room => {
          const roomOps = dailySchedule.rooms[room] || [];
          const foundOp = roomOps.find(op => op.id === operationId);
          if (foundOp) {
            targetOp = foundOp;
          }
        });
      });
      
      if (targetOp) {
        const currentStaffState = staff;
        const newStaffMembers = newStaffIds
          .map(id => currentStaffState.find(s => s.id === id))
          .filter(Boolean) as StaffMember[];
        
        const originalStaffNames = (targetOp.gptSuggestedStaff && targetOp.gptSuggestedStaff.length > 0 
          ? targetOp.gptSuggestedStaff.map(s => s.name) 
          : targetOp.assignedStaff.map(s => s.name)) || ["N/A", "N/A"];
        
        targetOp.assignedStaff = newStaffMembers;
        targetOp.status = 'modified_julia';
        targetOp.juliaModificationReason = reason;
        
        modifiedOverride = {
          operationId,
          originalSuggestion: originalStaffNames.slice(0, 2),
          juliaSelection: newStaffMembers.map(s => s.name).slice(0, 2),
          reason,
        };
        
        toast({ 
          title: "Vorschlag geändert", 
          description: `Einsatz für ${targetOp.room} wurde von Julia angepasst. KI lernt...`
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

  // Preserved workflow transition logic
  useEffect(() => {
    let nextStepKey: WorkflowStepKey | null = null;
    const currentOrder = ALL_WORKFLOW_STEPS.find(s => s.key === currentWorkflowStepKey)?.order || 0;

    if ((currentWorkflowStepKey === 'GPT_SUGGESTIONS_READY' || currentWorkflowStepKey === 'JULIA_REVIEW') && juliaReviewedCount > 0 && juliaReviewedCount < TOTAL_ASSIGNMENTS_FOR_JULIA) {
      const juliaReviewStep = ALL_WORKFLOW_STEPS.find(s => s.key === 'JULIA_REVIEW');
      if (juliaReviewStep && juliaReviewStep.order > currentOrder) {
        nextStepKey = 'JULIA_REVIEW';
      } else if (currentWorkflowStepKey !== 'JULIA_REVIEW' && juliaReviewStep && juliaReviewStep.order === currentOrder) {
        nextStepKey = 'JULIA_REVIEW';
      } else if (!juliaReviewStep) {
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

  // Preserved workflow completion toasts
  useEffect(() => {
    if (previousWorkflowStepKey === 'JULIA_REVIEW' && currentWorkflowStepKey === 'TORSTEN_FINAL_APPROVAL') {
      setTimeout(() => {
        toast({title: "Julia's Prüfung abgeschlossen!", description: "Alle Vorschläge wurden bearbeitet. Warten auf finale Freigabe."});
      }, 0);
    }
    if (previousWorkflowStepKey === 'TORSTEN_FINAL_APPROVAL' && currentWorkflowStepKey === 'PLAN_FINALIZED') {
      setTimeout(() => {
        toast({title: "Plan finalisiert!", description: "Der OP-Personalplan wurde erfolgreich von Torsten Fast freigegeben.", className: "bg-green-600 text-white"});
      }, 0);
    }
  }, [currentWorkflowStepKey, previousWorkflowStepKey, toast]);

  // Preserved demo functions
  const approveAllByDemo = useCallback(() => {
    if (currentWorkflowStepKey !== 'JULIA_REVIEW' && currentWorkflowStepKey !== 'GPT_SUGGESTIONS_READY') {
      toast({title: "Aktion nicht möglich", description: "Alle Vorschläge können nur während Julias Prüfung genehmigt werden.", variant: "destructive"});
      return;
    }
    
    const prevKey = currentWorkflowStepKey;
    
    setSchedule(prev => {
      const newSchedule = JSON.parse(JSON.stringify(prev));
      allAssignmentsList.forEach(op => {
        // Find and update operation in new schedule structure
        Object.values(newSchedule).forEach(dailySchedule => {
          NEW_OPERATING_ROOMS.forEach(room => {
            const roomOps = dailySchedule.rooms[room] || [];
            const assignment = roomOps.find(a => a.id === op.id);
            if (assignment && (assignment.status === 'pending_gpt' || assignment.status === 'critical_pending')) {
              assignment.status = 'approved_julia';
              if (assignment.gptSuggestedStaff && assignment.gptSuggestedStaff.length > 0) {
                assignment.assignedStaff = assignment.gptSuggestedStaff;
              }
            }
          });
        });
      });
      return newSchedule;
    });
    
    setPreviousWorkflowStepKey(prevKey);
    toast({title: "Alle Vorschläge genehmigt (Demo)", description: "Alle ausstehenden KI-Vorschläge wurden automatisch genehmigt."});
  }, [currentWorkflowStepKey, allAssignmentsList, toast]);

  const handleGptOptimize = () => {
    if (currentWorkflowStepKey !== 'JULIA_REVIEW' && currentWorkflowStepKey !== 'GPT_SUGGESTIONS_READY') {
      toast({title: "Aktion nicht möglich", description: "Optimierung ist nur während Julias Prüfung möglich.", variant: "destructive"});
      return;
    }
    
    let approvedCount = 0;
    const prevKey = currentWorkflowStepKey;
    
    setSchedule(prev => {
      const newSchedule = JSON.parse(JSON.stringify(prev));
      allAssignmentsList.forEach(op => {
        Object.values(newSchedule).forEach(dailySchedule => {
          NEW_OPERATING_ROOMS.forEach(room => {
            const roomOps = dailySchedule.rooms[room] || [];
            const assignment = roomOps.find(a => a.id === op.id);
            if (assignment && (assignment.status === 'pending_gpt' || assignment.status === 'critical_pending')) {
              assignment.status = 'approved_julia';
              if (assignment.gptSuggestedStaff && assignment.gptSuggestedStaff.length > 0) {
                assignment.assignedStaff = assignment.gptSuggestedStaff;
              }
              approvedCount++;
            }
          });
        });
      });
      return newSchedule;
    });
    
    setPreviousWorkflowStepKey(prevKey);
    if (approvedCount > 0) {
      toast({title: "KI-Optimierung durchgeführt", description: `${approvedCount} verbleibende Vorschläge wurden automatisch genehmigt.`});
    } else {
      toast({title: "KI-Optimierung", description: "Keine offenen Vorschläge zur automatischen Genehmigung gefunden."});
    }
  };
  
  const handleFinalizePlan = () => {
    if (currentWorkflowStepKey !== 'TORSTEN_FINAL_APPROVAL') {
      toast({title: "Aktion nicht möglich", description: "Der Plan kann nur nach Julias Prüfung finalisiert werden.", variant: "destructive"});
      return;
    }
    
    setSchedule(prev => {
      const newSchedule = JSON.parse(JSON.stringify(prev));
      allAssignmentsList.forEach(op => {
        Object.values(newSchedule).forEach(dailySchedule => {
          NEW_OPERATING_ROOMS.forEach(room => {
            const roomOps = dailySchedule.rooms[room] || [];
            const assignment = roomOps.find(a => a.id === op.id);
            if (assignment && (assignment.status === 'approved_julia' || assignment.status === 'modified_julia')) {
              assignment.status = 'final_approved';
            }
          });
        });
      });
      return newSchedule;
    });
    
    setPreviousWorkflowStepKey(currentWorkflowStepKey);
    setCurrentWorkflowStepKey('PLAN_FINALIZED');
  };

  // Preserved staff management
  const reportStaffUnavailable = useCallback((staffId: string, isUnavailable: boolean) => {
    const staffMemberToUpdate = staff.find(s => s.id === staffId);
    if (!staffMemberToUpdate) {
      toast({ title: "Fehler", description: `Personal mit ID ${staffId} nicht gefunden.`, variant: "destructive" });
      return;
    }

    setStaff(prevStaff => 
      prevStaff.map(s => s.id === staffId ? { ...s, isSick: isUnavailable } : s)
    );

    setSchedule(prevSchedule => {
      const newSchedule = JSON.parse(JSON.stringify(prevSchedule)) as ORSchedule;
      let affectedSlots = 0;

      Object.values(newSchedule).forEach(dailySchedule => {
        NEW_OPERATING_ROOMS.forEach(room => {
          const roomOps = dailySchedule.rooms[room] || [];
          roomOps.forEach(operation => {
            let staffChangedInSlot = false;
            
            if (operation.assignedStaff.some(s => s.id === staffId)) {
              operation.assignedStaff = operation.assignedStaff.filter(s => s.id !== staffId);
              staffChangedInSlot = true;
            }
            
            if (operation.gptSuggestedStaff && operation.gptSuggestedStaff.some(s => s.id === staffId)) {
              operation.gptSuggestedStaff = operation.gptSuggestedStaff.filter(s => s.id !== staffId);
              if (operation.status === 'pending_gpt' || operation.status === 'approved_julia' || operation.status === 'critical_pending') {
                staffChangedInSlot = true; 
              }
            }

            if (staffChangedInSlot) {
              affectedSlots++;
              operation.notes = `${isUnavailable ? staffMemberToUpdate.name + ' jetzt abwesend. ' : staffMemberToUpdate.name + ' wieder verfügbar. '} Plan muss ggf. angepasst werden.`;
              
              if (operation.assignedStaff.length < 2 || operation.status === 'pending_gpt') {
                operation.status = 'critical_pending';
              } else if (operation.assignedStaff.length === 0) {
                operation.status = 'empty';
              }
              
              if (operation.gptSuggestedStaff && operation.gptSuggestedStaff.some(s => s.id === staffId)) {
                operation.gptSuggestedStaff = [];
              }
            }
          });
        });
      });
      
      if (affectedSlots > 0) {
        toast({ 
          title: "Personalverfügbarkeit geändert", 
          description: `${staffMemberToUpdate.name} ist ${isUnavailable ? 'jetzt abwesend' : 'wieder verfügbar'}. ${affectedSlots} Einsätze betroffen. KI prüft Anpassungen.` 
        });
      } else {
        toast({ 
          title: "Personalverfügbarkeit geändert", 
          description: `${staffMemberToUpdate.name} ist ${isUnavailable ? 'jetzt abwesend' : 'wieder verfügbar'}. Keine direkten Planänderungen nötig.` 
        });
      }
      return newSchedule;
    });

    setTimeout(() => {
      if(currentWorkflowStepKey !== 'PLAN_FINALIZED'){
        setPreviousWorkflowStepKey(currentWorkflowStepKey);
        setCurrentWorkflowStepKey('GPT_SUGGESTIONS_READY');
      }
    }, 100);

  }, [staff, toast, currentWorkflowStepKey]);
  
  // Expose functions for testing
  useEffect(() => {
    // @ts-ignore
    window.demoApproveAll = approveAllByDemo;
    // @ts-ignore
    window.reportStaffUnavailable = reportStaffUnavailable;
    
    return () => {
      // @ts-ignore
      window.demoApproveAll = undefined;
      // @ts-ignore
      window.reportStaffUnavailable = undefined;
    }
  }, [approveAllByDemo, reportStaffUnavailable]);

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
    
    // CSV Import functions
    handleCSVImport,
    updateScheduleFromOperations,
    transitionToNextWorkflowStep,
    resetForNewImport,
    csvImported,
    scheduleReady,
    
    // Preserved workflow functions
    handleApprove,
    handleModify,
    handleGptOptimize,
    handleFinalizePlan,
    loadGptSuggestions,
    reportStaffUnavailable,
    
    // Progress tracking (updated for 29 operations)
    juliaProgress: { reviewed: juliaReviewedCount, total: TOTAL_ASSIGNMENTS_FOR_JULIA },
    criticalAlertsCount: allAssignmentsList.filter(op => 
      op.status === 'critical_pending' || 
      (op.assignedStaff.length < 2 && op.status !== 'empty' && op.status !== 'final_approved')
    ).length,
    juliaModificationsCount: juliaOverrides.length,
    
    // Enhanced panels data
    criticalSituationData,
    optimizationSuggestionsData,
    handleExtendStaff,
    handleRescheduleStaff,
  };
}
