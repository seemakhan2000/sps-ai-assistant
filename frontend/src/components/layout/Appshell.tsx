"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import Loading from "@/src/components/ui/Loading";
import { authService } from "@/src/features/services/auth.service";
import type { User } from "@/src/features/types/index";

import Header from "./Header";
import Sidebar from "./Sidebar";

interface Props {
  title: string;
  subtitle?: string;
  /** Pass a function if the page needs the signed-in user. */
  children: ReactNode | ((user: User) => ReactNode);
}

/** Page frame for every logged-in route: auth check + Sidebar + Header. */
export default function AppShell({ title, subtitle, children }: Props) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let cancelled = false;

    authService
      .getMe()
      .then((result) => {
        if (!cancelled) setUser(result.data.user);
      })
      .catch(() => {
        if (!cancelled) router.replace("/login");
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!user) return <Loading />;

  return (
    <div className="flex min-h-screen bg-[#F5F7FB]">
      <Sidebar />

      <div className="min-w-0 flex-1">
        <Header name={user.name} title={title} subtitle={subtitle} />

        <main className="mx-auto max-w-[1500px] p-6 lg:p-9">
          {typeof children === "function" ? children(user) : children}
        </main>
      </div>
    </div>
  );
}