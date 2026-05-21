import { APP_NAME } from '../constants';

interface TosPageProps {
  onBack: () => void;
}

export function TosPage({ onBack }: TosPageProps) {
  return (
    <div className="config-page">
      <header className="config-header">
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          ← Back
        </button>
        <h1>Terms of Service</h1>
      </header>
      <article className="tos-body">
        <p>
          <strong>Last updated:</strong> May 2026. By using {APP_NAME} (&quot;the
          App&quot;), you agree to these terms.
        </p>

        <h2>1. Independent service</h2>
        <p>
          {APP_NAME} is a standalone tool for writing and organizing character
          dialogue and nicknames. The App is operated independently and is not
          affiliated with, endorsed by, sponsored by, or connected to any game
          publisher, console manufacturer, entertainment company, trademark
          owner, or other third party. No company names, game titles, or
          copyrighted characters from other products are used by the App itself.
        </p>

        <h2>2. Your content</h2>
        <p>
          You are solely responsible for names, text, images, and other material
          you create, import, or generate (including via third-party AI). Do not
          upload unlawful, harassing, hateful, or infringing content. You grant
          the operator a limited technical license to store and process your
          content only to provide features you enable (such as cloud sync).
        </p>

        <h2>3. No association with third parties</h2>
        <p>
          References you enter (character names, dialogue, etc.) are your own.
          The operator does not claim any rights in third-party intellectual
          property and does not authorize you to use anyone else&apos;s trademarks
          or copyrighted works. You are responsible for compliance with laws and
          rights of others.
        </p>

        <h2>4. AI-generated text</h2>
        <p>
          Optional AI features use your own API key and an external provider.
          Generated output may be inaccurate or inappropriate. Review everything
          before use. The operator does not guarantee quality or safety of AI
          suggestions.
        </p>

        <h2>5. Accounts and cloud save</h2>
        <p>
          If you create an account, keep your credentials secure. Cloud data may
          be lost due to outages, policy changes, or account closure. Keep your
          own backups when possible.
        </p>

        <h2>6. Payments</h2>
        <p>
          Optional payments (web checkout or mobile store) may remove advertising.
          Purchases are handled by third-party payment providers. Refunds follow
          those providers&apos; policies unless required by law.
        </p>

        <h2>7. Acceptable use</h2>
        <p>
          Do not abuse the service (spam, automated scraping, attempts to break
          limits, or harm other users). Usage limits may apply on public
          deployments.
        </p>

        <h2>8. Disclaimer of warranties</h2>
        <p>
          THE APP IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT
          WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY,
          FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
        </p>

        <h2>9. Limitation of liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE OPERATOR AND CONTRIBUTORS
          SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
          CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF DATA, PROFITS, OR
          GOODWILL, ARISING FROM YOUR USE OF THE APP. OUR TOTAL LIABILITY FOR ANY
          CLAIM RELATING TO THE APP SHALL NOT EXCEED THE GREATER OF (A) AMOUNTS
          YOU PAID US FOR THE APP IN THE TWELVE MONTHS BEFORE THE CLAIM, OR (B)
          TEN US DOLLARS (USD $10), IF YOU PAID NOTHING.
        </p>

        <h2>10. Indemnity</h2>
        <p>
          You agree to defend and indemnify the operator against claims arising
          from your content or misuse of the App, except where caused by our
          intentional misconduct.
        </p>

        <h2>11. Changes and termination</h2>
        <p>
          We may update these terms or discontinue the App at any time. Continued
          use after changes means acceptance. We may suspend accounts that violate
          these terms.
        </p>

        <h2>12. Governing law</h2>
        <p>
          These terms are governed by the laws applicable where the operator
          resides, without regard to conflict-of-law rules. Courts in that
          jurisdiction shall have exclusive venue for disputes, unless mandatory
          consumer protection laws in your country require otherwise.
        </p>

        <h2>13. Contact</h2>
        <p>
          For questions about these terms, contact the project maintainer through
          the repository listed on the App&apos;s deployment page.
        </p>
      </article>
    </div>
  );
}
