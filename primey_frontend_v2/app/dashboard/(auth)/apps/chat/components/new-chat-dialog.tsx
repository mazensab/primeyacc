"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import useChatStore from "../useChatStore";
import { UserPropsTypes } from "../types";
import { generateAvatarFallback } from "@/lib/utils";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const statusColors = {
  success: "bg-green-600 dark:bg-green-800",
  warning: "bg-yellow-500 dark:bg-yellow-700",
  danger: "bg-red-600 dark:bg-red-800"
};

export function NewChatDialog({
  contacts,
  open,
  onOpenChange
}: {
  contacts: UserPropsTypes[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { startChat, chats } = useChatStore();
  const [query, setQuery] = useState("");

  const filteredContacts = contacts.filter((contact) =>
    contact.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  const hasChat = (contact: UserPropsTypes) =>
    chats.some((chat) => chat.type !== "group" && chat.user_id === contact.id);

  const handleOpenChange = (value: boolean) => {
    onOpenChange(value);
    if (!value) setQuery("");
  };

  const handleSelect = (contact: UserPropsTypes) => {
    startChat(contact);
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New chat</DialogTitle>
        </DialogHeader>
        <div>
          <div className="relative">
            <Search className="text-muted-foreground absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2" />
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search contacts..."
              className="h-9 ps-8"
            />
          </div>
        </div>
        <div className="-mx-2 max-h-80 overflow-y-auto">
          {filteredContacts.length > 0 ? (
            filteredContacts.map((contact) => (
              <button
                key={contact.id}
                type="button"
                onClick={() => handleSelect(contact)}
                className="hover:bg-muted flex w-full cursor-pointer items-center gap-3 rounded-md p-2 text-start">
                <Avatar>
                  <AvatarImage src={contact.avatar} alt={contact.name} />
                  {contact.online_status && (
                    <AvatarBadge className={statusColors[contact.online_status]} />
                  )}
                  <AvatarFallback>{generateAvatarFallback(contact.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 grow">
                  <div className="truncate text-sm font-medium">{contact.name}</div>
                  <div className="text-muted-foreground truncate text-xs">
                    {contact.about ?? contact.email ?? contact.last_seen}
                  </div>
                </div>
                <span className="text-muted-foreground flex-none text-xs">
                  {hasChat(contact) ? "Open chat" : "Start chat"}
                </span>
              </button>
            ))
          ) : (
            <div className="text-muted-foreground py-8 text-center text-sm">No contact found</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
