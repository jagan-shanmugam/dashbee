import type { Metadata } from "next";
import { LegalHeader } from "@/components/legal-header";
import { LegalFooter } from "@/components/legal-footer";

export const metadata: Metadata = {
  title: "Terms of Service | DashBee",
  description:
    "DashBee Terms of Service - Understand your rights and responsibilities when using our AI-powered dashboard generator. Open source under MIT License.",
  openGraph: {
    title: "Terms of Service | DashBee",
    description:
      "DashBee Terms of Service - Understand your rights and responsibilities.",
    type: "website",
  },
};

export default function TermsPage() {
  return (
    <div className="legal-page-container">
      <LegalHeader title="Terms of Service" />

      <main className="legal-content">
        <p className="legal-effective-date">
          <strong>Last Updated:</strong> February 2026
        </p>

        <section className="legal-section">
          <h2>1. Introduction</h2>
          <p>
            Welcome to DashBee. These Terms of Service (&quot;Terms&quot;)
            govern your use of the DashBee application and services. By
            accessing or using DashBee, you agree to be bound by these Terms. If
            you do not agree to these Terms, please do not use the service.
          </p>
          <p>
            DashBee is an open-source, AI-powered dashboard generator that
            creates dashboards from natural language prompts. The software is
            provided under the MIT License.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. MIT License and Open Source</h2>
          <p>
            DashBee is open-source software licensed under the MIT License. This
            means:
          </p>
          <ul>
            <li>
              You are free to use, copy, modify, merge, publish, distribute,
              sublicense, and/or sell copies of the software
            </li>
            <li>
              The software is provided &quot;AS IS&quot;, without warranty of
              any kind, express or implied
            </li>
            <li>
              The authors and copyright holders are not liable for any claims,
              damages, or other liability arising from the use of the software
            </li>
          </ul>
          <p>
            The full MIT License text is available at:{" "}
            <a
              href="https://github.com/jagan-shanmugam/dashbee/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
            >
              github.com/jagan-shanmugam/dashbee/blob/main/LICENSE
            </a>
          </p>
        </section>

        <section className="legal-section">
          <h2>3. Acceptance of Terms</h2>
          <p>By using DashBee, you acknowledge that you have read, understood, and agree to be bound by these Terms. You also agree to comply with all applicable laws and regulations.</p>
          <p>
            If you are using DashBee on behalf of an organization, you represent
            that you have the authority to bind that organization to these
            Terms.
          </p>
        </section>

        <section className="legal-section">
          <h2>4. Use of Service</h2>
          <p>DashBee allows you to:</p>
          <ul>
            <li>
              Connect to your own databases (PostgreSQL, MySQL, SQLite) to
              generate dashboards
            </li>
            <li>
              Use natural language prompts to create SQL queries and
              visualizations
            </li>
            <li>
              Connect to cloud storage services (AWS S3, Google Cloud Storage)
              for data files
            </li>
            <li>Export dashboards in various formats</li>
          </ul>
          <p>You agree to use the service only for lawful purposes and in accordance with these Terms.</p>
        </section>

        <section className="legal-section">
          <h2>5. User Responsibilities</h2>
          <p>When using DashBee, you are responsible for:</p>
          <ul>
            <li>
              <strong>Your Data:</strong> Ensuring you have the right to access
              and query any databases or data sources you connect to DashBee
            </li>
            <li>
              <strong>Credential Security:</strong> Keeping your database
              credentials, API keys, and cloud storage credentials secure
            </li>
            <li>
              <strong>Query Validation:</strong> Reviewing AI-generated SQL
              queries before executing them, especially in production
              environments
            </li>
            <li>
              <strong>Compliance:</strong> Ensuring your use of DashBee complies
              with all applicable data protection laws and regulations
            </li>
            <li>
              <strong>Appropriate Use:</strong> Not using the service to access
              data you are not authorized to access
            </li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>6. Data Security</h2>
          <p>
            You acknowledge and understand that:
          </p>
          <ul>
            <li>
              DashBee connects to databases using credentials you provide
            </li>
            <li>
              Your prompts and generated queries may be sent to third-party AI
              providers (OpenAI, Anthropic, OpenRouter, Google)
            </li>
            <li>
              You are responsible for the security of your database credentials
              and data
            </li>
            <li>
              You should not connect DashBee to databases containing highly
              sensitive data without appropriate security measures in place
            </li>
          </ul>
          <p>
            We recommend using read-only database users with limited permissions
            when connecting to DashBee, especially for production databases.
          </p>
        </section>

        <section className="legal-section">
          <h2>7. Third-Party Services</h2>
          <p>
            DashBee integrates with third-party AI providers to generate queries
            and dashboards. By using DashBee, you also agree to the terms of
            service of these providers:
          </p>
          <ul>
            <li>OpenAI Terms of Use</li>
            <li>Anthropic Terms of Service</li>
            <li>OpenRouter Terms of Service</li>
            <li>Google Cloud Terms of Service (for Gemini)</li>
          </ul>
          <p>
            We are not responsible for the practices or policies of these
            third-party services.
          </p>
        </section>

        <section className="legal-section">
          <h2>8. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by applicable law, in no event shall
            DashBee, its developers, contributors, or affiliates be liable for:
          </p>
          <ul>
            <li>
              Any indirect, incidental, special, consequential, or punitive
              damages
            </li>
            <li>
              Loss of profits, data, use, goodwill, or other intangible losses
            </li>
            <li>
              Any damage resulting from unauthorized access to or alteration of
              your data
            </li>
            <li>
              Any errors, mistakes, or inaccuracies in AI-generated queries or
              content
            </li>
            <li>
              Any interruption or cessation of the service
            </li>
          </ul>
          <p>
            This limitation applies regardless of whether the damages are based
            on warranty, contract, tort, or any other legal theory.
          </p>
        </section>

        <section className="legal-section">
          <h2>9. Disclaimer of Warranties</h2>
          <p>
            DASHBEE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot;
            WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
            INCLUDING BUT NOT LIMITED TO:
          </p>
          <ul>
            <li>IMPLIED WARRANTIES OF MERCHANTABILITY</li>
            <li>FITNESS FOR A PARTICULAR PURPOSE</li>
            <li>NON-INFRINGEMENT</li>
            <li>ACCURACY OR COMPLETENESS OF CONTENT</li>
          </ul>
          <p>
            We do not warrant that the service will be uninterrupted, secure, or
            error-free. AI-generated queries may contain errors and should
            always be reviewed before execution.
          </p>
        </section>

        <section className="legal-section">
          <h2>10. Indemnification</h2>
          <p>
            You agree to indemnify, defend, and hold harmless DashBee, its
            developers, and contributors from and against any claims,
            liabilities, damages, losses, and expenses arising out of or in any
            way connected with:
          </p>
          <ul>
            <li>Your access to or use of the service</li>
            <li>Your violation of these Terms</li>
            <li>Your violation of any third-party rights</li>
            <li>Any data you submit or access through the service</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>11. Modifications to Service and Terms</h2>
          <p>
            We reserve the right to modify or discontinue the service at any
            time without notice. We may also revise these Terms from time to
            time. The most current version will always be posted on this page
            with the updated &quot;Last Updated&quot; date.
          </p>
          <p>
            Your continued use of DashBee after any changes to these Terms
            constitutes acceptance of the modified Terms.
          </p>
        </section>

        <section className="legal-section">
          <h2>12. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with
            the laws of the jurisdiction in which you reside, without regard to
            its conflict of law provisions. Any disputes arising under these
            Terms shall be resolved in the courts of competent jurisdiction.
          </p>
        </section>

        <section className="legal-section">
          <h2>13. Severability</h2>
          <p>
            If any provision of these Terms is found to be unenforceable or
            invalid, that provision will be limited or eliminated to the minimum
            extent necessary so that these Terms will otherwise remain in full
            force and effect.
          </p>
        </section>

        <section className="legal-section">
          <h2>14. Contact Information</h2>
          <p>
            If you have any questions about these Terms, please contact us
            through:
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
        </section>
      </main>

      <LegalFooter />
    </div>
  );
}
