// src/app/page.tsx - Updated with CSV Import Panel and Julia Training Panel

"use client";
import React from 'react';
import Header from '@/components/or-planner/Header';
import WorkflowStatusIndicator from '@/components/or-planner/WorkflowStatusIndicator';
import DashboardStats from '@/components/or-planner/DashboardStats';
import OperatingRoomScheduleTable from '@/components/or-planner/OperatingRoomScheduleTable';
import AiAssistantPanel from '@/components/or-planner/AiAssistantPanel';
import JuliaRecommendationsPanel from '@/components/or-planner/JuliaRecommendationsPanel';
import AssignmentModal from '@/components/or-planner/AssignmentModal';
import JuliaTrainingPanel from '@/components/or-planner/JuliaTrainingPanel';
import { CSVImportPanel } from '@/components/or-planner/CSVImportPanel';
import { useORData } from '@/hooks/useORData';
import { useToast } from '@/hooks/use-toast';
import { STAFF_MEMBERS } from '@/lib/or-planner-data';
import { Skeleton } from '@/components/ui/skeleton';
import { Info } from 'lucide-react';

export default function ORNexusPlannerPage() {
  const { toast } = useToast();
  const {
    schedule,
    workflowSteps,
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
    juliaProgress,
    criticalAlertsCount,
    juliaModificationsCount,
    criticalSituationData,
    optimizationSuggestionsData,
    handleExtendStaff,
    handleRescheduleStaff,
  } = useORData();

  // Add Julia training state (for now, we'll use local state until hook is updated)
  const [juliaTrainingStatus, setJuliaTrainingStatus] = React.useState<'none' | 'uploaded' | 'processing' | 'active'>('none');

  const handleJuliaTrainingDataUploaded = (trainingData: any) => {
    console.log('Julia training data uploaded:', trainingData);
    setJuliaTrainingStatus('active');
    // Here you would integrate with your AI system
    // For now, just show that it's active
  };

  const handleCSVImportSuccess = (operations: any[]) => {
    console.log('CSV Import successful:', operations);
    toast({
      title: "CSV Import erfolgreich",
      description: `${operations.length} Operationen aus CSV importiert. Diese können nun mit der KI geplant werden.`,
    });
    // Here you would integrate the imported operations with your schedule
    // This would typically involve updating the schedule state with real operations
  };

  const availableStaffForModal = STAFF_MEMBERS.filter(s => !s.isSick);

  if (isLoading && currentWorkflowStepKey === 'PLAN_CREATED') {
     return (
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-grow container mx-auto p-4 space-y-6">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-96 w-full" />
          </main>
        </div>
     );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-2 py-4 sm:px-4 sm:py-6 space-y-4 sm:space-y-6">
        <WorkflowStatusIndicator steps={workflowSteps} />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left/Main column for Schedule and Stats */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <DashboardStats 
              juliaProgress={juliaProgress}
              criticalAlertsCount={criticalAlertsCount}
              juliaModificationsCount={juliaModificationsCount}
            />
            <OperatingRoomScheduleTable 
              schedule={schedule} 
              onCellClick={(op) => setSelectedOperation(op)} 
            />
          </div>

          {/* Right column for AI Assistant Panels */}
          <div className="lg:col-span-1 space-y-6">
            {/* CSV Import Panel */}
            <div>
              <h2 className="text-lg font-headline text-primary mb-3 flex items-center">
                <Info className="mr-2 h-5 w-5" /> OP-Plan Import
              </h2>
              <CSVImportPanel
                onImportSuccess={handleCSVImportSuccess}
                isDisabled={currentWorkflowStepKey === 'PLAN_FINALIZED'}
              />
            </div>

            {/* Julia Training Panel */}
            <div>
              <h2 className="text-lg font-headline text-primary mb-3 flex items-center">
                <Info className="mr-2 h-5 w-5" /> Julia's KI Training
              </h2>
              <JuliaTrainingPanel
                onTrainingDataUploaded={handleJuliaTrainingDataUploaded}
                currentTrainingStatus={juliaTrainingStatus}
              />
            </div>

            {/* Existing Recommendations Section */}
            <div>
              <h2 className="text-lg font-headline text-primary mb-3 flex items-center">
                <Info className="mr-2 h-5 w-5" /> GPT-4 Empfehlungen für Julia
              </h2>
              <JuliaRecommendationsPanel
                criticalSituation={criticalSituationData}
                optimizationSuggestions={optimizationSuggestionsData}
                onExtendStaff={handleExtendStaff}
                onRescheduleStaff={handleRescheduleStaff}
              />
            </div>

            {/* Existing AiAssistantPanel - now represents "GPT-4 Lernfortschritt" */}
            <AiAssistantPanel 
              aiRawLearningSummary={aiRawLearningSummary}
              structuredLearningPoints={structuredLearningPoints}
              onOptimizeClick={handleGptOptimize}
              onFinalizePlanClick={handleFinalizePlan}
              currentWorkflowStepKey={currentWorkflowStepKey}
              isLoading={isLoading}
            />
          </div>
        </div>
      </main>

      <AssignmentModal
        operation={selectedOperation}
        isOpen={!!selectedOperation}
        onClose={() => setSelectedOperation(null)}
        onApprove={handleApprove}
        onModify={handleModify}
        availableStaff={availableStaffForModal}
      />
      <footer className="text-center p-4 text-sm text-muted-foreground border-t border-border">
        © {new Date().getFullYear()} Klinikum Gütersloh - Nexus OR Planner. Alle Rechte vorbehalten.
      </footer>
    </div>
  );
}
