import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../lib/auth';
import { getMyCertificate, getCertSettings, getMyResults, getMyDrills, generateCertificate } from '../lib/db';
import { analyzeSkillGap, comprehensiveScore, evaluateBadges, sessionQuizAvg } from '../lib/logic';
import { Certificate, CertSettings, QuizResult, DrillResult } from '../types';
import { IPEC_LOGO, COLLEGE_LOGO_DEFAULT, QR_CODE } from '../lib/logos';

const BADGE_CONFIG: Record<string, { color: string; emoji: string; label: string }> = {
  'Platinum Edge': { color: '#6d28d9', emoji: '💎', label: 'Platinum Edge' },
  'Gold Edge':     { color: '#b45309', emoji: '🏆', label: 'Gold Edge' },
  'Silver Edge':   { color: '#047857', emoji: '🥈', label: 'Silver Edge' },
  'Bronze Edge':   { color: '#1d4ed8', emoji: '🎖', label: 'Bronze Edge' },
};

function badgeFromScore(s: number) {
  return s >= 85 ? 'Platinum Edge' : s >= 70 ? 'Gold Edge' : s >= 55 ? 'Silver Edge' : 'Bronze Edge';
}
function trackFromYear(year: string) {
  const y = (year || '').toLowerCase();
  return y.includes('1') || y.includes('2') ? 'Junior Champion' : 'Senior Champion';
}

export default function CertificatePage() {
  const { user } = useAuth();
  const [cert, setCert] = useState<Certificate | null>(null);
  const [settings, setSettings] = useState<CertSettings | null>(null);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [drills, setDrills] = useState<DrillResult[]>([]);
  const [usn, setUsn] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const certRef = useRef<HTMLDivElement>(null);

  const loadAll = async () => {
    if (!user) return;
    const [c, s, r, d] = await Promise.all([
      getMyCertificate(user.id, user.batchId),
      getCertSettings(user.batchId || 'batch-1'),
      getMyResults(user.id),
      getMyDrills(user.id),
    ]);
    setCert(c as any); setSettings(s as any);
    setResults(r as any); setDrills(d as any);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, [user]);

  const quizSessAvg = sessionQuizAvg(results);
  const passedDrills = drills.filter(d => d.passed);
  const drillAvg = passedDrills.length ? Math.round(passedDrills.reduce((s, d) => s + d.percentage, 0) / passedDrills.length) : 0;
  const badges = evaluateBadges(results);
  const finalScore = comprehensiveScore(quizSessAvg, drillAvg, passedDrills.length, badges.length);

  const refreshSettings = async () => {
    setRefreshing(true);
    const s = await getCertSettings(user?.batchId || 'batch-1');
    setSettings(s as any);
    setRefreshing(false);
  };

  const generate = async () => {
    if (!usn.trim()) return;
    if (!user) return;
    setGenerating(true);
    const c = await generateCertificate(
      { id: user.id, name: user.name, batchId: user.batchId || '', branch: user.branch, college: user.college },
      { usn: usn.trim(), semester: user.year || '3rd', batchName: 'Employability Edge 2026', finalScore, idx: Math.floor(Math.random() * 9000) + 1000 }
    );
    setCert(c as any); setGenerating(false);
  };

  const download = () => {
    if (!certRef.current) return;
    const html = certRef.current.outerHTML;
    const w = window.open('', '_blank'); if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Certificate — ${user?.name}</title>
<style>*{margin:0;padding:0;box-sizing:border-box;}body{background:#c8b48a;display:flex;justify-content:center;padding:16px;}
@media print{body{background:white;padding:0;}@page{size:A4 landscape;margin:0;}}</style></head>
<body>${html}<script>setTimeout(()=>{window.print();},800);</script></body></html>`);
    w.document.close();
  };

  if (loading) return <div className="text-center py-16 text-slate-400">Loading your certificate...</div>;

  if (results.length === 0 && !cert) return (
    <div className="max-w-lg mx-auto bg-white border border-slate-200 rounded-2xl p-10 text-center mt-10">
      <div className="text-5xl mb-4">📝</div>
      <h1 className="text-xl font-extrabold text-slate-800">Complete your quizzes first</h1>
      <p className="text-slate-500 text-sm mt-2">Take your Morning and Afternoon quizzes — your certificate will be ready here when done.</p>
    </div>
  );

  if (!cert) return (
    <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-2xl p-8 space-y-4 mt-6">
      <div className="text-center"><div className="text-4xl mb-2">🎓</div>
        <h1 className="text-xl font-extrabold text-slate-800">Generate Your Certificate</h1>
        <p className="text-sm text-slate-500 mt-1">Enter your USN to generate.</p></div>
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-center">
        <div className="text-3xl font-extrabold text-brand">{finalScore}%</div>
        <div className="text-xs text-slate-500 mt-1">Consolidated score · {badgeFromScore(finalScore)}</div>
      </div>
      <div><label className="text-xs font-bold text-slate-500">USN / Registration Number</label>
        <input value={usn} onChange={e => setUsn(e.target.value)}
          className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm mt-1" placeholder="e.g. 1CR21CS042" /></div>
      <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500 space-y-0.5">
        <p><span className="font-semibold">Name:</span> {user?.name}</p>
        <p><span className="font-semibold">Branch:</span> {user?.branch || '—'}</p>
        <p><span className="font-semibold">Year:</span> {user?.year || '—'}</p>
        <p><span className="font-semibold">College:</span> {user?.college || '—'}</p>
      </div>
      <button onClick={generate} disabled={generating || !usn.trim()}
        className="w-full bg-brand text-white font-bold py-2.5 rounded-lg disabled:opacity-50">
        {generating ? 'Generating...' : 'Generate Certificate'}</button>
    </div>
  );

  return <CertView cert={cert} settings={settings} userYear={user?.year || ''} onRefresh={refreshSettings} refreshing={refreshing} onDownload={download} certRef={certRef} />;
}

function CertView({ cert, settings, userYear, onRefresh, refreshing, onDownload, certRef }: any) {
  const badge = BADGE_CONFIG[cert.badgeLevel] || BADGE_CONFIG['Bronze Edge'];
  const track = trackFromYear(userYear || cert.semester || '3rd');
  const issued = new Date(cert.issuedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const collegeLogo = settings?.collegeLogoUrl || cert.collegeLogoUrl || COLLEGE_LOGO_DEFAULT;
  const collegeSignature = settings?.collegeSignatureUrl || null;
  const downloadEnabled = settings?.downloadEnabled ?? false;

  // ── Design tokens ──────────────────────────────
  const NAVY = '#0a1628';
  const NAVY2 = '#112040';
  const GOLD = '#c9961a';
  const GOLD2 = '#e8b830';
  const CREAM = '#fdf8ed';
  const W = 1060, H = 740;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-extrabold text-slate-800">Your Certificate 🎓</h1>
        <div className="flex items-center gap-2">
          {downloadEnabled
            ? <button onClick={onDownload} className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg shadow">⬇ Download / Print PDF</button>
            : <>
                <span className="text-amber-700 bg-amber-50 border border-amber-200 text-sm px-4 py-2 rounded-lg">🔒 Download locked by admin</span>
                <button onClick={onRefresh} disabled={refreshing} className="text-xs font-semibold text-brand border border-indigo-200 px-3 py-2 rounded-lg hover:bg-indigo-50">
                  {refreshing ? '⏳' : '🔄 Check unlock'}</button>
              </>}
        </div>
      </div>
      {!downloadEnabled && <div className="bg-blue-50 border border-blue-100 text-blue-700 text-sm rounded-lg p-3">ℹ Your certificate is ready — preview below. Admin will unlock download after Day 5.</div>}

      {/* ═══════════════ CERTIFICATE ═══════════════ */}
      <div style={{ overflowX: 'auto' }}>
      <div ref={certRef} style={{ width:`${W}px`, height:`${H}px`, background:CREAM, position:'relative', overflow:'hidden', fontFamily:"'Georgia','Times New Roman',serif", boxShadow:'0 30px 80px rgba(0,0,0,0.25)' }}>

        {/* ── Ornate outer border ── */}
        <div style={{ position:'absolute', inset:'8px', border:`4px double ${GOLD}`, pointerEvents:'none', zIndex:30 }} />
        <div style={{ position:'absolute', inset:'16px', border:`1px solid ${GOLD2}`, pointerEvents:'none', zIndex:30 }} />

        {/* ── Corner flourishes ── */}
        {[{t:'0',l:'0'},{t:'0',r:'0'},{b:'0',l:'0'},{b:'0',r:'0'}].map((p,i) => (
          <div key={i} style={{ position:'absolute', ...p as any, width:'56px', height:'56px', zIndex:31 }}>
            <svg viewBox="0 0 56 56" style={{ width:'100%', height:'100%' }}>
              <path d={i===0?"M0,0 L40,0 L0,40 Z":i===1?"M56,0 L16,0 L56,40 Z":i===2?"M0,56 L40,56 L0,16 Z":"M56,56 L16,56 L56,16 Z"} fill={GOLD} opacity="0.8"/>
              <circle cx={i===0||i===2?14:42} cy={i===0||i===1?14:42} r="6" fill={GOLD2}/>
              <circle cx={i===0||i===2?14:42} cy={i===0||i===1?14:42} r="3" fill="white"/>
            </svg>
          </div>
        ))}

        {/* ── Top decorative band ── */}
        <div style={{ position:'absolute', top:'20px', left:'20px', right:'20px', height:'90px', background:`linear-gradient(135deg,${NAVY} 0%,${NAVY2} 60%,${NAVY} 100%)`, zIndex:5 }}>
          {/* Gold top stripe */}
          <div style={{ height:'4px', background:`linear-gradient(90deg,transparent,${GOLD},${GOLD2},${GOLD},transparent)` }} />
          {/* Gold bottom stripe */}
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'4px', background:`linear-gradient(90deg,transparent,${GOLD},${GOLD2},${GOLD},transparent)` }} />

          {/* Header content */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 24px', height:'82px' }}>
            {/* College logo */}
            <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
              <img src={collegeLogo} alt="College" style={{ height:'60px', maxWidth:'90px', objectFit:'contain', background:'white', borderRadius:'6px', padding:'4px', boxShadow:'0 2px 8px rgba(0,0,0,0.3)' }} />
            </div>
            {/* Centre title */}
            <div style={{ textAlign:'center', flex:1 }}>
              <div style={{ color:GOLD2, fontSize:'10px', letterSpacing:'6px', textTransform:'uppercase', marginBottom:'4px' }}>Certificate of Achievement</div>
              <div style={{ color:'white', fontSize:'22px', fontWeight:700, letterSpacing:'2px', fontFamily:"'Georgia',serif" }}>Employability Edge</div>
              <div style={{ color:'rgba(200,180,120,0.8)', fontSize:'10px', letterSpacing:'3px', textTransform:'uppercase', marginTop:'2px' }}>5-Day Soft Skills Training Programme</div>
            </div>
            {/* iPEC logo */}
            <div style={{ display:'flex', alignItems:'center' }}>
              <img src={IPEC_LOGO} alt="iPEC" style={{ height:'60px', objectFit:'contain' }} />
            </div>
          </div>
        </div>

        {/* ── Main body ── */}
        <div style={{ position:'absolute', top:'120px', left:'20px', right:'20px', bottom:'20px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'space-between', padding:'14px 40px 16px', zIndex:5 }}>

          {/* Track pill */}
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <div style={{ height:'1px', width:'60px', background:`linear-gradient(90deg,transparent,${GOLD})` }} />
            <div style={{ background:`linear-gradient(135deg,${NAVY},${NAVY2})`, border:`1px solid ${GOLD}`, borderRadius:'20px', padding:'4px 20px', color:GOLD2, fontSize:'12px', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase' }}>{track}</div>
            <div style={{ height:'1px', width:'60px', background:`linear-gradient(90deg,${GOLD},transparent)` }} />
          </div>

          {/* Certify text */}
          <div style={{ textAlign:'center' }}>
            <div style={{ color:'#8a7040', fontSize:'13px', letterSpacing:'3px', textTransform:'uppercase', marginBottom:'6px' }}>This is to certify that</div>

            {/* NAME — large, centred */}
            <div style={{ fontSize:'44px', fontWeight:700, color:NAVY, letterSpacing:'3px', textAlign:'center', borderBottom:`2px solid ${GOLD}`, paddingBottom:'6px', marginBottom:'8px', textTransform:'uppercase' }}>
              {cert.userName}
            </div>

            {/* Details row — centred */}
            <div style={{ textAlign:'center', fontSize:'13px', color:'#4a3010', lineHeight:'1.9' }}>
              <span><strong style={{ color:GOLD }}>USN:</strong> {cert.usn || '—'}</span>
              <span style={{ margin:'0 14px', color:GOLD }}>|</span>
              <span><strong style={{ color:GOLD }}>Branch:</strong> {cert.branch || '—'}</span>
              <span style={{ margin:'0 14px', color:GOLD }}>|</span>
              <span><strong style={{ color:GOLD }}>Year:</strong> {cert.semester || '—'}</span>
              <span style={{ margin:'0 14px', color:GOLD }}>|</span>
              <span><strong style={{ color:GOLD }}>College:</strong> {cert.college || '—'}</span>
            </div>

            {/* Body text — centred */}
            <div style={{ textAlign:'center', fontSize:'13.5px', color:'#3a2a0a', lineHeight:'1.9', marginTop:'6px' }}>
              has successfully completed the <strong>Employability Edge 5-Day Soft Skills Training</strong><br/>
              conducted at <strong>{cert.college || 'the partner institution'}</strong> &nbsp;|&nbsp; organised by <strong>iPEC Solutions Pvt. Ltd.</strong>
            </div>
          </div>

          {/* Score + Badge row */}
          <div style={{ display:'flex', alignItems:'center', gap:'24px', background:`linear-gradient(135deg,${NAVY}f0,${NAVY2}f0)`, border:`1px solid ${GOLD}`, borderRadius:'10px', padding:'10px 28px' }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:'42px', fontWeight:800, color:GOLD2, lineHeight:1, fontFamily:"'Georgia',serif" }}>{cert.finalScore}%</div>
              <div style={{ fontSize:'9px', color:'rgba(200,180,120,0.8)', letterSpacing:'2px', textTransform:'uppercase', marginTop:'2px' }}>Consolidated Score</div>
            </div>
            <div style={{ width:'1px', height:'48px', background:GOLD, opacity:0.4 }} />
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:'26px' }}>{badge.emoji}</div>
              <div style={{ fontSize:'13px', fontWeight:700, color:GOLD2 }}>{badge.label}</div>
            </div>
            <div style={{ width:'1px', height:'48px', background:GOLD, opacity:0.4 }} />
            <div style={{ textAlign:'center', fontSize:'11px', color:'rgba(200,180,120,0.7)' }}>
              <div>📅 {issued}</div>
              <div style={{ marginTop:'4px' }}>📋 {cert.certNumber}</div>
              <div style={{ marginTop:'4px' }}>⏱ {cert.trainingDuration}</div>
            </div>
          </div>

          {/* Gold divider */}
          <div style={{ width:'100%', height:'1px', background:`linear-gradient(90deg,transparent,${GOLD},${GOLD2},${GOLD},transparent)` }} />

          {/* Signatures row */}
          <div style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'flex-end', padding:'0 10px' }}>
            {/* College signatory LEFT */}
            <div style={{ textAlign:'center', width:'220px' }}>
              {/* Signature image if available */}
              {collegeSignature
                ? <img src={collegeSignature} alt="signature" style={{ height:'36px', objectFit:'contain', marginBottom:'4px' }} />
                : <div style={{ height:'1px', background:GOLD, width:'160px', margin:'0 auto 6px' }} />}
              <div style={{ borderTop:`1px solid ${GOLD}`, paddingTop:'4px' }}>
                <div style={{ fontSize:'12px', fontStyle:'italic', color:NAVY, fontWeight:600 }}>Authorised Signatory</div>
                <div style={{ fontSize:'11px', color:'#6b5530', marginTop:'2px' }}>{cert.college || 'Partner Institution'}</div>
              </div>
            </div>

            {/* QR code CENTRE */}
            <div style={{ textAlign:'center' }}>
              <img src={QR_CODE} alt="QR" style={{ width:'68px', height:'68px', objectFit:'contain', border:`2px solid ${GOLD}`, borderRadius:'6px', padding:'3px', background:'white' }} />
              <div style={{ fontSize:'8px', color:'#8a7040', marginTop:'3px', fontFamily:'monospace', fontWeight:700 }}>{cert.certNumber}</div>
            </div>

            {/* iPEC signatory RIGHT */}
            <div style={{ textAlign:'center', width:'220px' }}>
              <div style={{ height:'1px', background:GOLD, width:'160px', margin:'0 auto 6px' }} />
              <div style={{ borderTop:`1px solid ${GOLD}`, paddingTop:'4px' }}>
                <div style={{ fontSize:'13px', fontStyle:'italic', color:NAVY, fontWeight:700 }}>Sivanandan.V</div>
                <div style={{ fontSize:'11px', fontWeight:700, color:NAVY, marginTop:'2px' }}>Managing Director</div>
                <div style={{ fontSize:'11px', color:'#6b5530', marginTop:'1px' }}>iPEC Solutions Pvt. Ltd.</div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:`1px solid rgba(200,160,26,0.2)`, paddingTop:'6px' }}>
            <div style={{ fontSize:'9px', color:'#9a8060', fontFamily:"'Georgia',serif" }}>
              <strong style={{ color:NAVY }}>iPEC Solutions Pvt. Ltd.</strong> &nbsp;·&nbsp; www.ipecsolutions.com &nbsp;·&nbsp; +91 6366373030
            </div>
            <div style={{ fontSize:'9px', color:'#9a8060', fontFamily:'monospace' }}>Digitally Generated · {cert.certNumber}</div>
          </div>
        </div>

        {/* ── Side decorative stripes ── */}
        <div style={{ position:'absolute', left:'20px', top:'110px', bottom:'20px', width:'3px', background:`linear-gradient(180deg,${GOLD},transparent,${GOLD})`, zIndex:4 }} />
        <div style={{ position:'absolute', right:'20px', top:'110px', bottom:'20px', width:'3px', background:`linear-gradient(180deg,${GOLD},transparent,${GOLD})`, zIndex:4 }} />
      </div>
      </div>
    </div>
  );
}
