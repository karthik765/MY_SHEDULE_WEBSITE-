import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Make It Count",
  description: "Privacy Policy for Make It Count.",
};

const sectionStyle = { marginTop: 28 };
const headingStyle = { fontSize: 24, lineHeight: 1.2, margin: "0 0 8px" };

export default function PrivacyPolicyPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#fff8ed", color: "#23170f", padding: "48px 20px" }}>
      <article
        style={{
          background: "#ffffff",
          border: "1px solid #ead7c0",
          borderRadius: 16,
          boxShadow: "0 24px 80px rgba(99, 45, 12, 0.14)",
          margin: "0 auto",
          maxWidth: 860,
          padding: "40px",
        }}
      >
        <p style={{ color: "#9a4a16", fontSize: 13, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" }}>
          Make It Count
        </p>
        <h1 style={{ fontSize: 44, lineHeight: 1.05, margin: "10px 0 8px" }}>Privacy Policy</h1>
        <p style={{ color: "#6f5d4b", marginBottom: 34 }}>Last updated: September 8, 2026</p>

        <div style={{ fontSize: 16, lineHeight: 1.7 }}>
          <section>
            <h2 style={headingStyle}>Overview</h2>
            <p>
              Make It Count is a personal planning and productivity app for schedules, tasks, habits, goals,
              milestones, focus sessions, and related progress features. This Privacy Policy explains what
              information the app uses and how it is handled.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>Information we use</h2>
            <p>
              When you sign in with Google, we receive the basic account information needed to authenticate
              you, such as your email address and account identifier. We use this information to create and
              maintain your app session and associate your saved productivity data with your account.
            </p>
            <p style={{ marginTop: 12 }}>
              Information you enter into Make It Count may include schedules, tasks, habits, goals, milestones,
              focus sessions, notes, and progress records. Some preferences, such as theme and display settings,
              may be stored locally on your device.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>How information is used</h2>
            <p>
              We use information to provide sign-in, save and display your productivity data, operate app
              features, maintain security, diagnose errors, and improve the service. We do not sell personal
              information and Make It Count does not include advertising at this time.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>Sharing</h2>
            <p>
              We do not sell your personal information. Information may be processed by service providers that
              host the app, database, authentication, and infrastructure needed to operate Make It Count. These
              providers may process information only to provide those services and protect them.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>Data retention and deletion</h2>
            <p>
              We retain account and productivity information while your account is active or as needed to provide
              the service. You may request deletion of your account and associated data by contacting us. We may
              retain limited information when required for security, legal, or fraud-prevention purposes.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>Children</h2>
            <p>
              Make It Count is not directed to children under 13. We do not knowingly collect personal
              information from children under 13.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>Security</h2>
            <p>
              We use reasonable technical and organizational measures to protect information. No method of
              transmission or storage is completely secure, so absolute security cannot be guaranteed.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>Changes to this policy</h2>
            <p>
              We may update this Privacy Policy as the app changes. The updated version will be posted on this page
              with a new Last updated date.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>Contact</h2>
            <p>
              For privacy questions or a data deletion request, contact:{" "}
              <a style={{ color: "#c45116", textDecoration: "underline" }} href="mailto:karthiksaivazza1301245@gmail.com">
                karthiksaivazza1301245@gmail.com
              </a>
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
