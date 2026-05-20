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
          <strong>Last updated:</strong> May 2026. By using Tomodachi Dictionary
          (&quot;the App&quot;), you agree to these terms.
        </p>

        <h2>1. What the App is</h2>
        <p>
          The App is a fan-made editor for custom dialogue and nicknames in
          Tomodachi Life: Living the Dream. It is not affiliated with, endorsed
          by, or sponsored by Nintendo or any rights holder of Tomodachi Life.
          All game trademarks belong to their owners.
        </p>

        <h2>2. Your content</h2>
        <p>
          You are solely responsible for text you write, import, or generate
          (including via third-party AI). Do not upload unlawful, harassing,
          hateful, or infringing content. You grant the operator a limited
          technical license to store and process your content only to provide
          sync and hosting features you enable.
        </p>

        <h2>3. AI-generated text</h2>
        <p>
          Optional AI features use your own API key and an external provider
          (e.g. Google Gemini). Generated output may be inaccurate or
          inappropriate. Review everything before use in-game. The operator does
          not guarantee quality or safety of AI suggestions.
        </p>

        <h2>4. Accounts and cloud save</h2>
        <p>
          If you create an account, you must keep your credentials secure. Usernames
          map to internal auth identifiers; we do not require a personal email for
          sign-up. Cloud data may be lost due to outages, policy changes, or account
          closure. Keep your own backups when possible.
        </p>

        <h2>5. Acceptable use</h2>
        <p>
          Do not abuse the service (spam, automated scraping, attempts to break
          limits, or harm other users). Fair-use limits (e.g. phrase counts per
          type) may apply on public deployments.
        </p>

        <h2>6. Disclaimer of warranties</h2>
        <p>
          THE APP IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT
          WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY,
          FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
        </p>

        <h2>7. Limitation of liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE OPERATOR AND CONTRIBUTORS
          SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
          CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF DATA, PROFITS, OR
          GOODWILL, ARISING FROM YOUR USE OF THE APP. OUR TOTAL LIABILITY FOR ANY
          CLAIM RELATING TO THE APP SHALL NOT EXCEED THE GREATER OF (A) AMOUNTS
          YOU PAID US FOR THE APP IN THE TWELVE MONTHS BEFORE THE CLAIM, OR (B)
          TEN US DOLLARS (USD $10), IF YOU PAID NOTHING.
        </p>

        <h2>8. Indemnity</h2>
        <p>
          You agree to defend and indemnify the operator against claims arising
          from your content or misuse of the App, except where caused by our
          intentional misconduct.
        </p>

        <h2>9. Changes and termination</h2>
        <p>
          We may update these terms or discontinue the App at any time. Continued
          use after changes means acceptance. We may suspend accounts that violate
          these terms.
        </p>

        <h2>10. Governing law</h2>
        <p>
          These terms are governed by the laws applicable where the operator
          resides, without regard to conflict-of-law rules. Courts in that
          jurisdiction shall have exclusive venue for disputes, unless mandatory
          consumer protection laws in your country require otherwise.
        </p>

        <h2>11. Contact</h2>
        <p>
          For questions about these terms, contact the project maintainer through
          the repository listed on the App&apos;s deployment page.
        </p>
      </article>
    </div>
  );
}
