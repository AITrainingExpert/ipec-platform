export type Role = 'participant' | 'trainer' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  role: Role;
  branch?: string;
  year?: string;
  college?: string;
  batchId?: string;
  createdAt: string;
}

export type Track = 'junior' | 'senior';

export interface Batch {
  id: string;
  name: string;
  college: string;
  trainerId?: string;
  track?: Track;        // Junior Champions / Senior Champions
  createdAt: string;
}

export interface Question {
  id: string;
  section: string;      // syllabus topic (shown as a focus area when missed)
  topic?: string;       // syllabus module / topic
  track?: Track;        // junior | senior
  slot?: 'Morning' | 'Afternoon';
  day: number;          // 1..5
  level: 'B' | 'I' | 'A';
  text: string;
  options: string[];
  answer: number;       // index of correct option
}

export interface QuizResult {
  id: string;
  userId: string;
  userName: string;
  batchId?: string;
  day: number | 'all';
  sessionSlot?: 'Morning' | 'Afternoon' | 'Full';  // which session
  activityType?: string;   // 'Quiz-Morning' / 'Quiz-Afternoon' / 'Bootcamp'
  attemptNumber?: number;                            // 1, 2, or 3
  score: number;
  total: number;
  percentage: number;
  weakSections: string[];
  completedAt: string;
}

export interface Badge {
  id: string;
  code: string;
  title: string;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  earnedAt: string;
}

export interface DrillResult {
  id: string;
  userId: string;
  userName: string;
  batchId?: string;
  drillId: string;
  drillTitle: string;
  badgeTitle: string;
  badgeTier: 'Gold' | 'Platinum';
  score: number;       // number correct
  total: number;
  percentage: number;
  passed: boolean;     // met the drill's pass score
  xpEarned: number;
  completedAt: string;
}

export interface AtsResult {
  overall: number;
  formatting: number;
  keywords: number;
  actionVerbs: number;
  detectedSkills: string[];
  missingKeywords: string[];
  tips: string[];
}

// ---- Phase 1: Allowlist (only invited emails can register) ----
export interface AllowedEmail {
  email: string;
  batchId: string;
  addedBy: string;
  createdAt: string;
}

// ---- Phase 2: Session locks (5 days x Morning/Afternoon) ----
export type SessionKey = string; // e.g. "1-Morning", "3-Afternoon"
export interface SessionLock {
  batchId: string;
  sessionKey: SessionKey;   // day + session
  unlocked: boolean;
  updatedBy: string;
  updatedAt: string;
}

// ---- Phase 3: Trainer-uploaded questions live in the same Question shape ----
// (section 'APT' for Aptitude, 'RSN' for Reasoning, etc.)

// ---- Phase 4: Session feedback ----
export interface Feedback {
  id: string;
  userId: string;
  userName: string;
  batchId?: string;
  sessionKey: SessionKey;
  ratingProgram: number;      // 1-5
  ratingTrainer: number;      // 1-5
  ratingInteractivity: number;// 1-5
  ratingEngagement: number;   // 1-5
  ratingDifferent: number;    // 1-5 (different from other trainings)
  comments: string;
  createdAt: string;
}

// ---- Certificates ----
export type BadgeLevel = 'Platinum Edge' | 'Gold Edge' | 'Silver Edge' | 'Bronze Edge';

export interface Certificate {
  id: string;
  certNumber: string;
  userId: string;
  userName: string;
  usn: string;
  semester: string;       // stores year (e.g. "3rd Year")
  batchId: string;
  batchName: string;
  college: string;
  branch: string;
  finalScore: number;
  badgeLevel: string;     // Platinum/Gold/Silver/Bronze Edge
  trainingDuration: string;
  issuedAt: string;
  qrCode: string;
  collegeLogoUrl?: string;
  downloadEnabled: boolean;
}

export interface CertSettings {
  batchId: string;
  downloadEnabled: boolean;
  collegeLogoUrl?: string;
  collegeSignatoryName: string;
  collegeSignatoryTitle: string;
  collegeSignatureUrl?: string;   // base64 or URL of scanned signature image
  updatedAt: string;
}

// ---- NBA / OBE Report ----
export interface CourseOutcome {
  id: string;         // CO1, CO2 ...
  statement: string;
  poMapping: string;  // e.g. PO10, PO12
  psoMapping?: string;
  days: number[];     // which training days cover this CO
  activityTypes: string[]; // Quiz, Drill, Bootcamp
}

export interface NbaConfig {
  batchId: string;
  programName: string;
  collegeName: string;
  department: string;
  academicYear: string;
  threshold: number;   // default 60
  cos: CourseOutcome[];
  updatedAt: string;
}

export interface AttemptLimit {
  batchId: string;
  maxAttempts: number; // 2 or 3
  updatedAt: string;
}
