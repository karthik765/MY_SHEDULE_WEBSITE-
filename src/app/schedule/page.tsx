"use client";

import PageHeader from "@/components/studio/PageHeader";
import { Tabs, TabPanel } from "@/components/studio/Tabs";
import { AddButton } from "@/components/studio/Composer";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import ScheduleSection from "@/components/ScheduleSection";
import TasksSection from "@/components/TasksSection";

const TABS = [
  { value: "schedule", label: "Schedule" },
  { value: "tasks", label: "Tasks" },
];

// Reads the ?tab= query param, so links like "/schedule?tab=tasks" can deep
// link into a specific tab — split out because useSearchParams requires a
// Suspense boundary in production builds.
function TabbedContent() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState(searchParams.get("tab") === "tasks" ? "tasks" : "schedule");
  // The composer lives inside the section components, but its trigger belongs
  // in the page header where every other page keeps its primary action — so
  // the open state is owned here and passed down.
  const [adding, setAdding] = useState(false);

  return (
    <>
      <PageHeader
        eyebrow="PLAN WITH PURPOSE"
        title="OWN YOUR DAY."
        description="A thoughtful home for your schedule and the things you want to get done."
        action={<AddButton open={adding} onToggle={() => setAdding(!adding)} label={tab === "tasks" ? "Add task" : "Add event"} />}
      />
      <Tabs items={TABS} value={tab} onChange={(next) => { setTab(next); setAdding(false); }} ariaLabel="Schedule sections" />
      <TabPanel value={tab}>
        {tab === "schedule"
          ? <ScheduleSection adding={adding} onAdded={() => setAdding(false)} />
          : <TasksSection adding={adding} onAdded={() => setAdding(false)} />}
      </TabPanel>
    </>
  );
}

export default function SchedulePage() {
  return (
    <div className="page-schedule space-y-6">
      <Suspense fallback={<PageHeader eyebrow="PLAN WITH PURPOSE" title="OWN YOUR DAY." description="A thoughtful home for your schedule and the things you want to get done." />}>
        <TabbedContent />
      </Suspense>
    </div>
  );
}
