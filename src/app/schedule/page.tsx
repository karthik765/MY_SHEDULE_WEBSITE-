"use client";

import PageHeader from "@/components/studio/PageHeader";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import ScheduleSection from "@/components/ScheduleSection";
import TasksSection from "@/components/TasksSection";

const TABS = [
  { value: "schedule", label: "Schedule" },
  { value: "tasks", label: "Tasks" },
] as const;

type Tab = (typeof TABS)[number]["value"];

function TabPicker({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  return (
    <div className="chapter-tabs">
      {TABS.map((t) => (
        <button
          key={t.value}
          data-camera-tab
          aria-pressed={tab === t.value}
          onClick={() => onChange(t.value)}
          className={`comic-btn px-3 py-1.5 text-sm ${tab === t.value ? "text-paper" : ""}`}
          style={{ backgroundColor: tab === t.value ? "var(--ink)" : "var(--panel)" }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// Reads the ?tab= query param, so links like "/schedule?tab=tasks" can deep
// link into a specific tab — split out because useSearchParams requires a
// Suspense boundary in production builds.
function TabbedContent() {
  const searchParams = useSearchParams();
  const initialTab: Tab = searchParams.get("tab") === "tasks" ? "tasks" : "schedule";
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <>
      <TabPicker tab={tab} onChange={setTab} />
      {tab === "schedule" && <ScheduleSection />}
      {tab === "tasks" && <TasksSection />}
    </>
  );
}

export default function SchedulePage() {
  return (
    <div className="page-schedule space-y-6">
      <PageHeader eyebrow="PLAN WITH PURPOSE" title="OWN YOUR DAY." description="A thoughtful home for your schedule and the things you want to get done." />
      <Suspense fallback={<TabPicker tab="schedule" onChange={() => {}} />}>
        <TabbedContent />
      </Suspense>
    </div>
  );
}
