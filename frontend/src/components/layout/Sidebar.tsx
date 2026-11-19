"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FileText,
  FolderOpen,
  History,
  Loader2,
  LogOut,
  PlusCircle,
  Video,
  X,
  type LucideIcon
} from "lucide-react";

import { authService } from "@/src/features/services/auth.service";

/* -------------------------------------------------------------------------- */
/*  Config                                                                    */
/* -------------------------------------------------------------------------- */

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * Navigation follows SRS 4.2.
 * Resume Maker, AI Headshots and Billing & Credits must never appear here.
 * Question Bank is added only after it is verified and approved.
 */
const NAV_GROUPS: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { name: "Create Session", href: "/CreateSession", icon: PlusCircle },
      { name: "Call Sessions", href: "/CallSessions", icon: History }
    ]
  },
  {
    label: "Resources",
    items: [
      { name: "Resumes", href: "/Resumes", icon: FileText },
      { name: "Documents", href: "/Documents", icon: FolderOpen },
      // Desktop browser only (SRS 4.14). Hide on unsupported platforms later.
      { name: "Mock Interview", href: "/MockInterview", icon: Video }
    ]
  }
];

/** Where the user lands after a successful logout. */
const LOGIN_ROUTE = "/login";

/** Brand navy, same as the Header. */
const NAVY = "#1E3A8A";

/** Logo file lives in frontend/public/images (square works best). */
const LOGO_SRC = "/images/logo-400.webp";

/** Deep navy used as the sidebar background. */
const SIDEBAR_BG = "#13296B";

/** Focus ring that stays visible on the dark sidebar. */
const FOCUS_RING_DARK =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

const FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Picks the one nav item that matches the current path.
 * The longest match wins, so a nested path highlights the most specific item
 * and not its parent.
 */
function getActiveHref(pathname: string): string | null {
  const matches = NAV_GROUPS.flatMap((group) => group.items)
    .filter(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
    )
    .sort((a, b) => b.href.length - a.href.length);

  return matches[0]?.href ?? null;
}

/**
 * Handles logout in one place: request, loading state, error state, redirect.
 * Pass `onLogout` to Sidebar if you use NextAuth / Clerk / Firebase, e.g.
 * `onLogout={() => signOut({ callbackUrl: "/login" })}`.
 */
function useLogout(onLogout?: () => Promise<void> | void) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logout = useCallback(async () => {
    if (loading) return false;

    setLoading(true);
    setError(null);

    try {
      if (onLogout) {
        await onLogout();
      } else {
        await authService.logout();
      }

      router.replace(LOGIN_ROUTE);
      router.refresh(); // drop any cached authenticated data
      return true;
    } catch {
      setError("Could not log out. Check your connection and try again.");
      setLoading(false);
      return false;
    }
  }, [loading, onLogout, router]);

  const reset = useCallback(() => setError(null), []);

  return { logout, loading, error, reset };
}

/* -------------------------------------------------------------------------- */
/*  Pieces                                                                    */
/* -------------------------------------------------------------------------- */

function NavLink({
  item,
  active,
  onNavigate
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${FOCUS_RING_DARK} ${
        active
          ? "bg-white/15 text-white"
          : "text-blue-100/80 hover:bg-white/10 hover:text-white"
      }`}
    >
      {/* Active marker: a bar on the leading edge, not just a colour change */}
      <span
        aria-hidden
        className={`absolute inset-y-2 left-0 w-1 rounded-r-full bg-sky-400 transition-opacity ${
          active ? "opacity-100" : "opacity-0"
        }`}
      />
      <Icon
        size={18}
        aria-hidden
        className={
          active
            ? "text-white"
            : "text-blue-200/60 transition-colors group-hover:text-white"
        }
      />
      <span className="truncate">{item.name}</span>
    </Link>
  );
}

/**
 * Confirmation step so an accidental tap never ends a live interview session.
 * Rendered through a portal (see LogoutButton), so it always sits above the
 * page content instead of being trapped under the sidebar's stacking context.
 */
function LogoutDialog({
  loading,
  error,
  onConfirm,
  onCancel
}: {
  loading: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        // Keep the mobile drawer open underneath; only close this dialog.
        event.stopImmediatePropagation();
        if (!loading) onCancel();
        return;
      }

      // Simple focus trap
      if (event.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          "button:not([disabled])"
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    // Capture phase so this runs before the drawer's own Escape handler.
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [loading, onCancel]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        aria-hidden
        onClick={loading ? undefined : onCancel}
        className="absolute inset-0 bg-slate-900/50"
      />

      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="logout-title"
        aria-describedby="logout-desc"
        className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="flex items-start gap-4">
          <span
            aria-hidden
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600"
          >
            <LogOut size={20} />
          </span>

          <div>
            <h2
              id="logout-title"
              className="text-base font-semibold text-[#101D32]"
            >
              Log out of SPS AI Assistant?
            </h2>
            <p
              id="logout-desc"
              className="mt-1.5 text-sm leading-6 text-slate-600"
            >
              You will need to sign in again to open your sessions, resumes and
              documents.
            </p>
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={loading}
            className={`rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 ${FOCUS_RING}`}
          >
            Stay signed in
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`inline-flex min-w-[6.5rem] items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-70 ${FOCUS_RING}`}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" aria-hidden />
                Logging out
              </>
            ) : (
              "Log out"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function LogoutButton({
  onLogout,
  onDone
}: {
  onLogout?: () => Promise<void> | void;
  onDone?: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { logout, loading, error, reset } = useLogout(onLogout);

  const close = useCallback(() => {
    setConfirming(false);
    reset();
    triggerRef.current?.focus();
  }, [reset]);

  const confirm = useCallback(async () => {
    const ok = await logout();
    if (ok) onDone?.();
  }, [logout, onDone]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setConfirming(true)}
        aria-haspopup="dialog"
        className={`group flex w-full items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:border-red-300/40 hover:bg-red-500/15 hover:text-red-100 active:bg-red-500/25 ${FOCUS_RING_DARK}`}
      >
        <span
          aria-hidden
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-blue-100 transition-colors group-hover:bg-red-500/20 group-hover:text-red-200"
        >
          <LogOut size={16} />
        </span>
        <span className="flex-1 text-left">Log out</span>
      </button>

      {/* Portal to <body>: escapes the sidebar so the dialog covers the whole page. */}
      {confirming &&
        createPortal(
          <LogoutDialog
            loading={loading}
            error={error}
            onConfirm={confirm}
            onCancel={close}
          />,
          document.body
        )}
    </>
  );
}

/**
 * Wide logo shown at its natural ratio, so it is never squashed into a square.
 * Falls back to a navy "SPS" tile if the file is missing.
 * It sits on a white card (see SidebarContent) so it stays readable on navy.
 * Make it bigger or smaller with `max-h-16` and the card padding `p-3`.
 */
function BrandLogo() {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        aria-hidden
        style={{ backgroundColor: NAVY }}
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white"
      >
        SPS
      </span>
    );
  }

  return (
    <Image
      src={LOGO_SRC}
      alt="SPS logo"
      width={400}
      height={120}
      priority
      onError={() => setFailed(true)}
      className="mx-auto h-auto max-h-16 w-full object-contain"
    />
  );
}

function SidebarContent({
  onNavigate,
  onLogout
}: {
  onNavigate?: () => void;
  onLogout?: () => Promise<void> | void;
}) {
  const pathname = usePathname();
  const activeHref = getActiveHref(pathname);

  return (
    <div className="flex h-full flex-col">
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className={`flex shrink-0 flex-col items-stretch gap-4 border-b border-white/10 px-6 py-6 ${FOCUS_RING_DARK}`}
      >
        <span className="block rounded-xl bg-white p-3 shadow-sm">
          <BrandLogo />
        </span>

        <span className="min-w-0">
          <span className="block truncate text-base font-bold text-white">
            SPS AI Assistant
          </span>
          <span className="mt-0.5 block truncate text-xs text-blue-200/70">
            Intelligent Workspace
          </span>
        </span>
      </Link>

      <nav
        aria-label="Main navigation"
        className="flex-1 space-y-7 overflow-y-auto overscroll-contain px-4 py-6"
      >
        {NAV_GROUPS.map((group) => (
          <section key={group.label} aria-labelledby={`nav-${group.label}`}>
            <h2
              id={`nav-${group.label}`}
              className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-blue-200/60"
            >
              {group.label}
            </h2>

            <ul className="space-y-1">
              {group.items.map((item) => (
                <li key={item.href}>
                  <NavLink
                    item={item}
                    active={item.href === activeHref}
                    onNavigate={onNavigate}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </nav>

      <div className="shrink-0 border-t border-white/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <LogoutButton onLogout={onLogout} onDone={onNavigate} />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Exports                                                                   */
/* -------------------------------------------------------------------------- */

interface SidebarProps {
  /** Override the default logout (e.g. NextAuth `signOut`). */
  onLogout?: () => Promise<void> | void;
}

/** Slide-in navigation for screens below the lg breakpoint. Opened from Header. */
export function MobileSidebar({
  open,
  onClose,
  onLogout
}: SidebarProps & {
  open: boolean;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const firstRender = useRef(true);

  // Close the drawer whenever the route changes.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (open) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    const previouslyFocused = document.activeElement as HTMLElement | null;

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        aria-hidden
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/50"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        style={{ backgroundColor: SIDEBAR_BG }}
        className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-xl"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
          className={`absolute right-3 top-6 rounded-md p-1 text-blue-100 transition-colors hover:bg-white/10 ${FOCUS_RING_DARK}`}
        >
          <X size={20} aria-hidden />
        </button>

        <SidebarContent onNavigate={onClose} onLogout={onLogout} />
      </aside>
    </div>
  );
}

/** Desktop sidebar. Hidden below lg, where MobileSidebar takes over. */
export default function Sidebar({ onLogout }: SidebarProps) {
  return (
    <aside
      style={{ backgroundColor: SIDEBAR_BG }}
      className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-white/10 lg:block"
    >
      <SidebarContent onLogout={onLogout} />
    </aside>
  );
}