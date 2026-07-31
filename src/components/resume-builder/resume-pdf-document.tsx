import path from "node:path";
import type { ReactElement, ReactNode } from "react";
import {
  Document,
  Font,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
  type DocumentProps,
} from "@react-pdf/renderer";

import type {
  ResumeDocument,
  ResumeLanguage,
} from "@/src/lib/resume-builder/schema";

Font.register({
  family: "Roboto",
  fonts: [
    {
      src: path.join(
        process.cwd(),
        "node_modules",
        "@fontsource",
        "roboto",
        "files",
        "roboto-latin-ext-400-normal.woff",
      ),
      fontWeight: 400,
    },
    {
      src: path.join(
        process.cwd(),
        "node_modules",
        "@fontsource",
        "roboto",
        "files",
        "roboto-latin-ext-700-normal.woff",
      ),
      fontWeight: 700,
    },
  ],
});

Font.registerHyphenationCallback((word) => [word]);

const labels: Record<
  ResumeLanguage,
  Record<
    | "summary"
    | "experience"
    | "education"
    | "skills"
    | "projects"
    | "certifications"
    | "present",
    string
  >
> = {
  en: {
    summary: "PROFESSIONAL SUMMARY",
    experience: "EXPERIENCE",
    education: "EDUCATION",
    skills: "SKILLS",
    projects: "PROJECTS",
    certifications: "CERTIFICATIONS",
    present: "Present",
  },
  tr: {
    summary: "PROFESYONEL ÖZET",
    experience: "DENEYİM",
    education: "EĞİTİM",
    skills: "YETKİNLİKLER",
    projects: "PROJELER",
    certifications: "SERTİFİKALAR",
    present: "Devam Ediyor",
  },
};

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 46,
    paddingVertical: 42,
    fontFamily: "Roboto",
    fontSize: 10.25,
    lineHeight: 1.34,
    color: "#1e293b",
  },
  header: { alignItems: "center", marginBottom: 2 },
  name: {
    color: "#0f172a",
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: 0.5,
  },
  headline: { marginTop: 3, fontSize: 11.5, fontWeight: 700 },
  contact: {
    marginTop: 4,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 5,
    color: "#475569",
    fontSize: 9.25,
  },
  contactLink: { color: "#334155", textDecoration: "none" },
  section: { marginTop: 11.5 },
  sectionTitle: {
    borderBottomColor: "#334155",
    borderBottomWidth: 0.8,
    paddingBottom: 2.5,
    color: "#0f172a",
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: 1.05,
  },
  sectionBody: { marginTop: 5 },
  entry: { marginBottom: 7 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  grow: { flexGrow: 1, flexShrink: 1 },
  entryTitle: { color: "#0f172a", fontWeight: 700 },
  date: { flexShrink: 0, color: "#475569", fontSize: 9.25 },
  bulletRow: { flexDirection: "row", marginTop: 1.5, paddingLeft: 3 },
  bullet: { width: 10 },
  bulletText: { flex: 1 },
  smallGap: { marginTop: 2 },
});

function href(value: string): string {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section} minPresenceAhead={36}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

export function ResumePdfDocument({
  draft,
}: {
  draft: ResumeDocument;
}): ReactElement<DocumentProps> {
  const copy = labels[draft.language];
  const contact = [
    draft.contact.email,
    draft.contact.phone,
    draft.contact.location,
  ].filter(Boolean);
  const links = [draft.contact.linkedin, draft.contact.website].filter(Boolean);

  return (
    <Document
      title={draft.title}
      author={draft.contact.fullName || "CareerPilot user"}
      subject="Resume"
      creator="CareerPilot"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.name}>{draft.contact.fullName || "Your Name"}</Text>
          {draft.contact.headline ? (
            <Text style={styles.headline}>{draft.contact.headline}</Text>
          ) : null}
          {contact.length ? (
            <View style={styles.contact}>
              {contact.map((item, index) => (
                <Text key={item}>{index ? `| ${item}` : item}</Text>
              ))}
            </View>
          ) : null}
          {links.length ? (
            <View style={styles.contact}>
              {links.map((item) => (
                <Link key={item} src={href(item)} style={styles.contactLink}>
                  {item.replace(/^https?:\/\//i, "")}
                </Link>
              ))}
            </View>
          ) : null}
        </View>

        {draft.summary ? (
          <Section title={copy.summary}>
            <Text>{draft.summary}</Text>
          </Section>
        ) : null}

        {draft.experience.length ? (
          <Section title={copy.experience}>
            {draft.experience.map((item) => (
              <View key={item.id} style={styles.entry} minPresenceAhead={36}>
                <View style={styles.row}>
                  <View style={styles.grow}>
                    <Text style={styles.entryTitle}>{item.role || "Role"}</Text>
                    <Text>
                      {[item.company, item.location].filter(Boolean).join(" | ") ||
                        "Company"}
                    </Text>
                  </View>
                  <Text style={styles.date}>
                    {[item.startDate, item.current ? copy.present : item.endDate]
                      .filter(Boolean)
                      .join(" – ")}
                  </Text>
                </View>
                {item.bullets.filter(Boolean).map((bullet, index) => (
                  <View key={`${item.id}-${index}`} style={styles.bulletRow}>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={styles.bulletText}>{bullet}</Text>
                  </View>
                ))}
              </View>
            ))}
          </Section>
        ) : null}

        {draft.education.length ? (
          <Section title={copy.education}>
            {draft.education.map((item) => (
              <View key={item.id} style={styles.entry} wrap={false}>
                <View style={styles.row}>
                  <View style={styles.grow}>
                    <Text style={styles.entryTitle}>{item.degree || "Degree"}</Text>
                    <Text>
                      {[item.school, item.location].filter(Boolean).join(" | ")}
                    </Text>
                  </View>
                  <Text style={styles.date}>
                    {[item.startDate, item.endDate].filter(Boolean).join(" – ")}
                  </Text>
                </View>
                {item.details ? <Text style={styles.smallGap}>{item.details}</Text> : null}
              </View>
            ))}
          </Section>
        ) : null}

        {draft.skills.filter(Boolean).length ? (
          <Section title={copy.skills}>
            <Text>{draft.skills.filter(Boolean).join(", ")}</Text>
          </Section>
        ) : null}

        {draft.projects.length ? (
          <Section title={copy.projects}>
            {draft.projects.map((item) => (
              <View key={item.id} style={styles.entry} wrap={false}>
                <Text style={styles.entryTitle}>{item.name || "Project"}</Text>
                {item.link ? (
                  <Link src={href(item.link)} style={styles.contactLink}>
                    {item.link.replace(/^https?:\/\//i, "")}
                  </Link>
                ) : null}
                {item.description ? (
                  <Text style={styles.smallGap}>{item.description}</Text>
                ) : null}
              </View>
            ))}
          </Section>
        ) : null}

        {draft.certifications.length ? (
          <Section title={copy.certifications}>
            {draft.certifications.map((item) => (
              <View key={item.id} style={styles.row} wrap={false}>
                <Text style={styles.grow}>
                  <Text style={styles.entryTitle}>{item.name || "Certification"}</Text>
                  {item.issuer ? ` | ${item.issuer}` : ""}
                </Text>
                <Text style={styles.date}>{item.date}</Text>
              </View>
            ))}
          </Section>
        ) : null}
      </Page>
    </Document>
  );
}
