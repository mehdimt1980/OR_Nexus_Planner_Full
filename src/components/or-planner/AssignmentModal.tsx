"use client";
import React, { useState, useEffect } from 'react';
import type { OperationAssignment, StaffMember } from '@/lib/or-planner-types';
import { SHIFT_TIMES } from '@/lib/or-planner-types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Check, Edit3, Bot, User, Info } from 'lucide-react';
import { STAFF_MEMBERS } from '@/lib/or-planner-data'; // Use full staff list for modification options
import { cn } from '@/lib/utils';

type AssignmentModalProps = {
  operation: OperationAssignment | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (operationId: string) => void;
  onModify: (operationId: string, newStaffId: string, reason: string) => void;
  availableStaff: StaffMember[]; // For modification dropdown
};

const complexityClasses: Record<string, string> = {
  'Sehr Hoch': 'text-red-600 bg-red-100 dark:text-red-300 dark:bg-red-700/30',
  'Hoch': 'text-orange-600 bg-orange-100 dark:text-orange-300 dark:bg-orange-700/30',
  'Mittel': 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-700/30',
  'Niedrig': 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-700/30',
};


const AssignmentModal: React.FC<AssignmentModalProps> = ({ operation, isOpen, onClose, onApprove, onModify, availableStaff }) => {
  const [selectedStaffId, setSelectedStaffId] = useState<string | undefined>(undefined);
  const [modificationReason, setModificationReason] = useState<string>('');
  const [isModifying, setIsModifying] = useState<boolean>(false);

  useEffect(() => {
    if (operation) {
      setSelectedStaffId(operation.assignedStaff?.id);
      setModificationReason(operation.juliaModificationReason || '');
      setIsModifying(operation.status === 'modified_julia'); 
    } else {
      setIsModifying(false);
      setModificationReason('');
    }
  }, [operation]);

  if (!operation) return null;

  const handleModifyAction = () => {
    if (selectedStaffId && modificationReason) {
      onModify(operation.id, selectedStaffId, modificationReason);
    }
  };
  
  const canApprove = operation.status === 'pending_gpt' || operation.status === 'critical_pending' || operation.status === 'modified_julia';
  const canModify = operation.status === 'pending_gpt' || operation.status === 'critical_pending' || operation.status === 'modified_julia' || operation.status === 'approved_julia';


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-card">
        <DialogHeader>
          <DialogTitle className="text-xl font-headline text-primary">
            Einsatzdetails: {operation.room} - {operation.shift} ({SHIFT_TIMES[operation.shift]})
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto px-1 pr-3">
          {operation.status === 'critical_pending' && operation.notes && (
            <div className="p-3 rounded-md bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 flex items-start space-x-2">
              <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold">Kritische Meldung</h4>
                <p className="text-sm">{operation.notes}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 items-center">
            <Label htmlFor="procedureName" className="text-sm font-medium text-muted-foreground">Prozedur:</Label>
            <p id="procedureName" className="col-span-2 text-sm font-semibold text-card-foreground">{operation.procedureName || 'N/A'}</p>
          </div>

          <div className="grid grid-cols-3 gap-2 items-center">
            <Label htmlFor="complexity" className="text-sm font-medium text-muted-foreground">Komplexität:</Label>
            {operation.complexity && (
              <Badge id="complexity" className={cn("col-span-2 w-fit", complexityClasses[operation.complexity])}>
                {operation.complexity}
              </Badge>
            )}
          </div>

          {operation.gptSuggestedStaff && (
            <div className="p-3 rounded-md bg-primary/5 border border-primary/20">
              <div className="flex items-center space-x-2 mb-1 text-primary">
                <Bot className="h-5 w-5" />
                <h4 className="font-semibold">KI Vorschlag</h4>
              </div>
              <p className="text-sm text-card-foreground">Personal: {operation.gptSuggestedStaff.name}</p>
              {operation.aiReasoning && <p className="text-xs text-muted-foreground mt-1">Begründung: {operation.aiReasoning}</p>}
            </div>
          )}
          
          <div className="grid grid-cols-3 gap-2 items-center pt-2">
            <Label htmlFor="assignedStaff" className="text-sm font-medium text-muted-foreground">Zugewiesen:</Label>
            <p id="assignedStaff" className="col-span-2 text-sm font-semibold text-card-foreground">{operation.assignedStaff?.name || 'Nicht zugewiesen'}</p>
          </div>

          {isModifying && (
            <div className="space-y-3 p-3 border border-dashed border-accent/50 rounded-md bg-accent/5">
              <h4 className="font-medium text-accent-foreground">Personal ändern:</h4>
              <div>
                <Label htmlFor="staffSelect" className="text-xs text-muted-foreground">Personal auswählen</Label>
                <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                  <SelectTrigger id="staffSelect">
                    <SelectValue placeholder="Personal auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {STAFF_MEMBERS.filter(s => !s.isSick).map(staff => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="modificationReason" className="text-xs text-muted-foreground">Begründung der Änderung</Label>
                <Textarea
                  id="modificationReason"
                  value={modificationReason}
                  onChange={(e) => setModificationReason(e.target.value)}
                  placeholder="Kurze Begründung für die KI..."
                  className="h-20"
                />
              </div>
            </div>
          )}
          {operation.status === 'modified_julia' && operation.juliaModificationReason && !isModifying && (
             <div className="p-3 rounded-md bg-blue-500/5 border border-blue-500/20">
                <div className="flex items-center space-x-2 mb-1 text-blue-600 dark:text-blue-400">
                  <Info className="h-5 w-5" />
                  <h4 className="font-semibold">Julias Anpassung</h4>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Begründung: {operation.juliaModificationReason}</p>
             </div>
          )}

        </div>

        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button variant="outline">Schließen</Button>
          </DialogClose>
          {canModify && !isModifying && (
            <Button variant="outline" className="text-accent-foreground border-accent hover:bg-accent/10 hover:text-accent-foreground" onClick={() => setIsModifying(true)}>
              <Edit3 className="mr-2 h-4 w-4" /> Personal ändern
            </Button>
          )}
          {isModifying && (
            <Button onClick={handleModifyAction} disabled={!selectedStaffId || !modificationReason} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Check className="mr-2 h-4 w-4" /> Änderung speichern
            </Button>
          )}
          {canApprove && !isModifying &&(
            <Button onClick={() => onApprove(operation.id)} className="bg-green-600 hover:bg-green-700 text-white">
              <Check className="mr-2 h-4 w-4" /> Genehmigen
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignmentModal;
