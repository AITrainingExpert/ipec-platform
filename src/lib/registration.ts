// ============================================================
// STUDENT REGISTRATION RULES: one place for branches, USN format,
// name / email clean-up and the semester every student is fixed to.
// Used by the Register screen and by Admin > Participants.
// ============================================================

export const FIXED_SEMESTER = '5';
export const FIXED_YEAR = '3rd';            // semester 5 = 3rd year (keeps the Senior track)

export const BRANCHES: { code: string; name: string }[] = [
  { code: 'AE', name: 'Aeronautical Engineering' },
  { code: 'AU', name: 'Automobile Engineering' },
  { code: 'AI', name: 'Artificial Intelligence & Machine Learning' },
  { code: 'AD', name: 'Artificial Intelligence & Data Science' },
  { code: 'CS', name: 'Computer Science & Engineering' },
  { code: 'IS', name: 'Information Science & Engineering' },
  { code: 'CB', name: 'Computer Science & Business Systems' },
  { code: 'CG', name: 'Computer Science & Design' },
  { code: 'EC', name: 'Electronics & Communication Engineering' },
  { code: 'EE', name: 'Electrical & Electronics Engineering' },
  { code: 'ME', name: 'Mechanical Engineering' },
  { code: 'MR', name: 'Marine Engineering' },
];

/** What is saved on the profile, e.g. "CS - Computer Science & Engineering". */
export const branchLabel = (code: string) => {
  const b = BRANCHES.find(x => x.code === code);
  return b ? `${b.code} - ${b.name}` : '';
};

/** Branch code from a saved branch value (new "CS - …" form or old free text like "cse"). */
export function branchCodeOf(saved?: string | null): string {
  const s = (saved || '').trim().toUpperCase();
  if (!s) return '';
  const direct = BRANCHES.find(b => s === b.code || s.startsWith(b.code + ' ') || s.startsWith(b.code + '-'));
  if (direct) return direct.code;
  const old: Record<string, string> = { CSE: 'CS', ISE: 'IS', ECE: 'EC', EEE: 'EE', MECH: 'ME', AIML: 'AI', 'AI&ML': 'AI', AIDS: 'AD', 'AI&DS': 'AD', CSBS: 'CB', CSD: 'CG' };
  if (old[s.replace(/[\s.]/g, '')]) return old[s.replace(/[\s.]/g, '')];
  const byName = BRANCHES.find(b => b.name.toUpperCase() === s);
  return byName ? byName.code : '';
}

// ---------- USN ----------
// Two formats are in use:
//   VTU (10):               4SN24CS001  = 4 + SN + 24 + CS + 001
//   Srinivas University (11): 01SU24AI001 = 01 + SU + 24 + AI + 001
export const USN_PATTERN = /^(?:[1-4][A-Z]{2}\d{2}[A-Z]{2}\d{3}|\d{2}[A-Z]{2}\d{2}[A-Z]{2}\d{3})$/;
export const USN_EXAMPLE = '4SN24CS001';
export const USN_MAX = 11;

export const cleanUsn = (v: string) => (v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

export function checkUsn(usn: string): string {
  if (!usn) return 'Enter your USN.';
  if (usn.length < 10) return `USN is 10 or 11 characters, like ${USN_EXAMPLE} or 01SU24AI001.`;
  if (!USN_PATTERN.test(usn)) return `This doesn't look like a USN. It should look like ${USN_EXAMPLE} or 01SU24AI001.`;
  return '';
}

/** Branch code inside a USN (characters 6–7), if it is one of ours. */
export function branchFromUsn(usn: string): string {
  if (!USN_PATTERN.test(usn)) return '';
  const code = usn.slice(-5, -3);
  return BRANCHES.some(b => b.code === code) ? code : '';
}

// ---------- name / email / mobile ----------
export function cleanName(v: string): string {
  const s = (v || '').replace(/\s+/g, ' ').trim();
  // ALL CAPS or all small → Title Case; mixed case is left as the student typed it
  if (s && (s === s.toUpperCase() || s === s.toLowerCase())) {
    return s.toLowerCase().replace(/(^|[\s.'-])([a-z])/g, (_, p, c) => p + c.toUpperCase());
  }
  return s;
}

export function checkName(v: string): string {
  const s = cleanName(v);
  if (!s) return 'Enter your full name.';
  if (s.length < 3) return 'Enter your full name as in college records.';
  if (/[^A-Za-z .'-]/.test(s)) return 'Use letters only (no numbers or symbols).';
  return '';
}

export const cleanEmail = (v: string) => (v || '').trim().toLowerCase();

export function checkEmail(v: string): string {
  const e = cleanEmail(v);
  if (!e) return 'Enter the email you gave to your college.';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(e)) return 'This is not a valid email address.';
  const typo = /@(gmial|gmal|gamil|gmai|gnail)\.|\.con$|\.cmo$|\.co\.in\.|@gmail\.co$/;
  if (typo.test(e)) return 'Please check the spelling of your email.';
  return '';
}

/** 10-digit Indian mobile, without +91 / spaces. */
export function cleanMobile(v: string): string {
  const d = (v || '').replace(/\D/g, '');
  return d.length === 12 && d.startsWith('91') ? d.slice(2) : d.length === 11 && d.startsWith('0') ? d.slice(1) : d;
}

export function checkMobile(v: string): string {
  const m = cleanMobile(v);
  if (!m) return 'Enter your mobile number.';
  if (m.length !== 10) return 'Mobile number must be 10 digits.';
  if (!/^[6-9]/.test(m)) return 'Mobile number must start with 6, 7, 8 or 9.';
  if (/^(\d)\1{9}$/.test(m)) return 'Enter your real mobile number.';
  return '';
}

/** Semester → year text the rest of the app uses ("3rd"). */
export function yearForSemester(sem?: string | null): string {
  const n = Number(sem);
  return n >= 1 && n <= 8 ? ['1st', '2nd', '3rd', '4th'][Math.ceil(n / 2) - 1] : '';
}

export interface RegistrationCheck {
  enrolled: boolean;
  blocked: boolean;
  enrolled_batch: string | null;
  enrolled_batch_name: string | null;
  email_registered: boolean;
  usn_registered: boolean;
  mobile_registered: boolean;
  in_college_list?: boolean;           // email is on the imported college list
  usn_matches_list?: boolean | null;   // null = nothing to compare
}
