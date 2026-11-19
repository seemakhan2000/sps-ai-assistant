"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import {
  ArrowUpDown,
  Bot,
  Briefcase,
  Building2,
  ChevronDown,
  LayoutGrid,
  List,
  MessagesSquare,
  MoreVertical,
  PhoneCall,
  Search,
} from "lucide-react";

import { sessionActions } from "../utils/session.actions";

import EditSessionModal from "./EditSessionModal";
import SessionLauncher from "./SessionLauncher";

/* -------------------------------------------------
   Types & helpers
------------------------------------------------- */

type ModeFilter = "all" | "interview" | "regular" | "mock";
type Status = "ready" | "live" | "past";
type View = "grid" | "list";

const TABS: { value: ModeFilter; label: string; icon?: typeof Briefcase }[] = [
  { value: "all", label: "All" },
  { value: "interview", label: "Interview", icon: Briefcase },
  { value: "regular", label: "Regular", icon: PhoneCall },
  { value: "mock", label: "Mock", icon: Bot },
];

const MODE_ICON = {
  interview: Briefcase,
  regular: PhoneCall,
  mock: Bot,
} as const;

function field(item: unknown, keys: string[]): string {
  if (!item || typeof item !== "object") return "";

  const record = item as Record<string, unknown>;

  for (const key of keys) {
    const value = record[key];

    if (value !== undefined && value !== null && value !== "") {
      return String(value);
    }
  }

  return "";
}

const getId = (item: unknown) => field(item, ["id", "_id"]);

function getStatus(item: unknown): Status {
  const value = field(item, ["status", "state"]).toLowerCase();

  if (/\b(live|in[_ -]?progress|running|active)\b/.test(value)) return "live";

  if (/\b(completed?|ended|finished|closed|past|expired)\b/.test(value)) {
    return "past";
  }

  return "ready";
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date
    .toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    })
    .toUpperCase();
}

function formatElapsed(startedAt: string, now: number) {
  const start = new Date(startedAt).getTime();

  if (Number.isNaN(start)) return "";

  const total = Math.max(0, Math.floor((now - start) / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;

  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

const cap = (value: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : "";

/* -------------------------------------------------
   Small dropdown
------------------------------------------------- */

function Menu({
  trigger,
  children,
}: {
  trigger: (toggle: () => void) => ReactNode;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }

    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={ref}
      className="relative"
      onClick={(event) => event.stopPropagation()}
    >
      {trigger(() => setOpen((current) => !current))}

      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-44 rounded-xl border border-[#E1E6F2] bg-white p-1 shadow-[0_8px_30px_rgba(15,37,87,0.14)]">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  onClick,
  children,
  danger = false,
}: {
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full rounded-lg px-3 py-1.5 text-left text-[14px] leading-5 ${
        danger
          ? "text-[#DC2626] hover:bg-[#FEF2F2]"
          : "text-[#172554] hover:bg-[#F1F4FB]"
      }`}
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------
   Session card
------------------------------------------------- */

function SessionCard({
  session,
  view,
  busy,
  now,
  onOpen,
  onDetails,
  onEdit,
  onDelete,
}: {
  session: unknown;
  view: View;
  busy: boolean;
  now: number;
  onOpen: () => void;
  onToggleTranscript: () => void;
  onDetails?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const mode = (field(session, ["mode"]).toLowerCase() || "interview") as
    | "interview"
    | "regular"
    | "mock";

  const ModeIcon = MODE_ICON[mode] ?? Briefcase;
  const status = getStatus(session);

  const company = field(session, ["company"]);
  const role = field(session, ["role"]);
  const logo = field(session, ["companyLogo", "logo", "logoUrl"]);

  const title = company || `${cap(mode)} call`;
  const subtitle =
    role ||
    field(session, ["instructions", "description"]).slice(0, 60) ||
    "No description";

  const date = formatDate(field(session, ["createdAt", "created_at", "date"]));

  const transcriptOn = Boolean(
    (session as Record<string, unknown> | null)?.saveTranscript
  );

  const startedAt = field(session, ["startedAt", "liveSince"]);
  const elapsed = startedAt ? formatElapsed(startedAt, now) : "";

  const statusNode =
    status === "live" ? (
      <div>
        <p className="flex items-center gap-2 text-[14px] font-semibold text-[#172554]">
          <span className="h-2 w-2 rounded-full bg-[#EF4444]" />
          Live
        </p>
        <p className="text-[13px] text-[#64748B]">
          {[elapsed, "Free Session"].filter(Boolean).join(" · ")}
        </p>
      </div>
    ) : status === "past" ? (
      <div>
        <p className="flex items-center gap-2 text-[14px] font-semibold text-[#172554]">
          <span className="h-2 w-2 rounded-full bg-[#9CA3AF]" />
          Completed
        </p>
        <p className="text-[13px] text-[#64748B]">
          {field(session, ["duration", "usage"]) || "Session ended"}
        </p>
      </div>
    ) : (
      <div>
        <p className="flex items-center gap-2 text-[14px] font-semibold text-[#172554]">
          <span className="h-2 w-2 rounded-full bg-[#172554]" />
          Ready to Start
        </p>
        <p className="text-[13px] text-[#64748B]">
          {field(session, ["usage"]) || "No usage yet"}
        </p>
      </div>
    );

  const action = (
    <button
      type="button"
      disabled={busy}
      className={
        status === "live"
          ? "h-11 shrink-0 rounded-xl bg-[#0F2557] px-5 text-[14px] font-semibold text-white transition hover:bg-[#17347A] disabled:opacity-60"
          : "h-11 shrink-0 rounded-xl border border-[#DCE2F0] bg-white px-5 text-[14px] font-semibold text-[#0F1B3D] transition hover:bg-[#F1F4FB] disabled:opacity-60"
      }
    >
      {busy
        ? "Please wait..."
        : status === "live"
          ? "Join session"
          : "Start session"}
    </button>
  );

  const pills = (
    <div className="flex flex-wrap gap-2">
      <span className="flex h-8 items-center gap-1.5 rounded-full border border-[#DCE2F0] bg-white px-3 text-[13px] font-medium text-[#334155]">
        <ModeIcon size={14} strokeWidth={1.7} />
        {cap(mode)}
      </span>

      <span
        className={`flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium ${
          transcriptOn
            ? "border-[#DCE2F0] bg-white text-[#334155]"
            : "border-dashed border-[#C9D1E6] bg-transparent text-[#64748B]"
        }`}
      >
        <MessagesSquare size={14} strokeWidth={1.7} />
        Transcript
      </span>
    </div>
  );

  const menu = (
    <Menu
      trigger={(toggle) => (
        <button
          type="button"
          aria-label="Session options"
          onClick={toggle}
          className="flex h-7 w-7 items-center justify-center rounded-md text-[#172554] transition hover:bg-[#0F2557]/10"
        >
          <MoreVertical size={16} />
        </button>
      )}
    >
      {(close) => (
        <>
          {onEdit && (
            <MenuItem
              onClick={() => {
                close();
                onEdit();
              }}
            >
              Edit
            </MenuItem>
          )}

          {onDetails && (
            <MenuItem
              onClick={() => {
                close();
                onDetails();
              }}
            >
              Details
            </MenuItem>
          )}

          {onDelete && (
            <MenuItem
              danger
              onClick={() => {
                close();
                onDelete();
              }}
            >
              Delete
            </MenuItem>
          )}
        </>
      )}
    </Menu>
  );

  const titleNode = (
    <div className="flex min-w-0 items-center gap-2.5">
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt=""
          className="h-6 w-6 shrink-0 rounded-md border border-[#DCE2F0] object-contain"
        />
      ) : company ? (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[#DCE2F0] bg-white text-[#9AA5C2]">
          <Building2 size={13} />
        </span>
      ) : null}

      <h3 className="truncate text-[20px] font-semibold leading-7 text-[#172554]">
        {title}
      </h3>
    </div>
  );

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.target !== event.currentTarget) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen();
    }
  }

  const clickable = {
    role: "button" as const,
    tabIndex: 0,
    onClick: onOpen,
    onKeyDown,
    "aria-label": `Open session ${title}`,
  };

  if (view === "list") {
    return (
      <article
        {...clickable}
        className="flex cursor-pointer flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-[#E1E6F2] bg-white px-5 py-4 transition hover:border-[#C3CDE8] hover:shadow-[0_4px_16px_rgba(15,37,87,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F2557]/30"
      >
        <div className="w-[110px] shrink-0 text-[13px] font-medium text-[#64748B]">
          {date}
        </div>

        <div className="min-w-0 flex-1 basis-[200px]">
          {titleNode}
          <p className="mt-0.5 truncate text-[14px] text-[#475569]">
            {subtitle}
          </p>
        </div>

        {pills}

        <div className="w-[170px] shrink-0">{statusNode}</div>

        {action}
        {menu}
      </article>
    );
  }

  return (
    <article
      {...clickable}
      className="cursor-pointer rounded-[28px] border border-[#E1E6F2] bg-white p-1.5 shadow-[0_1px_2px_rgba(15,37,87,0.04)] transition hover:border-[#C3CDE8] hover:shadow-[0_6px_20px_rgba(15,37,87,0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F2557]/30"
    >
      <div className="rounded-[22px] bg-[#F3F5FA] p-4">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium text-[#64748B]">
            {date}
          </span>
          {menu}
        </div>

        <div className="mt-2">{titleNode}</div>

        <p className="mt-1.5 truncate text-[14px] font-medium text-[#475569]">
          {subtitle}
        </p>

        <div className="mt-4">{pills}</div>
      </div>

      <div className="flex items-center justify-between gap-3 px-4 pb-2.5 pt-3">
        {statusNode}
        {action}
      </div>
    </article>
  );
}

/* -------------------------------------------------
   Collapsible group
------------------------------------------------- */

function Group({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="mb-4 flex items-center gap-2 text-[15px] font-semibold text-[#172554]"
      >
        <ChevronDown
          size={15}
          className={`transition ${open ? "" : "-rotate-90"}`}
        />
        {title}
        <span className="font-medium text-[#64748B]">{count}</span>
      </button>

      {open && children}
    </section>
  );
}

/* -------------------------------------------------
   Board
------------------------------------------------- */

type Props = {
  sessions: unknown;
  busyId?: unknown;
  onCreate: () => void;
  onToggleTranscript: (session: unknown) => unknown;
  onDetails?: (id: string) => void;
  onStarted?: (session: unknown) => void;
  showCreateButton?: boolean;
  freeLeft?: number;
  title?: string;
  subtitle?: string;
};

export default function SessionsBoard({
  sessions,
  busyId,
  onCreate,
  onToggleTranscript,
  onDetails,
  onStarted,
  showCreateButton = true,
  freeLeft,
  title,
  subtitle,
}: Props) {
  const [tab, setTab] = useState<ModeFilter>("all");
  const [query, setQuery] = useState("");
  const [newestFirst, setNewestFirst] = useState(true);
  const [view, setView] = useState<View>("grid");
  const [now, setNow] = useState(() => Date.now());
  const [launching, setLaunching] = useState<unknown | null>(null);
  const [editing, setEditing] = useState<unknown | null>(null);
  const [deleting, setDeleting] = useState<unknown | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const [overrides, setOverrides] = useState<
    Record<string, Record<string, unknown>>
  >({});

  const baseList = useMemo<unknown[]>(() => {
    if (Array.isArray(sessions)) return sessions as unknown[];

    const wrapped = sessions as Record<string, unknown> | null | undefined;

    for (const key of ["items", "data", "sessions", "results"]) {
      const value = wrapped?.[key];

      if (Array.isArray(value)) return value as unknown[];
    }

    return [];
  }, [sessions]);

  const list = useMemo<unknown[]>(
    () =>
      baseList
        .filter((item) => !hidden.has(getId(item)))
        .map((item) => {
          const patch = overrides[getId(item)];

          return patch ? { ...(item as object), ...patch } : item;
        }),
    [baseList, hidden, overrides]
  );

  const hasLive = list.some((item) => getStatus(item) === "live");

  useEffect(() => {
    if (!hasLive) return;

    const timer = setInterval(() => setNow(Date.now()), 1000);

    return () => clearInterval(timer);
  }, [hasLive]);

  const visible = useMemo(() => {
    const search = query.trim().toLowerCase();

    const filtered = list.filter((item) => {
      const mode = field(item, ["mode"]).toLowerCase();

      if (tab !== "all" && mode !== tab) return false;

      if (!search) return true;

      const modeLabel = cap(mode);
      const sessionTitle = field(item, ["company"]) || `${modeLabel} call`;

      const searchableText = [
        field(item, ["role"]),
        field(item, ["company"]),
        field(item, ["mode"]),
        modeLabel,
        sessionTitle,
        `${modeLabel} call`,
        field(item, ["instructions"]),
        field(item, ["description"]),
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(search);
    });

    return filtered.sort((a, b) => {
      const first =
        new Date(field(a, ["createdAt", "created_at"])).getTime() || 0;
      const second =
        new Date(field(b, ["createdAt", "created_at"])).getTime() || 0;

      return newestFirst ? second - first : first - second;
    });
  }, [list, tab, query, newestFirst]);

  const active = visible.filter((item) => getStatus(item) !== "past");
  const past = visible.filter((item) => getStatus(item) === "past");

  const callToggle = (item: unknown) => onToggleTranscript(item);

  async function confirmDelete() {
    if (!deleting) return;

    const id = getId(deleting);

    try {
      setDeleteBusy(true);
      setDeleteError("");

      await sessionActions.remove(id);

      setHidden((previous) => new Set(previous).add(id));
      setDeleting(null);
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "Unable to delete the session."
      );
    } finally {
      setDeleteBusy(false);
    }
  }

  function renderCards(items: unknown[]) {
    return (
      <div
        className={
          view === "grid"
            ? "grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3"
            : "space-y-3"
        }
      >
        {items.map((item, index) => {
          const id = getId(item);

          return (
            <SessionCard
              key={id || index}
              session={item}
              view={view}
              now={now}
              busy={Boolean(busyId) && String(busyId) === id}
              onOpen={() => setLaunching(item)}
              onToggleTranscript={() => callToggle(item)}
              onDetails={onDetails ? () => onDetails(id) : undefined}
              onEdit={
                getStatus(item) === "ready"
                  ? () => setEditing(item)
                  : undefined
              }
              onDelete={
                getStatus(item) === "live"
                  ? undefined
                  : () => {
                      setDeleteError("");
                      setDeleting(item);
                    }
              }
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {(title || showCreateButton) && (
        <div className="flex items-start justify-between gap-4">
          <div>
            {title && (
              <h2 className="text-[20px] font-semibold text-[#172554]">
                {title}
              </h2>
            )}

            {subtitle && (
              <p className="mt-0.5 text-[14px] text-[#475569]">
                {subtitle}
              </p>
            )}
          </div>

          {showCreateButton && (
            <div className="ml-auto flex h-12 items-stretch rounded-2xl bg-blue-900 text-white">
              <button
                type="button"
                onClick={onCreate}
                className="rounded-l-2xl px-7 text-[15px] font-semibold transition bg-blue-900"
              >
                Create session
              </button>

              <span className="my-2 w-px bg-white/30" />

              <Menu
                trigger={(toggle) => (
                  <button
                    type="button"
                    aria-label="More create options"
                    onClick={toggle}
                    className="flex h-12 items-center rounded-r-2xl px-4 transition bg-blue-900"
                  >
                    <ChevronDown size={16} />
                  </button>
                )}
              >
                {(close) =>
                  (["interview", "regular", "mock"] as const).map((mode) => (
                    <MenuItem
                      key={mode}
                      onClick={() => {
                        close();
                        onCreate();
                      }}
                    >
                      {mode === "regular"
                        ? "Regular call"
                        : `${cap(mode)} session`}
                    </MenuItem>
                  ))
                }
              </Menu>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}

      <div className="flex items-center justify-between border-b border-[#E1E6F2]">
        <div role="tablist" className="flex gap-2 overflow-x-auto">
          {TABS.map(({ value, label, icon: Icon }) => {
            const selected = tab === value;

            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setTab(value)}
                className={`-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3.5 text-[15px] transition ${
                  selected
                    ? "border-[#0F2557] font-semibold text-[#172554]"
                    : "border-transparent font-medium text-[#64748B] hover:text-[#172554]"
                }`}
              >
                {Icon && <Icon size={15} strokeWidth={1.7} />}
                {label}
              </button>
            );
          })}
        </div>

        <span className="shrink-0 pl-3 text-[14px] font-medium text-[#475569]">
          {visible.length} {visible.length === 1 ? "Session" : "Sessions"}
        </span>
      </div>

      {/* Search + view toggle */}

      <div className="flex items-center justify-between gap-4">
        <div className="flex h-12 w-full max-w-[320px] items-center rounded-xl border border-[#E1E6F2] bg-white">
          <div className="flex min-w-0 flex-1 items-center gap-2.5 pl-4">
            <Search size={16} className="shrink-0 text-[#6B7799]" />

            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by role or company"
              aria-label="Search sessions"
              className="h-full w-full bg-transparent text-[14px] text-[#172554] placeholder:text-[#9AA5C2] focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => setNewestFirst((current) => !current)}
            aria-label={newestFirst ? "Sort oldest first" : "Sort newest first"}
            title={newestFirst ? "Newest first" : "Oldest first"}
            className="flex h-full w-12 items-center justify-center rounded-r-xl border-l border-[#E1E6F2] text-[#334168] transition hover:bg-[#F1F4FB]"
          >
            <ArrowUpDown size={16} />
          </button>
        </div>

        <div className="flex rounded-xl bg-[#F1F4FB] p-1">
          {(
            [
              { value: "grid", label: "Grid view", Icon: LayoutGrid },
              { value: "list", label: "List view", Icon: List },
            ] as const
          ).map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              aria-label={label}
              aria-pressed={view === value}
              onClick={() => setView(value)}
              className={`flex h-9 w-11 items-center justify-center rounded-lg transition ${
                view === value
                  ? "bg-white text-[#0F2557] shadow-[0_1px_3px_rgba(15,37,87,0.14)]"
                  : "text-[#6B7799]"
              }`}
            >
              <Icon size={17} />
            </button>
          ))}
        </div>
      </div>

      {/* Sessions */}

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#C9D1E6] py-16 text-center">
          <p className="text-[15px] font-semibold text-[#172554]">
            No sessions found
          </p>

          <p className="mt-1 text-[14px] text-[#64748B]">
            {query || tab !== "all"
              ? "Try a different search or filter."
              : "Create a session to get started."}
          </p>
        </div>
      ) : past.length === 0 ? (
        <div className="pb-6">{renderCards(active)}</div>
      ) : (
        <div className="space-y-8 pb-6">
          {active.length > 0 && (
            <Group title="Active sessions" count={active.length}>
              {renderCards(active)}
            </Group>
          )}

          <Group title="Past sessions" count={past.length}>
            {renderCards(past)}
          </Group>
        </div>
      )}

      {launching !== null && (
        <SessionLauncher
          session={launching}
          freeLeft={freeLeft}
          onStarted={onStarted}
          onClose={() => setLaunching(null)}
        />
      )}

      {editing !== null && (
        <EditSessionModal
          session={editing}
          onClose={() => setEditing(null)}
          onSaved={(id, patch) =>
            setOverrides((previous) => ({
              ...previous,
              [id]: { ...(previous[id] ?? {}), ...patch },
            }))
          }
        />
      )}

      {deleting !== null && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#040A1C]/60 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deleteBusy) {
              setDeleting(null);
            }
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-session-title"
            className="w-full max-w-[400px] rounded-[20px] border border-[#E1E6F2] bg-white px-6 py-5 shadow-[0_24px_80px_rgba(15,37,87,0.25)]"
          >
            <h2
              id="delete-session-title"
              className="text-[18px] font-semibold leading-6 text-[#172554]"
            >
              Delete session?
            </h2>

            <p className="mt-1.5 text-[14px] leading-5 text-[#475569]">
              &quot;{field(deleting, ["company", "role"]) || "This session"}
              &quot; will be permanently deleted along with its saved answers
              and transcript. This cannot be undone.
            </p>

            {deleteError && (
              <p role="alert" className="mt-2 text-[14px] text-red-600">
                {deleteError}
              </p>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDeleting(null)}
                disabled={deleteBusy}
                className="h-10 rounded-xl bg-[#F1F4FB] text-[14px] font-medium text-[#0F1B3D] transition hover:bg-[#E5EAF6] disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleteBusy}
                className="h-10 rounded-xl bg-[#DC2626] text-[14px] font-semibold text-white transition hover:bg-[#B91C1C] disabled:opacity-60"
              >
                {deleteBusy ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}