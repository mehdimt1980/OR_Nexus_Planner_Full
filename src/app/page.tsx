"use client";
import React, { useState, useCallback } from 'react';
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
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Info, 
  Upload, 
  Database, 
  PlayCircle, 
  X,
  FileText,
  Calendar,
  Users
} from 'lucide-react';
import type { OperationAssignment } from '@/lib/or-planner-types';

type DataMode = 'demo' | 'imported';

export default function ORNexusPlannerPage() {
  const [dataMode, setDataMode] = useState<DataMode>('demo');
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [importedDataInfo, setImportedDataInfo] = useState<{
    fileName: string;
    operationCount: number;
    importDate: string;
  } | null>(null);

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
    importCSVData,
    currentDate,
    setCurrentDate,
  } = useORData();

  const availableStaffForModal = STAFF_MEMBERS.filter(s => !s.isSick);

  // Check if schedule has any operations
  const hasOperations = Object.values(schedule).some(roomSchedule => 
    Object.keys(roomSchedule).length > 0
  );

  // Handle CSV import
  const handleCSVImport = useCallback((operations: OperationAssignment[], fileName?: string) => {
    importCSVData(operations);
    setDataMode('imported');
    setShowImportPanel(false);
    
    if (fileName) {
      setImportedDataInfo({
        fileName,
        operationCount: operations.length,
        importDate: new Date().toISOString().split('T')[0]
      });
    }
  }, [importCSVData]);

  // Switch to demo mode
  const handleDemoMode = useCallback(() => {
    setDataMode('demo');
    setImportedDataInfo(null);
    // You could load demo data here if needed
  }, []);

  // Close import panel
  const handleCloseImport = useCallback(() => {
    setShowImportPanel(false);
  }, []);

  if (isLoading && currentWorkflowStepKey === 'PLAN_CREATED') {
    return (
      <div className="flex flex-col min-h-screen">
        <Header 
          dataMode={dataMode}
          importedDataInfo={importedDataInfo}
          onShowImport={() => setShowImportPanel(true)}
          currentDate={currentDate}
        />
        <main className="flex-grow container mx-auto p-4 space-y-6">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-96 w-full" />
        </main>
      </div>
    );
  }

  // Show import panel if requested
  if (showImportPanel) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header 
          dataMode={dataMode}
          importedDataInfo={importedDataInfo}
          onShowImport={() => setShowImportPanel(true)}
          currentDate={currentDate}
        />
        <main className="flex-grow container mx-auto px-2 py-4 sm:px-4 sm:py-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={handleCloseImport}
                className="flex items-center space-x-2"
              >
                <X className="h-4 w-4" />
                <span>Zurück zum Planer</span>
              </Button>
              {hasOperations && (
                <Alert className="flex-1 max-w-md">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Importierte Daten ersetzen den aktuellen Plan vollständig.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
          
          <CSVImportPanel 
            onImport={(operations) => handleCSVImport(operations, 'Imported CSV')}
            currentDate={currentDate}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header 
        dataMode={dataMode}
        importedDataInfo={importedDataInfo}
        onShowImport={() => setShowImportPanel(true)}
        currentDate={currentDate}
      />
      <main className="flex-grow container mx-auto px-2 py-4 sm:px-4 sm:py-6 space-y-4 sm:space-y-6">
        
        {/* Data Mode Indicator and Controls */}
        <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  {dataMode === 'demo' ? (
                    <PlayCircle className="h-5 w-5 text-blue-500" />
                  ) : (
                    <Database className="h-5 w-5 text-green-500" />
                  )}
                  <span className="font-semibold">
                    {dataMode === 'demo' ? 'Demo-Modus' : 'Echte Krankenhausdaten'}
                  </span>
                </div>
                
                {importedDataInfo && (
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <FileText className="h-4 w-4" />
                      <span>{importedDataInfo.fileName}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span>{importedDataInfo.operationCount} Operationen</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>Importiert: {importedDataInfo.importDate}</span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex space-x-2">
                {dataMode === 'imported' && (
                  <Button
                    variant="outline"
                    onClick={handleDemoMode}
                    size="sm"
                  >
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Demo-Modus
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setShowImportPanel(true)}
                  size="sm"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  CSV Importieren
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Empty State for Demo Mode */}
        {dataMode === 'demo' && !hasOperations && (
          <Card className="text-center py-12">
            <CardContent>
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Willkommen zum Nexus OR Planner</h3>
                  <p className="text-muted-foreground mt-2">
                    Importieren Sie CSV-Daten aus Ihrem Krankenhausinformationssystem 
                    oder nutzen Sie den Demo-Modus zum Testen.
                  </p>
                </div>
                <div className="flex justify-center space-x-4">
                  <Button
                    onClick={() => setShowImportPanel(true)}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    CSV-Daten importieren
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDemoMode}
                  >
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Demo-Modus starten
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Planning Interface - Only show if there are operations */}
        {hasOperations && (
          <>
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
                {/* GPT-4 Recommendations for Julia */}
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

                {/* AI Learning Progress */}
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
          </>
        )}
      </main>

      {/* Assignment Modal */}
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
        {dataMode === 'imported' && (
          <Badge variant="outline" className="ml-2">
            Echte Daten
          </Badge>
        )}
      </footer>
    </div>
  );
}
