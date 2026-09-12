"use client";

import { useEffect, useRef } from "react";
import useChatStore from "../useChatStore";
import { ChatMessageProps } from "../types";

import { MessagesSquare } from "lucide-react";

import { BubbleGroup } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from "@/components/ui/empty";
import { ChatHeader, ChatBubble, ChatFooter, UserDetailSheet } from "./index";

function groupMessages(messages: ChatMessageProps[]) {
  const groups: ChatMessageProps[][] = [];
  messages.forEach((message) => {
    const lastGroup = groups[groups.length - 1];
    if (
      lastGroup &&
      Boolean(lastGroup[0].own_message) === Boolean(message.own_message) &&
      lastGroup[0].user_id === message.user_id
    ) {
      lastGroup.push(message);
    } else {
      groups.push([message]);
    }
  });
  return groups;
}

export function ChatContent() {
  const { selectedChat, toggleNewChatDialog } = useChatStore();
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollIntoView(false);
    }
  }, [selectedChat]);

  if (!selectedChat) {
    return (
      <div className="hidden h-full items-center justify-center lg:flex">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MessagesSquare />
            </EmptyMedia>
            <EmptyTitle>No Chat Selected</EmptyTitle>
            <EmptyDescription>
              Select a conversation from the list to read and reply, or start a new chat with one
              of your contacts.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="flex-row justify-center gap-2">
            <Button size="sm" onClick={() => toggleNewChatDialog(true)}>
              Start New Chat
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  const isGroup = selectedChat.type === "group";

  return (
    <div className="bg-background fixed inset-0 z-50 flex h-full flex-col p-4 lg:relative lg:z-10 lg:bg-transparent lg:p-0">
      <ChatHeader chat={selectedChat} />

      <div className="flex-1 overflow-y-auto lg:px-4">
        <div ref={messagesContainerRef}>
          <div className="flex flex-col gap-6 py-6">
            {(selectedChat.messages ?? []).length === 0 && (
              <div className="text-muted-foreground py-16 text-center text-sm">
                No messages yet. Say hi 👋
              </div>
            )}
            {groupMessages(selectedChat?.messages ?? []).map((group, key) => (
              <BubbleGroup key={key}>
                {group.map((item, index) => (
                  <ChatBubble
                    message={item}
                    type={item.type}
                    key={item.id}
                    sender={
                      isGroup && !item.own_message && index === 0
                        ? selectedChat.users?.find((member) => member.id === item.user_id)?.name
                        : undefined
                    }
                  />
                ))}
              </BubbleGroup>
            ))}
          </div>
        </div>
      </div>

      <ChatFooter />

      {!isGroup && <UserDetailSheet user={selectedChat.user} />}
    </div>
  );
}
