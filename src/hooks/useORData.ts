
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
import { INITIAL_SCHEDULE_TEMPLATE, STAFF_MEMBERS, AVAILABLE_STAFF_FOR_AI, SICK_STAFF_FOR_AI, getStaffMemberByName, getStaffMemberById } from '@/lib/or-planner-data';
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
  const [staff, setStaff] = useState<StaffMember[]>(STAFF_MEMBERS);
  const [currentWorkflowStepKey, setCurrentWorkflowStepKey] = useState<WorkflowStepKey>('PLAN_CREATED');
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
    { text: "Saal GCH BD1: Georg H. hat 3 OPs - Arbeitsbelastung prüfen", icon: Brain }, // Using Brain as placeholder
    { text: "Saal ACH: Gleichmäßige Verteilung der Komplexität über alle Schichten prüfen", icon: TrendingUp },
    { text: "Reserve: Thomas L. und Sandra P. flexibel für kurzfristige Engpässe einsetzen", icon: Settings2 },
    { text: "Effizienz: Plan zu 89% optimal - sehr gut!", icon: Settings2 }, // Placeholder
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
      if (step.key === currentWorkflowStepKey) {
        status = 'active';
      } else {
        const stepIndex = ALL_WORKFLOW_STEPS.findIndex(s => s.key === step.key);
        const currentIndex = ALL_WORKFLOW_STEPS.findIndex(s => s.key === currentWorkflowStepKey);
        if (stepIndex < currentIndex) {
          status = 'completed';
        }
      }
      return { ...step, status };
    });
  };
  
  const loadGptSuggestions = useCallback(async () => {
    if (currentWorkflowStepKey !== 'PLAN_CREATED') return;

    setIsLoading(true);
    setCurrentWorkflowStepKey('GPT_SUGGESTIONS_READY');
    
    const operationsForAI = allAssignmentsList
      .filter(op => op.status === 'empty' || op.status === 'critical_pending')
      .map(op => ({
        name: op.room,
        shift: op.shift,
        operationComplexity: op.complexity || 'Mittel',
      }));

    const input: SuggestStaffingPlanInput = {
      operatingRooms: operationsForAI,
      availableStaff: AVAILABLE_STAFF_FOR_AI,
      sickStaff: SICK_STAFF_FOR_AI,
    };

    try {
      const suggestions = await fetchAiStaffingSuggestions(input);
      setSchedule(prev => {
        const newSchedule = JSON.parse(JSON.stringify(prev));
        suggestions.assignments.forEach(sugg => {
          const room = sugg.operatingRoom as OperatingRoomName;
          const shift = sugg.shift as Shift;
          if (newSchedule[room]?.[shift]) {
            const staffMembers = sugg.staff
              .map(name => getStaffMemberByName(name))
              .filter(Boolean) as StaffMember[];
            
            newSchedule[room][shift]!.gptSuggestedStaff = staffMembers;
            newSchedule[room][shift]!.assignedStaff = staffMembers; // Initialize with AI suggestions
            newSchedule[room][shift]!.aiReasoning = sugg.reason;
            if (newSchedule[room][shift]!.status !== 'critical_pending') {
                 newSchedule[room][shift]!.status = 'pending_gpt';
            }
          }
        });
        return newSchedule;
      });
      toast({ title: "KI Personalvorschläge generiert", description: `${suggestions.assignments.length} Vorschläge (mit je 2 Pflegern) warten auf Prüfung.` });
    } catch (error: any) {
      console.error("Fehler bei KI Vorschlägen:", error);
      toast({ title: "Fehler bei KI Vorschlägen", description: error.message || "Die KI konnte keine Vorschläge generieren.", variant: "destructive" });
      setCurrentWorkflowStepKey('PLAN_CREATED');
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkflowStepKey, toast, allAssignmentsList]);

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
      // Adjusting input for SummarizeGptLearningInput:
      // Flatten the array of staff names for the string description
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
    } catch (error) {
      console.error(error);
      toast({ title: "Fehler bei KI Lern-Update", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast, juliaOverrides.length]);

  useEffect(() => {
    if (juliaOverrides.length === 0 && currentWorkflowStepKey !== 'PLAN_CREATED') {
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
        // Ensure assignedStaff reflects the (potentially dual) gptSuggestedStaff if approved
        if (op.gptSuggestedStaff && op.gptSuggestedStaff.length > 0) {
          op.assignedStaff = op.gptSuggestedStaff;
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
        const newStaffMembers = newStaffIds.map(id => getStaffMemberById(id)).filter(Boolean) as StaffMember[];
        const originalStaffNames = (op.gptSuggestedStaff && op.gptSuggestedStaff.length > 0 ? op.gptSuggestedStaff.map(s => s.name) : op.assignedStaff.map(s => s.name)) || ["N/A"];
        
        op.assignedStaff = newStaffMembers;
        op.status = 'modified_julia';
        op.juliaModificationReason = reason;
        
        modifiedOverride = {
          operationId,
          originalSuggestion: originalStaffNames,
          juliaSelection: newStaffMembers.map(s => s.name),
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
    if (currentWorkflowStepKey === 'GPT_SUGGESTIONS_READY' && juliaReviewedCount > 0) {
      setCurrentWorkflowStepKey('JULIA_REVIEW');
    }
    if (currentWorkflowStepKey === 'JULIA_REVIEW' && juliaReviewedCount === TOTAL_ASSIGNMENTS_FOR_JULIA) {
       setCurrentWorkflowStepKey('TORSTEN_FINAL_APPROVAL');
       toast({title: "Julia's Prüfung abgeschlossen!", description: "Alle Vorschläge wurden bearbeitet. Warten auf finale Freigabe."});
    }
  }, [juliaReviewedCount, currentWorkflowStepKey, toast]);

  const approveAllByDemo = useCallback(() => {
    if (currentWorkflowStepKey !== 'JULIA_REVIEW' && currentWorkflowStepKey !== 'GPT_SUGGESTIONS_READY') {
      toast({title: "Aktion nicht möglich", description: "Alle Vorschläge können nur während Julias Prüfung genehmigt werden.", variant: "destructive"});
      return;
    }
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
    toast({title: "Alle Vorschläge genehmigt (Demo)", description: "Alle ausstehenden KI-Vorschläge wurden automatisch genehmigt."});
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
    setCurrentWorkflowStepKey('PLAN_FINALIZED');
    toast({title: "Plan finalisiert!", description: "Der OP-Personalplan wurde erfolgreich von Torsten Fast freigegeben.", className: "bg-green-600 text-white"});
  };


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
    criticalAlertsCount: allAssignmentsList.filter(op => op.status === 'critical_pending' || (op.room === 'DaVinci' && op.shift === 'BD2' && op.assignedStaff.length < 2)).length,
    juliaModificationsCount: juliaOverrides.length,
    criticalSituationData,
    optimizationSuggestionsData,
    handleExtendStaff,
    handleRescheduleStaff,
  };
}
