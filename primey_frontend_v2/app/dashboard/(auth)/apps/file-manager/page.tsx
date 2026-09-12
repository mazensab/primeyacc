import { generateMeta } from "@/lib/utils";
import { FileManager } from "./components/file-manager";

export async function generateMetadata() {
  return generateMeta({
    title: "File Manager App",
    additionalTitle: true,
    description:
      "Browse, organize, and manage files and folders with a clean list view, search functionality, and quick upload actions. A professional file management application built with React, TypeScript, Tailwind CSS, and shadcn/ui.",
    canonical: "/apps/file-manager"
  });
}

export default function Page() {
  return <FileManager />;
}
