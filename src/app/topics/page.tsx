"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";

type TopicStatus = "planned" | "learning" | "completed" | "not_useful";

interface TopicNode {
  id: string;
  name: string;
  status: TopicStatus;
  order: number;
  parentId: string | null;
}

interface TreeNode extends TopicNode {
  children: TreeNode[];
}

function buildTree(flat: TopicNode[]): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  for (const n of flat) byId.set(n.id, { ...n, children: [] });
  const roots: TreeNode[] = [];
  for (const n of flat) {
    const node = byId.get(n.id)!;
    const parent = n.parentId ? byId.get(n.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

function countDescendants(node: TreeNode): number {
  return node.children.reduce((sum, c) => sum + 1 + countDescendants(c), 0);
}

const STATUS_META: Record<TopicStatus, { label: string; color: string; emoji: string }> = {
  planned: { label: "Planned", color: "var(--ink)", emoji: "⚪" },
  learning: { label: "Learning", color: "var(--comic-blue)", emoji: "🔵" },
  completed: { label: "Completed", color: "var(--comic-green)", emoji: "✅" },
  not_useful: { label: "Not Useful", color: "var(--comic-red)", emoji: "🚫" },
};

export default function TopicsPage() {
  const [topics, setTopics] = useState<TopicNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRootName, setNewRootName] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [addingChildFor, setAddingChildFor] = useState<string | null>(null);
  const [childDraft, setChildDraft] = useState("");

  async function load() {
    const res = await fetch("/api/topics");
    setTopics(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time fetch on mount
    load();
  }, []);

  async function addRoot(e: FormEvent) {
    e.preventDefault();
    if (!newRootName.trim()) return;
    await fetch("/api/topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newRootName }),
    });
    setNewRootName("");
    load();
  }

  async function addChild(parentId: string) {
    if (!childDraft.trim()) return;
    await fetch("/api/topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: childDraft, parentId }),
    });
    setChildDraft("");
    setAddingChildFor(null);
    load();
  }

  // Name edits update local state on every keystroke for a responsive input,
  // but only PATCH on blur — an inline-editable field, not a form to submit.
  function updateNameLocal(id: string, name: string) {
    setTopics((prev) => prev.map((t) => (t.id === id ? { ...t, name } : t)));
  }

  async function commitName(id: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    await fetch(`/api/topics/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
  }

  async function setStatus(id: string, status: TopicStatus) {
    setTopics((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    await fetch(`/api/topics/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async function deleteNode(node: TreeNode) {
    const count = countDescendants(node);
    const msg =
      count > 0
        ? `Delete "${node.name}" and its ${count} subtopic${count === 1 ? "" : "s"}?`
        : `Delete "${node.name}"?`;
    if (!window.confirm(msg)) return;
    await fetch(`/api/topics/${node.id}`, { method: "DELETE" });
    load();
  }

  function toggleCollapsed(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const tree = buildTree(topics);

  // The row itself (dot, name, status, add/delete) — shared by both a root
  // card's header and every nested <li>, just at different text sizes.
  function nodeRow(node: TreeNode, { root }: { root: boolean }): ReactNode {
    const meta = STATUS_META[node.status];
    const hasChildren = node.children.length > 0;
    const isCollapsed = collapsed.has(node.id);
    const isAddingChild = addingChildFor === node.id;

    return (
      <>
        <div className="flex flex-wrap items-center gap-1.5">
          {hasChildren ? (
            <button
              onClick={() => toggleCollapsed(node.id)}
              className="w-4 shrink-0 text-xs font-bold text-ink/50"
              title={isCollapsed ? "Expand" : "Collapse"}
            >
              {isCollapsed ? "▸" : "▾"}
            </button>
          ) : (
            <span className="w-4 shrink-0" />
          )}
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: meta.color }}
          />
          <input
            className={`min-w-0 flex-1 bg-transparent px-0.5 py-0.5 text-ink outline-none focus:underline ${
              root ? "font-heading text-lg tracking-wide" : "text-sm font-bold"
            }`}
            value={node.name}
            onChange={(e) => updateNameLocal(node.id, e.target.value)}
            onBlur={(e) => commitName(node.id, e.target.value)}
          />
          <select
            value={node.status}
            onChange={(e) => setStatus(node.id, e.target.value as TopicStatus)}
            className="comic-input px-1.5 py-1 text-xs font-bold"
            style={{ color: meta.color }}
          >
            {(Object.entries(STATUS_META) as [TopicStatus, (typeof STATUS_META)[TopicStatus]][]).map(
              ([value, m]) => (
                <option key={value} value={value}>
                  {m.emoji} {m.label}
                </option>
              )
            )}
          </select>
          <button
            onClick={() => {
              setAddingChildFor(isAddingChild ? null : node.id);
              setChildDraft("");
            }}
            className="text-xs font-bold text-ink/60 hover:text-comic-orange hover:underline"
            title="Add subtopic"
          >
            + Sub
          </button>
          <button
            onClick={() => deleteNode(node)}
            className="text-xs font-bold text-comic-red hover:underline"
          >
            Delete
          </button>
        </div>

        {isAddingChild && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addChild(node.id);
            }}
            className="mt-1.5 flex gap-1.5 pl-6"
          >
            <input
              autoFocus
              className="comic-input min-w-0 flex-1 px-2 py-1 text-xs"
              placeholder="Subtopic name..."
              value={childDraft}
              onChange={(e) => setChildDraft(e.target.value)}
            />
            <button type="submit" className="comic-btn px-2 py-1 text-xs text-ink">
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setAddingChildFor(null);
                setChildDraft("");
              }}
              className="comic-btn bg-panel px-2 py-1 text-xs"
            >
              Cancel
            </button>
          </form>
        )}
      </>
    );
  }

  function renderChild(node: TreeNode) {
    const hasChildren = node.children.length > 0;
    const isCollapsed = collapsed.has(node.id);
    return (
      <li key={node.id}>
        {nodeRow(node, { root: false })}
        {hasChildren && !isCollapsed && <ul>{node.children.map((c) => renderChild(c))}</ul>}
      </li>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-4xl text-comic-orange" style={{ WebkitTextStroke: "1.5px var(--ink)" }}>
          Completed Topics
        </h1>
        <p className="mt-1 text-sm text-ink/50">
          One tree per track — Data Engineering, Game Dev, VFX/Unreal, AI, whatever you&apos;re learning — branching
          into every subtopic you add.
        </p>
      </div>

      <form onSubmit={addRoot} className="comic-panel flex flex-wrap gap-2 p-4">
        <input
          className="comic-input min-w-[200px] flex-1 px-3 py-2 text-sm"
          placeholder="New main topic (e.g. Data Engineering)"
          value={newRootName}
          onChange={(e) => setNewRootName(e.target.value)}
        />
        <button type="submit" className="comic-btn px-4 py-2 text-sm text-ink">
          Add Main Topic
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-ink/60">
        {(Object.entries(STATUS_META) as [TopicStatus, (typeof STATUS_META)[TopicStatus]][]).map(
          ([value, m]) => (
            <span key={value} className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: m.color }} />
              {m.label}
            </span>
          )
        )}
      </div>

      {loading ? (
        <p className="text-ink/60">Loading...</p>
      ) : tree.length === 0 ? (
        <p className="text-ink/60">No topics yet — add your first main topic above.</p>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tree.map((root) => {
            const hasChildren = root.children.length > 0;
            const isCollapsed = collapsed.has(root.id);
            return (
              <div key={root.id} className="comic-panel p-4">
                {nodeRow(root, { root: true })}
                {hasChildren && !isCollapsed && (
                  <ul className="topic-tree mt-3">{root.children.map((c) => renderChild(c))}</ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
