"use client";

import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react";

interface MediaItem {
  id: string;
  category: string;
  title: string;
  status: string;
  completedAt: string | null;
  imageUrl: string | null;
  notes: string | null;
}

function isThisMonth(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function PosterForm({
  onSubmit,
  submitLabel,
  submitColor,
  titlePlaceholder,
}: {
  onSubmit: (title: string, imageUrl: string) => Promise<void>;
  submitLabel: string;
  submitColor: string;
  titlePlaceholder: string;
}) {
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUrl(await readImageAsDataUrl(file));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await onSubmit(title, imageUrl);
    setTitle("");
    setImageUrl("");
  }

  return (
    <form onSubmit={handleSubmit} className="comic-panel flex flex-col gap-3 p-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex min-w-[160px] flex-1 flex-col gap-1">
          <label className="text-xs font-bold text-ink/70">Title</label>
          <input
            className="comic-input px-3 py-2 text-sm"
            placeholder={titlePlaceholder}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-ink/70">Poster image</label>
          <input
            key={imageUrl ? "has-image" : "no-image"}
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="text-xs"
          />
        </div>
        <button type="submit" className="comic-btn px-4 py-2 text-sm text-chip-ink" style={{ backgroundColor: submitColor }}>
          {submitLabel}
        </button>
      </div>

      {imageUrl && (
        <div className="flex items-center gap-3">
          <div className="aspect-[2/3] w-28 overflow-hidden rounded border-2 border-ink">
            {/* eslint-disable-next-line @next/next/no-img-element -- user-provided poster (data: URI), not an optimizable static asset */}
            <img src={imageUrl} alt="Poster preview" className="h-full w-full object-cover" />
          </div>
          <button
            type="button"
            onClick={() => setImageUrl("")}
            className="comic-btn bg-panel px-3 py-1.5 text-xs"
          >
            Remove image
          </button>
        </div>
      )}
    </form>
  );
}

function PosterGrid({
  items,
  emoji,
  emptyLabel,
  onDelete,
  onRemoveImage,
  onMarkDone,
  markDoneLabel,
}: {
  items: MediaItem[];
  emoji: string;
  emptyLabel: string;
  onDelete: (id: string) => void;
  onRemoveImage: (id: string) => void;
  onMarkDone?: (id: string) => void;
  markDoneLabel?: string;
}) {
  if (items.length === 0) return <p className="text-xs text-ink/40">{emptyLabel}</p>;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {items.map((item) => (
        <div key={item.id} className="comic-panel-sm overflow-hidden p-0">
          <div className="relative flex aspect-[2/3] w-full items-center justify-center bg-paper">
            {item.imageUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- user-provided poster (data: URI), not an optimizable static asset */}
                <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
                <button
                  onClick={() => onRemoveImage(item.id)}
                  title="Remove poster image"
                  className="comic-btn absolute right-1 top-1 h-6 w-6 rounded-full bg-panel p-0 text-xs leading-none"
                >
                  ×
                </button>
              </>
            ) : (
              <span className="text-4xl">{emoji}</span>
            )}
          </div>
          <div className="space-y-1 p-2">
            <p className="line-clamp-2 text-sm font-bold">{item.title}</p>
            {onMarkDone && (
              <button
                onClick={() => onMarkDone(item.id)}
                className="comic-btn w-full bg-comic-green py-1 text-xs text-chip-ink"
              >
                {markDoneLabel ?? "Mark watched"}
              </button>
            )}
            <button
              onClick={() => onDelete(item.id)}
              className="comic-btn w-full bg-panel py-1 text-xs"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MediaSection({
  category,
  monthLabel,
  upcomingLabel,
  accentColor,
  emoji,
  itemNoun,
  watchedVerb = "Watched",
}: {
  category: "movie" | "webseries" | "game";
  monthLabel: string;
  upcomingLabel: string;
  accentColor: string;
  emoji: string;
  itemNoun: string;
  watchedVerb?: string;
}) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch(`/api/media?category=${category}`);
    setItems(await res.json());
    setLoading(false);
  }, [category]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch when category changes
    load();
  }, [load]);

  async function addWatched(title: string, imageUrl: string) {
    await fetch("/api/media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, title, imageUrl, status: "completed" }),
    });
    load();
  }

  async function addUpcoming(title: string, imageUrl: string) {
    await fetch("/api/media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, title, imageUrl }),
    });
    load();
  }

  async function markDone(id: string) {
    await fetch(`/api/media/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });
    load();
  }

  async function remove(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await fetch(`/api/media/${id}`, { method: "DELETE" });
  }

  async function removeImage(id: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, imageUrl: null } : i)));
    await fetch(`/api/media/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: null }),
    });
  }

  if (loading) return <p className="text-ink/60">Loading...</p>;

  const completedThisMonth = items.filter(
    (i) => i.status === "completed" && i.completedAt && isThisMonth(i.completedAt)
  );
  const watchedAll = items
    .filter((i) => i.status === "completed")
    .sort((a, b) => new Date(b.completedAt ?? 0).getTime() - new Date(a.completedAt ?? 0).getTime());
  const upcoming = items.filter((i) => i.status === "upcoming");
  const markDoneLabel = `I Have ${watchedVerb} the ${itemNoun}`;

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <h2 className="font-heading text-lg tracking-wide" style={{ color: accentColor }}>
            {monthLabel}
          </h2>
          <span className="comic-badge px-2 py-0.5 text-xs text-chip-ink" style={{ backgroundColor: accentColor }}>
            {completedThisMonth.length}
          </span>
        </div>
        <div className="mb-3">
          <PosterForm
            onSubmit={addWatched}
            submitLabel="Log watched"
            submitColor="var(--comic-green)"
            titlePlaceholder={`${itemNoun} you watched...`}
          />
        </div>
        <PosterGrid
          items={completedThisMonth}
          emoji={emoji}
          emptyLabel={`Nothing logged this month yet.`}
          onDelete={remove}
          onRemoveImage={removeImage}
        />
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2">
          <h2 className="font-heading text-lg tracking-wide" style={{ color: accentColor }}>
            Watched It
          </h2>
          <span className="comic-badge px-2 py-0.5 text-xs text-chip-ink" style={{ backgroundColor: accentColor }}>
            {watchedAll.length}
          </span>
        </div>
        <PosterGrid
          items={watchedAll}
          emoji={emoji}
          emptyLabel={`Nothing marked as ${watchedVerb.toLowerCase()} yet.`}
          onDelete={remove}
          onRemoveImage={removeImage}
        />
      </div>

      <div>
        <h2 className="font-heading mb-2 text-lg tracking-wide" style={{ color: accentColor }}>
          {upcomingLabel}
        </h2>
        <div className="mb-3">
          <PosterForm
            onSubmit={addUpcoming}
            submitLabel="Add to queue"
            submitColor="var(--comic-blue)"
            titlePlaceholder={`${itemNoun} to watch next...`}
          />
        </div>
        <PosterGrid
          items={upcoming}
          emoji={emoji}
          emptyLabel="Nothing queued up."
          onDelete={remove}
          onRemoveImage={removeImage}
          onMarkDone={markDone}
          markDoneLabel={markDoneLabel}
        />
      </div>
    </div>
  );
}
