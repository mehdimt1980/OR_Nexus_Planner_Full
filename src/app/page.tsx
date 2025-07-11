"use client";
import React, { useState } from 'react';
import Header from '@/components/or-planner/Header';
import WorkflowStatusIndicator from '@/components/or-planner/WorkflowStatusIndicator';
import DashboardStats from '@/components/or-planner/DashboardStats';
import OperatingRoomScheduleTable from '@/components/or-planner/OperatingRoomScheduleTable';
import AiAssistantPanel from '@/components/or-planner/AiAssistantPanel';
import JuliaRecommendationsPanel from '@/components/or-planner/JuliaRecommendationsPanel';
import AssignmentModal from '@/components/or-planner/AssignmentModal';
import CSVImportPanel from '@/components/or-planner/CSVImportPanel';
import { useORData } from '@/hooks/useORData';
import { STAFF_MEMBERS } from '@/lib/or-planner-data';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Info, Upload, Download } from 'lucide-react';

export default function ORNexusPlannerPage() {
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
    handleCSVImport, // Add this function
    juliaProgress,
    criticalAlertsCount,
    juliaModificationsCount,
    criticalSituationData,
    optimizationSuggestionsData,
    handleExtendStaff,
    handleRescheduleStaff,
  } = useORData();

  const [showImportDialog, setShowImportDialog] = useState(false);

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
        
        {/* Import/Export Actions */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-foreground">OP-Personalplanung</h1>
          <div className="flex space-x-2">
            <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center space-x-2">
                  <Upload className="h-4 w-4" />
                  <span>CSV Import</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>OP-Plan aus CSV importieren</DialogTitle>
                </DialogHeader>
                <CSVImportPanel 
                  onImport={(operations) => {
                    handleCSVImport(operations);
                    setShowImportDialog(false);
                  }}
                  currentDate={new Date().toISOString().split('T')[0]}
                />
              </DialogContent>
            </Dialog>
            
            <Button variant="outline" className="flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>Export</span>
            </Button>
          </div>
        </div>
        
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
            {/* New Recommendations Section */}
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
