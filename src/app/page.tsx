"use client";
import React from 'react';
import dynamic from 'next/dynamic';
import { useORData } from '@/hooks/useORData';
import { STAFF_MEMBERS } from '@/lib/or-planner-data';
import { Info } from 'lucide-react';

// Import UI components with error handling
let Skeleton;
try {
  Skeleton = require('@/components/ui/skeleton').Skeleton;
} catch {
  Skeleton = ({ className }: { className: string }) => (
    <div 
      className={className}
      style={{ 
        backgroundColor: '#e2e8f0', 
        borderRadius: '6px',
        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      }} 
    />
  );
}

// Dynamically import components with fallbacks
const Header = dynamic(
  () => import('@/components/or-planner/Header').catch(() => () => (
    <header style={{ backgroundColor: 'white', padding: '16px', borderBottom: '1px solid #e2e8f0' }}>
      <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>🏥 Nexus OR Planner</h1>
    </header>
  )),
  { 
    ssr: false,
    loading: () => (
      <div style={{ height: '80px', backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }} />
    )
  }
);

const WorkflowStatusIndicator = dynamic(
  () => import('@/components/or-planner/WorkflowStatusIndicator').catch(() => ({ steps }: { steps: any[] }) => (
    <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
      <h3 style={{ margin: '0 0 16px 0' }}>Workflow-Status</h3>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {steps.map((step, index) => (
          <span 
            key={step.key}
            style={{
              padding: '8px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              backgroundColor: step.status === 'completed' ? '#10b981' : 
                             step.status === 'active' ? '#f59e0b' : '#e2e8f0',
              color: step.status === 'pending' ? '#64748b' : 'white'
            }}
          >
            {index + 1}. {step.label}
          </span>
        ))}
      </div>
    </div>
  )),
  { 
    ssr: false,
    loading: () => <Skeleton className="h-20 w-full" />
  }
);

const DashboardStats = dynamic(
  () => import('@/components/or-planner/DashboardStats').catch(() => ({ juliaProgress, criticalAlertsCount, juliaModificationsCount }: any) => (
    <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
      <h3 style={{ margin: '0 0 16px 0' }}>Dashboard Statistiken</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>
            {juliaProgress?.reviewed || 0}/{juliaProgress?.total || 0}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Julia Fortschritt</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>
            {criticalAlertsCount || 0}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Kritische Warnungen</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
            {juliaModificationsCount || 0}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Julia Änderungen</div>
        </div>
      </div>
    </div>
  )),
  { 
    ssr: false,
    loading: () => <Skeleton className="h-32 w-full" />
  }
);

const OperatingRoomScheduleTable = dynamic(
  () => import('@/components/or-planner/OperatingRoomScheduleTable').catch(() => ({ schedule, onCellClick }: any) => (
    <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
      <h3 style={{ margin: '0 0 16px 0' }}>Operationssaal-Zeitplan</h3>
      {Object.entries(schedule || {}).map(([room, operations]: [string, any]) => (
        <div key={room} style={{ marginBottom: '20px' }}>
          <h4 style={{ backgroundColor: '#3b82f6', color: 'white', padding: '8px 12px', borderRadius: '4px' }}>
            {room}
          </h4>
          {Object.keys(operations || {}).length === 0 ? (
            <p style={{ color: '#64748b', margin: '8px 0' }}>Keine Operationen geplant</p>
          ) : (
            Object.entries(operations || {}).map(([time, operation]: [string, any]) => (
              <div 
                key={time}
                style={{
                  padding: '12px',
                  margin: '8px 0',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
                onClick={() => onCellClick?.(operation)}
              >
                <strong>{time}</strong> - {operation.procedureName || 'Unbekannte Operation'}
                <br />
                <small style={{ color: '#64748b' }}>
                  {operation.patientCase} | {operation.department} | {operation.estimatedDuration}min
                </small>
              </div>
            ))
          )}
        </div>
      ))}
    </div>
  )),
  { 
    ssr: false,
    loading: () => <Skeleton className="h-96 w-full" />
  }
);

const JuliaRecommendationsPanel = dynamic(
  () => import('@/components/or-planner/JuliaRecommendationsPanel').catch(() => ({ criticalSituation, optimizationSuggestions }: any) => (
    <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
      <h4 style={{ margin: '0 0 12px 0' }}>GPT-4 Empfehlungen</h4>
      <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '4px' }}>
        <p style={{ fontSize: '12px', margin: '0' }}>
          {criticalSituation?.gptSuggestion || 'KI analysiert aktuelle Situation...'}
        </p>
      </div>
    </div>
  )),
  { 
    ssr: false,
    loading: () => <Skeleton className="h-48 w-full" />
  }
);

const AiAssistantPanel = dynamic(
  () => import('@/components/or-planner/AiAssistantPanel').catch(() => ({ aiRawLearningSummary, onOptimizeClick, onFinalizePlanClick, isLoading }: any) => (
    <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
      <h4 style={{ margin: '0 0 12px 0' }}>KI-Lernfortschritt</h4>
      <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
        {aiRawLearningSummary || 'KI lernt aus den Daten...'}
      </p>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button 
          onClick={onOptimizeClick}
          disabled={isLoading}
          style={{
            padding: '8px 16px',
            backgroundColor: isLoading ? '#9ca3af' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '12px'
          }}
        >
          {isLoading ? 'Optimiert...' : 'KI Optimieren'}
        </button>
        <button 
          onClick={onFinalizePlanClick}
          style={{
            padding: '8px 16px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Plan finalisieren
        </button>
      </div>
    </div>
  )),
  { 
    ssr: false,
    loading: () => <Skeleton className="h-64 w-full" />
  }
);

const AssignmentModal = dynamic(
  () => import('@/components/or-planner/AssignmentModal').catch(() => ({ operation, isOpen, onClose, onApprove }: any) => {
    if (!isOpen || !operation) return null;
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '8px',
          maxWidth: '500px',
          width: '90%'
        }}>
          <h3>Operation Details</h3>
          <p><strong>Eingriff:</strong> {operation.procedureName}</p>
          <p><strong>Zeit:</strong> {operation.scheduledTime}</p>
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button 
              onClick={() => {
                onApprove?.(operation.id);
                onClose?.();
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '4px'
              }}
            >
              Genehmigen
            </button>
            <button 
              onClick={onClose}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '4px'
              }}
            >
              Schließen
            </button>
          </div>
        </div>
      </div>
    );
  }),
  { 
    ssr: false
  }
);

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
    isClient
  } = useORData();

  const availableStaffForModal = React.useMemo(() => 
    STAFF_MEMBERS?.filter(s => !s.isSick) || [], 
    []
  );

  // Loading state
  if (!isClient || (isLoading && currentWorkflowStepKey === 'PLAN_CREATED')) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '100vh',
        backgroundColor: '#f8fafc'
      }}>
        <Header />
        <main style={{ 
          flexGrow: 1, 
          maxWidth: '1200px', 
          margin: '0 auto', 
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}>
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-96 w-full" />
        </main>
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh',
      backgroundColor: '#f8fafc'
    }}>
      <Header />
      <main style={{ 
        flexGrow: 1, 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        <WorkflowStatusIndicator steps={workflowSteps || []} />
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
          gap: '24px'
        }}>
          {/* Left/Main column for Schedule and Stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <DashboardStats 
              juliaProgress={juliaProgress}
              criticalAlertsCount={criticalAlertsCount}
              juliaModificationsCount={juliaModificationsCount}
            />
            <OperatingRoomScheduleTable 
              schedule={schedule} 
              onCellClick={(op: any) => setSelectedOperation?.(op)} 
            />
          </div>

          {/* Right column for AI Assistant Panels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* GPT-4 Recommendations Section */}
            <div>
              <h2 style={{ 
                fontSize: '18px', 
                fontWeight: 'bold', 
                color: '#3b82f6', 
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center'
              }}>
                <Info style={{ marginRight: '8px', width: '20px', height: '20px' }} />
                GPT-4 Empfehlungen für Julia
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
      </main>

      <AssignmentModal
        operation={selectedOperation}
        isOpen={!!selectedOperation}
        onClose={() => setSelectedOperation?.(null)}
        onApprove={handleApprove}
        onModify={handleModify}
        availableStaff={availableStaffForModal}
      />
      
      <footer style={{ 
        textAlign: 'center', 
        padding: '16px', 
        fontSize: '12px', 
        color: '#64748b',
        borderTop: '1px solid #e2e8f0'
      }}>
        © {new Date().getFullYear()} Klinikum Gütersloh - Nexus OR Planner. Alle Rechte vorbehalten.
      </footer>
    </div>
  );
}
