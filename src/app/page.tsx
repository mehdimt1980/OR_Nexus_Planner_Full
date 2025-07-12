"use client";
import React from 'react';
import { useORData } from '@/hooks/useORData';

export default function TestPage() {
  const { isClient, schedule, allAssignmentsList } = useORData();
  
  if (!isClient) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>Loading...</h1>
      </div>
    );
  }
  
  return (
    <div style={{ padding: '20px' }}>
      <h1>OR Nexus Planner - Test</h1>
      <p>Client loaded: {isClient ? 'Yes' : 'No'}</p>
      <p>Operations found: {Object.values(schedule).reduce((sum, room) => sum + Object.keys(room).length, 0)}</p>
      
      <h2>Schedule Data:</h2>
      <pre style={{ background: '#f5f5f5', padding: '10px', fontSize: '12px', overflow: 'auto', maxHeight: '400px' }}>
        {JSON.stringify(schedule, null, 2)}
      </pre>
      
      <h2>Operating Rooms:</h2>
      {Object.entries(schedule).map(([room, operations]) => (
        <div key={room} style={{ marginBottom: '10px', border: '1px solid #ccc', padding: '10px' }}>
          <h3>{room}</h3>
          <p>Operations: {Object.keys(operations).length}</p>
          {Object.entries(operations).map(([time, op]) => (
            <div key={time} style={{ marginLeft: '20px', marginBottom: '5px' }}>
              <strong>{time}</strong>: {op.procedureName} - {op.patientCase}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
