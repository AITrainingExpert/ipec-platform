import { useEffect } from 'react';

// ============================================================
// VIEW-ONLY MODE for trainers: they can see every page, but the
// browser won't let them copy, select, right-click, save, print or
// view source. Form fields (search, enrolment box, question upload)
// keep working so trainers can still type and paste into them.
// Admin is never restricted.
// ============================================================
const STYLE_ID = 'ipec-view-only';
const CSS = `
  body.ipec-view-only, body.ipec-view-only * { -webkit-user-select: none !important; user-select: none !important; -webkit-touch-callout: none !important; }
  body.ipec-view-only input, body.ipec-view-only textarea, body.ipec-view-only select { -webkit-user-select: text !important; user-select: text !important; }
  body.ipec-view-only img { -webkit-user-drag: none; pointer-events: none; }
  @media print { body.ipec-view-only * { display: none !important; }
    body.ipec-view-only::after { content: 'Printing is disabled for trainer accounts.'; display: block; padding: 40px; font: 16px sans-serif; } }
`;

const isField = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);

export default function ViewOnlyGuard({ active }: { active: boolean }) {
  useEffect(() => {
    if (!active) return;
    document.body.classList.add('ipec-view-only');
    if (!document.getElementById(STYLE_ID)) {
      const st = document.createElement('style'); st.id = STYLE_ID; st.textContent = CSS; document.head.appendChild(st);
    }
    const stop = (e: Event) => { if (!isField(e.target)) e.preventDefault(); };
    const stopAlways = (e: Event) => e.preventDefault();
    const keys = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;
      if (mod && ['p', 's', 'u'].includes(k)) { e.preventDefault(); return; }          // print / save / source
      if (mod && ['c', 'x', 'a'].includes(k) && !isField(e.target)) e.preventDefault(); // copy / cut / select-all on the page
    };
    const beforePrint = () => { /* CSS above blanks the page */ };
    document.addEventListener('copy', stop, true);
    document.addEventListener('cut', stop, true);
    document.addEventListener('contextmenu', stopAlways, true);
    document.addEventListener('dragstart', stopAlways, true);
    document.addEventListener('selectstart', stop, true);
    document.addEventListener('keydown', keys, true);
    window.addEventListener('beforeprint', beforePrint);
    return () => {
      document.body.classList.remove('ipec-view-only');
      document.removeEventListener('copy', stop, true);
      document.removeEventListener('cut', stop, true);
      document.removeEventListener('contextmenu', stopAlways, true);
      document.removeEventListener('dragstart', stopAlways, true);
      document.removeEventListener('selectstart', stop, true);
      document.removeEventListener('keydown', keys, true);
      window.removeEventListener('beforeprint', beforePrint);
    };
  }, [active]);
  return null;
}
