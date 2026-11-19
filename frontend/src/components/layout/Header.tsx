"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, Menu, Settings } from "lucide-react";

import { authService } from "@/src/features/services/auth.service";
import { MobileSidebar } from "./Sidebar";

/** Same deep navy as the sidebar, so the two read as one frame. */
const HEADER_BG = "#13296B";

/** Brand navy, used for text on white surfaces. */
const NAVY = "#1E3A8A";

const FOCUS_RING_DARK =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

interface Props {
  name: string;
  title?: string;
  subtitle?: string;
  /** Optional profile photo URL. Falls back to the first letter of `name`. */
  image?: string;
}

function Avatar({ name, image }: { name: string; image?: string }) {
  const [failed, setFailed] = useState(false);

  if (image && !failed) {
    return (
      <Image
        src={image}
        alt=""
        width={36}
        height={36}
        onError={() => setFailed(true)}
        className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-white/40"
      />
    );
  }

  return (
    <span
      aria-hidden
      style={{ color: NAVY }}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold uppercase ring-2 ring-white/40"
    >
      {name.charAt(0)}
    </span>
  );
}

function UserMenu({ name, image }: { name: string; image?: string }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;

    const onMouseDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function handleSignOut() {
    try {
      setError("");
      setSigningOut(true);

      await authService.logout();

      router.replace("/login");
      router.refresh();
    } catch {
      setError("Couldn't sign out. Please try again.");
      setSigningOut(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/10 ${FOCUS_RING_DARK}`}
      >
        <Avatar name={name} image={image} />

        <span className="hidden text-left sm:block">
          <span className="block text-sm font-semibold text-white">{name}</span>
          <span className="block text-xs text-blue-200/70">SPS Account</span>
        </span>

        <ChevronDown
          size={16}
          aria-hidden
          className={`text-blue-200 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"
        >
          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-800"
          >
            <Settings size={16} aria-hidden />
            Account Settings
          </Link>

          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
          >
            <LogOut size={16} aria-hidden />
            {signingOut ? "Signing out..." : "Sign Out"}
          </button>

          {error && (
            <p role="alert" className="px-3 py-2 text-xs text-red-600">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function Header({
  name,
  title = "Interview Assistant",
  subtitle = "Manage your SPS AI sessions",
  image
}: Props) {
  const [navOpen, setNavOpen] = useState(false);
  const closeNav = useCallback(() => setNavOpen(false), []);

  return (
    <>
      <header
        style={{ backgroundColor: HEADER_BG }}
        className="sticky top-0 z-30 flex h-20 items-center justify-between gap-4 border-b border-white/10 px-6 lg:px-9"
      >
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            aria-label="Open navigation"
            className={`rounded-md p-2 text-white transition-colors hover:bg-white/10 lg:hidden ${FOCUS_RING_DARK}`}
          >
            <Menu size={22} aria-hidden />
          </button>

          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-white">{title}</h2>
            <p className="truncate text-xs text-blue-200/70">{subtitle}</p>
          </div>
        </div>

        <UserMenu name={name} image={image} />
      </header>

      <MobileSidebar open={navOpen} onClose={closeNav} />
    </>
  );
}