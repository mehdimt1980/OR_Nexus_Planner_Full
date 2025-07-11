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
import { Progress } from '@/components/ui/progress';
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
  ChevronUp,
  Save,
  Download,
  History,
  Activity,
  Zap,
  CheckCircle,
  AlertTriangle,
  TrendingUp
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type { OperationAssignment } from '@/lib/or-planner-types';

type DataMode = 'demo' | 'imported';

/**
 * Keyboard shortcuts configuration with enhanced functionality
 */
const KEYBOARD_SHORTCUTS = [
  { key: 'Ctrl+I', action: 'CSV Import öffnen', description: 'Importiere Operationsdaten aus CSV-Datei', icon: Upload },
  { key: 'Ctrl+E', action: 'Plan exportieren', description: 'Exportiere aktuellen Plan als CSV', icon: Download },
  { key: 'Ctrl+S', action: 'Plan speichern', description: 'Speichere aktuellen Plan lokal', icon: Save },
  { key: 'Ctrl+H', action: 'Hilfe anzeigen', description: 'Zeige diese Hilfe an', icon: HelpCircle },
  { key: 'Ctrl+D', action: 'Datenquelle Panel', description: 'Öffne/schließe Datenquelle Panel', icon: Database },
  { key: 'Ctrl+Z', action: 'Backup wiederherstellen', description: 'Stelle vorherigen Zustand wieder her', icon: History },
  { key: 'Ctrl+P', action: 'Plan vergleichen', description: 'Vergleiche mit vorheriger Version', icon: TrendingUp },
  { key: 'Esc', action: 'Modal schließen', description: 'Schließe geöffnete Dialoge', icon: X },
];

/**
 * Enhanced workflow help information with real-world context
 */
const WORKFLOW_HELP = [
  {
    step: '1. Daten Import & Vorbereitung',
    description: 'Importieren Sie CSV-Daten aus Ihrem Krankenhausinformationssystem oder nutzen Sie Demo-Daten zum Testen.',
    tips: [
      'Verwenden Sie das Semikolon (;) als Trennzeichen für deutsche CSV-Dateien',
      'Achten Sie auf das deutsche Datumsformat (DD.MM.YYYY) in der CSV',
      'Überprüfen Sie die Spaltenüberschriften: Datum, Zeit, Eingriff, OP-Orgaeinheit, OP-Saal',
      'Das System erkennt automatisch deutsche Prozedurnamen und Komplexitätsstufen'
    ],
    realWorldContext: 'In echten Krankenhäusern werden diese Daten meist über Nacht aus dem KIS exportiert.'
  },
  {
    step: '2. KI-Personalvorschläge Generierung',
    description: 'Das System generiert automatisch Personalvorschläge basierend auf deutscher medizinischer Expertise und Abteilungskompetenzen.',
    tips: [
      'KI berücksichtigt deutsche medizinische Verfahren (UCH, ACH, GYN, URO, GCH, PCH)',
      'Personalspezialisierungen werden automatisch den Eingriffen zugeordnet',
      'Zeitkonflikte werden erkannt und vermieden',
      'Operationskomplexität beeinflusst die Personalauswahl (Experte vs. Berufsanfänger)'
    ],
    realWorldContext: 'In der Realität sparen KI-Vorschläge der OP-Leitung täglich 2-3 Stunden Planungszeit.'
  },
  {
    step: '3. Julia\'s Prüfung & Genehmigung',
    description: 'Als OP-Pflegeleitung prüfen und genehmigen Sie die KI-Vorschläge oder nehmen Anpassungen vor.',
    tips: [
      'Klicken Sie auf Operations-Zellen für detaillierte Informationen',
      'Nutzen Sie die Begründungsfelder für Änderungen - die KI lernt daraus',
      'Berücksichtigen Sie Personalverfügbarkeit und Expertise',
      'Die KI zeigt Ihnen kritische Situationen und Optimierungsvorschläge'
    ],
    realWorldContext: 'Julia Woogk hat 15+ Jahre OP-Erfahrung und kennt jedes Teammitglied persönlich.'
  },
  {
    step: '4. Finale Freigabe durch OP-Manager',
    description: 'Nach Julia\'s Prüfung kann OP-Manager Torsten den Plan final freigeben.',
    tips: [
      'Überprüfen Sie die Gesamtstatistiken und Auslastungsdaten',
      'Exportieren Sie den finalisierten Plan für die Verteilung',
      'Planhistorie wird automatisch für Nachverfolgung gespeichert',
      'System generiert automatisch Berichte für das Management'
    ],
    realWorldContext: 'Torsten Fernow verantwortet die strategische OP-Planung und Ressourcenoptimierung.'
  }
];

/**
 * Enhanced quick actions for power users
 */
const QUICK_ACTIONS = [
  {
    title: 'Heute starten',
    description: 'Schnell mit heutigem Demo-Plan beginnen',
    action: 'generateToday',
    icon: Calendar,
    color: 'bg-blue-500'
  },
  {
    title: 'Letzte Woche',
    description: 'Plan der letzten Woche laden',
    action: 'loadLastWeek',
    icon: History,
    color: 'bg-green-500'
  },
  {
    title: 'Busy Szenario',
    description: 'Hohe Auslastung für Stress-Test',
    action: 'generateBusy',
    icon: Activity,
    color: 'bg-orange-500'
  },
  {
    title: 'KI Optimierung',
    description: 'Alle offenen Vorschläge genehmigen',
    action: 'autoOptimize',
    icon: Zap,
    color: 'bg-purple-500'
  }
];

export default function ORNexusPlannerPage() {
  const [dataMode, setDataMode] = useState<DataMode>('demo');
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [showDataSourcePanel, setShowDataSourcePanel] = useState(false);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [helpActiveTab, setHelpActiveTab] = useState('workflow');
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
    comparePlans,
    planHistory,
    hasBackup,
    importProgress
  } = useORData();

  const availableStaffForModal = STAFF_MEMBERS.filter(s => !s.isSick);

  // Check if schedule has any operations
  const hasOperations = Object.values(schedule).some(roomSchedule => 
    Object.keys(roomSchedule).length > 0
  );

  // Get current data source info for enhanced display
  const dataSourceInfo = getDataSourceInfo();

  /**
   * Enhanced keyboard shortcuts handler with more actions
   */
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
          case 'd':
            event.preventDefault();
            setShowDataSourcePanel(!showDataSourcePanel);
            break;
          case 'z':
            event.preventDefault();
            if (hasBackup) {
              rollbackImport();
            }
            break;
          case 'p':
            event.preventDefault();
            if (planHistory.length > 1) {
              comparePlans();
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
  }, [hasOperations, exportPlanAsCSV, savePlanToStorage, hasBackup, rollbackImport, comparePlans, planHistory.length, showDataSourcePanel]);

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

  // Quick action handlers
  const handleQuickAction = useCallback((action: string) => {
    switch (action) {
      case 'generateToday':
        // Could generate demo data for today
        handleDemoMode();
        break;
      case 'loadLastWeek':
        // Could load previous plan from history
        if (planHistory.length > 0) {
          comparePlans();
        }
        break;
      case 'generateBusy':
        // Could generate high-volume demo data
        handleDemoMode();
        break;
      case 'autoOptimize':
        // Auto-approve all pending suggestions
        if (currentWorkflowStepKey === 'JULIA_REVIEW' || currentWorkflowStepKey === 'GPT_SUGGESTIONS_READY') {
          handleGptOptimize();
        }
        break;
    }
  }, [handleDemoMode, planHistory, comparePlans, currentWorkflowStepKey, handleGptOptimize]);

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
            
            {/* Import Progress Indicator */}
            {importProgress.isImporting && (
              <Card className="max-w-md">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Import läuft...</span>
                      <span className="text-sm text-muted-foreground">{importProgress.progress}%</span>
                    </div>
                    <Progress value={importProgress.progress} className="w-full" />
                    <p className="text-xs text-muted-foreground">{importProgress.currentStep}</p>
                  </div>
                </CardContent>
              </Card>
            )}
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
          
          {/* Enhanced Controls Bar with Quick Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="flex items-center space-x-2">
              {/* Core Controls */}
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
                        <Save className="h-4 w-4" />
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
                        <Download className="h-4 w-4" />
                        <span className="hidden sm:inline">Export</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Plan als CSV exportieren (Ctrl+E)</p>
                    </TooltipContent>
                  </Tooltip>

                  {planHistory.length > 1 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => comparePlans()}
                          className="flex items-center space-x-2"
                        >
                          <TrendingUp className="h-4 w-4" />
                          <span className="hidden sm:inline">Vergleichen</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Plan vergleichen (Ctrl+P)</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </>
              )}
            </div>

            {/* Enhanced Status Indicators */}
            <div className="flex items-center space-x-3">
              {/* Data Quality Indicator */}
              <div className="flex items-center space-x-2">
                <span className="text-xs text-muted-foreground">Qualität:</span>
                <Badge 
                  variant={dataSourceInfo.statistics.qualityScore >= 90 ? 'default' : 
                          dataSourceInfo.statistics.qualityScore >= 70 ? 'secondary' : 'destructive'}
                  className="text-xs"
                >
                  {dataSourceInfo.statistics.qualityScore}%
                </Badge>
              </div>

              {/* Plan Version */}
              {planHistory.length > 0 && (
                <div className="flex items-center space-x-1">
                  <History className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">v{planHistory.length}</span>
                </div>
              )}

              {/* Keyboard Shortcuts Indicator */}
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <Keyboard className="h-3 w-3" />
                <span>Shortcuts: Ctrl+I, Ctrl+E, Ctrl+H</span>
              </div>
            </div>
          </div>

          {/* Data Source Panel (Enhanced Collapsible) */}
          {showDataSourcePanel && (
            <div className="space-y-4">
              <DataSourcePanel
                dataSourceInfo={dataSourceInfo}
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

          {/* Enhanced Data Mode Indicator */}
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
                  
                  {/* Enhanced Data Info */}
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

          {/* Enhanced Empty State with Quick Actions */}
          {dataMode === 'demo' && !hasOperations && (
            <Card className="text-center py-12">
              <CardContent>
                <div className="space-y-6">
                  <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Willkommen zum Nexus OR Planner</h3>
                    <p className="text-muted-foreground mt-2">
                      Importieren Sie CSV-Daten aus Ihrem Krankenhausinformationssystem 
                      oder nutzen Sie den Demo-Modus zum Testen der KI-gestützten Personalplanung.
                    </p>
                  </div>
                  
                  {/* Primary Actions */}
                  <div className="flex flex-col sm:flex-row justify-center gap-4">
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

                  {/* Quick Actions Grid */}
                  <div className="mt-8">
                    <h4 className="font-medium text-sm mb-4">Schnellstart-Optionen</h4>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {QUICK_ACTIONS.map((action) => (
                        <Button
                          key={action.action}
                          variant="outline"
                          onClick={() => handleQuickAction(action.action)}
                          className="h-auto p-4 flex flex-col items-center space-y-2"
                        >
                          <div className={`w-8 h-8 rounded-full ${action.color} flex items-center justify-center`}>
                            <action.icon className="h-4 w-4 text-white" />
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-xs">{action.title}</div>
                            <div className="text-xs text-muted-foreground">{action.description}</div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Enhanced Help Section */}
                  <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium text-sm mb-2">Schnellstart-Hilfe</h4>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>• <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Ctrl+I</kbd> für CSV-Import</p>
                      <p>• <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Ctrl+H</kbd> für detaillierte Workflow-Hilfe</p>
                      <p>• <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Ctrl+D</kbd> für Datenquelle-Verwaltung</p>
                      <p>• Unterstützte CSV-Spalten: Datum, Zeit, Eingriff, OP-Orgaeinheit, OP-Saal, 1.Operateur</p>
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

        {/* Enhanced Help Dialog with Tabs */}
        <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <HelpCircle className="h-6 w-6" />
                <span>Nexus OR Planner - Umfassende Hilfe</span>
              </DialogTitle>
              <DialogDescription>
                Detaillierte Anleitung für die Nutzung des KI-gestützten OP-Planungssystems im echten Krankenhaus-Umfeld
              </DialogDescription>
            </DialogHeader>
            
            <Tabs value={helpActiveTab} onValueChange={setHelpActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="workflow">Workflow</TabsTrigger>
                <TabsTrigger value="shortcuts">Shortcuts</TabsTrigger>
                <TabsTrigger value="csv">CSV Format</TabsTrigger>
                <TabsTrigger value="troubleshooting">Problembehebung</TabsTrigger>
              </TabsList>
              
              <TabsContent value="workflow" className="space-y-6">
                <div className="space-y-4">
                  {WORKFLOW_HELP.map((step, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <h4 className="font-semibold text-primary mb-2">{step.step}</h4>
                      <p className="text-sm text-muted-foreground mb-3">{step.description}</p>
                      
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mb-3">
                        <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                          Praxis-Kontext: {step.realWorldContext}
                        </p>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-xs font-medium">Tipps & Best Practices:</p>
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
              </TabsContent>

              <TabsContent value="shortcuts" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {KEYBOARD_SHORTCUTS.map((shortcut, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <shortcut.icon className="h-4 w-4 text-primary" />
                        <div>
                          <span className="font-medium text-sm">{shortcut.action}</span>
                          <p className="text-xs text-muted-foreground">{shortcut.description}</p>
                        </div>
                      </div>
                      <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm font-mono">
                        {shortcut.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="csv" className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-3">CSV-Format Anforderungen</h3>
                  <div className="bg-muted/50 p-4 rounded-lg space-y-4">
                    <div>
                      <p className="text-sm mb-3 font-medium">Erwartete CSV-Spalten (Semikolon-getrennt):</p>
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            <span>Datum (DD.MM.YYYY)</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            <span>Zeit (HH:MM)</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            <span>Eingriff</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            <span>OP-Orgaeinheit</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            <span>OP-Saal</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Info className="h-3 w-3 text-blue-500" />
                            <span>1.Operateur (optional)</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Info className="h-3 w-3 text-blue-500" />
                            <span>OP-Status (optional)</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Info className="h-3 w-3 text-blue-500" />
                            <span>Anmerkung (optional)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm mb-2 font-medium">Beispiel-Zeile:</p>
                      <code className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded block">
                        15.03.2024;08:30;Hüft-TEP links;UCH;SAAL 1;Dr. Weber;OP geplant;Pat. nüchtern
                      </code>
                    </div>

                    <div>
                      <p className="text-sm mb-2 font-medium">Unterstützte Abteilungen:</p>
                      <div className="flex flex-wrap gap-2">
                        {['UCH', 'ACH', 'GYN', 'URO', 'GCH', 'PCH'].map(dept => (
                          <Badge key={dept} variant="outline" className="text-xs">{dept}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="troubleshooting" className="space-y-4">
                <div className="space-y-4">
                  <div className="border border-orange-200 rounded-lg p-4">
                    <h4 className="font-semibold text-orange-700 mb-2 flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Häufige Import-Probleme
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>Zeitkonflikte:</strong> Mehrere Operationen zur gleichen Zeit - System zeigt Warnung und erlaubt Bestätigung</div>
                      <div><strong>Unbekannte Räume:</strong> Verwenden Sie das Format "SAAL 1", "SAAL 2", etc.</div>
                      <div><strong>Datums-Format:</strong> DD.MM.YYYY oder YYYY-MM-DD werden unterstützt</div>
                      <div><strong>Encoding-Probleme:</strong> CSV sollte UTF-8 kodiert sein für deutsche Umlaute</div>
                    </div>
                  </div>

                  <div className="border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-700 mb-2 flex items-center">
                      <Info className="h-4 w-4 mr-2" />
                      KI-Personalplanung Tipps
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>Expertise-Matching:</strong> KI berücksichtigt Abteilungs-Spezialisierungen automatisch</div>
                      <div><strong>Komplexitäts-Erkennung:</strong> Deutsche Prozedurnamen werden automatisch klassifiziert</div>
                      <div><strong>Lernfähigkeit:</strong> Julia's Änderungen verbessern zukünftige Vorschläge</div>
                      <div><strong>Zeitoptimierung:</strong> System minimiert Leerlaufzeiten und Überschneidungen</div>
                    </div>
                  </div>

                  <div className="border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-700 mb-2 flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Performance Optimierung
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>Datenqualität:</strong> Vollständige CSV-Daten ergeben bessere KI-Vorschläge</div>
                      <div><strong>Backup-Strategie:</strong> Nutzen Sie Ctrl+S für regelmäßige Speicherung</div>
                      <div><strong>Versionskontrolle:</strong> Plan-Historie ermöglicht Vergleiche und Rollbacks</div>
                      <div><strong>Export-Workflow:</strong> Finalisierte Pläne können als CSV re-exportiert werden</div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        <footer className="text-center p-4 text-sm text-muted-foreground border-t border-border">
          <div className="flex flex-col sm:flex-row items-center justify-between">
            <div>
              © {new Date().getFullYear()} Klinikum Gütersloh - Nexus OR Planner. Alle Rechte vorbehalten.
              {dataMode === 'imported' && (
                <Badge variant="outline" className="ml-2">
                  Echte Daten
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2 mt-2 sm:mt-0">
              {dataSourceInfo.version && (
                <Badge variant="outline" className="text-xs">
                  {dataSourceInfo.version}
                </Badge>
              )}
              {dataSourceInfo.statistics.qualityScore && (
                <Badge 
                  variant={dataSourceInfo.statistics.qualityScore >= 90 ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  Qualität: {dataSourceInfo.statistics.qualityScore}%
                </Badge>
              )}
            </div>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  );
}
