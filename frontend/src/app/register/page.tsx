
import type { Metadata } from "next";
import AuthForm from "@/src/features/authentication/AuthForm";

export const metadata: Metadata = {
  title: "Create Account"
};

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F7FB] px-5 py-12">
      <AuthForm mode="register" />
    </main>
  );
}