"use client";

import { ArrowLeft, Ellipsis, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateAvatarFallback } from "@/lib/utils";
import useChatStore from "../useChatStore";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CallDialog, ChatUserDropdown, VideoCallDialog } from "./index";
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage
} from "@/components/ui/avatar";
import { ChatItemProps } from "../types";

const statusColors = {
  success: "bg-green-600 dark:bg-green-800",
  warning: "bg-yellow-500 dark:bg-yellow-700",
  danger: "bg-red-600 dark:bg-red-800"
};

export function ChatHeader({ chat }: { chat: ChatItemProps }) {
  const { setSelectedChat } = useChatStore();
  const isGroup = chat.type === "group";
  const user = chat.user;

  return (
    <div className="flex justify-between gap-4 lg:px-4">
      <div className="flex gap-4">
        <Button
          size="sm"
          variant="outline"
          className="flex size-10 p-0 lg:hidden"
          onClick={() => setSelectedChat(null)}>
          <ArrowLeft />
        </Button>
        {isGroup ? (
          <Avatar>
            {chat.image && <AvatarImage src={chat.image} alt={chat.name} />}
            <AvatarFallback className="bg-primary/10 text-primary">
              <UsersRound className="size-4" />
            </AvatarFallback>
          </Avatar>
        ) : (
          <Avatar>
            <AvatarImage src={`${user?.avatar}`} alt="avatar image" />
            {user?.online_status && <AvatarBadge className={statusColors[user.online_status]} />}
            <AvatarFallback>{generateAvatarFallback(user?.name)}</AvatarFallback>
          </Avatar>
        )}
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold">{isGroup ? chat.name : user?.name}</span>
          {isGroup ? (
            <span className="text-muted-foreground text-xs">
              {chat.users?.length ?? 0} members
            </span>
          ) : user?.online_status == "success" ? (
            <span className="text-xs text-green-500">Online</span>
          ) : (
            <span className="text-muted-foreground text-xs">{user?.last_seen}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isGroup && chat.users && chat.users.length > 0 && (
          <AvatarGroup className="hidden lg:flex">
            {chat.users.slice(0, 3).map((member) => (
              <Avatar key={member.id} size="sm">
                <AvatarImage src={member.avatar} alt={member.name} />
                <AvatarFallback>{generateAvatarFallback(member.name)}</AvatarFallback>
              </Avatar>
            ))}
            {chat.users.length > 3 && <AvatarGroupCount>+{chat.users.length - 3}</AvatarGroupCount>}
          </AvatarGroup>
        )}
        {!isGroup && (
          <div className="hidden lg:flex lg:gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <VideoCallDialog />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">Start Video Chat</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <CallDialog />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">Start Call</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
        <ChatUserDropdown>
          <Button size="icon" variant="ghost">
            <Ellipsis />
          </Button>
        </ChatUserDropdown>
      </div>
    </div>
  );
}
