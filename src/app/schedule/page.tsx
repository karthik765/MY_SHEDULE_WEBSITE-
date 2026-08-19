"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import ScheduleSection from "@/components/ScheduleSection";
import TasksSection from "@/components/TasksSection";

const TABS = [
  { value: "schedule", label: "Schedule", color: "var(--comic-purple)" },
  { value: "tasks", label: "Tasks", color: "var(--comic-red)" },
] as const;

type Tab = (typeof TABS)[number]["value"];

function TabPicker({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {TABS.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={`comic-btn px-3 py-1.5 text-sm ${tab === t.value ? "text-chip-ink" : ""}`}
          style={{ backgroundColor: tab === t.value ? t.color : "var(--panel)" }}
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
    <div className="space-y-6">
      <h1 className="font-heading text-4xl text-comic-purple" style={{ WebkitTextStroke: "1.5px var(--ink)" }}>
        Schedule & Tasks
      </h1>
      <Suspense fallback={<TabPicker tab="schedule" onChange={() => {}} />}>
        <TabbedContent />
      </Suspense>
    </div>
  );
}
