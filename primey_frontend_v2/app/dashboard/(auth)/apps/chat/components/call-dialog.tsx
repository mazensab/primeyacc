"use client";

import React from "react";
import { PhoneIcon, PhoneMissedIcon, PhoneOffIcon } from "lucide-react";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

export function CallDialog() {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button size="icon" variant="outline">
          <span className="sr-only">Incoming call</span>
          <PhoneMissedIcon />
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <VisuallyHidden>
          <DrawerTitle>Incoming call</DrawerTitle>
          <DrawerDescription>Jennica Peterson is calling you</DrawerDescription>
        </VisuallyHidden>
        <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-6 px-6 pt-6 pb-10">
          <div className="relative">
            <span className="absolute -inset-2 animate-ping rounded-full bg-emerald-500/20" />
            <span className="absolute -inset-2 rounded-full bg-emerald-500/10" />
            <Avatar className="border-background relative size-24 border-4 shadow-sm">
              <AvatarImage src={`https://i.pravatar.cc/150?img=4`} alt="Jennica Peterson" />
              <AvatarFallback>JP</AvatarFallback>
            </Avatar>
          </div>
          <div className="space-y-1 text-center">
            <div className="text-xl font-semibold">Jennica Peterson</div>
            <p className="text-muted-foreground text-sm">Incoming voice call...</p>
          </div>
          <div className="flex items-start gap-16">
            <div className="flex flex-col items-center gap-2">
              <DrawerClose asChild>
                <Button
                  className="size-14 rounded-full bg-red-500 text-white hover:bg-red-600"
                  aria-label="Decline call">
                  <PhoneOffIcon className="size-5" />
                </Button>
              </DrawerClose>
              <span className="text-muted-foreground text-xs">Decline</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <DrawerClose asChild>
                <Button
                  className="size-14 rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
                  aria-label="Accept call">
                  <PhoneIcon className="size-5" />
                </Button>
              </DrawerClose>
              <span className="text-muted-foreground text-xs">Accept</span>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
