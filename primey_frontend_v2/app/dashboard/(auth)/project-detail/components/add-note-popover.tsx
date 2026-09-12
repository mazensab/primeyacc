"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";

export function AddNotePopover() {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");

  const handleSave = () => {
    if (!note.trim()) return;
    toast.success("Note added to the project.");
    setNote("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm">
          <PlusIcon /> Add note
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3">
        <div className="space-y-1">
          <Label htmlFor="project-note" className="text-sm font-semibold">
            Add Note
          </Label>
          <p className="text-muted-foreground text-xs">
            Visible to everyone on this project.
          </p>
        </div>
        <Textarea
          id="project-note"
          placeholder="Write a quick note..."
          className="min-h-24 resize-none"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!note.trim()}>
            Save Note
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
