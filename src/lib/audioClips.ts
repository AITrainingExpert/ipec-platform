export interface AudioClip {
  category: string;
  title: string;
  desc: string;
  flawed: string;
  model: string;
}

// Audio Studio uses the browser's built-in Web Speech API (speechSynthesis).
// It is 100% free, needs NO microphone and NO camera — it only SPEAKS text aloud.
export const AUDIO_CLIPS: AudioClip[] = [
  {
    category: 'Voice Modulation & Structure',
    title: 'Flawed Rambling vs Filler-Free PREP Answer',
    desc: 'Hear the difference between a nervous answer loaded with "umm/like" and a PREP-structured delivery.',
    flawed: 'Umm, basically like, I chose CS because, like, computers are very fast and, like, my uncle told me there are jobs.',
    model: 'I chose Computer Science because software engineering transforms abstract mathematical logic into scalable real-world solutions that impact millions.',
  },
  {
    category: 'Pitch & Confidence',
    title: 'Monotone Hesitancy vs Composed "Pause & Power"',
    desc: 'How a 2-second strategic pause projects emotional control and authority.',
    flawed: 'Yes sir, I know Java and SQL and I worked on a project in third year.',
    model: 'Yes, I possess strong fundamentals in Java and SQL. In my third year, I applied both to engineer a token-authenticated backend system.',
  },
  {
    category: 'Technical Storytelling',
    title: 'Vague Project Summary vs STAR Quantified Metrics',
    desc: 'Why recruiters ignore generic summaries and reward quantified metrics.',
    flawed: 'We made an e-commerce website using HTML, CSS and NodeJS.',
    model: 'We engineered an e-commerce platform where I personally optimized database indexes, reducing query latency by forty-five percent for over one thousand active users.',
  },
  {
    category: 'Handling Pressure',
    title: 'Defensive Reaction vs Composed Ownership',
    desc: 'Responding to a challenge on a weak grade without losing composure.',
    flawed: 'My CGPA is low because the college marking was very strict and unfair to us.',
    model: 'My CGPA reflects a slow start, but my project shipping and learning speed since then are the stronger signal of how I perform on real work.',
  },
];
