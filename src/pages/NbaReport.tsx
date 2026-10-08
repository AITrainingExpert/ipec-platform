import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { canExport } from '../lib/permissions';
import { getBatches, getBatchResults, getNbaConfig, saveNbaConfig, computeAttainment, DEFAULT_COS } from '../lib/db';
import { Batch, QuizResult, NbaConfig, CourseOutcome } from '../types';

export default function NbaReport() {
  const { user } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchId, setBatchId] = useState(user?.batchId || 'batch-1');
  const [results, setResults] = useState<QuizResult[]>([]);
  const [cfg, setCfg] = useState<NbaConfig>({
    batchId, programName: 'B.E. / B.Tech', collegeName: '',
    department: 'Computer Science & Engineering', academicYear: '2025–26',
    threshold: 60, cos: DEFAULT_COS, updatedAt: '',
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getBatches().then(setBatches); }, []);
  useEffect(() => {
    setLoading(true);
    Promise.all([getBatchResults(batchId), getNbaConfig(batchId)]).then(([r, c]) => {
      setResults(r as QuizResult[]);
      if (c) setCfg(c as NbaConfig);
      else setCfg(prev => ({ ...prev, batchId }));
      setLoading(false);
    });
  }, [batchId]);

  const attainment = computeAttainment(results, cfg.cos, cfg.threshold);
  const totalStudents = new Set(results.map(r => r.userId)).size;
  const overallAttainment = attainment.length
    ? Math.round(attainment.reduce((s, a) => s + a.attainmentPct, 0) / attainment.length) : 0;

  const saveCfg = async () => {
    await saveNbaConfig({ ...cfg, batchId, updatedAt: new Date().toISOString() });
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const updateCo = (idx: number, field: keyof CourseOutcome, val: any) => {
    setCfg(c => { const cos = [...c.cos]; cos[idx] = { ...cos[idx], [field]: val }; return { ...c, cos }; });
  };

  // Generate and download Word report
  const downloadWord = () => {
    if (!canExport(user)) return;
    const rows = attainment.map(a =>
      `<tr><td>${a.co.id}</td><td>${a.co.statement}</td><td>${a.co.poMapping}</td><td>${a.co.psoMapping || '—'}</td><td>${a.studentsAttempted}</td><td>${a.studentsAttained}</td><td>${a.attainmentPct}%</td><td>${a.attainmentPct >= 60 ? 'Attained ✓' : 'Not Attained'}</td></tr>`
    ).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  body{font-family:Calibri,Arial;font-size:11pt;color:#1e293b;margin:40px;}
  h1{color:#1a237e;font-size:16pt;border-bottom:2px solid #1a237e;padding-bottom:6px;}
  h2{color:#1a237e;font-size:13pt;margin-top:24px;}
  table{border-collapse:collapse;width:100%;font-size:10pt;margin:8px 0;}
  th{background:#1a237e;color:white;padding:8px;text-align:left;}
  td{border:1px solid #cbd5e1;padding:6px 8px;}
  tr:nth-child(even){background:#f1f5f9;}
  .attained{color:#059669;font-weight:bold;}
  .not-attained{color:#dc2626;}
  .meta{background:#f8fafc;border:1px solid #e2e8f0;padding:12px;border-radius:4px;margin:12px 0;}
  .footer{color:#64748b;font-size:9pt;margin-top:32px;border-top:1px solid #e2e8f0;padding-top:8px;}
</style></head><body>
<h1>NBA / OBE — Course Outcome Attainment Report</h1>
<p style="color:#64748b;font-size:10pt;">Employability Edge · 5-Day Soft Skills Training Programme · iPEC Solutions Pvt. Ltd.</p>

<div class="meta">
  <strong>Programme:</strong> ${cfg.programName} &nbsp;|&nbsp;
  <strong>Department:</strong> ${cfg.department} &nbsp;|&nbsp;
  <strong>College:</strong> ${cfg.collegeName || '[College to complete]'} &nbsp;|&nbsp;
  <strong>Academic Year:</strong> ${cfg.academicYear}<br/>
  <strong>Batch:</strong> ${batchId} &nbsp;|&nbsp;
  <strong>Total students assessed:</strong> ${totalStudents} &nbsp;|&nbsp;
  <strong>Attainment threshold:</strong> ${cfg.threshold}% &nbsp;|&nbsp;
  <strong>Overall attainment:</strong> <span style="color:#1a237e;font-weight:bold;">${overallAttainment}%</span>
</div>

<h2>1. Course Outcome (CO) — Programme Outcome (PO) Mapping</h2>
<table><tr>
  <th>CO</th><th>Course Outcome Statement</th><th>PO Mapped</th><th>PSO Mapped</th>
  <th>Students Attempted</th><th>Students Attained (≥${cfg.threshold}%)</th>
  <th>Attainment %</th><th>Status</th>
</tr>${rows}</table>

<h2>2. Direct Attainment Summary</h2>
<table><tr><th>CO</th><th>Target (60% of students ≥ ${cfg.threshold}%)</th><th>Actual Attainment</th><th>Gap (if any)</th></tr>
${attainment.map(a => `<tr><td>${a.co.id}</td><td>60%</td><td class="${a.attainmentPct >= 60 ? 'attained' : 'not-attained'}">${a.attainmentPct}%</td><td>${a.attainmentPct >= 60 ? '—' : (60 - a.attainmentPct) + '% gap'}</td></tr>`).join('')}
</table>

<h2>3. Placement Readiness Linkage</h2>
<p>The Employability Edge programme directly supports OBE objectives by developing measurable, 
assessable competencies aligned with industry hiring requirements. Each CO maps to NBA-prescribed 
Programme Outcomes, ensuring the training contributes to graduate attribute development beyond 
classroom instruction.</p>
<table><tr><th>OBE Objective</th><th>How Addressed</th></tr>
<tr><td>Curriculum–Industry alignment</td><td>Questions and drills designed around actual placement assessment patterns (TCS, Infosys, Wipro, etc.)</td></tr>
<tr><td>Continuous Assessment</td><td>Session-wise scores captured across 10 sessions (5 days × Morning + Afternoon) with attempt tracking</td></tr>
<tr><td>Student Progression</td><td>Day-wise performance ledger shows improvement trajectory from Day 1 to Day 5</td></tr>
<tr><td>Gap Identification</td><td>Concept-wise weak areas auto-identified and communicated to each student via personalised recommendations</td></tr>
<tr><td>Attainment Computation</td><td>Direct attainment calculated as % of students scoring ≥ ${cfg.threshold}% on CO-relevant assessments</td></tr>
</table>

<h2>4. Areas for College to Complete</h2>
<table><tr><th>Field</th><th>College Input Required</th></tr>
<tr><td>Indirect attainment (student feedback)</td><td>[College to add exit survey / course feedback data]</td></tr>
<tr><td>PSO mapping finalisation</td><td>[College to map to approved PSO list]</td></tr>
<tr><td>PO attainment aggregation</td><td>[College to add to overall PO attainment calculation]</td></tr>
<tr><td>IQAC / NBA coordinator sign-off</td><td>[College to obtain]</td></tr>
</table>

<div class="footer">
  Generated by iPEC Employability Edge Platform · www.ipecsolutions.com · +91 6366373030<br/>
  Date: ${new Date().toLocaleDateString('en-IN', {day:'numeric',month:'long',year:'numeric'})} · 
  This report is auto-generated from assessment data. College to verify and complete before submission.
</div>
</body></html>`;
    const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `NBA_OBE_Report_${batchId}_${new Date().toISOString().slice(0,10)}.doc`;
    a.click();
  };

  // Generate PDF
  const downloadPdf = () => {
    if (!canExport(user)) return;
    const w = window.open('', '_blank'); if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>NBA Report</title>
<style>
  body{font-family:Calibri,Arial;font-size:11pt;color:#1e293b;padding:30px;max-width:900px;margin:0 auto;}
  h1{color:#1a237e;font-size:16pt;border-bottom:2px solid #1a237e;padding-bottom:6px;}
  h2{color:#1a237e;font-size:13pt;margin-top:20px;}
  table{border-collapse:collapse;width:100%;font-size:10pt;margin:8px 0;}
  th{background:#1a237e;color:white;padding:7px;text-align:left;}
  td{border:1px solid #cbd5e1;padding:5px 7px;}
  tr:nth-child(even){background:#f8fafc;}
  .meta{background:#f8fafc;border:1px solid #e2e8f0;padding:10px;margin:10px 0;}
  .footer{color:#64748b;font-size:9pt;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:8px;}
  @media print{@page{size:A4;margin:15mm;}}
</style></head><body>
<h1>NBA / OBE — Course Outcome Attainment Report</h1>
<p style="color:#64748b;font-size:10pt;">Employability Edge · iPEC Solutions Pvt. Ltd.</p>
<div class="meta">
  <strong>Programme:</strong> ${cfg.programName} · <strong>Department:</strong> ${cfg.department} ·
  <strong>College:</strong> ${cfg.collegeName || '[College Name]'} · <strong>Year:</strong> ${cfg.academicYear}<br/>
  <strong>Students assessed:</strong> ${totalStudents} · <strong>Threshold:</strong> ${cfg.threshold}% · 
  <strong>Overall attainment:</strong> <strong style="color:#1a237e;">${overallAttainment}%</strong>
</div>
<h2>CO–PO Attainment Table</h2>
<table><tr><th>CO</th><th>Statement</th><th>PO</th><th>Attempted</th><th>Attained</th><th>Attainment%</th><th>Status</th></tr>
${attainment.map(a => `<tr><td><strong>${a.co.id}</strong></td><td>${a.co.statement}</td><td>${a.co.poMapping}</td><td>${a.studentsAttempted}</td><td>${a.studentsAttained}</td><td><strong>${a.attainmentPct}%</strong></td><td style="color:${a.attainmentPct>=60?'#059669':'#dc2626'};font-weight:bold;">${a.attainmentPct>=60?'Attained':'Gap'}</td></tr>`).join('')}
</table>
<div class="footer">iPEC Solutions Pvt. Ltd. · www.ipecsolutions.com · +91 6366373030 · Generated: ${new Date().toLocaleDateString('en-IN')}</div>
<script>window.onload=()=>{window.print();}</script>
</body></html>`);
    w.document.close();
  };

  if (loading) return <div className="text-center py-16 text-slate-400">⏳ Loading NBA report data...</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800">NBA / OBE Report</h1>
          <p className="text-sm text-slate-500">CO-PO attainment · configurable per college · auto-generated from assessment data</p>
        </div>
        <div className="flex gap-2">
          <select value={batchId} onChange={e => setBatchId(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
            {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          {canExport(user) && <button onClick={downloadWord} className="bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg">⬇ Word (.doc)</button>}
          {canExport(user) && <button onClick={downloadPdf} className="bg-brand text-white text-sm font-semibold px-4 py-2 rounded-lg">⬇ PDF</button>}
        </div>
      </div>

      {/* College config */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="font-bold text-slate-800 mb-3">Programme Details (configurable per college)</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { label: 'College Name', key: 'collegeName' },
            { label: 'Programme', key: 'programName' },
            { label: 'Department', key: 'department' },
            { label: 'Academic Year', key: 'academicYear' },
          ].map(({ label, key }) => (
            <div key={key}>
              <label className="text-xs font-bold text-slate-500">{label}</label>
              <input value={(cfg as any)[key]} onChange={e => setCfg(c => ({ ...c, [key]: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1" />
            </div>
          ))}
          <div>
            <label className="text-xs font-bold text-slate-500">Attainment Threshold (%)</label>
            <input type="number" value={cfg.threshold} min={50} max={80}
              onChange={e => setCfg(c => ({ ...c, threshold: Number(e.target.value) }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1" />
          </div>
        </div>
        <button onClick={saveCfg} className="mt-3 bg-brand text-white text-sm font-semibold px-4 py-2 rounded-lg">
          {saved ? '✓ Saved' : 'Save configuration'}
        </button>
      </div>

      {/* Attainment summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPI label="Students assessed" value={totalStudents} />
        <KPI label="COs defined" value={cfg.cos.length} />
        <KPI label="Overall attainment" value={overallAttainment + '%'} good={overallAttainment >= 60} />
        <KPI label="Threshold" value={cfg.threshold + '%'} />
      </div>

      {/* CO-PO Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-800">
          <h2 className="font-bold text-white">CO–PO Attainment Table</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="text-left px-3 py-2 w-12">CO</th>
                <th className="text-left px-3 py-2">Statement</th>
                <th className="px-2 text-center">PO</th>
                <th className="px-2 text-center">Attempted</th>
                <th className="px-2 text-center">Attained</th>
                <th className="px-2 text-center">Attainment%</th>
                <th className="px-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {attainment.map((a, i) => (
                <tr key={a.co.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-bold text-brand">{a.co.id}</td>
                  <td className="px-3 py-2 text-slate-700 text-xs">{a.co.statement}</td>
                  <td className="px-2 py-2 text-center font-semibold text-xs">{a.co.poMapping}</td>
                  <td className="px-2 py-2 text-center">{a.studentsAttempted}</td>
                  <td className="px-2 py-2 text-center">{a.studentsAttained}</td>
                  <td className="px-2 py-2 text-center font-bold text-brand">{a.attainmentPct}%</td>
                  <td className="px-2 py-2 text-center">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${a.attainmentPct >= 60 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {a.attainmentPct >= 60 ? '✓ Attained' : 'Gap'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Editable CO list */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="font-bold text-slate-800 mb-3">Edit Course Outcomes & PO Mapping</h2>
        <div className="space-y-3">
          {cfg.cos.map((co, i) => (
            <div key={co.id} className="grid sm:grid-cols-4 gap-2 p-3 bg-slate-50 rounded-lg">
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-400">{co.id} — Statement</label>
                <input value={co.statement} onChange={e => updateCo(i, 'statement', e.target.value)}
                  className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs mt-0.5" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400">PO Mapping</label>
                <input value={co.poMapping} onChange={e => updateCo(i, 'poMapping', e.target.value)}
                  className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs mt-0.5" placeholder="e.g. PO10" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400">PSO Mapping (optional)</label>
                <input value={co.psoMapping || ''} onChange={e => updateCo(i, 'psoMapping', e.target.value)}
                  className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs mt-0.5" placeholder="e.g. PSO2" />
              </div>
            </div>
          ))}
        </div>
        <button onClick={saveCfg} className="mt-3 bg-brand text-white text-sm font-semibold px-4 py-2 rounded-lg">
          {saved ? '✓ Saved' : 'Save CO configuration'}
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <strong>📋 For colleges:</strong> Download the Word document to complete the indirect attainment,
        PSO finalisation, and IQAC sign-off sections. The PDF version is ready for direct submission.
        This report auto-updates every time you open it — always reflects the latest assessment data.
      </div>
    </div>
  );
}

function KPI({ label, value, good }: { label: string; value: any; good?: boolean }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className={`text-2xl font-extrabold ${good ? 'text-emerald-600' : 'text-slate-800'}`}>{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
