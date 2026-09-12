"use client";

import { useState } from "react";
import Link from "next/link";
import { FileSearchIcon, GridIcon, ListIcon, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { NewProjectDrawer } from "./new-project-drawer";

type Project = {
  id: number;
  title: string;
  subtitle: string;
  progress: number;
  timeLeft: string;
  date: string;
  progressColor: string;
  badgeColor: string;
  team: { id: number; avatar: string }[];
};

export function ProjectList({ projects }: { projects: Project[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const filteredProjects = projects.filter((project) =>
    `${project.title} ${project.subtitle}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground text-sm">List of your ongoing projects</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full lg:w-64">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 opacity-50" />
            <Input
              placeholder="Search projects..."
              className="ps-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <ButtonGroup>
            <Button
              variant="outline"
              size="icon"
              aria-label="Grid view"
              aria-pressed={viewMode === "grid"}
              className={cn(viewMode === "grid" && "bg-muted")}
              onClick={() => setViewMode("grid")}>
              <GridIcon />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="List view"
              aria-pressed={viewMode === "list"}
              className={cn(viewMode === "list" && "bg-muted")}
              onClick={() => setViewMode("list")}>
              <ListIcon />
            </Button>
          </ButtonGroup>
          <NewProjectDrawer />
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="bg-muted/30 mb-4 rounded-full p-6">
            <FileSearchIcon className="text-muted-foreground size-10" />
          </div>
          <h3 className="mb-1 text-lg font-medium">No projects found</h3>
          <p className="text-muted-foreground text-sm">
            {`We couldn't find any projects matching "${searchQuery}".`}
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-4 lg:gap-6 lg:grid-cols-2 xl:grid-cols-4">
          {filteredProjects.map((project) => (
            <Link href="/dashboard/project-detail" key={project.id}>
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader>
                  <CardTitle>{project.title}</CardTitle>
                  <CardDescription>{project.subtitle}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-muted-foreground mb-4 text-sm">{project.date}</div>

                  <div className="mb-6">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm opacity-90">Progress</span>
                      <span className="text-sm font-semibold">{project.progress}%</span>
                    </div>
                    <Progress value={project.progress} indicatorColor={project.progressColor} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="*:data-[slot=avatar]:ring-background flex -space-x-2 *:data-[slot=avatar]:ring-2">
                      {project.team.map((member, i) => (
                        <Avatar key={i}>
                          <AvatarImage src={member.avatar} alt={`${member.id}`} />
                          <AvatarFallback>CN</AvatarFallback>
                        </Avatar>
                      ))}
                    </div>

                    <Badge
                      className={`${project.badgeColor} border-0 text-white hover:${project.badgeColor}`}>
                      {project.timeLeft}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:gap-6">
          {filteredProjects.map((project) => (
            <Link href="/dashboard/project-detail" key={project.id}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
                  <div className="md:w-64">
                    <div className="text-sm font-semibold">{project.title}</div>
                    <div className="text-muted-foreground text-sm">{project.subtitle}</div>
                  </div>
                  <div className="text-muted-foreground text-sm md:w-28">{project.date}</div>
                  <div className="flex flex-1 items-center gap-3">
                    <Progress
                      value={project.progress}
                      indicatorColor={project.progressColor}
                      className="flex-1"
                    />
                    <span className="w-10 text-end text-sm font-semibold">
                      {project.progress}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 md:justify-end">
                    <div className="*:data-[slot=avatar]:ring-background flex -space-x-2 *:data-[slot=avatar]:ring-2">
                      {project.team.map((member, i) => (
                        <Avatar key={i} className="size-7">
                          <AvatarImage src={member.avatar} alt={`${member.id}`} />
                          <AvatarFallback>CN</AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    <Badge
                      className={`${project.badgeColor} w-24 justify-center border-0 text-white hover:${project.badgeColor}`}>
                      {project.timeLeft}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
