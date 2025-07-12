"use client";
import React, { useState, useCallback } from 'react';
import Header from '@/components/or-planner/Header';
import WorkflowStatusIndicator from '@/components/or-planner/WorkflowStatusIndicator';
import DashboardStats from '@/components/or-planner/DashboardStats';
import OperatingRoomScheduleTable from '@/components/or-planner/OperatingRoomScheduleTable';
import AiAssistantPanel from '@/components/or-planner/AiAssistantPanel';
import JuliaRecommendationsPanel from '@/components/or-planner/JuliaRecommendationsPanel';
import AssignmentModal from '@/components/or-planner/AssignmentModal';
import CSVImportModal from '@/components/or-planner/CSVImportModal';
import { useORData } from '@/hooks/useORData';
import { useCSVImport } from '@/hooks/useCSVImport';
import { STAFF_MEMBERS } from '@/lib/or-planner-data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Upload, 
  FileText, 
  Calendar, 
  Clock, 
  Users, 
  Building, 
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Info,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import type { OperationAssignment } from '@/lib/or-planner-types';

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
    juliaProgress,
    criticalAlertsCount,
    juliaModificationsCount,
    criticalSituationData,
    optimizationSuggestionsData,
    handleExtendStaff,
    handleRescheduleStaff,
    updateScheduleFromOperations, // Assuming this method exists in useORData
    transitionToNextWorkflowStep, // Assuming this method exists in useORData
  } = useORData();

  // CSV Import state
  const [showCSVImportModal, setShowCSVImportModal] = useState(false);
  const [importCompleted, setImportCompleted] = useState(false);
  const [importedOperationsCount, setImportedOperationsCount] = useState(0);
  
  const csvImport = useCSVImport();
  const availableStaffForModal = STAFF_MEMBERS.filter(s => !s.isSick);

  // Handle successful CSV import
  const handleCSVImportSuccess = useCallback(async (operations: OperationAssignment[]) => {
    try {
      // Update the schedule with imported operations
      await updateScheduleFromOperations(operations);
      
      // Set import completion state
      setImportCompleted(true);
      setImportedOperationsCount(operations.length);
      setShowCSVImportModal(false);
      
      // Transition to next workflow step
      setTimeout(() => {
        transitionToNextWorkflowStep();
        toast.success('Workflow wurde automatisch zur KI-Personalvorschlag-Phase weitergeleitet');
      }, 1500);
      
    } catch (error) {
      toast.error('Fehler beim Integrieren der CSV-Daten in den Workflow');
      console.error('CSV integration error:', error);
    }
  }, [updateScheduleFromOperations, transitionToNextWorkflowStep]);

  // Handle CSV import modal close
  const handleCSVImportClose = useCallback(() => {
    setShowCSVImportModal(false);
    if (csvImport.state.status !== 'idle') {
      csvImport.actions.clearImport();
    }
  }, [csvImport.actions, csvImport.state.status]);

  // Retry CSV import
  const handleRetryImport = useCallback(() => {
    setImportCompleted(false);
    setImportedOperationsCount(0);
    csvImport.actions.clearImport();
    setShowCSVImportModal(true);
  }, [csvImport.actions]);

  // Force continue without import (fallback)
  const handleContinueWithoutImport = useCallback(() => {
    transitionToNextWorkflowStep();
    toast.info('Workflow fortgesetzt ohne CSV-Import');
  }, [transitionToNextWorkflowStep]);

  // Loading state for initial plan creation
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

  // CSV Import Phase - shown when workflow is in PLAN_CREATED state
  const renderCSVImportPhase = () => (
    <div className="space-y-6">
      {/* Import Status Card */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            OP-Plan Import Status
          </CardTitle>
          <CardDescription>
            Importieren Sie den aktuellen OP-Plan aus einer CSV-Datei
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!importCompleted ? (
            <>
              {/* Import Instructions */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>CSV-Format Anforderungen</AlertTitle>
                <AlertDescription>
                  Die CSV-Datei muss deutsche Krankenhausdaten mit Spalten wie Datum, Zeit, 
                  Eingriff, OP-Orgaeinheit (ACH, GCH, PCH, URO, GYN, UCH) und OP-Saal (SAAL 1-8) enthalten.
                </AlertDescription>
              </Alert>

              {/* Import Button or Progress */}
              {csvImport.computed.isProcessing ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span className="font-medium">Import läuft...</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${csvImport.state.progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {csvImport.state.progress < 40 && 'Datei wird gelesen...'}
                    {csvImport.state.progress >= 40 && csvImport.state.progress < 80 && 'Daten werden validiert...'}
                    {csvImport.state.progress >= 80 && 'Import wird abgeschlossen...'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Button 
                    onClick={() => setShowCSVImportModal(true)}
                    className="w-full h-12 text-base"
                    size="lg"
                  >
                    <Upload className="mr-2 h-5 w-5" />
                    OP-Plan CSV importieren
                  </Button>
                  
                  {/* Error Display */}
                  {csvImport.computed.hasErrors && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Import-Fehler</AlertTitle>
                      <AlertDescription>
                        <ul className="list-disc list-inside space-y-1">
                          {csvImport.state.errors.slice(0, 3).map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleRetryImport}
                          className="mt-2"
                        >
                          Erneut versuchen
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Fallback Option */}
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">
                      Alternativ können Sie mit Beispieldaten fortfahren:
                    </p>
                    <Button 
                      variant="outline"
                      onClick={handleContinueWithoutImport}
                      className="w-full"
                    >
                      Mit Beispieldaten fortfahren
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Import Success Display */
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Import erfolgreich abgeschlossen</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm">Operationen:</span>
                  <Badge variant="secondary">{importedOperationsCount}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" />
                  <span className="text-sm">Workflow läuft...</span>
                </div>
              </div>

              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Nächster Schritt</AlertTitle>
                <AlertDescription>
                  Der Workflow wird automatisch zur KI-Personalvorschlag-Phase weitergeleitet.
                  Die importierten Operationen werden analysiert und Personalempfehlungen erstellt.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule Preview Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            OP-Saal Übersicht
          </CardTitle>
          <CardDescription>
            {importCompleted 
              ? `${importedOperationsCount} Operationen importiert und bereit für Personalplanung`
              : 'Wartet auf CSV-Import...'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {importCompleted ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {['SAAL 1', 'SAAL 2', 'SAAL 3', 'SAAL 4', 'SAAL 5', 'SAAL 6', 'SAAL 7', 'SAAL 8'].map((room) => (
                  <div key={room} className="p-3 bg-muted rounded-lg text-center">
                    <div className="font-medium">{room}</div>
                    <div className="text-sm text-muted-foreground">Bereit</div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Detaillierte Planung wird nach KI-Analyse verfügbar sein
              </p>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>OP-Säle werden nach CSV-Import angezeigt</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Normal operation phase - shown after CSV import is complete
  const renderNormalPhase = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
      {/* Left/Main column for Schedule and Stats */}
      <div className="lg:col-span-2 space-y-4 sm:space-y-6">
        <DashboardStats 
          juliaProgress={juliaProgress}
          criticalAlertsCount={criticalAlertsCount}
          juliaModificationsCount={juliaModificationsCount}
          importedOperationsCount={importedOperationsCount > 0 ? importedOperationsCount : undefined}
        />
        <OperatingRoomScheduleTable 
          schedule={schedule} 
          onCellClick={(op) => setSelectedOperation(op)} 
        />
      </div>

      {/* Right column for AI Assistant Panels */}
      <div className="lg:col-span-1 space-y-6">
        {/* Recommendations Section */}
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

        {/* AI Learning Progress Panel */}
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
  );

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-2 py-4 sm:px-4 sm:py-6 space-y-4 sm:space-y-6">
        <WorkflowStatusIndicator steps={workflowSteps} />
        
        {/* Conditional rendering based on workflow step */}
        {currentWorkflowStepKey === 'PLAN_CREATED' ? (
          renderCSVImportPhase()
        ) : (
          renderNormalPhase()
        )}
      </main>

      {/* Modals */}
      <CSVImportModal
        isOpen={showCSVImportModal}
        onClose={handleCSVImportClose}
        onImportSuccess={handleCSVImportSuccess}
        isLoading={csvImport.computed.isProcessing}
      />

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
