import { AwardIcon, BookOpenIcon, ClockIcon, FlameIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function WelcomeCard() {
  return (
    <Card className="h-full overflow-hidden relative">
      <CardContent>
        <div className="grid w-full items-center pb-2 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="font-display text-3xl">
              Welcome, Toby <span className="text-4xl">👋</span>
            </div>
            <div className="text-2xl">What do you want to learn today?</div>
            <div className="text-muted-foreground">
              Discover courses, track progress, and achieve your learning goals seamlessly.
            </div>
            <div className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <span className="flex items-center gap-1.5">
                <BookOpenIcon className="size-4" /> 12 courses in progress
              </span>
              <span className="flex items-center gap-1.5">
                <ClockIcon className="size-4" /> 48 hours this month
              </span>
              <span className="flex items-center gap-1.5">
                <AwardIcon className="size-4" /> 3 certificates
              </span>
              <span className="flex items-center gap-1.5">
                <FlameIcon className="size-4" /> 5 day streak
              </span>
            </div>
            <div className="pt-2">
              <Button>Explore Courses</Button>
            </div>
          </div>
          <figure className="hidden lg:col-span-1 lg:block">
            <img
              width="100px"
              height="50px"
              src={`/academy-dashboard-light.svg`}
              className="block w-full dark:hidden"
              alt="Student standing on a stack of books"
            />
            <img
              width="100px"
              height="50px"
              src={`/academy-dashboard-dark.svg`}
              className="hidden w-full dark:block"
              alt="Student standing on a stack of books"
            />
          </figure>
          <img
            width="800px"
            height="300px"
            src={`/star-shape.png`}
            className="pointer-events-none absolute inset-0 aspect-auto"
            alt=""
            aria-hidden="true"
          />
        </div>
      </CardContent>
    </Card>
  );
}
