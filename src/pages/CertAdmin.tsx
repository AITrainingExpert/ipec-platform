import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { getBatches, getBatchResults, getBatchCertificates, generateCertificate,
         getCertSettings, saveCertSettings } from '../lib/db';
import { Batch, Certificate, CertSettings, QuizResult } from '../types';

export default function CertAdmin() {
  const { user } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchId, setBatchId] = useState('batch-1');
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [settings, setSettings] = useState<CertSettings>({
    batchId, downloadEnabled: false, collegeLogoUrl: '',
    collegeSignatoryName: '', collegeSignatoryTitle: '', updatedAt: '',
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async () => {
    const [b, c, r, s] = await Promise.all([
      getBatches(), getBatchCertificates(batchId), getBatchResults(batchId), getCertSettings(batchId),
    ]);
    setBatches(b); setCerts(c); setResults(r);
    if (s) setSettings(s);
    else setSettings({ batchId, downloadEnabled: false, collegeLogoUrl: '',
      collegeSignatoryName: '', collegeSignatoryTitle: '', updatedAt: '' });
  };
  useEffect(() => { load(); }, [batchId]);

  const saveSettings = async () => {
    setBusy(true);
    await saveCertSettings({ ...settings, batchId, updatedAt: new Date().toISOString() });
    setMsg('Settings saved.'); setBusy(false);
  };

  const generateAll = async () => {
    setBusy(true); setMsg('');
    // Group results per user, compute avg
    const perUser: Record<string, { name: string; scores: number[] }> = {};
    results.forEach(r => {
      if (!perUser[r.userId]) perUser[r.userId] = { name: r.userName, scores: [] };
      perUser[r.userId].scores.push(r.percentage);
    });
    let idx = certs.length + 1;
    for (const [userId, v] of Object.entries(perUser)) {
      const existing = certs.find(c => c.userId === userId);
      if (existing) continue; // don't regenerate
      const avg = Math.round(v.scores.reduce((s, x) => s + x, 0) / v.scores.length);
      const u = results.find(r => r.userId === userId);
      await generateCertificate(
        { id: userId, name: v.name, batchId, branch: '', college: settings.collegeSignatoryName ? '' : '' },
        { usn: '', semester: '', batchName: batches.find(b => b.id === batchId)?.name || batchId, finalScore: avg, idx: idx++ }
      );
    }
    await load();
    setMsg(`Certificates generated for ${Object.keys(perUser).length} participants.`);
    setBusy(false);
  };

  const exportCsv = () => {
    const head = 'Cert No,Name,USN,Branch,Batch,Score,Badge,Issued\n';
    const rows = certs.map(c => `${c.certNumber},${c.userName},${c.usn},${c.branch},${c.batchName},${c.finalScore}%,${c.badgeLevel},${c.issuedAt}`).join('\n');
    const blob = new Blob([head + rows], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'certificates.csv'; a.click();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-slate-800">Certificate Management</h1>
        <select value={batchId} onChange={e => setBatchId(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
          {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {/* Settings panel */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <h2 className="font-bold text-slate-800">Certificate Settings</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><label className="text-xs font-bold text-slate-500">College signatory name</label>
            <input value={settings.collegeSignatoryName} onChange={e => setSettings(s => ({...s, collegeSignatoryName: e.target.value}))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1" placeholder="e.g. Dr. Rajesh Kumar" /></div>
          <div><label className="text-xs font-bold text-slate-500">College signatory title</label>
            <input value={settings.collegeSignatoryTitle} onChange={e => setSettings(s => ({...s, collegeSignatoryTitle: e.target.value}))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1" placeholder="e.g. Training & Placement Officer" /></div>
          <div>
            <label className="text-xs font-bold text-slate-500">College logo (upload or URL)</label>
            <div className="flex gap-2 mt-1">
              <input value={settings.collegeLogoUrl || ''} onChange={e => setSettings(s => ({...s, collegeLogoUrl: e.target.value}))}
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="https://college.edu/logo.png" />
              <label className="cursor-pointer bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold px-3 py-2 rounded-lg hover:bg-slate-200">
                📁 Upload
                <input type="file" accept="image/*" className="hidden" onChange={e => {
                  const file = e.target.files?.[0]; if (!file) return;
                  const reader = new FileReader();
                  reader.onload = ev => setSettings(s => ({...s, collegeLogoUrl: ev.target?.result as string}));
                  reader.readAsDataURL(file);
                }} />
              </label>
            </div>
            {settings.collegeLogoUrl && <img src={settings.collegeLogoUrl} alt="preview" className="h-12 mt-1 object-contain border border-slate-200 rounded p-1" />}
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500">College signatory signature (scanned image)</label>
            <div className="flex gap-2 mt-1">
              <label className="cursor-pointer bg-indigo-50 border border-indigo-200 text-brand text-xs font-semibold px-3 py-2 rounded-lg hover:bg-indigo-100">
                📝 Upload scanned signature
                <input type="file" accept="image/*" className="hidden" onChange={e => {
                  const file = e.target.files?.[0]; if (!file) return;
                  const reader = new FileReader();
                  reader.onload = ev => setSettings(s => ({...s, collegeSignatureUrl: ev.target?.result as string}));
                  reader.readAsDataURL(file);
                }} />
              </label>
              {settings.collegeSignatureUrl && (
                <div className="flex items-center gap-2">
                  <img src={settings.collegeSignatureUrl} alt="signature" className="h-10 object-contain border border-slate-200 rounded px-2 bg-white" />
                  <button onClick={() => setSettings(s => ({...s, collegeSignatureUrl: ''}))} className="text-xs text-red-500">remove</button>
                </div>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Upload a scanned PNG/JPG of the signature. It will appear on the certificate.</p>
          </div>
          <div className="flex flex-col justify-end">
            <label className="text-xs font-bold text-slate-500 mb-2">Download access for participants</label>
            <div className="flex items-center gap-3">
              <button onClick={() => setSettings(s => ({...s, downloadEnabled: !s.downloadEnabled}))}
                className={`px-4 py-2 rounded-lg text-sm font-bold ${settings.downloadEnabled ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {settings.downloadEnabled ? '🔓 Unlocked — participants can download' : '🔒 Locked — certificates hidden'}
              </button>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={saveSettings} disabled={busy} className="bg-brand text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50">Save settings</button>
          {msg && <span className="text-emerald-600 text-sm self-center">{msg}</span>}
        </div>
      </div>

      {/* Generate + Export */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="font-bold text-slate-800 mb-3">Generate Certificates</h2>
        <p className="text-sm text-slate-500 mb-3">{certs.length} certificate(s) generated for this batch. {results.length > 0 ? `${Object.keys(results.reduce((m, r) => ({...m, [r.userId]: 1}), {})).length} participants have results.` : 'No results yet.'}</p>
        <div className="flex gap-2">
          <button onClick={generateAll} disabled={busy || results.length === 0} className="bg-brand text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50">Generate for all participants</button>
          <button onClick={exportCsv} disabled={certs.length === 0} className="border border-slate-200 text-slate-600 text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50">Export CSV</button>
        </div>
      </div>

      {/* Certificate list */}
      {certs.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-800 text-white text-xs">
              <tr><th className="text-left px-4 py-2">Cert No</th><th className="text-left px-4 py-2">Name</th><th className="px-2">Score</th><th className="px-2">Badge</th><th className="text-left px-4 py-2">Issued</th></tr>
            </thead>
            <tbody>
              {certs.map(c => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-mono text-xs text-brand">{c.certNumber}</td>
                  <td className="px-4 py-2 font-semibold">{c.userName}</td>
                  <td className="px-2 text-center font-bold">{c.finalScore}%</td>
                  <td className="px-2 text-center text-xs">{c.badgeLevel}</td>
                  <td className="px-4 py-2 text-xs text-slate-400">{new Date(c.issuedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
