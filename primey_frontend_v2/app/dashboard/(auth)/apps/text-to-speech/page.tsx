import { generateMeta } from "@/lib/utils";

import TextToSpeechApp from "./components/text-to-speech-app";

export async function generateMetadata() {
  return generateMeta({
    title: "Text to Speech App",
    additionalTitle: true,
    description:
      "Convert text into natural sounding speech with multiple voices, models, and fine tuned voice settings. A professional text to speech application built with React, TypeScript, Tailwind CSS, and shadcn/ui.",
    canonical: "/apps/text-to-speech"
  });
}

export default function Page() {
  return <TextToSpeechApp />;
}
