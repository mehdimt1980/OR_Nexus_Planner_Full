
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
import { AlertTriangle, Check, Edit3, Bot, User, Info, Users } from 'lucide-react';
import { STAFF_MEMBERS } from '@/lib/or-planner-data';
import { cn } from '@/lib/utils';

type AssignmentModalProps = {
  operation: OperationAssignment | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (operationId: string) => void;
  onModify: (operationId: string, newStaffIds: string[], reason: string) => void;
  availableStaff: StaffMember[]; // For modification dropdown
};

const complexityClasses: Record<string, string> = {
  'Sehr Hoch': 'text-red-600 bg-red-100 dark:text-red-300 dark:bg-red-700/30',
  'Hoch': 'text-orange-600 bg-orange-100 dark:text-orange-300 dark:bg-orange-700/30',
  'Mittel': 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-700/30',
  'Niedrig': 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-700/30',
};


const AssignmentModal: React.FC<AssignmentModalProps> = ({ operation, isOpen, onClose, onApprove, onModify, availableStaff }) => {
  const [selectedStaffId1, setSelectedStaffId1] = useState<string | undefined>(undefined);
  const [selectedStaffId2, setSelectedStaffId2] = useState<string | undefined>(undefined);
  const [modificationReason, setModificationReason] = useState<string>('');
  const [isModifying, setIsModifying] = useState<boolean>(false);

  useEffect(() => {
    if (operation) {
      setSelectedStaffId1(operation.assignedStaff?.[0]?.id);
      setSelectedStaffId2(operation.assignedStaff?.[1]?.id);
      setModificationReason(operation.juliaModificationReason || '');
      // Keep isModifying based on status, not if IDs are set, to allow modifying an empty slot
      setIsModifying(operation.status === 'modified_julia' || operation.status === 'empty' || operation.status === 'critical_pending');
    } else {
      setIsModifying(false);
      setModificationReason('');
      setSelectedStaffId1(undefined);
      setSelectedStaffId2(undefined);
    }
  }, [operation]);

  if (!operation) return null;

  const handleModifyAction = () => {
    const newStaffIds = [selectedStaffId1, selectedStaffId2].filter(Boolean) as string[];
    if (newStaffIds.length > 0 && modificationReason) { // Allow single modification if only one is selected initially
      if (newStaffIds.length === 1 && operation.assignedStaff.length === 0) { // If only one is selected for a previously empty slot
         // Optionally require two, or allow one. For now, allow one.
      } else if (newStaffIds.length < 2 && operation.assignedStaff.length > 0) {
        // If modifying an existing pair, ideally both should be selected or indicate one is being removed.
        // For simplicity, let's assume if one is not selected, it means it's being unassigned.
        // Or, we could enforce two selections for modification.
        // Current behavior: it will pass whatever is selected.
      }
      onModify(operation.id, newStaffIds, modificationReason);
    } else if (newStaffIds.length === 0 && modificationReason){ // Unassign all
      onModify(operation.id, [], modificationReason);
    }
  };
  
  const canApprove = operation.status === 'pending_gpt' || operation.status === 'critical_pending' || operation.status === 'modified_julia';
  const canModify = operation.status === 'pending_gpt' || operation.status === 'critical_pending' || operation.status === 'modified_julia' || operation.status === 'approved_julia' || operation.status === 'empty';

  const gptStaff = operation.gptSuggestedStaff || [];
  const assignedStaff = operation.assignedStaff || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-card">
        <DialogHeader>
          <DialogTitle className="text-xl font-headline text-primary">
            Einsatzdetails: {operation.room} - {operation.shift} ({SHIFT_TIMES[operation.shift]})
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto px-1 pr-3">
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

          {gptStaff.length > 0 && (
            <div className="p-3 rounded-md bg-primary/5 border border-primary/20">
              <div className="flex items-center space-x-2 mb-1 text-primary">
                <Bot className="h-5 w-5" />
                <h4 className="font-semibold">KI Vorschlag</h4>
              </div>
              {gptStaff.map((staff, idx) => (
                <p key={idx} className="text-sm text-card-foreground">Pflege {idx + 1}: {staff.name}</p>
              ))}
              {operation.aiReasoning && <p className="text-xs text-muted-foreground mt-1">Begründung: {operation.aiReasoning}</p>}
            </div>
          )}
          
          <div className="grid grid-cols-3 gap-2 items-start pt-2">
            <Label className="text-sm font-medium text-muted-foreground mt-1">Zugewiesen:</Label>
            <div className="col-span-2 space-y-1">
              {assignedStaff.length > 0 ? assignedStaff.map((staff, idx) => (
                <p key={idx} id={`assignedStaff-${idx}`} className="text-sm font-semibold text-card-foreground">Pflege {idx+1}: {staff.name}</p>
              )) : <p className="text-sm text-muted-foreground italic">Nicht zugewiesen</p>}
            </div>
          </div>

          {isModifying && (
            <div className="space-y-3 p-3 border border-dashed border-accent/50 rounded-md bg-accent/5">
              <h4 className="font-medium text-accent-foreground">Personal ändern:</h4>
              <div>
                <Label htmlFor="staffSelect1" className="text-xs text-muted-foreground">Pflege 1 auswählen</Label>
                <Select value={selectedStaffId1} onValueChange={setSelectedStaffId1}>
                  <SelectTrigger id="staffSelect1">
                    <SelectValue placeholder="Pflege 1 auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStaff.map(staff => (
                      <SelectItem key={staff.id} value={staff.id} disabled={staff.id === selectedStaffId2}>
                        {staff.name}
                      </SelectItem>
                    ))}
                     <SelectItem value="unassign">Unbesetzt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="staffSelect2" className="text-xs text-muted-foreground">Pflege 2 auswählen</Label>
                <Select value={selectedStaffId2} onValueChange={setSelectedStaffId2}>
                  <SelectTrigger id="staffSelect2">
                    <SelectValue placeholder="Pflege 2 auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStaff.map(staff => (
                      <SelectItem key={staff.id} value={staff.id} disabled={staff.id === selectedStaffId1}>
                        {staff.name}
                      </SelectItem>
                    ))}
                     <SelectItem value="unassign">Unbesetzt</SelectItem>
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
            <Button 
              onClick={handleModifyAction} 
              disabled={(!selectedStaffId1 && !selectedStaffId2 && operation.assignedStaff.length > 0) || !modificationReason || (selectedStaffId1 === selectedStaffId2 && selectedStaffId1 !== undefined && selectedStaffId1 !== "unassign")} // Prevent saving if both are unassigned from a previously assigned state without reason, or if same staff selected twice
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              <Check className="mr-2 h-4 w-4" /> Änderung speichern
            </Button>
          )}
          {canApprove && !isModifying && (
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
