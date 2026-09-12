"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Ellipsis, FileIcon, PlayIcon } from "lucide-react";
import { ChatMessageProps } from "../types";
import { GalleryMediaItem, MediaGalleryDialog } from "./media-gallery-dialog";

import { Bubble, BubbleContent } from "@/components/ui/bubble";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MessageStatusIcon } from "./message-status-icon";

function MessageRow({
  message,
  children
}: {
  message: ChatMessageProps;
  children: React.ReactNode;
}) {
  const own = message.own_message;
  return (
    <div className={cn("flex w-full flex-col gap-1", own && "items-end")}>
      <div className={cn("group/message flex w-full items-center gap-1", own && "flex-row-reverse")}>
        {children}
      </div>
      <MessageMeta message={message} />
    </div>
  );
}

function MessageActions({ own }: { own?: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon-xs"
          variant="ghost"
          aria-label="Message actions"
          className="text-muted-foreground shrink-0 transition-opacity data-[state=open]:opacity-100 lg:opacity-0 lg:group-hover/message:opacity-100 lg:focus-visible:opacity-100">
          <Ellipsis />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={own ? "end" : "start"}>
        <DropdownMenuGroup>
          <DropdownMenuItem>Forward</DropdownMenuItem>
          <DropdownMenuItem>Star</DropdownMenuItem>
          {own && <DropdownMenuItem>Edit</DropdownMenuItem>}
          <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SenderLabel({ name }: { name?: string }) {
  if (!name) return null;
  return <span className="text-muted-foreground px-1 text-xs font-medium">{name}</span>;
}

function MessageMeta({ message }: { message: ChatMessageProps }) {
  return (
    <div className="text-muted-foreground flex items-center gap-1 text-xs">
      <time>{message.time ?? "05:23 PM"}</time>
      {message.own_message && <MessageStatusIcon status={message.read ? "read" : "sent"} />}
    </div>
  );
}

function TextChatBubble({ message, sender }: { message: ChatMessageProps; sender?: string }) {
  const own = message.own_message;

  return (
    <MessageRow message={message}>
      <Bubble
        variant={own ? "default" : "muted"}
        align={own ? "end" : "start"}
        className="lg:max-w-[60%]">
        <SenderLabel name={sender} />
        <BubbleContent className="whitespace-pre-wrap">{message.content}</BubbleContent>
      </Bubble>
      <MessageActions own={own} />
    </MessageRow>
  );
}

function FileChatBubble({ message, sender }: { message: ChatMessageProps; sender?: string }) {
  const own = message.own_message;

  return (
    <MessageRow message={message}>
      <Bubble variant="muted" align={own ? "end" : "start"}>
        <SenderLabel name={sender} />
        <BubbleContent className="p-3">
          <div className="flex items-start gap-3">
            <div className="bg-background flex size-10 shrink-0 items-center justify-center rounded-lg border">
              <FileIcon className="size-5 opacity-70" strokeWidth={1.5} />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{message.data?.file_name}</div>
              <div className="text-muted-foreground text-xs">{message.data?.size}</div>
              <div className="mt-3 flex gap-2">
                {message.data?.path ? (
                  <>
                    <Button variant="outline" size="sm" asChild>
                      <a href={message.data.path} download={message.data.file_name}>
                        Download
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a href={message.data.path} target="_blank" rel="noreferrer">
                        Preview
                      </a>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm">
                      Download
                    </Button>
                    <Button variant="outline" size="sm">
                      Preview
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </BubbleContent>
      </Bubble>
      <MessageActions own={own} />
    </MessageRow>
  );
}

function VideoChatBubble({ message, sender }: { message: ChatMessageProps; sender?: string }) {
  const own = message.own_message;
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const items: GalleryMediaItem[] = [
    { type: "video", src: message.data?.path ?? "", poster: message.data?.cover }
  ];

  return (
    <MessageRow message={message}>
      <Bubble variant="ghost" align={own ? "end" : "start"}>
        <SenderLabel name={sender} />
        <BubbleContent className="w-56 max-w-full">
          <button
            type="button"
            aria-label="Play video"
            onClick={() => setGalleryIndex(0)}
            className="focus-visible:ring-ring/50 relative block w-full cursor-pointer overflow-hidden rounded-xl outline-none focus-visible:ring-3">
            {message.data?.cover ? (
              <img
                src={message.data.cover}
                className="aspect-4/3 w-full object-cover"
                alt="Video preview"
              />
            ) : (
              <video
                src={message.data?.path}
                preload="metadata"
                muted
                className="aspect-4/3 w-full bg-black object-cover"
              />
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors hover:bg-black/10">
              <span className="flex size-12 items-center justify-center rounded-full bg-black/50">
                <PlayIcon className="size-5 text-white" />
              </span>
            </span>
            {message.data?.duration && (
              <span className="absolute end-2 bottom-2 rounded-md bg-black/60 px-1.5 py-0.5 text-xs font-medium text-white">
                {message.data.duration}
              </span>
            )}
          </button>
        </BubbleContent>
      </Bubble>
      <MessageActions own={own} />
      <MediaGalleryDialog items={items} index={galleryIndex} onIndexChange={setGalleryIndex} />
    </MessageRow>
  );
}

function SoundChatBubble({ message, sender }: { message: ChatMessageProps; sender?: string }) {
  const own = message.own_message;

  return (
    <MessageRow message={message}>
      <Bubble variant="muted" align={own ? "end" : "start"}>
        <SenderLabel name={sender} />
        <BubbleContent className="p-2">
          <div className="flex flex-col gap-2">
            {message.content && <div className="px-1 pt-1">{message.content}</div>}
            <audio className="w-60 max-w-full sm:w-80" controls src={message.data?.path} />
          </div>
        </BubbleContent>
      </Bubble>
      <MessageActions own={own} />
    </MessageRow>
  );
}

function ImageChatBubble({ message, sender }: { message: ChatMessageProps; sender?: string }) {
  const own = message.own_message;
  const images_limit = 4;
  const images: string[] = message.data?.images ?? [];
  const images_with_limit = images.slice(0, images_limit);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const items: GalleryMediaItem[] = images.map((src) => ({ type: "image", src }));

  return (
    <MessageRow message={message}>
      <Bubble variant="muted" align={own ? "end" : "start"}>
        <SenderLabel name={sender} />
        <BubbleContent className="p-1.5">
          <div className="flex flex-col gap-1.5">
            {message.content && <div className="px-1.5 pt-1">{message.content}</div>}
            <div
              className={cn(
                "grid gap-1.5",
                images.length > 1 ? "w-64 grid-cols-2 sm:w-80" : "w-56 grid-cols-1"
              )}>
              {images_with_limit.map((image, key) => (
                <figure
                  className="relative cursor-pointer overflow-hidden rounded-lg transition-opacity hover:opacity-90"
                  key={key}
                  onClick={() => setGalleryIndex(key)}>
                  <img
                    src={image}
                    className="aspect-4/3 w-full object-cover"
                    alt="Shared attachment"
                  />
                  {key + 1 === images_limit && images.length > images_limit && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-2xl font-semibold text-white">
                      +{images.length - images_with_limit.length}
                    </div>
                  )}
                </figure>
              ))}
            </div>
          </div>
        </BubbleContent>
      </Bubble>
      <MessageActions own={own} />
      <MediaGalleryDialog items={items} index={galleryIndex} onIndexChange={setGalleryIndex} />
    </MessageRow>
  );
}

export function ChatBubble({
  message,
  type,
  sender
}: {
  message: ChatMessageProps;
  type?: string;
  sender?: string;
}) {
  switch (type) {
    case "text":
      return <TextChatBubble message={message} sender={sender} />;
    case "video":
      return <VideoChatBubble message={message} sender={sender} />;
    case "sound":
      return <SoundChatBubble message={message} sender={sender} />;
    case "image":
      return <ImageChatBubble message={message} sender={sender} />;
    case "file":
      return <FileChatBubble message={message} sender={sender} />;
    default:
      return null;
  }
}
