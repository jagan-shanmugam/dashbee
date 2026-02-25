import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

interface LegalHeaderProps {
  title: string;
}

function BeeIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="16" cy="16" r="14" fill="url(#beeGradient)" />
      <ellipse cx="16" cy="16" rx="8" ry="10" fill="#18181b" />
      <ellipse cx="16" cy="12" rx="6" ry="3" fill="#fbbf24" />
      <ellipse cx="16" cy="18" rx="6" ry="3" fill="#fbbf24" />
      <circle cx="13" cy="10" r="2" fill="white" />
      <circle cx="19" cy="10" r="2" fill="white" />
      <circle cx="13" cy="10" r="1" fill="#18181b" />
      <circle cx="19" cy="10" r="1" fill="#18181b" />
      <defs>
        <linearGradient
          id="beeGradient"
          x1="4"
          y1="4"
          x2="28"
          y2="28"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#0ea5e9" />
          <stop offset="1" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

export function LegalHeader({ title }: LegalHeaderProps) {
  return (
    <header className="legal-header">
      <div className="legal-header-inner">
        <Link href="/" className="legal-logo">
          <span className="logo-icon">
            <BeeIcon />
          </span>
          <span className="logo-text">DashBee</span>
        </Link>

        <h1 className="legal-page-title">{title}</h1>

        <div className="legal-header-actions">
          <Link href="/" className="back-link">
            <ArrowLeftIcon />
            <span>Back to Home</span>
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
