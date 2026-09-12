import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ActivityTab } from "./activity-tab";
import { BriefTab } from "./brief-tab";
import { FilesTab } from "./files-tab";
import { OverviewTab } from "./overview-tab";
import { TasksTab } from "./tasks-tab";
import { TimelineTab } from "./timeline-tab";

export function ProjectDetailTabs() {
  return (
    <Tabs defaultValue="overview" className="gap-4 lg:gap-6">
      <TabsList className="max-w-full justify-start overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="tasks">
          Tasks <Badge variant="secondary">24</Badge>
        </TabsTrigger>
        <TabsTrigger value="files">
          Files <Badge variant="secondary">18</Badge>
        </TabsTrigger>
        <TabsTrigger value="brief">Brief</TabsTrigger>
        <TabsTrigger value="timeline">Timeline</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <OverviewTab />
      </TabsContent>
      <TabsContent value="tasks">
        <TasksTab />
      </TabsContent>
      <TabsContent value="files">
        <FilesTab />
      </TabsContent>
      <TabsContent value="brief">
        <BriefTab />
      </TabsContent>
      <TabsContent value="timeline">
        <TimelineTab />
      </TabsContent>
      <TabsContent value="activity">
        <ActivityTab />
      </TabsContent>
    </Tabs>
  );
}
