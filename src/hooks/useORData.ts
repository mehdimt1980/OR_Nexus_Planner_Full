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
import { STAFF_MEMBERS as INITIAL_STAFF_MEMBERS } from '@/lib/or-planner-data';
import { useToast } from "@/hooks/use-toast";
import type { CriticalSituationData, OptimizationSuggestionItem } from '@/components/or-planner/JuliaRecommendationsPanel';
import type { LearningProgressItem } from '@/components/or-planner/AiAssistantPanel';
import { Brain, TrendingUp, Settings2 } from 'lucide-react';

const TOTAL_ASSIGNMENTS_FOR_JULIA = 19;

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

// Demo data generator function
const generateDemoSchedule = (): TimeBasedORSchedule => {
  const demoSchedule = {} as TimeBasedORSchedule;
  
  OPERATING_ROOMS.forEach(room => {
    demoSchedule[room] = {};
    
    // Add some demo operations
    const operations = [
      {
        id: `${room}-08-00`,
        patientName: "Max Mustermann",
        operationType: "Appendektomie",
        department: "Chirurgie" as Department,
        surgeon: "Dr. Schmidt",
        scheduledTime: "08:00",
        duration: "90",
        room: room,
        assignedStaff: [
          { staffId: "staff-1", name: "Dr. Schmidt", role: "Surgeon" },
          { staffId: "staff-2", name: "S. Müller", role: "Nurse" }
        ],
        status: "gpt_suggested" as const,
        priority: "medium" as const,
        notes: "Routine operation"
      },
      {
        id: `${room}-10-30`,
        patientName: "Anna Weber",
        operationType: "Gallenblasen-OP",
        department: "Chirurgie" as Department,
        surgeon: "Dr. Weber",
        scheduledTime: "10:30",
        duration: "120",
        room: room,
        assignedStaff: [
          { staffId: "staff-3", name: "Dr. Weber", role: "Surgeon" },
          { staffId: "staff-4", name: "P. Klein", role: "Anesthesiologist" }
        ],
        status: "approved_julia" as const,
        priority: "high" as const,
        notes: "Urgent case"
      }
    ];
    
    operations.forEach(op => {
      demoSchedule[room][op.scheduledTime] = op;
    });
  });
  
  return demoSchedule;
};

export function useORData() {
  const [isClient, setIsClient] = useState(false);
  const [schedule, setSchedule] = useState<TimeBasedORSchedule>(() => {
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
  const [currentDate, setCurrentDate] = useState<string>('');
  
  const [dataSourceInfo, setDataSourceInfo] = useState<{
    type: 'demo' | 'imported' | 'mixed';
    fileName?: string;
    importDate?: string;
    lastModified?: string;
  }>({ type: 'demo' });
  
  const { toast } = useToast();

  // Critical situation and optimization data
  const [criticalSituationData] = useState<CriticalSituationData>({
    title: "Kritische Situation: Personalengpass",
    situation: "Mehrere Operationen zur gleichen Zeit benötigen spezialisiertes Personal.",
    gptSuggestion: "Personal flexibel zwischen Abteilungen umverteilen und Prioritäten setzen.",
    alternative: "Weniger kritische OPs verschieben oder mit weniger erfahrenem Personal unter Supervision durchführen.",
  });

  const [optimizationSuggestionsData] = useState<OptimizationSuggestionItem[]>([
    { text: "Gleichmäßige Verteilung der Arbeitsbelastung über alle Räume prüfen", icon: Brain },
    { text: "Optimierung der Operationszeiten für bessere Personalnutzung", icon: TrendingUp },
    { text: "Reserve-Personal flexibel für kurzfristige Engpässe einsetzen", icon: Settings2 },
    { text: "Zeitbasierte Planung zu 92% optimal - sehr gut!", icon: Settings2 },
  ]);
  
  const [structuredLearningPoints] = useState<LearningProgressItem[]>([
    { text: "Gelernt aus Julia's Entscheidungen: Präferenz für zeitoptimierte Personalzuordnung.", icon: Brain },
    { text: "Verbesserung: +15% Genauigkeit bei der zeitbasierten Planung seit letzter Iteration.", icon: TrendingUp },
    { text: "Nächste Optimierung: Berücksichtigung von Operationsdauer und Personalverfügbarkeit.", icon: Settings2 },
  ]);

  // Client-side effect to load saved data and set current date
  useEffect(() => {
    setIsClient(true);
    setCurrentDate(new Date().toISOString().split('T')[0]);
    
    try {
      const savedSchedule = localStorage.getItem(STORAGE_KEYS.SCHEDULE);
      if (savedSchedule) {
        const parsed = JSON.parse(savedSchedule);
        setSchedule(parsed);
      } else {
        // Load demo data if no saved data
        setSchedule(generateDemoSchedule());
      }

      const savedWorkflow = localStorage.getItem(STORAGE_KEYS.WORKFLOW_STATE);
      if (savedWorkflow) {
        const parsed = JSON.parse(savedWorkflow);
        setCurrentWorkflowStepKey(parsed.currentStep || 'PLAN_CREATED');
        setPreviousWorkflowStepKey(parsed.previousStep || null);
      }

      const savedOverrides = localStorage.getItem(STORAGE_KEYS.JULIA_OVERRIDES);
      if (savedOverrides) {
        setJuliaOverrides(JSON.parse(savedOverrides));
      }

      const savedDataSource = localStorage.getItem(STORAGE_KEYS.DATA_SOURCE_INFO);
      if (savedDataSource) {
        setDataSourceInfo(JSON.parse(savedDataSource));
      }
    } catch (error) {
      console.warn('Failed to load saved data:', error);
      // Fallback to demo data
      setSchedule(generateDemoSchedule());
    }
  }, []);

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
      if (a.scheduledTime !== b.scheduledTime) {
        return a.scheduledTime.localeCompare(b.scheduledTime);
      }
      return a.room.localeCompare(b.room);
    });
  }, [schedule]);

  // Save to localStorage
  const saveToLocalStorage = useCallback(() => {
    if (!isClient) return;
    
    try {
      localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(schedule));
      localStorage.setItem(STORAGE_KEYS.WORKFLOW_STATE, JSON.stringify({
        currentStep: currentWorkflowStepKey,
        previousStep: previousWorkflowStepKey
      }));
      localStorage.setItem(STORAGE_KEYS.JULIA_OVERRIDES, JSON.stringify(juliaOverrides));
      localStorage.setItem(STORAGE_KEYS.DATA_SOURCE_INFO, JSON.stringify(dataSourceInfo));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }, [isClient, schedule, currentWorkflowStepKey, previousWorkflowStepKey, juliaOverrides, dataSourceInfo]);

  // Auto-save effect
  useEffect(() => {
    if (!isClient) return;
    
    const timeoutId = setTimeout(() => {
      saveToLocalStorage();
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [isClient, saveToLocalStorage]);

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

  // Action handlers
  const handleApprove = useCallback((operationId: string) => {
    setSchedule(prev => {
      const newSchedule = { ...prev };
      OPERATING_ROOMS.forEach(room => {
        Object.keys(newSchedule[room]).forEach(timeSlot => {
          if (newSchedule[room][timeSlot]?.id === operationId) {
            newSchedule[room][timeSlot] = {
              ...newSchedule[room][timeSlot],
              status: 'approved_julia'
            };
          }
        });
      });
      return newSchedule;
    });
    
    toast({
      title: "Operation genehmigt",
      description: "Die Operation wurde von Julia genehmigt.",
    });
  }, [toast]);

  const handleModify = useCallback((operationId: string, modifications: Partial<OperationAssignment>) => {
    setSchedule(prev => {
      const newSchedule = { ...prev };
      OPERATING_ROOMS.forEach(room => {
        Object.keys(newSchedule[room]).forEach(timeSlot => {
          if (newSchedule[room][timeSlot]?.id === operationId) {
            newSchedule[room][timeSlot] = {
              ...newSchedule[room][timeSlot],
              ...modifications,
              status: 'modified_julia'
            };
          }
        });
      });
      return newSchedule;
    });

    const override: JuliaOverride = {
      id: `override-${Date.now()}`,
      operationId,
      originalValue: "Previous assignment",
      newValue: "Modified assignment",
      field: "staff",
      reason: "Julia's modification",
      timestamp: new Date().toISOString(),
      confidence: 95
    };
    
    setJuliaOverrides(prev => [...prev, override]);
    
    toast({
      title: "Operation geändert",
      description: "Die Operation wurde von Julia modifiziert.",
    });
  }, [toast]);

  const handleGptOptimize = useCallback(async () => {
    setIsLoading(true);
    try {
      // Simulate AI optimization
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setCurrentWorkflowStepKey('AI_SUGGESTIONS_GENERATED');
      setAiRawLearningSummary("GPT-4 hat neue Optimierungsvorschläge generiert basierend auf aktuellen Daten und Julias Präferenzen.");
      
      toast({
        title: "KI-Optimierung abgeschlossen",
        description: "Neue Vorschläge wurden generiert.",
      });
    } catch (error) {
      toast({
        title: "Fehler",
        description: "KI-Optimierung fehlgeschlagen.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const handleFinalizePlan = useCallback(() => {
    setCurrentWorkflowStepKey('PLAN_FINALIZED');
    saveToLocalStorage();
    
    toast({
      title: "Plan finalisiert",
      description: "Der Operationsplan wurde erfolgreich finalisiert.",
    });
  }, [saveToLocalStorage, toast]);

  const handleExtendStaff = useCallback((staffId: string, hours: number) => {
    toast({
      title: "Personal verlängert",
      description: `Arbeitszeit um ${hours} Stunden verlängert.`,
    });
  }, [toast]);

  const handleRescheduleStaff = useCallback((staffId: string, newTime: string) => {
    toast({
      title: "Personal umgeplant",
      description: `Neue Einsatzzeit: ${newTime}`,
    });
  }, [toast]);

  const importCSVData = useCallback((operations: OperationAssignment[]) => {
    try {
      const newSchedule = {} as TimeBasedORSchedule;
      OPERATING_ROOMS.forEach(room => {
        newSchedule[room] = {};
      });

      operations.forEach(operation => {
        if (newSchedule[operation.room]) {
          newSchedule[operation.room][operation.scheduledTime] = operation;
        }
      });

      setSchedule(newSchedule);
      setDataSourceInfo({
        type: 'imported',
        fileName: 'imported_data.csv',
        importDate: new Date().toISOString(),
        lastModified: new Date().toISOString()
      });
      setCurrentWorkflowStepKey('PLAN_CREATED');

      toast({
        title: "CSV importiert",
        description: `${operations.length} Operationen erfolgreich importiert.`,
      });
    } catch (error) {
      toast({
        title: "Import-Fehler",
        description: "Fehler beim Importieren der CSV-Daten.",
        variant: "destructive"
      });
    }
  }, [toast]);

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
    
    // Data management
    importCSVData,
    
    // State management
    currentDate,
    setCurrentDate,
    
    // Client state flag
    isClient,
  };
}
