import { generateMeta } from "@/lib/utils";
import { List, BarChart3 } from "lucide-react";
import { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";

import { InstructorSection } from "../components/instructor-section";
import { CourseContent } from "../components/course-content";
import { StudyProgress } from "../components/study-progress";
import { CourseModules } from "../components/course-modules";

import courseData from "../data.json";

export async function generateMetadata(): Promise<Metadata> {
  return generateMeta({
    title: "Course Detail",
    additionalTitle: true,
    description:
      "Access video lessons, track curriculum progress, and manage learning milestones with an integrated course player and detailed module outlines. A professional e-learning application page built with React, Next.js, TypeScript, Tailwind CSS, and shadcn/ui.",
    canonical: "/apps/courses/course-detail"
  });
}

export default function Page() {
  const { data: course } = courseData;

  return (
    <div className="mx-auto max-w-7xl space-y-4 lg:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight lg:text-2xl">{course.title}</h1>
        <div className="flex gap-2 lg:hidden">
          <Drawer direction="bottom">
            <DrawerTrigger asChild>
              <Button variant="outline" size="sm">
                <BarChart3 />
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerTitle className="sr-only">Study progress</DrawerTitle>
              <StudyProgress progress={course.progress} />
            </DrawerContent>
          </Drawer>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <List />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="overflow-y-auto pt-10">
              <SheetTitle className="sr-only">Course modules</SheetTitle>
              <CourseModules
                data={{
                  modules: course.modules,
                  completedCount: course.completedModules,
                  totalCount: course.totalModules
                }}
              />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="grid gap-4 lg:gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:space-y-6 lg:col-span-2">
          <div className="relative aspect-video overflow-hidden rounded-xl">
            <video
              controls
              poster={course.video.thumbnail}
              className="h-full w-full object-cover"
              preload="metadata">
              <source src={course.video.src} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>

          <InstructorSection instructor={course.instructor} />

          <CourseContent
            data={{
              about: course.about,
              suitFor: course.suitFor
            }}
          />
        </div>

        <div className="hidden space-y-4 lg:space-y-6 lg:col-span-1 lg:block">
          <StudyProgress progress={course.progress} />

          <CourseModules
            data={{
              modules: course.modules,
              completedCount: course.completedModules,
              totalCount: course.totalModules
            }}
          />
        </div>
      </div>
    </div>
  );
}
