"use client";

import { useState } from "react";
import { CircleFadingPlus, Globe, ImageIcon, Lock, Plus, Users, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";

interface CreatePostDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialTab?: string;
  showTrigger?: boolean;
}

export function CreatePostDialog({
  open,
  onOpenChange,
  initialTab = "text",
  showTrigger = true
}: CreatePostDialogProps) {
  const [newPostType, setNewPostType] = useState(initialTab);
  const [status, setStatus] = useState("public");

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) setNewPostType(initialTab);
    onOpenChange?.(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button variant="outline" className="mt-4 w-full">
            <Plus />
            Create Post
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Post</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* User Header */}
          <div className="flex items-center gap-3">
            <Avatar className="size-10">
              <AvatarImage src="https://i.pravatar.cc/150?img=13" />
              <AvatarFallback>XA</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <p className="font-semibold">Toby Belhome</p>
              {/* Status */}
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger
                  size="sm"
                  className="text-muted-foreground h-6 gap-1 border-0 bg-transparent p-0 text-xs shadow-none dark:bg-transparent dark:hover:bg-transparent [&_svg:not([class*='size-'])]:size-3.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    <Globe />
                    Public
                  </SelectItem>
                  <SelectItem value="friends">
                    <Users />
                    Friends
                  </SelectItem>
                  <SelectItem value="private">
                    <Lock />
                    Only me
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Post Type */}
          <Tabs value={newPostType} onValueChange={setNewPostType} className="gap-4">
            <TabsList className="w-full">
              <TabsTrigger value="text">Text</TabsTrigger>
              <TabsTrigger value="image">
                <ImageIcon />
                Photo
              </TabsTrigger>
              <TabsTrigger value="video">
                <Video />
                Video
              </TabsTrigger>
              <TabsTrigger value="status">
                <CircleFadingPlus />
                Status
              </TabsTrigger>
            </TabsList>

            <TabsContent value="text">
              <Textarea placeholder="What's on your mind?" className="min-h-32 resize-none" />
            </TabsContent>

            <TabsContent value="image" className="space-y-4">
              <Textarea placeholder="What's on your mind?" className="min-h-24 resize-none" />
              <div className="rounded-lg border border-dashed p-8 text-center">
                <ImageIcon className="text-muted-foreground/50 mx-auto size-8" />
                <p className="text-muted-foreground mt-2 text-sm">Add photos to your post</p>
                <Button variant="outline" size="sm" className="mt-2">
                  Upload Photo
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="video" className="space-y-4">
              <Textarea placeholder="What's on your mind?" className="min-h-24 resize-none" />
              <div className="rounded-lg border border-dashed p-8 text-center">
                <Video className="text-muted-foreground/50 mx-auto size-8" />
                <p className="text-muted-foreground mt-2 text-sm">Add video to your post</p>
                <Button variant="outline" size="sm" className="mt-2">
                  Upload Video
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="status" className="space-y-4">
              <Input placeholder="Add a caption to your story..." />
              <div className="rounded-lg border border-dashed p-8 text-center">
                <CircleFadingPlus className="text-muted-foreground/50 mx-auto size-8" />
                <p className="text-muted-foreground mt-2 text-sm">
                  Share a photo or video to your story
                </p>
                <Button variant="outline" size="sm" className="mt-2">
                  Upload Media
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {/* Action Icons */}
          <div className="flex items-center justify-end gap-4">
            {newPostType === "status" && (
              <p className="text-muted-foreground me-auto text-xs">
                Your story is visible to your followers for 24 hours.
              </p>
            )}
            <Button>{newPostType === "status" ? "Share Status" : "Post"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
