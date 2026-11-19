import Image from "next/image";
import Link from "next/link";

/** Logo file lives in frontend/public/images. */
const LOGO_SRC = "/images/logo-400.webp";

const PRODUCT_LINKS = [
  { label: "Features", href: "/#features" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Privacy", href: "/#privacy" },
  { label: "FAQ", href: "/#faq" }
];

const ACCOUNT_LINKS = [
  { label: "Sign In", href: "/login" },
  { label: "Create account", href: "/register" }
];

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

const linkClass = `rounded text-sm text-blue-100/80 transition-colors hover:text-white ${focusRing}`;

function FooterColumn({
  title,
  links
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <nav aria-label={title}>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-blue-200/60">
        {title}
      </h2>
      <ul className="mt-4 space-y-3">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className={linkClass}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function Footer() {
  return (
    <footer className="bg-[#0E1F54] px-4 pt-14 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 pb-12 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr] lg:gap-16">
          {/* Brand */}
          <div className="max-w-sm">
            <Link
              href="/"
              aria-label="SPS AI Assistant home"
              className={`inline-flex items-center gap-3 rounded-lg ${focusRing}`}
            >
              <span className="flex h-16 items-center rounded-xl bg-white px-4">
                <Image
                  src={LOGO_SRC}
                  alt="SPS logo"
                  width={400}
                  height={120}
                  className="h-auto max-h-12 w-auto max-w-[200px] object-contain"
                />
              </span>
              <span>
                <span className="block text-sm font-bold leading-tight text-white">
                  SPS AI Assistant
                </span>
                <span className="block text-[11px] text-blue-200/80">
                  Intelligent Workspace
                </span>
              </span>
            </Link>

            <p className="mt-5 text-sm leading-6 text-blue-100/70">
              Real-time AI assistance for interviews, calls and professional
              conversations.
            </p>
          </div>

          <FooterColumn title="Product" links={PRODUCT_LINKS} />
          <FooterColumn title="Account" links={ACCOUNT_LINKS} />
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 py-6 text-center text-xs text-blue-200/70 sm:text-left">
         <p>
  © 2026 Software Productivity Strategists. All
  rights reserved.
</p>
        </div>
      </div>
    </footer>
  );
}