import { Metadata } from "next";
import { generateMeta } from "@/lib/utils";

import ImageGenerator from "./components/image-generator";

export async function generateMetadata(): Promise<Metadata> {
  return generateMeta({
    title: "AI Image Generator",
    additionalTitle: true,
    description:
      "Create high-fidelity visuals from text prompts with granular control over styles, aspect ratios, and seeds. A professional AI image generation workspace built with React, TypeScript, Next.js, Tailwind CSS, and shadcn/ui.",
    canonical: "/apps/ai-image-generator"
  });
}

export default function Page() {
  return <ImageGenerator />;
}
