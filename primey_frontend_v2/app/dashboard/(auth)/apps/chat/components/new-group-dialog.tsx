"use client";

import { useState } from "react";
import useChatStore from "../useChatStore";
import { UserPropsTypes } from "../types";
import { generateAvatarFallback } from "@/lib/utils";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage
} from "@/components/ui/avatar";

export function NewGroupDialog({
  contacts,
  open,
  onOpenChange
}: {
  contacts: UserPropsTypes[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { startGroup } = useChatStore();
  const [name, setName] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const selectedContacts = contacts.filter((contact) => selectedIds.includes(contact.id));

  const toggleMember = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleOpenChange = (value: boolean) => {
    onOpenChange(value);
    if (!value) {
      setName("");
      setSelectedIds([]);
    }
  };

  const handleCreate = () => {
    startGroup(name.trim(), selectedContacts);
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create group</DialogTitle>
          <DialogDescription>
            Give your group a name and select the members you want to invite.
          </DialogDescription>
        </DialogHeader>
        <Input
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Group name"
          className="h-9"
        />
        <Command className="p-0 **:data-[slot=command-input-wrapper]:p-0">
          <CommandInput placeholder="Search user..." />
          <CommandList className="max-h-56">
            <CommandEmpty>No users found.</CommandEmpty>
            <CommandGroup className="px-0">
              {contacts.map((contact) => (
                <CommandItem
                  key={contact.id}
                  value={contact.name}
                  data-checked={selectedIds.includes(contact.id)}
                  onSelect={() => toggleMember(contact.id)}
                  className="flex items-center">
                  <Avatar>
                    <AvatarImage src={contact.avatar} alt={contact.name} />
                    <AvatarFallback>{generateAvatarFallback(contact.name)}</AvatarFallback>
                  </Avatar>
                  <div className="ms-2 min-w-0">
                    <p className="truncate text-sm leading-none font-medium">{contact.name}</p>
                    <p className="text-muted-foreground mt-1 truncate text-sm">
                      {contact.email}
                    </p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
        <DialogFooter className="items-center sm:justify-between">
          {selectedContacts.length > 0 ? (
            <AvatarGroup>
              {selectedContacts.slice(0, 5).map((contact) => (
                <Avatar key={contact.id}>
                  <AvatarImage src={contact.avatar} alt={contact.name} />
                  <AvatarFallback>{generateAvatarFallback(contact.name)}</AvatarFallback>
                </Avatar>
              ))}
              {selectedContacts.length > 5 && (
                <AvatarGroupCount>+{selectedContacts.length - 5}</AvatarGroupCount>
              )}
            </AvatarGroup>
          ) : (
            <p className="text-muted-foreground text-sm">
              Select members to add to this group.
            </p>
          )}
          <Button onClick={handleCreate} disabled={!name.trim() || selectedContacts.length === 0}>
            Create group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
