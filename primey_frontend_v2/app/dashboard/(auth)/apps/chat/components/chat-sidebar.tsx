"use client";

import React from "react";
import { PlusIcon, Search } from "lucide-react";
import useChatStore from "../useChatStore";
import { ChatItemProps, UserPropsTypes } from "../types";

import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { ChatListItem } from "./chat-list-item";
import { NewChatDialog } from "./new-chat-dialog";
import { NewGroupDialog } from "./new-group-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function ChatSidebar({
  chats,
  contacts
}: {
  chats: ChatItemProps[];
  contacts: UserPropsTypes[];
}) {
  const {
    selectedChat,
    chats: storeChats,
    setChats,
    showNewChatDialog,
    toggleNewChatDialog
  } = useChatStore();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [newGroupOpen, setNewGroupOpen] = React.useState(false);

  React.useEffect(() => {
    setChats(chats);
  }, [chats, setChats]);

  const list = storeChats.length > 0 ? storeChats : chats;
  const filteredChats = list.filter((chat) =>
    (chat.name ?? chat.user?.name ?? "").toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

  const changeHandle = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  return (
    <Card className="w-full pb-0 lg:w-80 lg:shrink-0">
      <CardContent className="flex flex-1 flex-col overflow-hidden p-0">
        <div className="space-y-4 p-(--card-spacing)">
          <div className="flex items-center justify-between gap-2">
            <div className="font-display text-xl">Chats</div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon-sm" className="rounded-full">
                  <span className="sr-only">New conversation</span>
                  <PlusIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  <DropdownMenuItem onSelect={() => toggleNewChatDialog(true)}>
                    New chat
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setNewGroupOpen(true)}>
                    Create group
                  </DropdownMenuItem>
                  <DropdownMenuItem>Add contact</DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <InputGroup>
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput type="text" placeholder="Chats search..." onChange={changeHandle} />
          </InputGroup>
        </div>

        <ScrollArea className="min-h-0 min-w-0 flex-1 border-t [&>[data-slot=scroll-area-viewport]>div]:block!">
          <div className="divide-y">
            {filteredChats.length ? (
              filteredChats.map((chat) => (
                <ChatListItem
                  chat={chat}
                  key={chat.id}
                  active={selectedChat && selectedChat.id === chat.id}
                />
              ))
            ) : (
              <div className="text-muted-foreground mt-4 text-center text-sm">No chat found</div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
      <NewChatDialog
        contacts={contacts}
        open={showNewChatDialog}
        onOpenChange={toggleNewChatDialog}
      />
      <NewGroupDialog contacts={contacts} open={newGroupOpen} onOpenChange={setNewGroupOpen} />
    </Card>
  );
}
