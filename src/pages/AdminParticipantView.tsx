import React, { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { getUsers, getMyResults, getMyDrills, getMyCertificate, getCertSettings } from '../lib/db';
import { analyzeSkillGap, comprehensiveScore, evaluateBadges, conceptCoverage, recommendFor, sessionQuizAvg } from '../lib/logic';
import { User, QuizResult, DrillResult, Certificate } from '../types';
import { IPEC_LOGO, COLLEGE_LOGO_DEFAULT, QR_CODE } from '../lib/logos';

const BADGE_CONFIG: Record<string, { color: string; bg: string; emoji: string; desc: string }> = {
  'Platinum Edge': { color: '#7c3aed', bg: '#f5f3ff', emoji: '💎', desc: 'Outstanding — Top Tier' },
  'Gold Edge':     { color: '#d97706', bg: '#fffbeb', emoji: '🥇', desc: 'Excellent Achievement' },
  'Silver Edge':   { color: '#059669', bg: '#ecfdf5', emoji: '🥈', desc: 'Strong Performance' },
  'Bronze Edge':   { color: '#2563eb', bg: '#eff6ff', emoji: '🥉', desc: 'Programme Completion' },
};

function trackFromYear(year: string): string {
  const y = (year || '').toLowerCase();
  return y.includes('1') || y.includes('2') ? 'Junior Champion' : 'Senior Champion';
}

export default function AdminParticipantView() {
  const { userId } = useParams<{ userId: string }>();
  const location = useLocation();
  const viewType = location.pathname.includes('/certificate') ? 'certificate' : 'report';
  const [participant, setParticipant] = useState<User | null>(null);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [drills, setDrills] = useState<DrillResult[]>([]);
  const [cert, setCert] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    Promise.all([
      getUsers(),
      getMyResults(userId),
      getMyDrills(userId),
      getMyCertificate(userId),
    ]).then(([users, r, d, c]) => {
      const p = (users as User[]).find(u => u.id === userId) || null;
      setParticipant(p);
      setResults(r as QuizResult[]);
      setDrills(d as DrillResult[]);
      setCert(c as Certificate | null);
      setLoading(false);
    });
  }, [userId]);

  if (loading) return <div className="text-center py-16 text-slate-400">⏳ Loading...</div>;
  if (!participant) return <div className="text-center py-16 text-slate-400">Participant not found.</div>;

  const gap = analyzeSkillGap(results);
  const passedDrills = drills.filter(d => d.passed);
  const drillAvg = passedDrills.length ? Math.round(passedDrills.reduce((s, d) => s + d.percentage, 0) / passedDrills.length) : 0;
  const badges = evaluateBadges(results);
  const quizSessAvg = sessionQuizAvg(results);
  const finalScore = comprehensiveScore(quizSessAvg, drillAvg, passedDrills.length, badges.length);
  const { track, coverage } = conceptCoverage(results, participant.year || '3rd');

  // Session-wise scores
  const byDaySlot: Record<string, QuizResult> = {};
  results.forEach(r => {
    const k = `${r.day}-${r.sessionSlot || 'Full'}`;
    if (!byDaySlot[k] || r.percentage > byDaySlot[k].percentage) byDaySlot[k] = r;
  });

  if (viewType === 'certificate') {
    if (!cert) return (
      <div className="max-w-lg mx-auto bg-white border border-slate-200 rounded-2xl p-10 text-center mt-10">
        <div className="text-5xl mb-4">🎓</div>
        <h1 className="text-xl font-extrabold text-slate-800">No certificate generated yet</h1>
        <p className="text-slate-500 text-sm mt-2">{participant.name} has not generated their certificate yet.</p>
        <Link to="/activity" className="inline-block mt-5 text-sm font-semibold text-brand">← Back to Activity</Link>
      </div>
    );

    const badge = BADGE_CONFIG[cert.badgeLevel] || BADGE_CONFIG['Bronze Edge'];
    const track2 = trackFromYear(participant.year || '3rd');
    const issued = new Date(cert.issuedAt).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' });
    const collegeLogo = cert.collegeLogoUrl || COLLEGE_LOGO_DEFAULT;
    const W = 1060, H = 730;
    const CAM = "'Cambria','Georgia','Times New Roman',serif";
    const GOLD = '#b8922c'; const NAVY = '#0d1b3e';

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Link to="/activity" className="text-xs text-brand hover:underline">← Back to Activity Dashboard</Link>
            <h1 className="text-xl font-extrabold text-slate-800 mt-1">Certificate — {participant.name}</h1>
          </div>
        </div>
        <div style={{overflowX:'auto'}}>
        <div style={{width:`${W}px`,height:`${H}px`,background:'linear-gradient(160deg,#fefcf5 0%,#fdf8ec 55%,#fef6e8 100%)',fontFamily:CAM,position:'relative',overflow:'hidden',boxShadow:'0 24px 64px rgba(0,0,0,0.22)'}}>
          <div style={{position:'absolute',inset:'10px',border:`3px solid ${GOLD}`,pointerEvents:'none',zIndex:20}} />
          <div style={{position:'absolute',inset:'16px',border:`1px solid #d9ba60`,pointerEvents:'none',zIndex:20}} />
          {[{top:'4px',left:'4px'},{top:'4px',right:'4px'},{bottom:'4px',left:'4px'},{bottom:'4px',right:'4px'}].map((pos,i)=>(
            <div key={i} style={{position:'absolute',...pos as any,width:'22px',height:'22px',background:`linear-gradient(135deg,${GOLD},#f0d080)`,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:'10px',zIndex:21}}>✦</div>
          ))}
          <div style={{position:'absolute',left:'20px',top:'20px',bottom:'20px',width:'210px',background:`linear-gradient(180deg,${NAVY} 0%,#1a2f5c 50%,${NAVY} 100%)`,display:'flex',flexDirection:'column',alignItems:'center',padding:'20px 14px',zIndex:5,gap:'12px'}}>
            <img src={collegeLogo} alt="College" style={{maxWidth:'130px',maxHeight:'110px',objectFit:'contain',background:'white',borderRadius:'8px',padding:'6px'}} />
            <div style={{width:'100%',textAlign:'center'}}>
              <div style={{color:'#f0d070',fontSize:'8px',letterSpacing:'3px',textTransform:'uppercase',marginBottom:'6px'}}>Achievement Track</div>
              <div style={{background:'rgba(200,168,44,0.12)',border:`1px solid ${GOLD}`,borderRadius:'20px',padding:'5px 12px',color:'#f0d070',fontSize:'13px',fontWeight:700}}>{track2}</div>
            </div>
            <div style={{width:'100%',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(200,168,44,0.3)',borderRadius:'10px',padding:'14px 10px',textAlign:'center'}}>
              <div style={{fontSize:'46px',fontWeight:800,color:'white',lineHeight:1}}>{cert.finalScore}%</div>
              <div style={{fontSize:'9px',color:'#8ab0d0',letterSpacing:'2px',textTransform:'uppercase',marginTop:'4px'}}>Final Score</div>
              <div style={{fontSize:'22px',margin:'8px 0 3px'}}>{badge.emoji}</div>
              <div style={{color:'#f0d070',fontSize:'13px',fontWeight:700}}>{cert.badgeLevel}</div>
            </div>
            <div style={{width:'100%',borderTop:'1px solid rgba(200,168,44,0.25)',paddingTop:'12px',textAlign:'center',marginTop:'auto'}}>
              <div style={{color:GOLD,fontSize:'11px',fontStyle:'italic',marginBottom:'3px'}}>Authorised Signatory</div>
              <div style={{color:'rgba(255,255,255,0.85)',fontSize:'10px',fontWeight:600}}>Training Coordinator</div>
              <div style={{color:'#8ab0d0',fontSize:'9px',marginTop:'2px'}}>{cert.college || 'Partner Institution'}</div>
            </div>
          </div>
          <div style={{position:'absolute',left:'248px',right:'20px',top:'20px',bottom:'20px',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'space-between',padding:'22px 32px 18px',zIndex:5,textAlign:'center'}}>
            <div style={{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div style={{flex:1,textAlign:'center'}}>
                <div style={{color:'#8a6020',fontSize:'10px',letterSpacing:'5px',textTransform:'uppercase',marginBottom:'4px'}}>Certificate of Achievement</div>
                <div style={{color:NAVY,fontFamily:CAM,fontSize:'28px',fontWeight:700}}>Employability Edge</div>
                <div style={{color:'#6b5530',fontSize:'11px',letterSpacing:'2px',textTransform:'uppercase',marginTop:'3px'}}>5-Day Soft Skills Training Programme</div>
              </div>
              <img src={IPEC_LOGO} alt="iPEC" style={{height:'72px',objectFit:'contain',flexShrink:0,marginLeft:'16px'}} />
            </div>
            <div style={{width:'100%',height:'2px',background:`linear-gradient(90deg,transparent,${GOLD},#f0d080,${GOLD},transparent)`}} />
            <div style={{color:'#6b5530',fontSize:'13px',letterSpacing:'2px',textTransform:'uppercase',fontFamily:CAM}}>This is to certify that</div>
            <div style={{fontFamily:CAM,fontSize:'40px',fontWeight:700,color:NAVY,letterSpacing:'2px',lineHeight:1,width:'100%',borderBottom:`2px solid ${GOLD}`,paddingBottom:'8px'}}>{cert.userName.toUpperCase()}</div>
            <div style={{fontFamily:CAM,fontSize:'14px',color:'#3a2a0a',lineHeight:'1.8'}}>
              <strong style={{color:'#7a5010'}}>USN:</strong> {cert.usn||'—'} &nbsp;|&nbsp;<strong style={{color:'#7a5010'}}>Branch:</strong> {cert.branch||'—'} &nbsp;|&nbsp;<strong style={{color:'#7a5010'}}>Year:</strong> {cert.semester||'—'} &nbsp;|&nbsp;<strong style={{color:'#7a5010'}}>College:</strong> {cert.college||'—'}
            </div>
            <div style={{fontFamily:CAM,fontSize:'14.5px',color:'#4a3a1a',lineHeight:'1.8'}}>has successfully completed the <strong>Employability Edge 5-Day Soft Skills Training</strong><br/>organised by <strong>iPEC Solutions Pvt. Ltd.</strong></div>
            <div style={{width:'100%',height:'1px',background:`linear-gradient(90deg,transparent,${GOLD},transparent)`}} />
            <div style={{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
              <div style={{textAlign:'center',minWidth:'200px'}}>
                <div style={{fontFamily:CAM,fontSize:'19px',fontStyle:'italic',color:NAVY,borderBottom:`1.5px solid ${GOLD}`,paddingBottom:'5px',marginBottom:'5px'}}>Fathima Afroz</div>
                <div style={{fontSize:'12px',color:NAVY,fontWeight:700}}>Founder &amp; CEO</div>
                <div style={{fontSize:'11px',color:'#6b5530',marginTop:'2px'}}>iPEC Solutions Pvt. Ltd.</div>
              </div>
              <div style={{textAlign:'center'}}>
                <img src={QR_CODE} alt="QR" style={{width:'72px',height:'72px',objectFit:'contain',border:`2px solid ${GOLD}`,borderRadius:'6px',padding:'3px',background:'white'}} />
                <div style={{fontSize:'9px',color:'#8a7040',marginTop:'3px',fontFamily:'monospace',fontWeight:700}}>{cert.certNumber}</div>
              </div>
              <div style={{textAlign:'right',minWidth:'180px'}}>
                <div style={{fontWeight:700,color:NAVY,fontSize:'12px',marginBottom:'3px',fontFamily:CAM}}>Date of Issue</div>
                <div style={{fontSize:'13px',color:'#4a3a1a',fontFamily:CAM}}>{issued}</div>
                <div style={{fontWeight:700,color:NAVY,fontSize:'11px',marginTop:'8px',fontFamily:CAM}}>Duration</div>
                <div style={{fontSize:'12px',color:'#4a3a1a',fontFamily:CAM}}>{cert.trainingDuration}</div>
              </div>
            </div>
            <div style={{width:'100%',display:'flex',justifyContent:'space-between',borderTop:'1px solid rgba(184,146,44,0.25)',paddingTop:'8px'}}>
              <div style={{fontSize:'10px',color:'#9a8060',fontFamily:CAM}}><strong style={{color:NAVY}}>iPEC Solutions Pvt. Ltd.</strong> · www.ipecsolutions.com · +91 6366373030</div>
              <div style={{fontSize:'10px',color:'#9a8060',fontFamily:'monospace'}}>Digitally Generated · {cert.certNumber}</div>
            </div>
          </div>
        </div>
        </div>
      </div>
    );
  }

  // Report view
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/activity" className="text-xs text-brand hover:underline">← Back to Activity Dashboard</Link>
          <h1 className="text-xl font-extrabold text-slate-800 mt-1">Report — {participant.name}</h1>
          <p className="text-sm text-slate-500">{participant.branch} · {participant.year} Year · {participant.college}</p>
        </div>
        <Link to={`/admin/participant/${userId}/certificate`} className="text-sm font-semibold bg-brand text-white px-4 py-2 rounded-lg">View Certificate →</Link>
      </div>

      {/* Score cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label:'Session Quiz Avg (55%)', val:quizSessAvg+'%' },
          { label:'Drill Avg (35%)', val:drillAvg+'%' },
          { label:'Badges (10%)', val:`${badges.length}/5` },
          { label:'🏆 Final Score', val:finalScore+'%', hi:true },
          { label:'Readiness', val:finalScore>=75?'Ready':finalScore>=60?'Developing':'At Risk' },
        ].map(c => (
          <div key={c.label} className={`rounded-xl p-4 border ${c.hi ? 'bg-brand text-white border-brand' : 'bg-white border-slate-200'}`}>
            <div className={`text-2xl font-extrabold ${c.hi ? 'text-white' : 'text-slate-800'}`}>{c.val}</div>
            <div className={`text-xs mt-1 ${c.hi ? 'text-indigo-100' : 'text-slate-500'}`}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Session-wise scores */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="font-bold text-slate-800 mb-3">Session-wise Scores</h2>
        <div className="space-y-3">
          {[1,2,3,4,5].map(day => {
            const m = byDaySlot[`${day}-Morning`];
            const a = byDaySlot[`${day}-Afternoon`];
            if (!m && !a) return <div key={day} className="text-xs text-slate-400">Day {day} — not taken</div>;
            return (
              <div key={day}>
                <p className="text-xs font-bold text-slate-400 mb-1">Day {day}</p>
                {m && <div className="flex items-center gap-3 pl-2 mb-1"><span className="text-[11px] text-amber-600 font-bold w-28">☀ Morning</span><div className="flex-1 h-2 bg-slate-100 rounded-full"><div className={`h-2 rounded-full ${m.percentage>=75?'bg-emerald-500':'bg-amber-400'}`} style={{width:m.percentage+'%'}} /></div><span className="text-sm font-bold w-10 text-right">{m.percentage}%</span></div>}
                {a && <div className="flex items-center gap-3 pl-2"><span className="text-[11px] text-indigo-600 font-bold w-28">🌙 Afternoon</span><div className="flex-1 h-2 bg-slate-100 rounded-full"><div className={`h-2 rounded-full ${a.percentage>=75?'bg-emerald-500':'bg-indigo-400'}`} style={{width:a.percentage+'%'}} /></div><span className="text-sm font-bold w-10 text-right">{a.percentage}%</span></div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Concept coverage */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="font-bold text-slate-800 mb-3">Concept Coverage — {track}</h2>
        <div className="space-y-3">
          {coverage.map((c,i) => (
            <div key={i}><div className="flex justify-between text-sm mb-1"><span className="text-slate-700 font-medium">{c.label}</span><span className="text-xs text-slate-400">{c.weight}% · {c.score!==null?<strong>{c.score}%</strong>:'not taken'}</span></div><div className="h-2 bg-slate-100 rounded-full"><div className={`h-2 rounded-full ${c.score!==null&&c.score>=75?'bg-emerald-500':c.score!==null&&c.score>=55?'bg-amber-400':'bg-red-400'}`} style={{width:`${c.score??0}%`}} /></div></div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5">
        <h2 className="font-bold text-brand mb-2">📌 Personalised recommendations</h2>
        <ul className="space-y-1.5 text-sm text-slate-700 list-disc list-inside">
          {recommendFor(finalScore, gap.gaps).map((r,i) => <li key={i}>{r}</li>)}
        </ul>
      </div>
    </div>
  );
}
