"use client";
import React from 'react';
import Header from '@/components/or-planner/Header';
import WorkflowStatusIndicator from '@/components/or-planner/WorkflowStatusIndicator';
import DashboardStats from '@/components/or-planner/DashboardStats';
import OperatingRoomScheduleTable from '@/components/or-planner/OperatingRoomScheduleTable';
import AiAssistantPanel from '@/components/or-planner/AiAssistantPanel';
import AssignmentModal from '@/components/or-planner/AssignmentModal';
import { useORData } from '@/hooks/useORData';
import { STAFF_MEMBERS } from '@/lib/or-planner-data';
import { Skeleton } from '@/components/ui/skeleton';

export default function ORNexusPlannerPage() {
  const {
    schedule,
    workflowSteps,
    currentWorkflowStepKey,
    aiLearningSummary,
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
  } = useORData();

  const availableStaffForModal = STAFF_MEMBERS.filter(s => !s.isSick);

  // Basic loading state for the whole page if initial data is loading hard
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
          <div className="lg:col-span-1">
            <AiAssistantPanel 
              learningSummary={aiLearningSummary}
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
