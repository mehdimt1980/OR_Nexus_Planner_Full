"use client";
import React from 'react';
import { useORData } from '@/hooks/useORData';

export default function TestPage() {
  const { isClient, schedule } = useORData();
  
  if (!isClient) {
    return <div>Loading...</div>;
  }
  
  return (
    <div style={{ padding: '20px' }}>
      <h1>OR Nexus Planner - Test</h1>
      <p>Operations: {Object.values(schedule).reduce((sum, room) => sum + Object.keys(room).length, 0)}</p>
    </div>
  );
}
