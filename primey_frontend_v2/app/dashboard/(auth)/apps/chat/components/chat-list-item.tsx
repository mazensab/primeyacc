import { cn, generateAvatarFallback } from "@/lib/utils";
import useChatStore from "../useChatStore";
import { ChatItemProps } from "../types";
import { Ellipsis, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ChatUserDropdown, MessageStatusIcon } from "./";
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const statusColors = {
  success: "bg-green-600 dark:bg-green-800",
  warning: "bg-yellow-500 dark:bg-yellow-700",
  danger: "bg-red-600 dark:bg-red-800"
};

export function ChatListItem({ chat, active }: { chat: ChatItemProps; active: boolean | null }) {
  const { setSelectedChat } = useChatStore();

  const handleClick = (chat: ChatItemProps) => {
    setSelectedChat(chat);
  };

  const unreadMessageCount = chat?.messages?.filter((item) => !item.read && !item.own_message) ?? [];
  const isGroup = chat.type === "group";

  return (
    <div
      className={cn(
        "group/item hover:bg-muted relative flex min-w-0 cursor-pointer items-center gap-4 px-6 py-3",
        { "dark:bg-muted! bg-gray-200!": active }
      )}
      onClick={() => handleClick(chat)}>
      {isGroup ? (
        <Avatar>
          {chat.image && <AvatarImage src={chat.image} alt={chat.name} />}
          <AvatarFallback className="bg-primary/10 text-primary">
            <UsersRound className="size-4" />
          </AvatarFallback>
        </Avatar>
      ) : (
        <Avatar>
          <AvatarImage src={chat.user?.avatar} alt="avatar image" />
          {chat.user?.online_status && (
            <AvatarBadge className={statusColors[chat.user.online_status]} />
          )}
          <AvatarFallback>{generateAvatarFallback(chat.user?.name)}</AvatarFallback>
        </Avatar>
      )}
      <div className="min-w-0 grow">
        <div className="flex items-center justify-between">
          <span className="truncate text-sm font-medium">
            {isGroup ? chat.name : chat.user?.name}
          </span>
          <span className="text-muted-foreground flex-none text-xs">{chat.date}</span>
        </div>
        <div className="flex items-center gap-2">
          <MessageStatusIcon status={chat.status} />
          <span className="text-muted-foreground truncate text-start text-sm">
            {chat.last_message}
          </span>
          {unreadMessageCount.length > 0 && (
            <div className="ms-auto flex size-5 shrink-0 items-center justify-center rounded-full bg-green-500 text-xs text-white">
              {unreadMessageCount.length}
            </div>
          )}
        </div>
      </div>
      <div
        className={cn(
          "absolute end-0 top-0 bottom-0 flex items-center bg-linear-to-l from-50% px-4 opacity-0 group-hover/item:opacity-100",
          { "from-muted": !active },
          { "dark:from-muted from-gray-200": active }
        )}>
        <ChatUserDropdown>
          <Button size="icon-xs" variant="outline" className="rounded-full">
            <Ellipsis />
          </Button>
        </ChatUserDropdown>
      </div>
    </div>
  );
}
