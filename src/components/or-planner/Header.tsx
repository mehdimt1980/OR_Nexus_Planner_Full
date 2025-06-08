
"use client";
import React, { useState, useEffect } from 'react';
import { Stethoscope, CalendarDays, Clock } from 'lucide-react'; 
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type HeaderProps = {
  // Props if any, e.g. app name if dynamic
};

const Header: React.FC<HeaderProps> = () => {
  const [currentTime, setCurrentTime] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState<string | null>(null);

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(now.toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' }));
    };

    updateDateTime(); // Set initial date and time on client mount
    
    const timer = setInterval(updateDateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Placeholder user data - in a real app, this would come from auth/context
  const user = {
    name: "Julia Woogk",
    initials: "JW",
    role: "OP-Pflege Leitung"
  };

  return (
    <header className="bg-card text-card-foreground p-3 sm:p-4 shadow-md sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Stethoscope className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
          <div>
            <h1 className="text-xl sm:text-2xl font-headline font-semibold text-primary">Nexus OR Planner</h1>
            <span className="text-xs text-muted-foreground hidden sm:block">Klinikum Gütersloh</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-3 sm:space-x-4 text-sm sm:text-base">
          <div className="flex items-center space-x-1.5 text-muted-foreground">
            <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5" />
            {currentDate !== null ? <span className="font-medium text-foreground/90">{currentDate}</span> : <span className="opacity-0">Sonntag, 00.00.0000</span>}
          </div>
          <div className="flex items-center space-x-1.5 text-muted-foreground">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
            {currentTime !== null ? <span className="font-mono font-medium text-foreground/90">{currentTime}</span> : <span className="opacity-0">00:00:00</span>}
          </div>
          <div className="flex items-center space-x-2 pl-2 sm:pl-3 border-l border-border">
            <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
              {/* <AvatarImage src="/path-to-user-image.jpg" alt={user.name} /> */}
              <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                {user.initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:flex flex-col text-xs">
              <span className="font-semibold text-card-foreground">{user.name}</span>
              <span className="text-muted-foreground">{user.role}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
