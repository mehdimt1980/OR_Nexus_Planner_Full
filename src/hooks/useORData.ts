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

const TOTAL_ASSIGNMENTS_FOR_JULIA = 19; // As per requirements

export function useORData() {
  const [schedule, setSchedule] = useState<ORSchedule>(INITIAL_SCHEDULE_TEMPLATE());
  const [staff, setStaff] = useState<StaffMember[]>(STAFF_MEMBERS);
  const [currentWorkflowStepKey, setCurrentWorkflowStepKey] = useState<WorkflowStepKey>('PLAN_CREATED');
  const [aiLearningSummary, setAiLearningSummary] = useState<string>("KI lernt aus Julias Anpassungen...");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedOperation, setSelectedOperation] = useState<OperationAssignment | null>(null);
  const [juliaOverrides, setJuliaOverrides] = useState<JuliaOverride[]>([]);
  const { toast } = useToast();

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
    setCurrentWorkflowStepKey('GPT_SUGGESTIONS_READY'); // Show loading for this step
    
    const operationsForAI = allAssignmentsList
      .filter(op => op.status === 'empty' || op.status === 'critical_pending') // only those needing staffing
      .map(op => ({
        name: op.room,
        shift: op.shift,
        operationComplexity: op.complexity || 'Mittel', // Fallback complexity
      }));

    const input: SuggestStaffingPlanInput = {
      operatingRooms: operationsForAI,
      availableStaff: AVAILABLE_STAFF_FOR_AI,
      sickStaff: SICK_STAFF_FOR_AI,
    };

    try {
      const suggestions = await fetchAiStaffingSuggestions(input);
      setSchedule(prev => {
        const newSchedule = JSON.parse(JSON.stringify(prev)); // Deep clone
        suggestions.assignments.forEach(sugg => {
          const room = sugg.operatingRoom as OperatingRoomName;
          const shift = sugg.shift as Shift;
          if (newSchedule[room]?.[shift]) {
            const staffMember = getStaffMemberByName(sugg.staff);
            newSchedule[room][shift]!.gptSuggestedStaff = staffMember;
            newSchedule[room][shift]!.assignedStaff = staffMember; // Initially assign GPT suggestion
            newSchedule[room][shift]!.aiReasoning = sugg.reason;
            // Keep critical_pending if it was, otherwise pending_gpt
            if (newSchedule[room][shift]!.status !== 'critical_pending') {
                 newSchedule[room][shift]!.status = 'pending_gpt';
            }
          }
        });
        return newSchedule;
      });
      toast({ title: "KI Personalvorschläge generiert", description: `${suggestions.assignments.length} Vorschläge warten auf Prüfung.` });
    } catch (error) {
      console.error(error);
      toast({ title: "Fehler bei KI Vorschlägen", description: "Die KI konnte keine Vorschläge generieren.", variant: "destructive" });
      setCurrentWorkflowStepKey('PLAN_CREATED'); // Revert step
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkflowStepKey, toast, allAssignmentsList]);

  useEffect(() => {
    // Auto-load GPT suggestions once after initial mount if workflow is at PLAN_CREATED
    if (currentWorkflowStepKey === 'PLAN_CREATED') {
      loadGptSuggestions();
    }
  }, [loadGptSuggestions, currentWorkflowStepKey]);


  const updateLearningSummary = useCallback(async (currentOverrides: JuliaOverride[]) => {
    if (currentOverrides.length === 0) {
      setAiLearningSummary("Noch keine Anpassungen durch Julia erfolgt.");
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
      setAiLearningSummary(summary.summary);
      toast({ title: "KI Lernfortschritt aktualisiert", description: "Die KI hat aus den letzten Änderungen gelernt." });
    } catch (error) {
      console.error(error);
      toast({ title: "Fehler bei KI Lern-Update", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

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
        const originalStaffName = op.gptSuggestedStaff?.name || "N/A";
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
     // For demo, this approves all remaining pending ones.
     // A real version might use confidence scores from GPT if available.
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
    aiLearningSummary,
    isLoading,
    selectedOperation,
    setSelectedOperation,
    handleApprove,
    handleModify,
    handleGptOptimize,
    handleFinalizePlan,
    loadGptSuggestions, // expose if manual trigger is needed
    juliaProgress: { reviewed: juliaReviewedCount, total: TOTAL_ASSIGNMENTS_FOR_JULIA },
    criticalAlertsCount: allAssignmentsList.filter(op => op.status === 'critical_pending' || (op.room === 'DaVinci' && op.shift === 'BD2' && op.assignedStaff?.name !== 'Karin R.')).length, // Example critical alert logic
    juliaModificationsCount: juliaOverrides.length,
  };
}
