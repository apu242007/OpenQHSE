// @ts-nocheck
// @react-pdf/renderer v3.x ships types written for React ≤18.
// The file is ONLY ever dynamically imported inside browser click handlers,
// so TS errors here are purely cosmetic and have no runtime impact.
/**
 * @react-pdf/renderer document for inspection reports.
 * ⚠️  This file is ONLY ever dynamically imported (never SSR'd).
 *     Never import it at the top level of a Next.js page/layout.
 */

import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import type { TemplateSection } from '@/types/inspections';

// ── Types ──────────────────────────────────────────────────

export type PDFResponses = Record<string, string | number | undefined>;

export interface InspectionPDFProps {
  title: string;
  inspector: string;
  site: string;
  date: Date;
  sections: TemplateSection[];
  responses: PDFResponses;
  score: number;
  maxScore: number;
}

// ── Design tokens ──────────────────────────────────────────

const BRAND  = '#0066FF';
const SAFE   = '#00C78C';
const WARN   = '#FFAA00';
const DANGER = '#FF4444';
const MUTED  = '#718096';

// ── Styles ─────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1a202c',
    paddingHorizontal: 40,
    paddingTop: 44,
    paddingBottom: 52,
    backgroundColor: '#ffffff',
  },
  brand: {
    fontSize: 7,
    color: BRAND,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
    marginBottom: 4,
  },
  title: {
    fontSize: 17,
    fontFamily: 'Helvetica-Bold',
    color: '#1a202c',
    marginBottom: 4,
  },
  meta: { fontSize: 7.5, color: MUTED },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    marginVertical: 12,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    padding: 12,
    marginBottom: 14,
  },
  scorePct:    { fontSize: 28, fontFamily: 'Helvetica-Bold' },
  scorePoints: { fontSize: 8,  color: MUTED, marginTop: 2  },
  scoreVerdict:{ fontSize: 11, fontFamily: 'Helvetica-Bold' },
  section:      { marginBottom: 14 },
  sectionBand: {
    backgroundColor: '#eff6ff',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 4,
  },
  sectionTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: BRAND },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  qText:  { flex: 1, color: '#374151' },
  answer: { fontFamily: 'Helvetica-Bold', width: 80, textAlign: 'right' },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    color: '#a0aec0',
  },
});

// ── Helpers ────────────────────────────────────────────────

function scoreColor(pct: number) {
  if (pct >= 80) return SAFE;
  if (pct >= 60) return WARN;
  return DANGER;
}

function verdict(pct: number) {
  if (pct >= 80) return 'CONFORME';
  if (pct >= 60) return 'ATENCIÓN REQUERIDA';
  return 'NO CONFORME';
}

// ── PDF Document ───────────────────────────────────────────

export function InspectionPDFDocument({
  title,
  inspector,
  site,
  date,
  sections,
  responses,
  score,
  maxScore,
}: InspectionPDFProps) {
  const pct      = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const color    = scoreColor(pct);
  const dateStr  = date.toLocaleDateString('es', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  return (
    <Document title={title} author="OpenQHSE">
      <Page size="A4" style={s.page}>

        {/* ── Header ─────────────────────────────────────── */}
        <Text style={s.brand}>OPENQHSE · REPORTE DE INSPECCIÓN</Text>
        <Text style={s.title}>{title}</Text>
        <Text style={s.meta}>
          Fecha: {dateStr}   ·   Inspector: {inspector || '—'}   ·   Sitio: {site || '—'}
        </Text>

        <View style={s.divider} />

        {/* ── Score ──────────────────────────────────────── */}
        <View style={s.scoreRow}>
          <View>
            <Text style={[s.scorePct, { color }]}>{pct}%</Text>
            <Text style={s.scorePoints}>{score} / {maxScore} pts</Text>
          </View>
          <Text style={[s.scoreVerdict, { color }]}>{verdict(pct)}</Text>
        </View>

        <View style={s.divider} />

        {/* ── Sections ───────────────────────────────────── */}
        {sections.map((sec) => (
          <View key={sec.id} style={s.section} wrap={false}>
            <View style={s.sectionBand}>
              <Text style={s.sectionTitle}>{sec.title}</Text>
            </View>

            {sec.questions.map((q) => {
              const raw = responses[q.id];
              let label  = '—';
              let aColor = MUTED;

              if (q.question_type === 'yes_no') {
                if (raw === 'yes')      { label = '✓ Sí'; aColor = SAFE;   }
                else if (raw === 'no') { label = '✗ No'; aColor = DANGER; }
              } else if (raw !== undefined && raw !== '') {
                label  = String(raw);
                aColor = '#1a202c';
              }

              return (
                <View key={q.id} style={s.row}>
                  <Text style={s.qText}>{q.text}</Text>
                  <Text style={[s.answer, { color: aColor }]}>{label}</Text>
                </View>
              );
            })}
          </View>
        ))}

        {/* ── Footer ─────────────────────────────────────── */}
        <View style={s.footer} fixed>
          <Text>OpenQHSE — github.com/apu242007/OpenQHSE</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Pág. ${pageNumber} / ${totalPages}`
            }
          />
        </View>

      </Page>
    </Document>
  );
}
