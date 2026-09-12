import { generateMeta } from "@/lib/utils";
import AppRender from "./app-render";

export async function generateMetadata() {
  return generateMeta({
    title: "AI Chat App",
    additionalTitle: true,
    description:
      "Interact with AI-powered conversational interfaces using a modern, responsive chat interface. A professional AI chat application page built with React, TypeScript, Next.js, Tailwind CSS, and shadcn/ui.",
    canonical: "/apps/ai-chat"
  });
}

export default function Page() {
  return (
    <div className="m-auto flex h-(--content-full-height) w-full max-w-(--breakpoint-md) items-center justify-center">
      <AppRender />
    </div>
  );
}
