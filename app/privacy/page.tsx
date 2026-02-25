import type { Metadata } from "next";
import { LegalHeader } from "@/components/legal-header";
import { LegalFooter } from "@/components/legal-footer";

export const metadata: Metadata = {
  title: "Privacy Policy | DashBee",
  description:
    "DashBee Privacy Policy - Learn how we collect, use, and protect your data. GDPR-compliant privacy practices for our AI-powered dashboard generator.",
  openGraph: {
    title: "Privacy Policy | DashBee",
    description:
      "DashBee Privacy Policy - Learn how we collect, use, and protect your data.",
    type: "website",
  },
};

export default function PrivacyPage() {
  return (
    <div className="legal-page-container">
      <LegalHeader title="Privacy Policy" />

      <main className="legal-content">
        <p className="legal-effective-date">
          <strong>Last Updated:</strong> February 2026
        </p>

        <section className="legal-section">
          <h2>1. Introduction</h2>
          <p>
            Welcome to DashBee (&quot;we,&quot; &quot;our,&quot; or
            &quot;us&quot;). DashBee is an open-source, AI-powered dashboard
            generator that creates dashboards from natural language prompts. We
            are committed to protecting your privacy and handling your data
            responsibly.
          </p>
          <p>
            This Privacy Policy explains how we collect, use, disclose, and
            safeguard your information when you use our application. Please read
            this policy carefully. If you do not agree with the terms of this
            privacy policy, please do not access the application.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Data We Collect</h2>
          <p>
            DashBee is designed with privacy in mind. We collect minimal data
            necessary to provide our services:
          </p>

          <h3>2.1 Database Connection Information</h3>
          <p>
            When you connect a database to DashBee, we process connection
            credentials (host, port, username, password) to execute queries on
            your behalf. These credentials are:
          </p>
          <ul>
            <li>Never stored permanently on our servers</li>
            <li>Used only for the duration of your session</li>
            <li>Not shared with third parties except AI providers for query generation</li>
          </ul>

          <h3>2.2 Query History</h3>
          <p>
            We may temporarily store SQL queries generated during your session
            to improve the user experience and enable features like query
            history. This data is session-based and not permanently retained.
          </p>

          <h3>2.3 Cloud Storage Credentials</h3>
          <p>
            If you use our cloud storage integration (AWS S3 or Google Cloud
            Storage), credentials are processed similarly to database
            connections—used only during your session and never stored
            permanently.
          </p>

          <h3>2.4 Analytics and Observability Data</h3>
          <p>
            We use Langfuse for LLM observability to improve our AI responses.
            This may include:
          </p>
          <ul>
            <li>Natural language prompts you submit</li>
            <li>Generated SQL queries and dashboard configurations</li>
            <li>Response times and token usage</li>
            <li>Error logs for debugging purposes</li>
          </ul>
          <p>
            This data helps us understand how our AI performs and improve the
            service. No personally identifiable information from your databases
            is intentionally collected.
          </p>
        </section>

        <section className="legal-section">
          <h2>3. How We Use Your Data</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Generate SQL queries and dashboards based on your prompts</li>
            <li>Execute database queries and return results</li>
            <li>Improve our AI models and service quality</li>
            <li>Debug issues and maintain service reliability</li>
            <li>Provide customer support when requested</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>4. Data Retention</h2>
          <p>
            DashBee follows a minimal data retention policy:
          </p>
          <ul>
            <li>
              <strong>Session Data:</strong> Database credentials and query
              results are cleared when your session ends
            </li>
            <li>
              <strong>Analytics Data:</strong> LLM observability data may be
              retained for up to 90 days for service improvement purposes
            </li>
            <li>
              <strong>Local Storage:</strong> Some preferences may be stored in
              your browser&apos;s local storage, which you can clear at any time
            </li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>5. Your Rights Under GDPR</h2>
          <p>
            If you are a resident of the European Economic Area (EEA), you have
            certain data protection rights under the General Data Protection
            Regulation (GDPR):
          </p>
          <ul>
            <li>
              <strong>Right of Access:</strong> You can request copies of your
              personal data
            </li>
            <li>
              <strong>Right to Rectification:</strong> You can request
              correction of inaccurate personal data
            </li>
            <li>
              <strong>Right to Erasure:</strong> You can request deletion of
              your personal data under certain conditions
            </li>
            <li>
              <strong>Right to Data Portability:</strong> You can request
              transfer of your data to another organization
            </li>
            <li>
              <strong>Right to Object:</strong> You can object to processing of
              your personal data
            </li>
            <li>
              <strong>Right to Restrict Processing:</strong> You can request
              limitation of processing under certain conditions
            </li>
          </ul>
          <p>
            To exercise any of these rights, please contact us through our
            GitHub repository. We will respond to your request within 30 days.
          </p>
        </section>

        <section className="legal-section">
          <h2>6. Cookies and Local Storage</h2>
          <p>
            DashBee uses browser local storage to remember your preferences,
            such as:
          </p>
          <ul>
            <li>Theme preference (light/dark mode)</li>
            <li>Dashboard style presets</li>
            <li>AI model settings</li>
            <li>Saved queries (stored locally in your browser)</li>
          </ul>
          <p>
            We do not use third-party tracking cookies. Any analytics data is
            collected server-side through Langfuse for LLM observability
            purposes only.
          </p>
        </section>

        <section className="legal-section">
          <h2>7. Third-Party Services</h2>
          <p>
            DashBee integrates with the following third-party services to
            provide AI-powered functionality:
          </p>
          <ul>
            <li>
              <strong>OpenAI:</strong> For GPT-based query generation and
              dashboard creation
            </li>
            <li>
              <strong>Anthropic:</strong> For Claude-based AI capabilities
            </li>
            <li>
              <strong>OpenRouter:</strong> As an alternative AI gateway
            </li>
            <li>
              <strong>Google (Gemini):</strong> For Gemini-based AI
              capabilities
            </li>
            <li>
              <strong>Langfuse:</strong> For LLM observability and monitoring
            </li>
          </ul>
          <p>
            When you use DashBee, your prompts are sent to these providers to
            generate responses. Each provider has their own privacy policy
            governing how they handle data. We recommend reviewing their
            policies for complete information.
          </p>
        </section>

        <section className="legal-section">
          <h2>8. International Data Transfers</h2>
          <p>
            Your information may be transferred to and processed in countries
            other than your country of residence, including the United States,
            where our third-party AI providers operate. We take appropriate
            safeguards to ensure your data remains protected in accordance with
            this Privacy Policy.
          </p>
          <p>
            For EEA residents, we rely on Standard Contractual Clauses approved
            by the European Commission for such transfers where applicable.
          </p>
        </section>

        <section className="legal-section">
          <h2>9. Data Security</h2>
          <p>
            We implement appropriate technical and organizational security
            measures to protect your data, including:
          </p>
          <ul>
            <li>HTTPS encryption for all data in transit</li>
            <li>No permanent storage of database credentials</li>
            <li>Session-based data handling with automatic cleanup</li>
            <li>Access controls for observability data</li>
          </ul>
          <p>
            However, no method of transmission over the Internet or electronic
            storage is 100% secure. While we strive to protect your personal
            information, we cannot guarantee its absolute security.
          </p>
        </section>

        <section className="legal-section">
          <h2>10. Children&apos;s Privacy</h2>
          <p>
            DashBee is not intended for use by children under the age of 16. We
            do not knowingly collect personal information from children. If you
            are a parent or guardian and believe your child has provided us with
            personal information, please contact us so we can take appropriate
            action.
          </p>
        </section>

        <section className="legal-section">
          <h2>11. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify
            you of any changes by posting the new Privacy Policy on this page
            and updating the &quot;Last Updated&quot; date. You are advised to
            review this Privacy Policy periodically for any changes.
          </p>
        </section>

        <section className="legal-section">
          <h2>12. Contact Information</h2>
          <p>
            If you have questions or concerns about this Privacy Policy or our
            data practices, please contact us through:
          </p>
          <ul>
            <li>
              <strong>GitHub Issues:</strong>{" "}
              <a
                href="https://github.com/jagan-shanmugam/dashbee/issues"
                target="_blank"
                rel="noopener noreferrer"
              >
                github.com/jagan-shanmugam/dashbee/issues
              </a>
            </li>
          </ul>
          <p>
            For GDPR-related inquiries from EEA residents, please mention
            &quot;GDPR Request&quot; in your communication, and we will respond
            within 30 days.
          </p>
        </section>
      </main>

      <LegalFooter />
    </div>
  );
}
