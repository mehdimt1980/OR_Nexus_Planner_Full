"use client";
import React, { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Header from '@/components/or-planner/Header';
import WorkflowStatusIndicator from '@/components/or-planner/WorkflowStatusIndicator';
import DashboardStats from '@/components/or-planner/DashboardStats';
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

// Dynamically import heavy components to prevent SSR issues
const OperatingRoomScheduleTable = dynamic(
  () => import('@/components/or-planner/OperatingRoomScheduleTable'),
  { 
    ssr: false,
    loading: () => <Skeleton className="h-96 w-full" />
  }
);

const AiAssistantPanel = dynamic(
  () => import('@/components/or-planner/AiAssistantPanel'),
  { 
    ssr: false,
    loading: () => <Skeleton className="h-64 w-full" />
  }
);

const JuliaRecommendationsPanel = dynamic(
  () => import('@/components/or-planner/JuliaRecommendationsPanel'),
  { 
    ssr: false,
    loading: () => <Skeleton className="h-48 w-full" />
  }
);

const AssignmentModal = dynamic(
  () => import('@/components/or-planner/AssignmentModal'),
  { 
    ssr: false
  }
);

const CSVImportPanel = dynamic(
  () => import('@/components/or-planner/CSVImportPanel'),
  { 
    ssr: false,
    loading: () => <Skeleton className="h-96 w-full" />
  }
);

const DataSourcePanel = dynamic(
  () => import('@/components/or-planner/DataSourcePanel'),
  { 
    ssr: false,
    loading: () => <Skeleton className="h-48 w-full" />
  }
);

type DataMode = 'demo' | 'imported';

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
    isClient // This comes from the fixed useORData hook
  } = useORData();

  const availableStaffForModal = STAFF_MEMBERS.filter(s => !s.isSick);

  // Don't render complex content until client-side hydration is complete
  if (!isClient) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="bg-card text-card-foreground p-4 shadow-md border-b">
          <div className="container mx-auto">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-primary/20 rounded-full animate-pulse" />
                <div>
                  <div className="h-6 w-48 bg-primary/20 rounded animate-pulse" />
                  <div className="h-4 w-64 bg-muted/50 rounded animate-pulse mt-1" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <main className="flex-grow container mx-auto p-4 space-y-6">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-96 w-full" />
        </main>
      </div>
    );
  }

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
  }, []);

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
            <Button
              variant="outline"
              onClick={handleCloseImport}
              className="flex items-center space-x-2"
            >
              <X className="h-4 w-4" />
              <span>Zurück zum Planer</span>
            </Button>
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
          
          {/* Data Mode Indicator */}
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
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Empty State */}
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
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Planning Interface */}
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
          <div className="flex flex-col sm:flex-row items-center justify-between">
            <div>
              © {new Date().getFullYear()} Klinikum Gütersloh - Nexus OR Planner. Alle Rechte vorbehalten.
              {dataMode === 'imported' && (
                <Badge variant="outline" className="ml-2">
                  Echte Daten
                </Badge>
              )}
            </div>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  );
}
