import Link from "next/link";

export function LegalFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="legal-footer">
      <div className="legal-footer-inner">
        <p className="legal-footer-copyright">
          &copy; {currentYear} DashBee. Open source under MIT License.
        </p>
        <nav className="legal-footer-nav">
          <Link href="/privacy" className="legal-footer-link">
            Privacy Policy
          </Link>
          <Link href="/terms" className="legal-footer-link">
            Terms of Service
          </Link>
          <a
            href="https://github.com/jagan-shanmugam/dashbee/blob/main/LICENSE"
            className="legal-footer-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            MIT License
          </a>
          <a
            href="https://github.com/jagan-shanmugam/dashbee"
            className="legal-footer-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
