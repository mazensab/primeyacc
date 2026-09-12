"use client";

import { useState } from "react";
import { CodeXmlIcon, CopyIcon, LinkIcon, Share2Icon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const projectLink = "shadcnuikit.com/project/saas-blog-growth";

type Member = {
  email: string;
  avatar?: string;
};

const initialMembers: Member[] = [
  { email: "sarah@acmecloud.com", avatar: "https://i.pravatar.cc/150?img=5" },
  { email: "priya@acmecloud.com", avatar: "https://i.pravatar.cc/150?img=15" }
];

function PermissionSelect() {
  return (
    <Select defaultValue="view">
      <SelectTrigger size="sm" className="border-none shadow-none">
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value="view">Can view</SelectItem>
        <SelectItem value="edit">Can edit</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function SharePopover() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [members, setMembers] = useState<Member[]>(initialMembers);

  const handleInvite = () => {
    const value = email.trim();
    if (!value.includes("@")) return;
    if (members.some((member) => member.email === value)) {
      toast.info("This person is already invited.");
      return;
    }
    setMembers([...members, { email: value }]);
    setEmail("");
    toast.success(`Invitation sent to ${value}.`);
  };

  const handleCopy = (text: string, message: string) => {
    navigator.clipboard?.writeText(text);
    toast.success(message);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2Icon /> Share
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">Share Project</h3>
            <p className="text-muted-foreground text-xs">
              Manage who has access to this project.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Close"
            onClick={() => setOpen(false)}>
            <XIcon />
          </Button>
        </div>

        <Tabs defaultValue="share">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="share">Share</TabsTrigger>
            <TabsTrigger value="publish">Publish</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>

          <TabsContent value="share" className="mt-2 space-y-4">
            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Direct link</span>
                <PermissionSelect />
              </div>
              <p className="text-muted-foreground text-xs">
                Anyone with the direct link can view.
              </p>
              <div className="relative">
                <LinkIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 opacity-50" />
                <Input readOnly value={projectLink} className="ps-9 text-sm" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="space-y-1">
                <span className="text-sm font-medium">Invite to collaborate</span>
                <p className="text-muted-foreground text-xs">
                  Add team members by username or email.
                </p>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Email or username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                />
                <Button variant="outline" onClick={handleInvite} disabled={!email.includes("@")}>
                  Invite
                </Button>
              </div>
              <div className="divide-y">
                {members.map((member) => (
                  <div key={member.email} className="flex items-center gap-2 py-1.5">
                    <Avatar className="size-6">
                      {member.avatar ? (
                        <AvatarImage src={member.avatar} alt={member.email} />
                      ) : null}
                      <AvatarFallback className="text-xs">
                        {member.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 truncate text-sm">{member.email}</span>
                    <div className="ms-auto shrink-0">
                      <PermissionSelect />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="publish" className="mt-2 space-y-3">
            <p className="text-muted-foreground text-sm">
              Publish a read-only version of this project to the web. Anyone with the public link
              can see progress, tasks, and the timeline.
            </p>
            <Button
              size="sm"
              onClick={() => toast.success("Project published to the web.")}>
              Publish to Web
            </Button>
          </TabsContent>

          <TabsContent value="export" className="mt-2 space-y-3">
            <p className="text-muted-foreground text-sm">
              Download a snapshot of this project including tasks, milestones, and budget.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.success("Exporting project as PDF.")}>
                Export as PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.success("Exporting project as CSV.")}>
                Export as CSV
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <Separator />

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCopy(`https://${projectLink}`, "Link copied to clipboard.")}>
            <CopyIcon /> Copy link
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              handleCopy(
                `<iframe src="https://${projectLink}/embed" width="800" height="600"></iframe>`,
                "Embed code copied to clipboard."
              )
            }>
            <CodeXmlIcon /> Embed
          </Button>
          <Button size="sm" className="ms-auto" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
