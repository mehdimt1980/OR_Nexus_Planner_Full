"use client";
import React, { useState } from 'react';
import { useORData } from '@/hooks/useORData';

export default function ORNexusPlannerPage() {
  const {
    schedule,
    workflowSteps,
    currentWorkflowStepKey,
    aiRawLearningSummary,
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
    isClient
  } = useORData();

  const [showImportPanel, setShowImportPanel] = useState(false);

  // Don't render until client-side hydration is complete
  if (!isClient) {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
          <div style={{ height: '20px', background: '#e9ecef', borderRadius: '4px', marginBottom: '10px' }}></div>
          <div style={{ height: '40px', background: '#e9ecef', borderRadius: '4px', marginBottom: '10px' }}></div>
          <div style={{ height: '300px', background: '#e9ecef', borderRadius: '4px' }}></div>
        </div>
      </div>
    );
  }

  // Check if schedule has any operations
  const hasOperations = Object.values(schedule).some(roomSchedule => 
    Object.keys(roomSchedule).length > 0
  );

  // Handle CSV import
  const handleCSVImport = (operations: any[], fileName?: string) => {
    importCSVData(operations);
    setShowImportPanel(false);
  };

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    },
    header: {
      backgroundColor: 'white',
      padding: '16px',
      borderBottom: '1px solid #dee2e6',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    main: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '24px'
    },
    card: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      border: '1px solid #dee2e6'
    },
    button: {
      padding: '8px 16px',
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px'
    },
    buttonSecondary: {
      padding: '8px 16px',
      backgroundColor: '#6c757d',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: '2fr 1fr',
      gap: '24px'
    },
    workflowStep: {
      padding: '8px 12px',
      margin: '4px',
      borderRadius: '4px',
      fontSize: '12px',
      display: 'inline-block'
    },
    operationCard: {
      padding: '12px',
      margin: '8px 0',
      backgroundColor: '#f8f9fa',
      border: '1px solid #dee2e6',
      borderRadius: '4px',
      cursor: 'pointer'
    },
    badge: {
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '11px',
      color: 'white',
      display: 'inline-block',
      marginLeft: '8px'
    }
  };

  if (showImportPanel) {
    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <h1>CSV Import Panel</h1>
          <button 
            style={styles.buttonSecondary}
            onClick={() => setShowImportPanel(false)}
          >
            ← Zurück zum Planer
          </button>
        </header>
        <main style={styles.main}>
          <div style={styles.card}>
            <h2>CSV-Daten importieren</h2>
            <p>Wählen Sie eine CSV-Datei aus Ihrem Krankenhausinformationssystem.</p>
            <input type="file" accept=".csv" />
            <br /><br />
            <button style={styles.button}>Datei hochladen</button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', color: '#343a40' }}>
              🏥 Nexus OR Planner
            </h1>
            <p style={{ margin: '4px 0 0 0', color: '#6c757d' }}>
              KI-gestützte Personalplanung für Operationssäle
            </p>
          </div>
          <div>
            <button 
              style={styles.button}
              onClick={() => setShowImportPanel(true)}
            >
              📁 CSV Importieren
            </button>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        {/* Data Mode Indicator */}
        <div style={{...styles.card, background: 'linear-gradient(135deg, #007bff20, #28a74520)'}}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                🎮 Demo-Modus
                <span style={{...styles.badge, backgroundColor: '#007bff'}}>
                  {Object.values(schedule).reduce((sum, room) => sum + Object.keys(room).length, 0)} Operationen
                </span>
              </h3>
              <p style={{ margin: '8px 0 0 0', color: '#6c757d' }}>
                Datum: {currentDate}
              </p>
            </div>
          </div>
        </div>

        {/* Workflow Status */}
        <div style={styles.card}>
          <h3>Workflow-Status</h3>
          <div>
            {workflowSteps.map((step, index) => (
              <span 
                key={step.key}
                style={{
                  ...styles.workflowStep,
                  backgroundColor: step.status === 'completed' ? '#28a745' : 
                                 step.status === 'active' ? '#ffc107' : '#e9ecef',
                  color: step.status === 'pending' ? '#6c757d' : 'white'
                }}
              >
                {index + 1}. {step.label}
              </span>
            ))}
          </div>
        </div>

        {/* Empty State */}
        {!hasOperations && (
          <div style={{...styles.card, textAlign: 'center', padding: '60px 20px'}}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
            <h3>Willkommen zum Nexus OR Planner</h3>
            <p style={{ color: '#6c757d', marginBottom: '24px' }}>
              Importieren Sie CSV-Daten aus Ihrem Krankenhausinformationssystem 
              oder nutzen Sie den Demo-Modus zum Testen der KI-gestützten Personalplanung.
            </p>
            <button 
              style={styles.button}
              onClick={() => setShowImportPanel(true)}
            >
              CSV-Daten importieren
            </button>
          </div>
        )}

        {/* Main Content */}
        {hasOperations && (
          <div style={styles.grid}>
            {/* Left Column - Schedule and Stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Dashboard Stats */}
              <div style={styles.card}>
                <h3>Dashboard Statistiken</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>
                      {juliaProgress.reviewed}/{juliaProgress.total}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6c757d' }}>Julia Fortschritt</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc3545' }}>
                      {criticalAlertsCount}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6c757d' }}>Kritische Warnungen</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
                      {juliaModificationsCount}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6c757d' }}>Julia Änderungen</div>
                  </div>
                </div>
              </div>

              {/* Operating Room Schedule */}
              <div style={styles.card}>
                <h3>Operationssaal-Zeitplan</h3>
                {Object.entries(schedule).map(([room, operations]) => (
                  <div key={room} style={{ marginBottom: '24px' }}>
                    <h4 style={{ 
                      backgroundColor: '#007bff', 
                      color: 'white', 
                      padding: '8px 12px', 
                      margin: '0 0 12px 0',
                      borderRadius: '4px'
                    }}>
                      {room}
                    </h4>
                    {Object.keys(operations).length === 0 ? (
                      <p style={{ color: '#6c757d', fontStyle: 'italic' }}>Keine Operationen geplant</p>
                    ) : (
                      Object.entries(operations).map(([time, operation]) => (
                        <div 
                          key={time}
                          style={{
                            ...styles.operationCard,
                            borderLeft: operation.status === 'approved_julia' ? '4px solid #28a745' :
                                       operation.status === 'modified_julia' ? '4px solid #ffc107' :
                                       operation.status === 'planned' ? '4px solid #007bff' : '4px solid #6c757d'
                          }}
                          onClick={() => setSelectedOperation(operation)}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <strong>{time}</strong> - {operation.procedureName}
                              <br />
                              <small style={{ color: '#6c757d' }}>
                                {operation.patientCase} | {operation.department} | {operation.estimatedDuration}min
                              </small>
                            </div>
                            <div>
                              <span style={{
                                ...styles.badge,
                                backgroundColor: operation.status === 'approved_julia' ? '#28a745' :
                                               operation.status === 'modified_julia' ? '#ffc107' :
                                               operation.status === 'planned' ? '#007bff' : '#6c757d'
                              }}>
                                {operation.status}
                              </span>
                            </div>
                          </div>
                          <div style={{ marginTop: '8px', fontSize: '12px' }}>
                            <strong>Personal:</strong> {operation.assignedStaff.map(s => s.name).join(', ')}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column - AI Assistant */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* GPT-4 Recommendations */}
              <div style={styles.card}>
                <h3 style={{ color: '#007bff' }}>🤖 GPT-4 Empfehlungen für Julia</h3>
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '14px', margin: '0 0 8px 0' }}>{criticalSituationData.title}</h4>
                  <p style={{ fontSize: '12px', margin: '0 0 8px 0', color: '#6c757d' }}>
                    {criticalSituationData.situation}
                  </p>
                  <p style={{ fontSize: '12px', margin: '0', backgroundColor: '#e3f2fd', padding: '8px', borderRadius: '4px' }}>
                    💡 {criticalSituationData.gptSuggestion}
                  </p>
                </div>
                
                <h4 style={{ fontSize: '14px', margin: '16px 0 8px 0' }}>Optimierungsvorschläge:</h4>
                {optimizationSuggestionsData.map((suggestion, index) => (
                  <div key={index} style={{ 
                    fontSize: '12px', 
                    margin: '4px 0', 
                    padding: '6px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '4px'
                  }}>
                    • {suggestion.text}
                  </div>
                ))}
              </div>

              {/* AI Learning Progress */}
              <div style={styles.card}>
                <h3 style={{ color: '#28a745' }}>🧠 KI-Lernfortschritt</h3>
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '12px', color: '#6c757d' }}>{aiRawLearningSummary}</p>
                </div>
                
                <div style={{ marginBottom: '16px' }}>
                  {['Datenanalyse', 'Mustererkennung', 'Personaloptimierung'].map((step, index) => (
                    <div key={step} style={{ margin: '8px 0' }}>
                      <div style={{ fontSize: '12px', marginBottom: '4px' }}>{step}</div>
                      <div style={{ 
                        height: '6px', 
                        backgroundColor: '#e9ecef', 
                        borderRadius: '3px',
                        overflow: 'hidden'
                      }}>
                        <div style={{ 
                          height: '100%', 
                          backgroundColor: '#28a745',
                          width: `${75 + index * 8}%`,
                          transition: 'width 0.3s'
                        }}></div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    style={styles.button}
                    onClick={handleGptOptimize}
                    disabled={isLoading}
                  >
                    {isLoading ? '⏳ Optimiert...' : '🚀 KI Optimieren'}
                  </button>
                  <button 
                    style={styles.buttonSecondary}
                    onClick={handleFinalizePlan}
                  >
                    ✅ Plan finalisieren
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Operation Details Modal */}
        {selectedOperation && (
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
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0 }}>Operation Details</h3>
                <button 
                  style={{...styles.buttonSecondary, padding: '4px 8px'}}
                  onClick={() => setSelectedOperation(null)}
                >
                  ✕
                </button>
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <p><strong>Eingriff:</strong> {selectedOperation.procedureName}</p>
                <p><strong>Patient:</strong> {selectedOperation.patientCase}</p>
                <p><strong>Zeit:</strong> {selectedOperation.scheduledTime}</p>
                <p><strong>Raum:</strong> {selectedOperation.room}</p>
                <p><strong>Abteilung:</strong> {selectedOperation.department}</p>
                <p><strong>Dauer:</strong> {selectedOperation.estimatedDuration} Minuten</p>
                <p><strong>Status:</strong> {selectedOperation.status}</p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <h4>Zugeteiltes Personal:</h4>
                {selectedOperation.assignedStaff.map((staff, index) => (
                  <div key={index} style={{ padding: '4px 0' }}>
                    • {staff.name} - {staff.skills?.join(', ')}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  style={styles.button}
                  onClick={() => {
                    handleApprove(selectedOperation.id);
                    setSelectedOperation(null);
                  }}
                >
                  ✅ Genehmigen
                </button>
                <button 
                  style={styles.buttonSecondary}
                  onClick={() => setSelectedOperation(null)}
                >
                  Schließen
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer style={{ 
        textAlign: 'center', 
        padding: '16px', 
        fontSize: '12px', 
        color: '#6c757d',
        borderTop: '1px solid #dee2e6'
      }}>
        © {new Date().getFullYear()} Klinikum Gütersloh - Nexus OR Planner. Alle Rechte vorbehalten.
      </footer>
    </div>
  );
}
