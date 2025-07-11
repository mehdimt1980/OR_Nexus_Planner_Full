"use client";
import React, { useState, useCallback, useEffect } from 'react';
import Header from '@/components/or-planner/Header';
import WorkflowStatusIndicator from '@/components/or-planner/WorkflowStatusIndicator';
import DashboardStats from '@/components/or-planner/DashboardStats';
import OperatingRoomScheduleTable from '@/components/or-planner/OperatingRoomScheduleTable';
import AiAssistantPanel from '@/components/or-planner/AiAssistantPanel';
import JuliaRecommendationsPanel from '@/components/or-planner/JuliaRecommendationsPanel';
import AssignmentModal from '@/components/or-planner/AssignmentModal';
import CSVImportPanel from '@/components/or-planner/CSVImportPanel';
import DataSourcePanel from '@/components/or-planner/DataSourcePanel';
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
  Users,
  Keyboard,
  HelpCircle,
  Settings,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { OperationAssignment } from '@/lib/or-planner-types';

type DataMode = 'demo' | 'imported';

/**
 * Keyboard shortcuts configuration
 */
const KEYBOARD_SHORTCUTS = [
  { key: 'Ctrl+I', action: 'CSV Import öffnen', description: 'Importiere Operationsdaten aus CSV-Datei' },
  { key: 'Ctrl+E', action: 'Plan exportieren', description: 'Exportiere aktuellen Plan als CSV' },
  { key: 'Ctrl+S', action: 'Plan speichern', description: 'Speichere aktuellen Plan lokal' },
  { key: 'Ctrl+H', action: 'Hilfe anzeigen', description: 'Zeige diese Hilfe an' },
  { key: 'Esc', action: 'Modal schließen', description: 'Schließe geöffnete Dialoge' },
  { key: 'Ctrl+Z', action: 'Backup wiederherstellen', description: 'Stelle vorherigen Zustand wieder her' },
];

/**
 * Workflow help information
 */
const WORKFLOW_HELP = [
  {
    step: '1. Daten Import',
    description: 'Importieren Sie CSV-Daten aus Ihrem Krankenhausinformationssystem oder nutzen Sie Demo-Daten zum Testen.',
    tips: ['Verwenden Sie das Semikolon (;) als Trennzeichen', 'Achten Sie auf das deutsche Datumsformat (DD.MM.YYYY)', 'Überprüfen Sie die Spaltenüberschriften']
  },
  {
    step: '2. KI-Personalvorschläge',
    description: 'Das System generiert automatisch Personalvorschläge basierend auf Komplexität und Abteilungsexpertise.',
    tips: ['KI berücksichtigt deutsche medizinische Verfahren', 'Personalspezialisierungen werden automatisch zugeordnet', 'Zeitkonflikte werden erkannt und vermieden']
  },
  {
    step: '3. Julia\'s Prüfung',
    description: 'Als OP-Pflegeleitung prüfen und genehmigen Sie die KI-Vorschläge oder nehmen Anpassungen vor.',
    tips: ['Klicken Sie auf Operations-Zellen für Details', 'Nutzen Sie die Begründungsfelder für Änderungen', 'Die KI lernt aus Ihren Anpassungen']
  },
  {
    step: '4. Finale Freigabe',
    description: 'Nach Julia\'s Prüfung kann der OP-Manager Torsten den Plan final freigeben.',
    tips: ['Überprüfen Sie die Gesamtstatistiken', 'Exportieren Sie den finalisierten Plan', 'Planblanung wird automatisch gespeichert']
  }
];

export default function ORNexusPlannerPage() {
  const [dataMode, setDataMode] = useState<DataMode>('demo');
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [showDataSourcePanel, setShowDataSourcePanel] = useState(false);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
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
    // Enhanced features
    savePlanToStorage,
    exportPlanAsCSV,
    rollbackImport,
    getDataSourceInfo,
    hasBackup
  } = useORData();

  const availableStaffForModal = STAFF_MEMBERS.filter(s => !s.isSick);

  // Check if schedule has any operations
  const hasOperations = Object.values(schedule).some(roomSchedule => 
    Object.keys(roomSchedule).length > 0
  );

  // **Keyboard Shortcuts Handler**
  useEffect(() => {
    const handleKeyboardShortcuts = (event: KeyboardEvent) => {
      // Only handle shortcuts when no input is focused
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement ||
          event.target instanceof HTMLSelectElement) {
        return;
      }

      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case 'i':
            event.preventDefault();
            setShowImportPanel(true);
            break;
          case 'e':
            event.preventDefault();
            if (hasOperations) {
              exportPlanAsCSV(true);
            }
            break;
          case 's':
            event.preventDefault();
            if (hasOperations) {
              savePlanToStorage();
            }
            break;
          case 'h':
            event.preventDefault();
            setShowHelpDialog(true);
            break;
          case 'z':
            event.preventDefault();
            if (hasBackup) {
              rollbackImport();
            }
            break;
        }
      } else if (event.key === 'Escape') {
        event.preventDefault();
        setSelectedOperation(null);
        setShowImportPanel(false);
        setShowDataSourcePanel(false);
        setShowHelpDialog(false);
      }
    };

    document.addEventListener('keydown', handleKeyboardShortcuts);
    return () => document.removeEventListener('keydown', handleKeyboardShortcuts);
  }, [hasOperations, exportPlanAsCSV, savePlanToStorage, hasBackup, rollbackImport]);

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

  // Data source panel handlers
  const handleShowDataSourcePanel = useCallback(() => {
    setShowDataSourcePanel(true);
  }, []);

  const handleClearData = useCallback(() => {
    setDataMode('demo');
    setImportedDataInfo(null);
    setShowDataSourcePanel(false);
    // Additional clearing logic would go here
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
    <TooltipProvider>
      <div className="flex flex-col min-h-screen bg-background">
        <Header 
          dataMode={dataMode}
          importedDataInfo={importedDataInfo}
          onShowImport={() => setShowImportPanel(true)}
          currentDate={currentDate}
        />
        <main className="flex-grow container mx-auto px-2 py-4 sm:px-4 sm:py-6 space-y-4 sm:space-y-6">
          
          {/* Enhanced Controls Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="flex items-center space-x-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShowDataSourcePanel}
                    className="flex items-center space-x-2"
                  >
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline">Datenquelle</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Datenquelle verwalten (Ctrl+D)</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowHelpDialog(true)}
                    className="flex items-center space-x-2"
                  >
                    <HelpCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">Hilfe</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Workflow-Hilfe anzeigen (Ctrl+H)</p>
                </TooltipContent>
              </Tooltip>

              {hasOperations && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => savePlanToStorage()}
                        className="flex items-center space-x-2"
                      >
                        <Database className="h-4 w-4" />
                        <span className="hidden sm:inline">Speichern</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Plan lokal speichern (Ctrl+S)</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportPlanAsCSV(true)}
                        className="flex items-center space-x-2"
                      >
                        <FileText className="h-4 w-4" />
                        <span className="hidden sm:inline">Export</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Plan als CSV exportieren (Ctrl+E)</p>
                    </TooltipContent>
                  </Tooltip>
                </>
              )}
            </div>

            {/* Keyboard Shortcuts Indicator */}
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <Keyboard className="h-3 w-3" />
              <span>Shortcuts: Ctrl+I (Import), Ctrl+E (Export), Ctrl+H (Hilfe)</span>
            </div>
          </div>

          {/* Data Source Panel (Collapsible) */}
          {showDataSourcePanel && (
            <div className="space-y-4">
              <DataSourcePanel
                dataSourceInfo={getDataSourceInfo()}
                onImportCSV={() => setShowImportPanel(true)}
                onExportCSV={() => exportPlanAsCSV(true)}
                onClearData={handleClearData}
                onGenerateDemo={handleDemoMode}
                onRestoreBackup={hasBackup ? rollbackImport : undefined}
                isLoading={isLoading}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDataSourcePanel(false)}
                className="w-full flex items-center space-x-2"
              >
                <ChevronUp className="h-4 w-4" />
                <span>Panel ausblenden</span>
              </Button>
            </div>
          )}

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
                  
                  {!showDataSourcePanel && (
                    <Button
                      variant="outline"
                      onClick={handleShowDataSourcePanel}
                      size="sm"
                    >
                      <ChevronDown className="h-4 w-4 mr-2" />
                      Details
                    </Button>
                  )}
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
                  
                  {/* Quick help */}
                  <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium text-sm mb-2">Schnellstart</h4>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>• Drücken Sie <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Ctrl+I</kbd> für CSV-Import</p>
                      <p>• Drücken Sie <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Ctrl+H</kbd> für detaillierte Hilfe</p>
                      <p>• Unterstützte CSV-Spalten: Datum, Zeit, Eingriff, OP-Orgaeinheit, OP-Saal</p>
                    </div>
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

        {/* Help Dialog */}
        <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <HelpCircle className="h-6 w-6" />
                <span>Nexus OR Planner - Workflow Hilfe</span>
              </DialogTitle>
              <DialogDescription>
                Umfassende Anleitung für die Nutzung des KI-gestützten OP-Planungssystems
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Keyboard Shortcuts */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <Keyboard className="h-5 w-5 mr-2" />
                  Tastaturkürzel
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {KEYBOARD_SHORTCUTS.map((shortcut, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <span className="font-medium">{shortcut.action}</span>
                        <p className="text-xs text-muted-foreground">{shortcut.description}</p>
                      </div>
                      <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm font-mono">
                        {shortcut.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>

              {/* Workflow Steps */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Workflow Schritte</h3>
                <div className="space-y-4">
                  {WORKFLOW_HELP.map((step, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <h4 className="font-semibold text-primary mb-2">{step.step}</h4>
                      <p className="text-sm text-muted-foreground mb-3">{step.description}</p>
                      <div className="space-y-1">
                        <p className="text-xs font-medium">Tipps:</p>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {step.tips.map((tip, tipIndex) => (
                            <li key={tipIndex} className="flex items-start space-x-1">
                              <span className="text-primary">•</span>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CSV Format Help */}
              <div>
                <h3 className="text-lg font-semibold mb-3">CSV-Format Anforderungen</h3>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm mb-3">Erwartete CSV-Spalten (Semikolon-getrennt):</p>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div>• Datum (DD.MM.YYYY)</div>
                    <div>• Zeit (HH:MM)</div>
                    <div>• Eingriff</div>
                    <div>• OP-Orgaeinheit</div>
                    <div>• OP-Saal</div>
                    <div>• 1.Operateur</div>
                    <div>• OP-Status</div>
                    <div>• Anmerkung</div>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <footer className="text-center p-4 text-sm text-muted-foreground border-t border-border">
          © {new Date().getFullYear()} Klinikum Gütersloh - Nexus OR Planner. Alle Rechte vorbehalten.
          {dataMode === 'imported' && (
            <Badge variant="outline" className="ml-2">
              Echte Daten
            </Badge>
          )}
        </footer>
      </div>
    </TooltipProvider>
  );
}
