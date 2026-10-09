// ============================================================
// THE EMPLOYABILITY EDGE: report definitions + CSV / PDF export
// Framework-free, so the same code runs in the app and in tests.
// Needs:  npm install jspdf jspdf-autotable
// ============================================================
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export type Row = Record<string, unknown>;

export interface Column { key: string; label: string; }

export interface ReportDef {
  id: string;
  title: string;
  view: string;              // Supabase view name
  blurb: string;
  columns: Column[];
  order: { col: string; asc: boolean }[];
  uniqueKey: string[];       // stable server-side order, so paging never skips rows
  sessionFilter: boolean;    // does this view have a "session" column?
}

const C = (key: string, label: string): Column => ({ key, label });

export const REPORTS: ReportDef[] = [
  {
    id: 'batch',
    title: 'Batch Progress (Day & Session)',
    view: 'rpt_batch_progress',
    uniqueKey: ['batch_id','day_no','session'],
    blurb: 'Each batch, each day: Morning, Afternoon and the Full Day roll-up.',
    sessionFilter: true,
    order: [{ col: 'batch_no', asc: true }, { col: 'day_no', asc: true }, { col: 'session', asc: true }],
    columns: [
      C('batch_no', 'Batch'), C('trainer_name', 'Trainer'), C('trainer_email', 'Trainer Email'),
      C('trainer_mobile', 'Trainer Mobile'), C('day_no', 'Day'), C('session', 'Session'),
      C('enrolled_students', 'Enrolled'), C('students_attempted', 'Attempted'),
      C('participation_pct', 'Participation %'), C('avg_score_pct', 'Avg %'),
      C('quiz_avg_pct', 'Quiz Avg %'), C('drill_avg_pct', 'Drill Avg %'),
      C('min_score_pct', 'Min %'), C('max_score_pct', 'Max %'), C('pass_rate_pct', 'Pass Rate %'),
      C('change_vs_previous', 'Change vs Prev'), C('total_xp', 'Total XP'),
      C('avg_trainer_rating', 'Trainer Rating'), C('feedback_count', 'Feedback #'),
    ],
  },
  {
    id: 'dept',
    title: 'Department-wise Day Average',
    view: 'rpt_department_day',
    uniqueKey: ['department','batch_id','day_no'],
    blurb: 'Average score of each department, each day, in each batch.',
    sessionFilter: false,
    order: [{ col: 'department', asc: true }, { col: 'batch_no', asc: true }, { col: 'day_no', asc: true }],
    columns: [
      C('department', 'Department'), C('batch_no', 'Batch'), C('trainer_name', 'Trainer'),
      C('trainer_email', 'Trainer Email'), C('day_no', 'Day'), C('students', 'Students'),
      C('avg_score_pct', 'Day Avg %'), C('morning_avg_pct', 'Morning %'),
      C('afternoon_avg_pct', 'Afternoon %'), C('quiz_avg_pct', 'Quiz %'), C('drill_avg_pct', 'Drill %'),
      C('min_score_pct', 'Min %'), C('max_score_pct', 'Max %'), C('pass_rate_pct', 'Pass Rate %'),
    ],
  },
  {
    id: 'student',
    title: 'Student-wise Day & Session',
    view: 'rpt_student_day',
    uniqueKey: ['user_id','day_no','session'],
    blurb: 'Every student, every session, with department and batch averages beside them.',
    sessionFilter: true,
    order: [{ col: 'batch_no', asc: true }, { col: 'day_no', asc: true }, { col: 'session', asc: true }, { col: 'rank_in_batch', asc: true }],
    columns: [
      C('batch_no', 'Batch'), C('trainer_name', 'Trainer'), C('day_no', 'Day'), C('session', 'Session'),
      C('rank_in_batch', 'Rank'), C('student_name', 'Student'), C('usn', 'USN'),
      C('student_email', 'Email'), C('department', 'Department'),
      C('quiz_best_pct', 'Quiz Best %'), C('drill_avg_pct', 'Drill Avg %'),
      C('drills_passed', 'Drills Passed'), C('drills_done', 'Drills Done'),
      C('overall_pct', 'Overall %'), C('department_avg_pct', 'Dept Avg %'),
      C('batch_avg_pct', 'Batch Avg %'), C('xp_earned', 'XP'),
    ],
  },
  {
    id: 'ledger',
    title: 'Full Attempt Log',
    view: 'rpt_ledger',
    uniqueKey: ['attempt_id'],
    blurb: 'Every single quiz, bootcamp and drill attempt, including retakes.',
    sessionFilter: true,
    order: [{ col: 'batch_no', asc: true }, { col: 'day_no', asc: true }, { col: 'student_name', asc: true }, { col: 'completed_at_ist', asc: true }],
    columns: [
      C('batch_no', 'Batch'), C('trainer_name', 'Trainer'), C('day_no', 'Day'), C('session', 'Session'),
      C('student_name', 'Student'), C('usn', 'USN'), C('department', 'Department'),
      C('activity_type', 'Type'), C('activity_name', 'Activity'), C('attempt_no', 'Attempt'),
      C('score', 'Score'), C('total', 'Out of'), C('percentage', '%'), C('passed', 'Passed'),
      C('badge_title', 'Badge'), C('completed_at_ist', 'Submitted (IST)'),
    ],
  },
];

// ---------- sorting: batches numerically, sessions Morning → Afternoon → Full Day ----------
const SESSION_RANK: Record<string, number> = { Morning: 1, Afternoon: 2, 'Full Day': 3 };

function cmp(a: unknown, b: unknown, col: string): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  if (col === 'session') return (SESSION_RANK[String(a)] ?? 9) - (SESSION_RANK[String(b)] ?? 9);
  const na = Number(a), nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return String(a).localeCompare(String(b));
}

export function sortRows(rows: Row[], report: ReportDef): Row[] {
  return [...rows].sort((x, y) => {
    for (const o of report.order) {
      const c = cmp(x[o.col], y[o.col], o.col);
      if (c !== 0) return o.asc ? c : -c;
    }
    return 0;
  });
}

// ---------- value formatting (shared by table, CSV and PDF) ----------
export function fmt(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(1);
  const s = String(v);
  // timestamps from the views come back as "2026-10-05T11:20:00" (already IST)
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]} ${m[4]}:${m[5]}`;
  return s;
}

// ---------- CSV ----------
export function toCSV(rows: Row[], cols: Column[]): string {
  const esc = (s: string) => (/[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const lines = [cols.map(c => esc(c.label)).join(',')];
  for (const r of rows) lines.push(cols.map(c => esc(fmt(r[c.key]))).join(','));
  return '﻿' + lines.join('\r\n');   // BOM so Excel opens it correctly
}

// ---------- PDF ----------
export interface PdfMeta {
  title: string;
  filters: string;      // e.g. "Batch 3 · Day 2 · All sessions"
  generatedBy: string;
  institute?: string;
}

export function buildPDF(rows: Row[], cols: Column[], meta: PdfMeta): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const stamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

  const header = () => {
    doc.setFillColor(31, 56, 100);
    doc.rect(0, 0, pageW, 54, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
    doc.text('THE EMPLOYABILITY EDGE', 32, 24);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    doc.text(meta.institute || 'iPEC Solutions Pvt. Ltd.', 32, 40);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
    doc.text(meta.title, pageW - 32, 24, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text(meta.filters, pageW - 32, 40, { align: 'right' });
  };

  autoTable(doc, {
    head: [cols.map(c => c.label)],
    body: rows.map(r => cols.map(c => fmt(r[c.key]))),
    startY: 66,
    margin: { top: 66, left: 24, right: 24, bottom: 36 },
    styles: { fontSize: cols.length > 15 ? 6.5 : 7.5, cellPadding: 3, overflow: 'linebreak', valign: 'middle' },
    headStyles: { fillColor: [46, 84, 150], textColor: 255, fontStyle: 'bold', halign: 'center' },
    alternateRowStyles: { fillColor: [242, 245, 250] },
    didParseCell: (h) => {
      if (h.section === 'body' && rows[h.row.index]?.session === 'Full Day') {
        h.cell.styles.fontStyle = 'bold';
        h.cell.styles.fillColor = [225, 232, 245];
      }
    },
    didDrawPage: () => {
      header();
      const pageH = doc.internal.pageSize.getHeight();
      doc.setTextColor(110, 110, 110); doc.setFontSize(8);
      doc.text(`Generated ${stamp} IST by ${meta.generatedBy}  ·  ${rows.length} rows`, 24, pageH - 16);
      doc.text(`Page ${doc.getNumberOfPages()}`, pageW - 24, pageH - 16, { align: 'right' });
    },
  });
  return doc;
}

// ---------- file name ----------
export function fileName(report: ReportDef, parts: string[], ext: 'csv' | 'pdf'): string {
  const d = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
  const tag = [report.title.replace(/[^A-Za-z]+/g, ''), ...parts.filter(Boolean)]
    .join('_').replace(/[^A-Za-z0-9_-]+/g, '');
  return `EmployabilityEdge_${tag}_${d}.${ext}`;
}
