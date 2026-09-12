import { Metadata } from "next";
import { generateMeta } from "@/lib/utils";

import AIChatSidebar from "./components/ai-chat-sidebar";
import AIChatInterface from "./components/ai-chat-interface";

export async function generateMetadata(): Promise<Metadata> {
  return generateMeta({
    title: "AI Chatbot",
    additionalTitle: true,
    description:
      "Engage with advanced AI models through a feature-rich chat interface featuring history tracking and contextual quick actions. A professional AI assistant page built with React, TypeScript, Next.js, Tailwind CSS, and shadcn/ui.",
    canonical: "/apps/ai-chat-v2"
  });
}

export default function Page() {
  return (
    <div className="relative flex h-(--content-full-height) rounded-md lg:border">
      <AIChatSidebar />
      <div className="flex w-full grow flex-col">
        <AIChatInterface />
      </div>
    </div>
  );
}
