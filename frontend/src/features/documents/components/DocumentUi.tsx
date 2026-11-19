"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

/* -------------------------------------------------
   Small dropdown
------------------------------------------------- */

export function Menu({
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

    function onKey(event: KeyboardEvent) {
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
    // stopPropagation: a click inside the menu must not open the card
    <div
      ref={ref}
      className="relative"
      onClick={(event) => event.stopPropagation()}
    >
      {trigger(() => setOpen((current) => !current))}

      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-[0_8px_30px_rgba(30,58,138,0.14)]">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function MenuItem({
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
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-[14px] leading-5 ${
        danger
          ? "text-red-600 hover:bg-red-50"
          : "text-slate-800 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------
   Rename dialog
------------------------------------------------- */

export function RenameDialog({
  name,
  onClose,
  onSave,
}: {
  name: string;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}) {
  const [value, setValue] = useState(name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const next = value.trim();

    if (!next) {
      setError("Please enter a name.");
      return;
    }

    if (next === name) {
      onClose();
      return;
    }

    try {
      setBusy(true);
      setError("");

      await onSave(next);

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to rename.");
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rename-title"
        className="w-full max-w-[420px] rounded-[20px] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(30,58,138,0.25)]"
      >
        <h2
          id="rename-title"
          className="text-[18px] font-semibold text-slate-900"
        >
          Rename document
        </h2>

        <input
          autoFocus
          value={value}
          maxLength={150}
          onChange={(event) => setValue(event.target.value)}
          onFocus={(event) => event.currentTarget.select()}
          aria-label="Document name"
          className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[14px] text-slate-900 outline-none transition focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10"
        />

        {error && (
          <p role="alert" className="mt-2 text-[13px] text-red-600">
            {error}
          </p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="h-11 rounded-xl bg-slate-100 text-[14px] font-medium text-slate-900 transition hover:bg-slate-200 disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={busy}
            className="h-11 rounded-xl bg-blue-900 text-[14px] font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
          >
            {busy ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* -------------------------------------------------
   Delete dialog
------------------------------------------------- */

export function DeleteDialog({
  name,
  onCancel,
  onConfirm,
}: {
  name: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-document-title"
        className="w-full max-w-[400px] rounded-[20px] border border-slate-200 bg-white px-6 py-5 shadow-[0_24px_80px_rgba(30,58,138,0.25)]"
      >
        <h2
          id="delete-document-title"
          className="text-[18px] font-semibold leading-6 text-slate-900"
        >
          Delete document?
        </h2>

        <p className="mt-1.5 text-[14px] leading-5 text-slate-500">
          &quot;{name}&quot; will be permanently deleted. This can&apos;t be
          undone.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-xl bg-slate-100 text-[14px] font-medium text-slate-900 transition hover:bg-slate-200"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="h-10 rounded-xl bg-red-600 text-[14px] font-semibold text-white transition hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}