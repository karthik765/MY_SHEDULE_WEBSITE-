"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

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

const STATUS_ORDER: TopicStatus[] = ["planned", "learning", "completed", "not_useful"];

// Fixed hex values, not the shared --comic-* theme tokens — those all
// alias to the same accent orange site-wide, which would make every status
// render identically. Status color needs to stay distinguishable (done vs.
// in-progress vs. skipped) regardless of whatever accent the theme uses.
const STATUS_META: Record<TopicStatus, { label: string; color: string }> = {
  planned: { label: "Planned", color: "#9a95a8" },
  learning: { label: "Learning", color: "#4c8dff" },
  completed: { label: "Completed", color: "#3ddc91" },
  not_useful: { label: "Not Useful", color: "#ff5b6b" },
};

// Fixed-geometry "skill tree" layout: every pill is the same size, so
// connector-line endpoints can be computed from (depth, row) alone — no
// DOM measuring needed. A node's row is the average of its children's rows
// (leaves get the next sequential row), which is what keeps a parent
// vertically centered on its branch.
const PILL_W = 176;
const PILL_H = 32;
const ROW_H = 44;
const COL_STEP = 236;
const PAD = 16;
const ROOTS_PER_PAGE = 5;

interface Positioned {
  node: TreeNode;
  depth: number;
  row: number;
  hasChildren: boolean;
}

function layoutTree(root: TreeNode, collapsed: Set<string>) {
  const positioned: Positioned[] = [];
  let rowCounter = 0;
  let maxDepth = 0;

  function visit(node: TreeNode, depth: number): number {
    maxDepth = Math.max(maxDepth, depth);
    const children = collapsed.has(node.id) ? [] : node.children;
    let row: number;
    if (children.length === 0) {
      row = rowCounter++;
    } else {
      const childRows = children.map((c) => visit(c, depth + 1));
      row = childRows.reduce((a, b) => a + b, 0) / childRows.length;
    }
    positioned.push({ node, depth, row, hasChildren: node.children.length > 0 });
    return row;
  }

  visit(root, 0);
  return { positioned, rowCount: Math.max(1, rowCounter), maxDepth };
}

function centerY(row: number) {
  return PAD + row * ROW_H + ROW_H / 2;
}

function leftX(depth: number) {
  return PAD + depth * COL_STEP;
}

export default function TopicsPage() {
  const [topics, setTopics] = useState<TopicNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRootName, setNewRootName] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [addingChildFor, setAddingChildFor] = useState<string | null>(null);
  const [childDraft, setChildDraft] = useState("");
  const [page, setPage] = useState(1);

  async function load() {
    const res = await fetch("/api/topics");
    setTopics(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time fetch on mount
    load();
  }, []);

  const tree = useMemo(() => buildTree(topics), [topics]);
  const totalPages = Math.max(1, Math.ceil(tree.length / ROOTS_PER_PAGE));

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clamps to a valid page after a root is deleted
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  async function addRoot(e: FormEvent) {
    e.preventDefault();
    if (!newRootName.trim()) return;
    const res = await fetch("/api/topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newRootName }),
    });
    if (res.ok) {
      // Jump to whichever page the new tree lands on (roots fill 5 per page).
      setPage(Math.floor(tree.length / ROOTS_PER_PAGE) + 1);
    }
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

  function cycleStatus(id: string, current: TopicStatus) {
    const next = STATUS_ORDER[(STATUS_ORDER.indexOf(current) + 1) % STATUS_ORDER.length];
    setStatus(id, next);
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

  const pageRoots = tree.slice((page - 1) * ROOTS_PER_PAGE, page * ROOTS_PER_PAGE);

  function renderLane(root: TreeNode) {
    const { positioned, rowCount, maxDepth } = layoutTree(root, collapsed);
    const byId = new Map(positioned.map((p) => [p.node.id, p]));
    const width = PAD * 2 + maxDepth * COL_STEP + PILL_W;
    const height = PAD * 2 + rowCount * ROW_H;
    const addingTarget = positioned.find((p) => p.node.id === addingChildFor);

    return (
      <div key={root.id} className="comic-panel p-4">
        <div className="overflow-x-auto">
          <div style={{ position: "relative", width, height }}>
            <svg width={width} height={height} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
              {positioned.map((p) => {
                if (!p.node.parentId) return null;
                const parent = byId.get(p.node.parentId);
                if (!parent) return null;
                const x1 = leftX(parent.depth) + PILL_W;
                const y1 = centerY(parent.row);
                const x2 = leftX(p.depth);
                const y2 = centerY(p.row);
                const midX = x1 + (x2 - x1) / 2;
                return (
                  <path
                    key={p.node.id}
                    d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                    fill="none"
                    stroke={STATUS_META[p.node.status].color}
                    strokeWidth={1.6}
                    opacity={0.75}
                  />
                );
              })}
            </svg>
            {positioned.map((p) => {
              const meta = STATUS_META[p.node.status];
              const isCollapsed = collapsed.has(p.node.id);
              const isRoot = p.depth === 0;
              return (
                <div
                  key={p.node.id}
                  className="flex items-center gap-1"
                  style={{
                    position: "absolute",
                    left: leftX(p.depth),
                    top: centerY(p.row) - PILL_H / 2,
                    width: PILL_W,
                    height: PILL_H,
                    borderRadius: PILL_H / 2,
                    border: `${isRoot ? 2 : 1.5}px solid ${meta.color}`,
                    background: "var(--panel)",
                    padding: "0 6px",
                  }}
                >
                  <button
                    onClick={() => toggleCollapsed(p.node.id)}
                    className="w-3 shrink-0 text-[10px] font-bold text-ink/50"
                    title={p.hasChildren ? (isCollapsed ? "Expand" : "Collapse") : undefined}
                    disabled={!p.hasChildren}
                    style={{ visibility: p.hasChildren ? "visible" : "hidden" }}
                  >
                    {isCollapsed ? "▸" : "▾"}
                  </button>
                  <button
                    onClick={() => cycleStatus(p.node.id, p.node.status)}
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: meta.color }}
                    title={`${meta.label} — click to change`}
                  />
                  <input
                    className={`min-w-0 flex-1 overflow-hidden bg-transparent px-0.5 text-ink outline-none focus:underline ${
                      isRoot ? "text-[13px] font-bold" : "text-[11.5px] font-bold"
                    }`}
                    style={{ textOverflow: "ellipsis" }}
                    value={p.node.name}
                    onChange={(e) => updateNameLocal(p.node.id, e.target.value)}
                    onBlur={(e) => commitName(p.node.id, e.target.value)}
                  />
                  <button
                    onClick={() => {
                      setAddingChildFor(addingChildFor === p.node.id ? null : p.node.id);
                      setChildDraft("");
                    }}
                    className="shrink-0 text-[11px] font-bold text-ink/50 hover:text-comic-orange"
                    title="Add subtopic"
                  >
                    +
                  </button>
                  <button
                    onClick={() => deleteNode(p.node)}
                    className="shrink-0 text-[11px] font-bold text-comic-red/70 hover:text-comic-red"
                    title="Delete"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {addingTarget && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addChild(addingTarget.node.id);
            }}
            className="mt-3 flex flex-wrap items-center gap-1.5"
          >
            <span className="text-xs text-ink/50">Add subtopic under &quot;{addingTarget.node.name}&quot;:</span>
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-4xl text-comic-orange" style={{ WebkitTextStroke: "1.5px var(--ink)" }}>
          Completed Topics
        </h1>
        <p className="mt-1 text-sm text-ink/50">
          One skill tree per track — Data Engineering, Game Dev, VFX/Unreal, AI, whatever you&apos;re learning —
          branching right into every subtopic you add. Click a dot to change its status.
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

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => setPage(n)}
              className="comic-btn px-3 py-1 text-xs"
              style={{
                backgroundColor: page === n ? "var(--ink)" : "var(--panel)",
                color: page === n ? "var(--paper)" : "var(--ink)",
              }}
            >
              Page {n}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-ink/60">Loading...</p>
      ) : tree.length === 0 ? (
        <p className="text-ink/60">No topics yet — add your first main topic above.</p>
      ) : (
        <div className="space-y-4">{pageRoots.map((root) => renderLane(root))}</div>
      )}
    </div>
  );
}
