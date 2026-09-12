"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Paperclip, Plus, PlusCircleIcon, SendIcon, SmileIcon, Trash2, X } from "lucide-react";
import useChatStore from "../useChatStore";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { EmojiPicker } from "./emoji-picker";

const formatFileSize = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))}KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)}MB`;

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
};

export function ChatFooter() {
  const [message, setMessage] = useState("");
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const discardRef = useRef(false);
  const { sendMessage, sendImages, sendAudio, sendVideo, sendFile } = useChatStore();

  useEffect(() => {
    if (!isRecording) return;
    const id = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [isRecording]);

  const startRecording = async () => {
    if (isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      discardRef.current = false;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        if (!discardRef.current && chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, {
            type: recorder.mimeType || "audio/webm"
          });
          sendAudio(URL.createObjectURL(blob));
        }
        setIsRecording(false);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setElapsed(0);
      setIsRecording(true);
    } catch {
      window.alert("Microphone access is needed to record a voice message.");
    }
  };

  const stopRecording = (discard: boolean) => {
    discardRef.current = discard;
    mediaRecorderRef.current?.stop();
  };

  const send = () => {
    const trimmed = message.trim();

    if (pendingImages.length > 0) {
      sendImages(pendingImages, trimmed || undefined);
      setPendingImages([]);
      setMessage("");
      return;
    }

    if (!trimmed) return;
    sendMessage(trimmed);
    setMessage("");
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    send();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  const handleFilesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    const imageUrls: string[] = [];

    files.forEach((file) => {
      const url = URL.createObjectURL(file);
      if (file.type.startsWith("image/")) {
        imageUrls.push(url);
      } else if (file.type.startsWith("video/")) {
        sendVideo(url);
      } else {
        sendFile(file.name, formatFileSize(file.size), url);
      }
    });

    if (imageUrls.length > 0) {
      setPendingImages((prev) => [...prev, ...imageUrls]);
    }
    event.target.value = "";
  };

  const handleRemoveImage = (index: number) => {
    URL.revokeObjectURL(pendingImages[index]);
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const insertEmoji = (emoji: string) => {
    const input = inputRef.current;
    const start = input?.selectionStart ?? message.length;
    const end = input?.selectionEnd ?? start;
    setMessage(message.slice(0, start) + emoji + message.slice(end));

    requestAnimationFrame(() => {
      if (!input) return;
      input.focus();
      const position = start + emoji.length;
      input.setSelectionRange(position, position);
    });
  };

  return (
    <div className="lg:px-4">
      <form onSubmit={handleSubmit}>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFilesSelected}
        />
        {pendingImages.length > 0 && (
          <div className="bg-muted/50 mb-2 flex flex-wrap items-center gap-3 rounded-lg border p-2">
            {pendingImages.map((image, index) => (
              <div key={image} className="relative">
                <img
                  src={image}
                  alt="Selected attachment"
                  className="size-16 rounded-md border object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  aria-label="Remove image"
                  className="bg-foreground text-background absolute -end-1.5 -top-1.5 flex size-5 cursor-pointer items-center justify-center rounded-full"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              className="size-16"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Add more images"
            >
              <Plus />
            </Button>
          </div>
        )}
        {isRecording && (
          <div className="bg-background flex h-14 items-center gap-3 rounded-lg border px-4">
            <span className="relative flex size-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex size-3 rounded-full bg-red-500" />
            </span>
            <span className="text-sm tabular-nums">{formatDuration(elapsed)}</span>
            <span className="text-muted-foreground text-sm">Recording...</span>
            <div className="ms-auto flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => stopRecording(true)}
                aria-label="Cancel recording">
                <Trash2 />
              </Button>
              <Button type="button" onClick={() => stopRecording(false)}>
                <span className="hidden lg:inline">Send</span>
                <SendIcon className="inline lg:hidden" />
              </Button>
            </div>
          </div>
        )}
        <div
          className={
            isRecording
              ? "hidden"
              : "bg-background focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 flex items-end gap-1 rounded-lg border p-2 transition-colors"
          }>
          <Textarea
            ref={inputRef}
            rows={1}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={handleKeyDown}
            className="max-h-40 min-h-9 flex-1 resize-none border-0 bg-transparent px-2 py-1.5 text-base! shadow-none focus-visible:ring-0 dark:bg-transparent"
            placeholder={pendingImages.length > 0 ? "Add a caption..." : "Type a message..."}
          />
          <div className="flex shrink-0 items-center">
            <EmojiPicker onSelect={insertEmoji}>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-full"
                aria-label="Emoji"
              >
                <SmileIcon />
              </Button>
            </EmojiPicker>
            <div className="block lg:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" className="size-11 rounded-full p-0">
                    <PlusCircleIcon className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onSelect={() => fileInputRef.current?.click()}>
                    Add File
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => startRecording()}>Send Voice</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="hidden lg:block">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="rounded-full"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Add File</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="rounded-full"
                      onClick={startRecording}>
                      <Mic />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Send Voice</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Button
              type="submit"
              className="ms-3"
              disabled={!message.trim() && pendingImages.length === 0}
            >
              <span className="hidden lg:inline">Send</span>{" "}
              <SendIcon className="inline lg:hidden" />
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
