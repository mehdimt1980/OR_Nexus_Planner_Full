
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
import { AlertTriangle, Lightbulb, CheckCircle, TrendingUp, BarChart2, RefreshCw, Users, Zap, Siren, Brain, Settings2 } from 'lucide-react';


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
    situation: "Saal DaVinci BD2: Ulla K. (Expertin) krank - 2 komplexe DaVinci OPs betroffen",
    gptSuggestion: "Gerhard K. (DaVinci erfahren) von UCH BD1 zu DaVinci BD2 verlängern",
    alternative: "Fatima R. (DaVinci-zertifiziert) von ACH BD2 zu DaVinci BD2 umplanen",
  });

  const [optimizationSuggestionsData, setOptimizationSuggestionsData] = useState<OptimizationSuggestionItem[]>([
    { text: "Saal GCH BD1: Georg H. hat 3 OPs - Arbeitsbelastung prüfen", icon: BarChart2 },
    { text: "Saal ACH: Gleichmäßige Verteilung der Komplexität über alle Schichten prüfen", icon: RefreshCw },
    { text: "Reserve: Thomas L. und Sandra P. flexibel für kurzfristige Engpässe einsetzen", icon: Users },
    { text: "Effizienz: Plan zu 89% optimal - sehr gut!", icon: Zap },
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
            const staffMember = getStaffMemberByName(sugg.staff);
            newSchedule[room][shift]!.gptSuggestedStaff = staffMember;
            newSchedule[room][shift]!.assignedStaff = staffMember; 
            newSchedule[room][shift]!.aiReasoning = sugg.reason;
            if (newSchedule[room][shift]!.status !== 'critical_pending') {
                 newSchedule[room][shift]!.status = 'pending_gpt';
            }
          }
        });
        return newSchedule;
      });
      toast({ title: "KI Personalvorschläge generiert", description: `${suggestions.assignments.length} Vorschläge warten auf Prüfung.` });
    } catch (error: any) {
      console.error("Fehler bei KI Vorschlägen:", error);
      toast({ title: "Fehler bei KI Vorschlägen", description: error.message || "Die KI konnte keine Vorschläge generieren.", variant: "destructive" });
      setCurrentWorkflowStepKey('PLAN_CREATED'); 
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkflowStepKey, toast, allAssignmentsList]);

  useEffect(() => {
    if (currentWorkflowStepKey === 'PLAN_CREATED' && !isLoading) { // ensure not to run if already loading
      loadGptSuggestions();
    }
  }, [loadGptSuggestions, currentWorkflowStepKey, isLoading]);


  const updateLearningSummary = useCallback(async (currentOverrides: JuliaOverride[]) => {
    if (currentOverrides.length === 0 && juliaOverrides.length === 0) { // check combined length
      setAiRawLearningSummary("Noch keine Anpassungen durch Julia erfolgt. KI wartet auf Feedback.");
      // Update structured points to reflect no overrides
      setStructuredLearningPoints([
        { text: "Die KI wartet auf Julias erste Anpassungen, um den Lernprozess zu starten.", icon: Brain },
        { text: "Verbesserungen werden nach Julias Feedback sichtbar.", icon: TrendingUp },
        { text: "Zukünftige Optimierungen basieren auf erkannten Mustern.", icon: Settings2 },
      ]);
      return;
    }
    setIsLoading(true);
    const input: SummarizeGptLearningInput = {
      juliaOverrides: currentOverrides.map(o => `${o.operationId}: ${o.originalSuggestion} -> ${o.juliaSelection} (${o.reason})`),
      numOverrides: currentOverrides.length,
      totalAssignments: TOTAL_ASSIGNMENTS_FOR_JULIA
    };
    try {
      const summary = await fetchAiLearningSummary(input);
      setAiRawLearningSummary(summary.summary);
      // Here you might parse summary.summary or use other data to update structuredLearningPoints
      // For now, we'll keep the example ones but ideally they are derived
      setStructuredLearningPoints([
        { text: `Gelernt: ${summary.summary.split('.')[0] || "Analysiere Julias Präferenzen..."}`, icon: Brain },
        { text: `Verbesserung: Aktivitätsbasiertes Lernen fortlaufend.`, icon: TrendingUp },
        { text: "Nächste Optimierung: Verfeinerung der Komplexitätsbewertung.", icon: Settings2 },
      ]);
      toast({ title: "KI Lernfortschritt aktualisiert", description: "Die KI hat aus den letzten Änderungen gelernt." });
    } catch (error) {
      console.error(error);
      toast({ title: "Fehler bei KI Lern-Update", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast, juliaOverrides.length]); // Depend on juliaOverrides.length to re-evaluate initial message

  useEffect(() => {
    // Initial call to set the correct learning summary if no overrides yet
    if (juliaOverrides.length === 0 && currentWorkflowStepKey !== 'PLAN_CREATED') {
        updateLearningSummary([]);
    }
  }, [juliaOverrides.length, currentWorkflowStepKey, updateLearningSummary]);


  const handleApprove = (operationId: string) => {
    setSchedule(prev => {
      const newSchedule = JSON.parse(JSON.stringify(prev));
      const [room, shift] = operationId.split('-') as [OperatingRoomName, Shift];
      if (newSchedule[room]?.[shift] && (newSchedule[room][shift]!.status === 'pending_gpt' || newSchedule[room][shift]!.status === 'critical_pending' || newSchedule[room][shift]!.status === 'modified_julia')) {
        newSchedule[room][shift]!.status = 'approved_julia';
        toast({ title: "Vorschlag genehmigt", description: `Einsatz für ${room} - ${shift} wurde von Julia genehmigt.`});
      }
      return newSchedule;
    });
    setSelectedOperation(null);
  };

  const handleModify = (operationId: string, newStaffId: string, reason: string) => {
    let modifiedOverride: JuliaOverride | null = null;
    setSchedule(prev => {
      const newSchedule = JSON.parse(JSON.stringify(prev));
      const [room, shift] = operationId.split('-') as [OperatingRoomName, Shift];
      const op = newSchedule[room]?.[shift];
      if (op) {
        const newStaffMember = getStaffMemberById(newStaffId);
        const originalStaffName = op.gptSuggestedStaff?.name || op.assignedStaff?.name || "N/A"; // Better fallback for original
        op.assignedStaff = newStaffMember;
        op.status = 'modified_julia';
        op.juliaModificationReason = reason;
        
        modifiedOverride = {
          operationId,
          originalSuggestion: originalStaffName,
          juliaSelection: newStaffMember?.name || "N/A",
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
        if (op.status === 'pending_gpt' || op.status === 'critical_pending') {
          newSchedule[op.room][op.shift]!.status = 'approved_julia';
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
        if (op.status === 'pending_gpt' || op.status === 'critical_pending') {
          newSchedule[op.room][op.shift]!.status = 'approved_julia';
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
        if (op.status === 'approved_julia' || op.status === 'modified_julia') {
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
    criticalAlertsCount: allAssignmentsList.filter(op => op.status === 'critical_pending' || (op.room === 'DaVinci' && op.shift === 'BD2' && op.assignedStaff?.name !== 'Karin R.')).length, 
    juliaModificationsCount: juliaOverrides.length,
    criticalSituationData,
    optimizationSuggestionsData,
    handleExtendStaff,
    handleRescheduleStaff,
  };
}
