"use client";

import { useState } from "react";
import Link from "next/link";
import { LayoutGridIcon, ListIcon } from "lucide-react";

import { cn, generateAvatarFallback } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";

type CourseStatus = "ongoing" | "done" | "paused";

type Course = {
  id: number;
  title: string;
  category: string;
  description: string;
  status: CourseStatus;
  progress: number;
  instructor: string;
  instructorAvatar?: string;
  logo: string;
};

const courses: Course[] = [
  {
    id: 1,
    title: "AngularJS",
    category: "Frontend Development",
    description:
      "Master Angular from the basics to building an advanced application with Firebase's Firestore.",
    status: "ongoing",
    progress: 45,
    instructor: "Brad Traversy",
    instructorAvatar: "https://i.pravatar.cc/150?img=12",
    logo: "https://cdn.simpleicons.org/angular"
  },
  {
    id: 2,
    title: "Codeigniter",
    category: "Backend Development",
    description: "Learn Php Codeigniter and understand working with MVC and HMVC from zero to hero.",
    status: "done",
    progress: 100,
    instructor: "InsideCode M",
    logo: "https://cdn.simpleicons.org/codeigniter"
  },
  {
    id: 3,
    title: "Laravel",
    category: "Backend Development",
    description:
      "Build a RESTful API for a market system using Laravel and dominate the challenging RESTful skills.",
    status: "ongoing",
    progress: 10,
    instructor: "JuanD MeGon",
    instructorAvatar: "https://i.pravatar.cc/150?img=13",
    logo: "https://cdn.simpleicons.org/laravel"
  },
  {
    id: 4,
    title: "NodeJS",
    category: "Backend Development",
    description:
      "Dive deep under the hood of NodeJS. Learn V8, Express, the MEAN stack and core Javascript concepts.",
    status: "paused",
    progress: 18,
    instructor: "Anthony Alicea",
    instructorAvatar: "https://i.pravatar.cc/150?img=32",
    logo: "https://cdn.simpleicons.org/nodedotjs"
  },
  {
    id: 5,
    title: "Sketch",
    category: "UI / UX Design",
    description:
      "Finally a comprehensive guide to using Sketch for designing mobile. Learn to design an app from A to Z.",
    status: "ongoing",
    progress: 40,
    instructor: "Joseph Angelo",
    logo: "https://cdn.simpleicons.org/sketch"
  },
  {
    id: 6,
    title: "Bootstrap",
    category: "Web Design",
    description:
      "This tutorial has been prepared for anyone who has a basic knowledge of HTML and CSS to develop websites.",
    status: "done",
    progress: 100,
    instructor: "Janice Carroll",
    instructorAvatar: "https://i.pravatar.cc/150?img=25",
    logo: "https://cdn.simpleicons.org/bootstrap"
  },
  {
    id: 7,
    title: "Firebase",
    category: "Backend Development",
    description:
      "Full-stack development with Angular, Firestore, Firebase Storage & Hosting and Firebase Cloud Functions.",
    status: "done",
    progress: 100,
    instructor: "Sara Perkins",
    instructorAvatar: "https://i.pravatar.cc/150?img=45",
    logo: "https://cdn.simpleicons.org/firebase"
  },
  {
    id: 8,
    title: "Github",
    category: "Version Control",
    description:
      "Go from complete novice to expert in Git and GitHub using step-by-step, no-assumptions learning.",
    status: "ongoing",
    progress: 55,
    instructor: "Sara Perkins",
    instructorAvatar: "https://i.pravatar.cc/150?img=45",
    logo: "https://cdn.simpleicons.org/github"
  }
];

const statusConfig: Record<CourseStatus, { label: string; variant: "info" | "success" | "warning" }> =
  {
    ongoing: { label: "Ongoing", variant: "info" },
    done: { label: "Done", variant: "success" },
    paused: { label: "Paused", variant: "warning" }
  };

const categories = ["All Categories", ...Array.from(new Set(courses.map((c) => c.category)))];

export function CourseList() {
  const [category, setCategory] = useState("All Categories");
  const [view, setView] = useState("grid");

  const filteredCourses =
    category === "All Categories" ? courses : courses.filter((c) => c.category === category);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight lg:text-2xl">My Courses</h1>
        <div className="flex items-center gap-2">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ButtonGroup>
            <Button
              variant="outline"
              size="icon"
              aria-label="List view"
              aria-pressed={view === "list"}
              className={cn(view === "list" && "bg-muted")}
              onClick={() => setView("list")}>
              <ListIcon />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Grid view"
              aria-pressed={view === "grid"}
              className={cn(view === "grid" && "bg-muted")}
              onClick={() => setView("grid")}>
              <LayoutGridIcon />
            </Button>
          </ButtonGroup>
        </div>
      </div>

      <div
        className={cn(
          "grid gap-4",
          view === "grid" ? "sm:grid-cols-2 xl:grid-cols-4" : "grid-cols-1"
        )}>
        {filteredCourses.map((course) => (
          <Link
            key={course.id}
            href="/dashboard/apps/courses/course-detail"
            className="group focus-visible:ring-ring/50 rounded-xl outline-none focus-visible:ring-3">
            <Card className="h-full gap-4 transition-shadow group-hover:shadow-md">
              <CardHeader className="flex items-start justify-between">
                <img src={course.logo} alt={course.title} className="size-10" />
                <Badge variant={statusConfig[course.status].variant}>
                  {statusConfig[course.status].label}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-2">
                <h2 className="font-semibold">{course.title}</h2>
                <p className="text-muted-foreground text-xs font-medium">{course.category}</p>
                <p className="text-muted-foreground line-clamp-3 text-sm">{course.description}</p>
                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium tabular-nums">{course.progress}%</span>
                  </div>
                  <Progress value={course.progress} className="h-1.5" />
                </div>
                <div className="flex items-center justify-between gap-2 border-t pt-3 mt-4">
                  <div className="flex min-w-0 items-center gap-2">
                    <Avatar className="size-7">
                      <AvatarImage src={course.instructorAvatar} alt={course.instructor} />
                      <AvatarFallback className="text-[10px]">
                        {generateAvatarFallback(course.instructor)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{course.instructor}</div>
                      <div className="text-muted-foreground text-xs">Instructor</div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={course.status === "done" ? "outline" : "default"}
                    className="shrink-0"
                    asChild>
                    <span>
                      {course.status === "done"
                        ? "Review"
                        : course.status === "paused"
                          ? "Resume"
                          : "Continue"}
                    </span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
