"use client";
import React, { useState } from 'react';
import { useORData } from '@/hooks/useORData';
import { STAFF_MEMBERS } from '@/lib/or-planner-data';
import { Info } from 'lucide-react';

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

  const [showOperationModal, setShowOperationModal] = useState(false);

  // Don't render until client-side hydration is complete
  if (!isClient) {
    return (
      <div style={{ 
        padding: '20px', 
        fontFamily: 'system-ui, -apple-system, sans-serif',
        backgroundColor: '#f8fafc',
        minHeight: '100vh'
      }}>
        <div style={{ backgroundColor: '#e2e8f0', height: '60px', borderRadius: '8px', marginBottom: '20px' }}></div>
        <div style={{ backgroundColor: '#e2e8f0', height: '100px', borderRadius: '8px', marginBottom: '20px' }}></div>
        <div style={{ backgroundColor: '#e2e8f0', height: '300px', borderRadius: '8px' }}></div>
      </div>
    );
  }

  const availableStaffForModal = STAFF_MEMBERS?.filter(s => !s.isSick) || [];

  // Loading state
  if (isLoading && currentWorkflowStepKey === 'PLAN_CREATED') {
    return (
      <div style={{ 
        padding: '20px', 
        fontFamily: 'system-ui, -apple-system, sans-serif',
        backgroundColor: '#f8fafc',
        minHeight: '100vh'
      }}>
        <div style={{ 
          backgroundColor: 'white', 
          padding: '20px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h1 style={{ margin: 0, color: '#1e293b' }}>🏥 Nexus OR Planner</h1>
          <p style={{ margin: '8px 0 0 0', color: '#64748b' }}>Lädt...</p>
        </div>
        <div style={{ backgroundColor: '#e2e8f0', height: '100px', borderRadius: '8px', marginBottom: '20px' }}></div>
        <div style={{ backgroundColor: '#e2e8f0', height: '300px', borderRadius: '8px' }}></div>
      </div>
    );
  }

  const containerStyle = {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const
  };

  const headerStyle = {
    backgroundColor: 'white',
    padding: '20px',
    borderBottom: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  };

  const mainStyle = {
    flex: 1,
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px',
    width: '100%'
  };

  const cardStyle = {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    marginBottom: '20px'
  };

  const buttonStyle = {
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#6b7280'
  };

  const successButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#10b981'
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <header style={headerStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#1e293b' }}>
              🏥 Nexus OR Planner
            </h1>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '16px' }}>
              KI-gestützte Personalplanung für Operationssäle
            </p>
          </div>
          <div>
            <span style={{ 
              backgroundColor: '#dbeafe', 
              color: '#1e40af', 
              padding: '6px 12px', 
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '500'
            }}>
              Demo-Modus
            </span>
          </div>
        </div>
      </header>

      <main style={mainStyle}>
        {/* Workflow Status */}
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
            Workflow-Status
          </h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {(workflowSteps || []).map((step, index) => (
              <span 
                key={step.key}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: '500',
                  backgroundColor: step.status === 'completed' ? '#10b981' : 
                                 step.status === 'active' ? '#f59e0b' : '#e5e7eb',
                  color: step.status === 'pending' ? '#374151' : 'white'
                }}
              >
                {index + 1}. {step.label}
              </span>
            ))}
          </div>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
          gap: '24px'
        }}>
          {/* Left Column */}
          <div>
            {/* Dashboard Stats */}
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600' }}>
                Dashboard Statistiken
              </h3>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(3, 1fr)', 
                gap: '20px'
              }}>
                <div style={{ textAlign: 'center', padding: '16px' }}>
                  <div style={{ 
                    fontSize: '32px', 
                    fontWeight: 'bold', 
                    color: '#3b82f6',
                    marginBottom: '4px'
                  }}>
                    {juliaProgress?.reviewed || 0}/{juliaProgress?.total || 0}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                    Julia Fortschritt
                  </div>
                </div>
                <div style={{ textAlign: 'center', padding: '16px' }}>
                  <div style={{ 
                    fontSize: '32px', 
                    fontWeight: 'bold', 
                    color: '#ef4444',
                    marginBottom: '4px'
                  }}>
                    {criticalAlertsCount || 0}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                    Kritische Warnungen
                  </div>
                </div>
                <div style={{ textAlign: 'center', padding: '16px' }}>
                  <div style={{ 
                    fontSize: '32px', 
                    fontWeight: 'bold', 
                    color: '#10b981',
                    marginBottom: '4px'
                  }}>
                    {juliaModificationsCount || 0}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                    Julia Änderungen
                  </div>
                </div>
              </div>
            </div>

            {/* Operating Room Schedule */}
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600' }}>
                Operationssaal-Zeitplan
              </h3>
              {Object.entries(schedule || {}).map(([room, operations]: [string, any]) => (
                <div key={room} style={{ marginBottom: '24px' }}>
                  <h4 style={{ 
                    backgroundColor: '#3b82f6', 
                    color: 'white', 
                    padding: '10px 16px', 
                    margin: '0 0 12px 0',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}>
                    {room}
                  </h4>
                  {Object.keys(operations || {}).length === 0 ? (
                    <p style={{ 
                      color: '#9ca3af', 
                      fontStyle: 'italic', 
                      margin: '12px 0',
                      padding: '16px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '6px',
                      textAlign: 'center'
                    }}>
                      Keine Operationen geplant
                    </p>
                  ) : (
                    Object.entries(operations || {}).map(([time, operation]: [string, any]) => (
                      <div 
                        key={time}
                        style={{
                          padding: '16px',
                          margin: '8px 0',
                          backgroundColor: '#fafbfc',
                          border: '1px solid #e5e7eb',
                          borderLeft: `4px solid ${
                            operation.status === 'approved_julia' ? '#10b981' :
                            operation.status === 'modified_julia' ? '#f59e0b' :
                            operation.status === 'planned' ? '#3b82f6' : '#6b7280'
                          }`,
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onClick={() => {
                          setSelectedOperation(operation);
                          setShowOperationModal(true);
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f1f5f9';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#fafbfc';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ 
                              fontSize: '16px', 
                              fontWeight: '600', 
                              color: '#1e293b',
                              marginBottom: '4px'
                            }}>
                              {time} - {operation.procedureName || 'Unbekannte Operation'}
                            </div>
                            <div style={{ 
                              fontSize: '13px', 
                              color: '#64748b',
                              marginBottom: '8px'
                            }}>
                              {operation.patientCase} | {operation.department} | {operation.estimatedDuration}min
                            </div>
                            <div style={{ fontSize: '12px', color: '#374151' }}>
                              <strong>Personal:</strong> {operation.assignedStaff?.map((s: any) => s.name).join(', ') || 'Nicht zugewiesen'}
                            </div>
                          </div>
                          <div>
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: '500',
                              backgroundColor: operation.status === 'approved_julia' ? '#dcfce7' :
                                             operation.status === 'modified_julia' ? '#fef3c7' :
                                             operation.status === 'planned' ? '#dbeafe' : '#f3f4f6',
                              color: operation.status === 'approved_julia' ? '#166534' :
                                     operation.status === 'modified_julia' ? '#92400e' :
                                     operation.status === 'planned' ? '#1e40af' : '#374151'
                            }}>
                              {operation.status === 'approved_julia' ? 'Genehmigt' :
                               operation.status === 'modified_julia' ? 'Geändert' :
                               operation.status === 'planned' ? 'Geplant' : operation.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right Column */}
          <div>
            {/* GPT-4 Recommendations */}
            <div style={cardStyle}>
              <h3 style={{ 
                margin: '0 0 16px 0', 
                fontSize: '16px', 
                fontWeight: '600',
                color: '#3b82f6',
                display: 'flex',
                alignItems: 'center'
              }}>
                <Info style={{ marginRight: '8px', width: '18px', height: '18px' }} />
                GPT-4 Empfehlungen für Julia
              </h3>
              
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  margin: '0 0 8px 0',
                  color: '#dc2626'
                }}>
                  {criticalSituationData?.title || 'Kritische Situation'}
                </h4>
                <p style={{ 
                  fontSize: '12px', 
                  margin: '0 0 8px 0', 
                  color: '#4b5563',
                  lineHeight: '1.4'
                }}>
                  {criticalSituationData?.situation || 'Analysiere aktuelle Situation...'}
                </p>
                <div style={{ 
                  backgroundColor: '#eff6ff', 
                  padding: '10px', 
                  borderRadius: '6px',
                  borderLeft: '3px solid #3b82f6'
                }}>
                  <p style={{ 
                    fontSize: '12px', 
                    margin: '0',
                    color: '#1e40af',
                    fontWeight: '500'
                  }}>
                    💡 {criticalSituationData?.gptSuggestion || 'KI generiert Empfehlungen...'}
                  </p>
                </div>
              </div>
              
              <h4 style={{ 
                fontSize: '14px', 
                fontWeight: '600', 
                margin: '16px 0 8px 0',
                color: '#059669'
              }}>
                Optimierungsvorschläge:
              </h4>
              {(optimizationSuggestionsData || []).map((suggestion: any, index: number) => (
                <div key={index} style={{ 
                  fontSize: '12px', 
                  margin: '6px 0', 
                  padding: '8px',
                  backgroundColor: '#f0fdf4',
                  borderRadius: '4px',
                  borderLeft: '2px solid #10b981'
                }}>
                  • {suggestion.text}
                </div>
              ))}
            </div>

            {/* AI Learning Progress */}
            <div style={cardStyle}>
              <h3 style={{ 
                margin: '0 0 16px 0', 
                fontSize: '16px', 
                fontWeight: '600',
                color: '#059669'
              }}>
                🧠 KI-Lernfortschritt
              </h3>
              
              <div style={{ marginBottom: '16px' }}>
                <p style={{ 
                  fontSize: '12px', 
                  color: '#4b5563',
                  lineHeight: '1.4',
                  marginBottom: '12px'
                }}>
                  {aiRawLearningSummary || 'KI analysiert Daten und lernt aus Mustern...'}
                </p>
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                {['Datenanalyse', 'Mustererkennung', 'Personaloptimierung'].map((step, index) => (
                  <div key={step} style={{ margin: '10px 0' }}>
                    <div style={{ 
                      fontSize: '12px', 
                      marginBottom: '4px',
                      fontWeight: '500',
                      color: '#374151'
                    }}>
                      {step}
                    </div>
                    <div style={{ 
                      height: '6px', 
                      backgroundColor: '#e5e7eb', 
                      borderRadius: '3px',
                      overflow: 'hidden'
                    }}>
                      <div style={{ 
                        height: '100%', 
                        backgroundColor: '#10b981',
                        width: `${75 + index * 8}%`,
                        transition: 'width 0.5s ease'
                      }}></div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  style={isLoading ? { ...buttonStyle, backgroundColor: '#9ca3af', cursor: 'not-allowed' } : buttonStyle}
                  onClick={handleGptOptimize}
                  disabled={isLoading}
                >
                  {isLoading ? '⏳ Optimiert...' : '🚀 KI Optimieren'}
                </button>
                <button 
                  style={successButtonStyle}
                  onClick={handleFinalizePlan}
                >
                  ✅ Plan finalisieren
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Operation Details Modal */}
      {showOperationModal && selectedOperation && (
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
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '20px' 
            }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
                Operation Details
              </h3>
              <button 
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '4px',
                  color: '#6b7280'
                }}
                onClick={() => {
                  setShowOperationModal(false);
                  setSelectedOperation(null);
                }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ marginBottom: '20px', lineHeight: '1.6' }}>
              <p style={{ margin: '8px 0' }}>
                <strong>Eingriff:</strong> {selectedOperation.procedureName}
              </p>
              <p style={{ margin: '8px 0' }}>
                <strong>Patient:</strong> {selectedOperation.patientCase}
              </p>
              <p style={{ margin: '8px 0' }}>
                <strong>Zeit:</strong> {selectedOperation.scheduledTime}
              </p>
              <p style={{ margin: '8px 0' }}>
                <strong>Raum:</strong> {selectedOperation.room}
              </p>
              <p style={{ margin: '8px 0' }}>
                <strong>Abteilung:</strong> {selectedOperation.department}
              </p>
              <p style={{ margin: '8px 0' }}>
                <strong>Dauer:</strong> {selectedOperation.estimatedDuration} Minuten
              </p>
              <p style={{ margin: '8px 0' }}>
                <strong>Status:</strong> {selectedOperation.status}
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                Zugeteiltes Personal:
              </h4>
              {(selectedOperation.assignedStaff || []).map((staff: any, index: number) => (
                <div key={index} style={{ 
                  padding: '8px 12px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '6px',
                  margin: '4px 0',
                  fontSize: '14px'
                }}>
                  <strong>{staff.name}</strong>
                  {staff.skills && staff.skills.length > 0 && (
                    <span style={{ color: '#64748b' }}> - {staff.skills.join(', ')}</span>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                style={successButtonStyle}
                onClick={() => {
                  handleApprove?.(selectedOperation.id);
                  setShowOperationModal(false);
                  setSelectedOperation(null);
                }}
              >
                ✅ Genehmigen
              </button>
              <button 
                style={secondaryButtonStyle}
                onClick={() => {
                  setShowOperationModal(false);
                  setSelectedOperation(null);
                }}
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      <footer style={{ 
        textAlign: 'center', 
        padding: '20px', 
        fontSize: '12px', 
        color: '#64748b',
        borderTop: '1px solid #e2e8f0',
        backgroundColor: 'white'
      }}>
        © {new Date().getFullYear()} Klinikum Gütersloh - Nexus OR Planner. Alle Rechte vorbehalten.
      </footer>
    </div>
  );
}
