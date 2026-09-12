"use client";

import Link from "next/link";
import { cn, generateAvatarFallback } from "@/lib/utils";
import {
  Dribbble,
  Facebook,
  FileSpreadsheet,
  FileText,
  Globe,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Video,
  X
} from "lucide-react";
import useChatStore from "../useChatStore";
import { UserPropsTypes } from "../types";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const statusColors = {
  success: "bg-green-600 dark:bg-green-800",
  warning: "bg-yellow-500 dark:bg-yellow-700",
  danger: "bg-red-600 dark:bg-red-800"
};

const socialIcons: Record<string, React.ReactNode> = {
  Facebook: <Facebook />,
  X: <X />,
  Dribbble: <Dribbble />,
  Linkedin: <Linkedin />,
  Instagram: <Instagram />
};

const fileTileStyles: Record<string, string> = {
  pdf: "bg-red-500/10 text-red-600 dark:text-red-400",
  excel: "bg-green-500/10 text-green-600 dark:text-green-400",
  file: "bg-blue-500/10 text-blue-600 dark:text-blue-400"
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h5 className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
      {children}
    </h5>
  );
}

function ContactRow({
  icon: Icon,
  children
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="bg-muted text-muted-foreground flex size-8 flex-none items-center justify-center rounded-md">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 grow text-sm">{children}</div>
    </div>
  );
}

export function UserDetailSheet({ user }: { user: UserPropsTypes }) {
  const { showProfileSheet, toggleProfileSheet } = useChatStore();

  return (
    <Sheet open={showProfileSheet} onOpenChange={toggleProfileSheet}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="text-xl">Profile</SheetTitle>
        </SheetHeader>
        <div className="overflow-y-auto px-4 pb-6">
          <div className="flex flex-col items-center pb-6 text-center">
            <Avatar className="mb-3 size-24">
              {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
              {user.online_status && (
                <AvatarBadge className={cn("size-5!", statusColors[user.online_status])} />
              )}
              <AvatarFallback className="text-2xl">
                {generateAvatarFallback(user.name)}
              </AvatarFallback>
            </Avatar>
            <h4 className="text-lg font-semibold">{user.name}</h4>
            <p className="mt-0.5 text-xs">
              {user.online_status === "success" ? (
                <span className="text-green-500">Online</span>
              ) : (
                <span className="text-muted-foreground">Last seen {user.last_seen}</span>
              )}
            </p>
            <div className="mt-4 grid w-full grid-cols-3 gap-2">
              <Button variant="outline" size="sm" onClick={() => toggleProfileSheet(false)}>
                <MessageSquare /> Message
              </Button>
              <Button variant="outline" size="sm">
                <Phone /> Call
              </Button>
              <Button variant="outline" size="sm">
                <Video /> Video
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            {user.about && (
              <section>
                <SectionTitle>About</SectionTitle>
                <p className="text-sm leading-relaxed">{user.about}</p>
              </section>
            )}

            {(user.phone || user.email || user.website || user.country) && (
              <section>
                <SectionTitle>Contact info</SectionTitle>
                <div className="divide-y rounded-lg border px-3">
                  {user.phone && <ContactRow icon={Phone}>{user.phone}</ContactRow>}
                  {user.email && (
                    <ContactRow icon={Mail}>
                      <a href={`mailto:${user.email}`} className="block truncate hover:underline">
                        {user.email}
                      </a>
                    </ContactRow>
                  )}
                  {user.website && (
                    <ContactRow icon={Globe}>
                      <a
                        href={user.website}
                        target="_blank"
                        rel="noreferrer"
                        className="block truncate hover:underline">
                        {user.website}
                      </a>
                    </ContactRow>
                  )}
                  {user.country && <ContactRow icon={MapPin}>{user.country}</ContactRow>}
                </div>
              </section>
            )}

            {user.medias && user.medias.length > 0 && (
              <section>
                <SectionTitle>Media</SectionTitle>
                <ScrollArea className="w-full">
                  <div className="flex gap-3 pb-3 *:shrink-0">
                    {user.medias.map((item, key) =>
                      item.type === "image" ? (
                        <img
                          key={key}
                          className="size-20 rounded-lg border object-cover"
                          src={`${item.path}`}
                          alt="Shared media"
                        />
                      ) : (
                        <Link
                          key={key}
                          href={item.path ?? "#"}
                          className={cn(
                            "flex size-20 items-center justify-center rounded-lg transition-opacity hover:opacity-80",
                            fileTileStyles[item.type ?? "file"] ?? fileTileStyles.file
                          )}>
                          {item.type === "excel" ? (
                            <FileSpreadsheet className="size-7" strokeWidth={1.5} />
                          ) : (
                            <FileText className="size-7" strokeWidth={1.5} />
                          )}
                        </Link>
                      )
                    )}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </section>
            )}

            {user.social_links && user.social_links.length > 0 && (
              <section>
                <SectionTitle>Social links</SectionTitle>
                <div className="flex flex-wrap items-center gap-2 *:shrink-0">
                  {user.social_links.map((item, key) => (
                    <Button
                      key={key}
                      variant="outline"
                      className="rounded-full"
                      size="icon-sm"
                      title={item.name}
                      asChild>
                      <Link href={item.url ?? "#"} target="_blank">
                        {socialIcons[item.name ?? ""] ?? <Globe />}
                      </Link>
                    </Button>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
