import { generateMeta } from "@/lib/utils";
import NotesApp from "./components/note-app";

export async function generateMetadata() {
  return generateMeta({
    title: "Note App",
    additionalTitle: true,
    description:
      "Capture ideas, create checklists, and organize your thoughts with a flexible masonry layout and custom labels. A professional note-taking application built with React, TypeScript, Tailwind CSS, and shadcn/ui.",
    canonical: "/apps/notes"
  });
}

export default function Page() {
  return <NotesApp />;
}
