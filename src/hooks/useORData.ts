
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
  Shift,
} from '@/lib/or-planner-types';
import { ALL_WORKFLOW_STEPS, SHIFTS, OPERATING_ROOMS } from '@/lib/or-planner-types';
import { INITIAL_SCHEDULE_TEMPLATE, STAFF_MEMBERS as INITIAL_STAFF_MEMBERS, getStaffMemberByName, getStaffMemberById } from '@/lib/or-planner-data';
import { fetchAiStaffingSuggestions, fetchAiLearningSummary } from '@/lib/actions';
import type { SuggestStaffingPlanInput } from '@/ai/flows/suggest-staffing-plan';
import type { SummarizeGptLearningInput } from '@/ai/flows/summarize-gpt-learning';
import { useToast } from "@/hooks/use-toast";
import type { CriticalSituationData, OptimizationSuggestionItem } from '@/components/or-planner/JuliaRecommendationsPanel';
import type { LearningProgressItem } from '@/components/or-planner/AiAssistantPanel';
import { Brain, TrendingUp, Settings2 } from 'lucide-react';


const TOTAL_ASSIGNMENTS_FOR_JULIA = 19; // As per requirements

export function useORData() {
  const [schedule, setSchedule] = useState<ORSchedule>(INITIAL_SCHEDULE_TEMPLATE());
  const [staff, setStaff] = useState<StaffMember[]>(() => JSON.parse(JSON.stringify(INITIAL_STAFF_MEMBERS))); // Deep copy for mutable state
  const [currentWorkflowStepKey, setCurrentWorkflowStepKey] = useState<WorkflowStepKey>('PLAN_CREATED');
  const [previousWorkflowStepKey, setPreviousWorkflowStepKey] = useState<WorkflowStepKey | null>(null);
  const [aiRawLearningSummary, setAiRawLearningSummary] = useState<string>("KI lernt aus Julias Anpassungen...");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedOperation, setSelectedOperation] = useState<OperationAssignment | null>(null);
  const [juliaOverrides, setJuliaOverrides] = useState<JuliaOverride[]>([]);
  const { toast } = useToast();

  const [criticalSituationData, setCriticalSituationData] = useState<CriticalSituationData>({
    title: "Kritische Situation erkannt",
    situation: "Saal DaVinci BD2: Ulla K. (Expertin) krank - 2 komplexe DaVinci OPs betroffen, benötigen je 2 erfahrene Pfleger.",
    gptSuggestion: "Gerhard K. & Karin R. für DaVinci BD2 einplanen. Gerhard von UCH BD1 verlängern, Karin ist DaVinci-erfahren.",
    alternative: "Fatima R. & Michael B. für DaVinci BD2. Fatima DaVinci-zertifiziert, Michael als Unterstützung.",
  });

  const [optimizationSuggestionsData, setOptimizationSuggestionsData] = useState<OptimizationSuggestionItem[]>([
    { text: "Saal GCH BD1: Georg H. hat 3 OPs - Arbeitsbelastung prüfen", icon: Brain },
    { text: "Saal ACH: Gleichmäßige Verteilung der Komplexität über alle Schichten prüfen", icon: TrendingUp },
    { text: "Reserve: Thomas L. und Sandra P. flexibel für kurzfristige Engpässe einsetzen", icon: Settings2 },
    { text: "Effizienz: Plan zu 89% optimal - sehr gut!", icon: Settings2 },
  ]);
  
  const [structuredLearningPoints, setStructuredLearningPoints] = useState<LearningProgressItem[]>([
      { text: "Gelernt aus Julia's Entscheidungen: Präferenz für Personal mit spezifischer Skill-Überlappung bei ähnlicher Komplexität.", icon: Brain },
      { text: "Verbesserung: +12% Genauigkeit bei der Zuordnung zu 'Sehr Hoch' komplexen OPs seit letzter Iteration.", icon: TrendingUp },
      { text: "Nächste Optimierung: Berücksichtigung von Personal-Paar-Präferenzen (falls vorhanden).", icon: Settings2 },
  ]);

  const handleExtendStaff = useCallback(() => {
    toast({ title: "Aktion: Personal verlängern", description: "Diese Aktion ist für Demo-Zwecke nicht implementiert." });
  }, [toast]);

  const handleRescheduleStaff = useCallback(() => {
    toast({ title: "Aktion: Personal umplanen", description: "Diese Aktion ist für Demo-Zwecke nicht implementiert." });
  }, [toast]);


  const allAssignmentsList = useMemo(() => {
    return OPERATING_ROOMS.flatMap(room =>
      SHIFTS.map(shift => schedule[room]?.[shift]).filter(Boolean) as OperationAssignment[]
    );
  }, [schedule]);

  const juliaReviewedCount = useMemo(() => allAssignmentsList.filter(op => op.status === 'approved_julia' || op.status === 'modified_julia').length, [allAssignmentsList]);

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
      return { ...step, label: step.label, status }; // Ensure label is passed
    });
  };
  
  const loadGptSuggestions = useCallback(async () => {
    // Prevent re-triggering if already loading or not in the right step for initial load
    if (isLoading && currentWorkflowStepKey === 'GPT_SUGGESTIONS_READY') return;
    // Allow re-triggering if called by reportStaffUnavailable, even if step is not PLAN_CREATED

    setIsLoading(true);
    // Don't always reset to GPT_SUGGESTIONS_READY if re-planning
    if (currentWorkflowStepKey === 'PLAN_CREATED') {
      setPreviousWorkflowStepKey(currentWorkflowStepKey);
      setCurrentWorkflowStepKey('GPT_SUGGESTIONS_READY');
    }
    
    const operationsForAI = allAssignmentsList
      .filter(op => op.status === 'empty' || op.status === 'critical_pending')
      .map(op => ({
        name: op.room,
        shift: op.shift,
        operationComplexity: op.complexity || 'Mittel',
      }));

    if (operationsForAI.length === 0 && currentWorkflowStepKey !== 'PLAN_CREATED') {
       toast({ title: "Keine Operationen für KI-Planung", description: "Alle Slots sind bereits zugewiesen oder nicht für KI-Planung markiert." });
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
          const room = sugg.operatingRoom as OperatingRoomName;
          const shift = sugg.shift as Shift;
          const targetOp = newSchedule[room]?.[shift];
          if (targetOp) {
            const staffMembers = sugg.staff
              .map(name => {
                const staffMember = staff.find(s => s.name === name); // Use current staff state
                return staffMember ? { id: staffMember.id, name: staffMember.name, skills: staffMember.skills } : null;
              })
              .filter(Boolean) as StaffMember[];
            
            targetOp.gptSuggestedStaff = staffMembers;
            targetOp.assignedStaff = staffMembers; 
            targetOp.aiReasoning = sugg.reason;
            // Only update status if it was 'empty'. If 'critical_pending', it might stay critical even with suggestions.
            // Or, Julia might need to confirm if the suggestion resolves the critical aspect.
            // For now, if AI suggests for a 'critical_pending', it becomes 'pending_gpt'.
            if (targetOp.status === 'empty' || targetOp.status === 'critical_pending') {
                 targetOp.status = 'pending_gpt';
            }
          }
        });
        return newSchedule;
      });
      toast({ title: "KI Personalvorschläge aktualisiert", description: `${suggestions.assignments.length} Vorschläge (mit je 2 Pflegern) wurden von der KI ${currentWorkflowStepKey === 'PLAN_CREATED' ? 'generiert' : 'neu bewertet'}.` });
    } catch (error: any) {
      console.error("Fehler bei KI Vorschlägen:", error);
      toast({ title: "Fehler bei KI Vorschlägen", description: error.message || "Die KI konnte keine Vorschläge generieren.", variant: "destructive" });
      // Revert to previous step if initial load failed, or stay in current if re-planning failed
      if (currentWorkflowStepKey === 'GPT_SUGGESTIONS_READY' && previousWorkflowStepKey === 'PLAN_CREATED') {
         setCurrentWorkflowStepKey('PLAN_CREATED');
      }
    } finally {
      setIsLoading(false);
    }
  }, [allAssignmentsList, staff, toast, currentWorkflowStepKey, previousWorkflowStepKey, isLoading]);

  useEffect(() => {
    if (currentWorkflowStepKey === 'PLAN_CREATED' && !isLoading) {
      loadGptSuggestions();
    }
  }, [loadGptSuggestions, currentWorkflowStepKey, isLoading]);


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
        { text: "Nächste Optimierung: Verfeinerung der Komplexitätsbewertung für Personalpaare.", icon: Settings2 },
      ]);
      toast({ title: "KI Lernfortschritt aktualisiert", description: "Die KI hat aus den letzten Änderungen gelernt." });
    } catch (error: any)      {
      console.error("Error in updateLearningSummary calling fetchAiLearningSummary:", error);
      toast({ title: "Fehler bei KI Lern-Update", description: `Fehler beim Abrufen der KI-Lernzusammenfassung. Originalfehler: ${error.message}`, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast, juliaOverrides.length]);

  useEffect(() => {
    if (juliaOverrides.length === 0 && currentWorkflowStepKey !== 'PLAN_CREATED' && currentWorkflowStepKey !== 'GPT_SUGGESTIONS_READY') {
        updateLearningSummary([]);
    }
  }, [juliaOverrides.length, currentWorkflowStepKey, updateLearningSummary]);


  const handleApprove = (operationId: string) => {
    setSchedule(prev => {
      const newSchedule = JSON.parse(JSON.stringify(prev));
      const [room, shift] = operationId.split('-') as [OperatingRoomName, Shift];
      const op = newSchedule[room]?.[shift];
      if (op && (op.status === 'pending_gpt' || op.status === 'critical_pending' || op.status === 'modified_julia')) {
        op.status = 'approved_julia';
        if (op.gptSuggestedStaff && op.gptSuggestedStaff.length > 0) {
          op.assignedStaff = op.gptSuggestedStaff; // Solidify AI suggestion on approve
        }
        toast({ title: "Vorschlag genehmigt", description: `Einsatz für ${room} - ${shift} wurde von Julia genehmigt.`});
      }
      return newSchedule;
    });
    setSelectedOperation(null);
  };

  const handleModify = (operationId: string, newStaffIds: string[], reason: string) => {
    let modifiedOverride: JuliaOverride | null = null;
    setSchedule(prev => {
      const newSchedule = JSON.parse(JSON.stringify(prev));
      const [room, shift] = operationId.split('-') as [OperatingRoomName, Shift];
      const op = newSchedule[room]?.[shift];
      if (op) {
        const currentStaffState = staff; // Use the latest staff state
        const newStaffMembers = newStaffIds
          .map(id => currentStaffState.find(s => s.id === id))
          .filter(Boolean) as StaffMember[];
        
        const originalStaffNames = (op.gptSuggestedStaff && op.gptSuggestedStaff.length > 0 ? op.gptSuggestedStaff.map(s => s.name) : op.assignedStaff.map(s => s.name)) || ["N/A", "N/A"];
        
        op.assignedStaff = newStaffMembers;
        op.status = 'modified_julia';
        op.juliaModificationReason = reason;
        
        modifiedOverride = {
          operationId,
          originalSuggestion: originalStaffNames.slice(0,2), // Ensure it's always an array of 2 for consistency
          juliaSelection: newStaffMembers.map(s => s.name).slice(0,2),
          reason,
        };
        toast({ title: "Vorschlag geändert", description: `Einsatz für ${room} - ${shift} wurde von Julia angepasst. KI lernt...`});
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
  
  useEffect(() => {
    let nextStepKey: WorkflowStepKey | null = null;
    const currentOrder = ALL_WORKFLOW_STEPS.find(s => s.key === currentWorkflowStepKey)?.order || 0;

    if ((currentWorkflowStepKey === 'GPT_SUGGESTIONS_READY' || currentWorkflowStepKey === 'JULIA_REVIEW') && juliaReviewedCount > 0 && juliaReviewedCount < TOTAL_ASSIGNMENTS_FOR_JULIA) {
      const juliaReviewStep = ALL_WORKFLOW_STEPS.find(s => s.key === 'JULIA_REVIEW');
      if (juliaReviewStep && juliaReviewStep.order > currentOrder) {
        nextStepKey = 'JULIA_REVIEW';
      } else if (currentWorkflowStepKey !== 'JULIA_REVIEW' && juliaReviewStep && juliaReviewStep.order === currentOrder) {
         // If already in JULIA_REVIEW, no change, otherwise set it
         nextStepKey = 'JULIA_REVIEW';
      } else if (!juliaReviewStep) { // Should not happen
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


  const approveAllByDemo = useCallback(() => {
    if (currentWorkflowStepKey !== 'JULIA_REVIEW' && currentWorkflowStepKey !== 'GPT_SUGGESTIONS_READY') {
      toast({title: "Aktion nicht möglich", description: "Alle Vorschläge können nur während Julias Prüfung genehmigt werden.", variant: "destructive"});
      return;
    }
    const prevKey = currentWorkflowStepKey;
    
    setSchedule(prev => {
      const newSchedule = JSON.parse(JSON.stringify(prev));
      allAssignmentsList.forEach(op => {
         const assignment = newSchedule[op.room]?.[op.shift];
        if (assignment && (assignment.status === 'pending_gpt' || assignment.status === 'critical_pending')) {
          assignment.status = 'approved_julia';
          if (assignment.gptSuggestedStaff && assignment.gptSuggestedStaff.length > 0) {
            assignment.assignedStaff = assignment.gptSuggestedStaff;
          }
        }
      });
      return newSchedule;
    });
    setPreviousWorkflowStepKey(prevKey); // Set previous key before current key might change due to side effects
    toast({title: "Alle Vorschläge genehmigt (Demo)", description: "Alle ausstehenden KI-Vorschläge wurden automatisch genehmigt."});
    // The useEffect for state transitions will handle setting the new currentWorkflowStepKey based on juliaReviewedCount.
  }, [currentWorkflowStepKey, allAssignmentsList, toast]);

  useEffect(() => {
    // @ts-ignore
    window.demoApproveAll = approveAllByDemo;
    return () => { // @ts-ignore
        window.demoApproveAll = undefined;
    };
  }, [approveAllByDemo]);


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
        const assignment = newSchedule[op.room]?.[op.shift];
        if (assignment && (assignment.status === 'pending_gpt' || assignment.status === 'critical_pending')) {
          assignment.status = 'approved_julia';
           if (assignment.gptSuggestedStaff && assignment.gptSuggestedStaff.length > 0) {
            assignment.assignedStaff = assignment.gptSuggestedStaff;
          }
          approvedCount++;
        }
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
        if (newSchedule[op.room]?.[op.shift] && (newSchedule[op.room][op.shift]!.status === 'approved_julia' || newSchedule[op.room][op.shift]!.status === 'modified_julia')) {
          newSchedule[op.room][op.shift]!.status = 'final_approved';
        }
      });
      return newSchedule;
    });
    setPreviousWorkflowStepKey(currentWorkflowStepKey);
    setCurrentWorkflowStepKey('PLAN_FINALIZED');
  };

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

      OPERATING_ROOMS.forEach(room => {
        SHIFTS.forEach(shift => {
          const operation = newSchedule[room]?.[shift];
          if (operation) {
            let staffChangedInSlot = false;
            // Check assigned staff
            if (operation.assignedStaff.some(s => s.id === staffId)) {
              operation.assignedStaff = operation.assignedStaff.filter(s => s.id !== staffId);
              staffChangedInSlot = true;
            }
            // Check GPT suggested staff (if they were the basis of current assignment)
            if (operation.gptSuggestedStaff && operation.gptSuggestedStaff.some(s => s.id === staffId)) {
                operation.gptSuggestedStaff = operation.gptSuggestedStaff.filter(s => s.id !== staffId);
                 // If the original suggestion is now invalid, AI should re-evaluate.
                 // If Julia had modified it, her modification stands unless she re-evaluates.
                 // For simplicity now, if AI suggested the sick person, let AI re-evaluate.
                if (operation.status === 'pending_gpt' || operation.status === 'approved_julia' || operation.status === 'critical_pending') {
                    staffChangedInSlot = true; 
                }
            }

            if (staffChangedInSlot) {
              affectedSlots++;
              operation.notes = `${isUnavailable ? staffMemberToUpdate.name + ' jetzt abwesend. ' : staffMemberToUpdate.name + ' wieder verfügbar. '} Plan muss ggf. angepasst werden.`;
              // If slot becomes understaffed (less than 2) or was relying on this staff, mark for re-evaluation
              if (operation.assignedStaff.length < 2 || operation.status === 'pending_gpt') {
                 operation.status = 'critical_pending'; // Mark as critical to get AI attention
              } else if (operation.assignedStaff.length === 0) {
                 operation.status = 'empty';
              }
              // Clear AI suggestion if it contained the now unavailable staff, to force re-suggestion
              if (operation.gptSuggestedStaff && operation.gptSuggestedStaff.some(s => s.id === staffId)) {
                operation.gptSuggestedStaff = [];
              }
            }
          }
        });
      });
      
      if (affectedSlots > 0) {
        toast({ title: "Personalverfügbarkeit geändert", description: `${staffMemberToUpdate.name} ist ${isUnavailable ? 'jetzt abwesend' : 'wieder verfügbar'}. ${affectedSlots} Einsätze betroffen. KI prüft Anpassungen.` });
      } else {
         toast({ title: "Personalverfügbarkeit geändert", description: `${staffMemberToUpdate.name} ist ${isUnavailable ? 'jetzt abwesend' : 'wieder verfügbar'}. Keine direkten Planänderungen nötig.` });
      }
      return newSchedule;
    });

    // Trigger AI re-planning
    // Resetting workflow step might be too drastic if only one staff changed.
    // Better to let loadGptSuggestions check for 'critical_pending' or 'empty' slots.
    // We need to ensure `loadGptSuggestions` runs after state updates.
    // A slight delay or a dedicated trigger might be good.
    setTimeout(() => {
        // Set a flag or directly call loadGptSuggestions if current step allows AI interaction
        if(currentWorkflowStepKey !== 'PLAN_FINALIZED'){ // Allow re-planning unless finalized
            setPreviousWorkflowStepKey(currentWorkflowStepKey);
            setCurrentWorkflowStepKey('GPT_SUGGESTIONS_READY'); // Force re-evaluation state
            // loadGptSuggestions will be called by useEffect watching currentWorkflowStepKey or PLAN_CREATED if reset
            // Or call it directly if we refine the workflow steps
        }
    }, 100); // Ensure state updates have propagated

  }, [staff, toast, currentWorkflowStepKey]);
  
  // Expose reportStaffUnavailable for testing (e.g. via console)
  useEffect(() => {
    // @ts-ignore
    window.reportStaffUnavailable = reportStaffUnavailable;
    return () => { // @ts-ignore
      window.reportStaffUnavailable = undefined;
    }
  }, [reportStaffUnavailable]);


  return {
    schedule,
    staff, // Expose the dynamic staff list
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
    loadGptSuggestions, // Expose for potential manual refresh
    reportStaffUnavailable, // Expose the new function
    juliaProgress: { reviewed: juliaReviewedCount, total: TOTAL_ASSIGNMENTS_FOR_JULIA },
    criticalAlertsCount: allAssignmentsList.filter(op => op.status === 'critical_pending' || (op.assignedStaff.length < 2 && op.status !== 'empty' && op.status !== 'final_approved')).length,
    juliaModificationsCount: juliaOverrides.length,
    criticalSituationData,
    optimizationSuggestionsData,
    handleExtendStaff,
    handleRescheduleStaff,
  };
}
    

    
