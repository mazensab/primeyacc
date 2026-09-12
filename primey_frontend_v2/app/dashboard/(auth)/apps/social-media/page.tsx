import { Metadata } from "next";
import { generateMeta } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

import { SocialMediaSidebar } from "./components/social-media-sidebar";
import { SocialMediaStories } from "./components/social-media-stories";
import { AsideRight } from "./components/aside-right";
import { PostItem } from "./components/post-item";

import { postsData } from "./data";

export async function generateMetadata(): Promise<Metadata> {
  return generateMeta({
    title: "Social Media App",
    additionalTitle: true,
    description:
      "Connect with users, share updates, and interact with social feeds using a modern multi-column layout featuring stories and interactive posts. A professional social media app built with React, TypeScript, Tailwind CSS, and shadcn/ui.",
    canonical: "/apps/social-media"
  });
}

export default function Page() {
  return (
    <div className="mx-auto grid w-full max-w-7xl flex-1 gap-4 md:h-[var(--content-full-height)] md:grid-cols-[280px_minmax(0,1fr)] md:overflow-hidden lg:grid-cols-[280px_minmax(0,1fr)_280px] lg:gap-6">
      <SocialMediaSidebar />

      <ScrollArea className="min-w-0 md:h-[var(--content-full-height)] [&>[data-slot=scroll-area-viewport]>div]:block!">
        <main className="mx-auto lg:max-w-2xl">
          <div className="space-y-4 px-0.5 py-0.5 pb-6 md:px-3 lg:space-y-6">
            {/* Stories */}
            <SocialMediaStories />

            {/* Posts */}
            <div className="space-y-4 lg:space-y-6">
              {postsData.map((post, i) => (
                <PostItem key={i} post={post} />
              ))}

              <div className="pt-2 text-center">
                <Button variant="outline">More posts</Button>
              </div>
            </div>
          </div>
        </main>
      </ScrollArea>

      <AsideRight />
    </div>
  );
}
