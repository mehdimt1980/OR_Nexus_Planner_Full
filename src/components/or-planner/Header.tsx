"use client";
import React, { useState, useEffect } from 'react';
import { Stethoscope } from 'lucide-react'; // Medical-themed icon

type HeaderProps = {
  // Props if any, e.g. app name if dynamic
};

const Header: React.FC<HeaderProps> = () => {
  const [currentTime, setCurrentTime] = useState<string | null>(null);

  useEffect(() => {
    // Set initial time on client mount
    setCurrentTime(new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-card text-card-foreground p-4 shadow-md sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Stethoscope className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-headline font-semibold text-primary">Nexus OR Planner</h1>
          <span className="text-xs text-muted-foreground mt-1">Klinikum Gütersloh</span>
        </div>
        <div className="text-lg font-semibold text-foreground font-mono">
          {currentTime !== null ? currentTime : <span className="opacity-0">00:00:00</span>}
        </div>
      </div>
    </header>
  );
};

export default Header;

