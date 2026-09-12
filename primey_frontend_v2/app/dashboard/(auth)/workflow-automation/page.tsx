import { generateMeta } from "@/lib/utils";
import { WorkflowLayout } from "./components/workflow-layout";

export async function generateMetadata() {
  return generateMeta({
    title: "Workflow Automation",
    description:
      "Visual workflow automation builder. Create and manage automated workflows with drag-and-drop triggers and actions.",
    canonical: "/workflow-automation"
  });
}

export default function Page() {
  return (
    <div className="h-(--content-full-height) overflow-hidden rounded-md border">
      <WorkflowLayout />
    </div>
  );
}
