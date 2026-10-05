export interface DrillQuestion {
  text: string;
  options: string[];
  answer: number;
  insight: string;   // "Master Trainer Insight" shown after answering
}

export interface Drill {
  id: string;
  day: number;
  session: 'Morning' | 'Afternoon';
  title: string;
  desc: string;
  badgeTitle: string;
  badgeTier: 'Gold' | 'Platinum';
  passScore: number;   // % needed to unlock the badge
  xp: number;          // XP awarded on unlock
  questions: DrillQuestion[];
}

export const DRILLS: Drill[] = [
  {
    id: 'd1m', day: 1, session: 'Morning', title: 'Fear Destroyer & Blank-Mind Recovery Arena',
    desc: 'Master the 4-step Answer-to-Fear protocol under simulated panic pressure.',
    badgeTitle: 'Panic Shield Master', badgeTier: 'Gold', passScore: 75, xp: 100,
    questions: [
      { text: 'Panel suddenly asks: "What is the biggest flaw in your project architecture?" Your mind goes totally blank. What is your immediate Step 1 action?',
        options: ['Say "I don\'t know, sir" and look down', 'Take a deep 2-second breath and say: "That is an insightful angle. Let me break down our architectural trade-offs…"', 'Quickly start making up false numbers to cover up', 'Ask to leave the interview room'],
        answer: 1, insight: 'Breathe & buy time using a structured thought-collection phrase — it converts panic into a composed opening.' },
      { text: 'Which phrase is an official "Strategic Time-Buyer" that shows structured thinking?',
        options: ['Umm… basically like… wait a minute', 'That is a valuable question; if I look at this from a system-design standpoint…', 'Sir please ask me something from my syllabus instead', 'I am feeling very nervous right now'],
        answer: 1, insight: 'A professional framing statement signals structured thinking while your mind catches up.' },
      { text: 'What physical anchor can you quietly trigger on your wrist when anxiety strikes?',
        options: ['NLP wrist-touch anchor', 'Cracking all your knuckles loudly', 'Tapping feet rapidly on the floor', 'Biting your pencil'],
        answer: 0, insight: 'The Day-1 NLP grounding exercise links a discreet wrist touch to a rehearsed calm state.' },
    ],
  },
  {
    id: 'd1a', day: 1, session: 'Afternoon', title: 'Pause & Power Voice Modulation Lab',
    desc: 'Eliminate filler words ("umm", "like") and master the 2-second power pause.',
    badgeTitle: 'Voice Modulation Maestro', badgeTier: 'Platinum', passScore: 80, xp: 150,
    questions: [
      { text: 'Filler words such as "umm", "like", "basically" mainly damage an answer because they:',
        options: ['Make the answer longer', 'Signal unpreparedness and dilute authority', 'Are grammatically wrong', 'Confuse the ATS'], answer: 1,
        insight: 'Fillers read as hesitation. A deliberate silent pause projects more control than any word.' },
      { text: 'The "2-second power pause" before a key point achieves what?',
        options: ['Wastes time', 'Creates emphasis and signals composure and executive presence', 'Hides nervousness only', 'Lets you think of jokes'], answer: 1,
        insight: 'A strategic pause makes the listener lean in — silence is a tool, not a gap.' },
      { text: 'Voice modulation improves an answer primarily because:',
        options: ['It makes the voice louder throughout', 'Varied pace, pitch and emphasis keep the listener engaged and highlight key points', 'It hides grammar errors', 'Panels score voice over content'], answer: 1,
        insight: 'Monotone flattens meaning; modulation guides the listener to what matters.' },
    ],
  },
  {
    id: 'd2m', day: 2, session: 'Morning', title: 'PREP Formula Speed Builder',
    desc: 'Assemble Point → Reason → Example → Point answers in under 45 seconds.',
    badgeTitle: 'PREP Structure Titan', badgeTier: 'Gold', passScore: 75, xp: 100,
    questions: [
      { text: 'In PREP, the letters stand for:', options: ['Plan, Read, Execute, Present', 'Point, Reason, Example, Point', 'Prepare, Rehearse, Explain, Perform', 'Point, Review, Evidence, Pause'], answer: 1,
        insight: 'PREP gives every answer a reusable spine so you never ramble.' },
      { text: 'Why does PREP end by restating the Point?', options: ['To fill time', 'To close cleanly and reinforce the takeaway in memory', 'Because panels forget', 'To correct earlier mistakes'], answer: 1,
        insight: 'The closing Point leaves the evaluator with a crisp, memorable conclusion.' },
      { text: 'A good PREP interview answer typically lasts:', options: ['10–15 seconds', '45–60 seconds', '3–4 minutes', 'As long as possible'], answer: 1,
        insight: 'Under a minute is long enough to be complete, short enough to stay sharp.' },
    ],
  },
  {
    id: 'd2a', day: 2, session: 'Afternoon', title: 'GD Interruption & Entry Combat',
    desc: 'Master strategic entry, building on points, and handling noisy GD rounds.',
    badgeTitle: 'GD Tactical Maestro', badgeTier: 'Platinum', passScore: 80, xp: 150,
    questions: [
      { text: 'A dominant speaker has consumed most of the GD time. As a scoring participant you should:',
        options: ['Out-shout them', 'Use a firm, polite bridge — "That\'s one view; let\'s also hear a different angle" — and bring in a quieter member', 'Complain to the evaluator mid-GD', 'Match their behaviour'], answer: 1,
        insight: 'Steering the group scores higher than dominating it — evaluators reward inclusion.' },
      { text: 'Which is a "group-progress move" in a GD?', options: ['"Let me repeat my point again"', '"We\'ve covered causes; shall we move to solutions?"', '"I disagree with everyone here"', '"Speak faster everyone"'], answer: 1,
        insight: 'Moving the group forward is a premium, direction-setting contribution.' },
      { text: 'The best way to enter a heated GD is:', options: ['Interrupt loudly', 'Build on the last point — "Adding to that…" — then add your contribution', 'Wait silently till the end', 'Raise your hand to the evaluator'], answer: 1,
        insight: 'Building on others shows listening quality — a scored collaborative behaviour.' },
    ],
  },
  {
    id: 'd3m', day: 3, session: 'Morning', title: 'STAR Technical Storytelling Forge',
    desc: 'Transform raw project work into high-impact Situation-Task-Action-Result narratives.',
    badgeTitle: 'STAR Storyteller Champion', badgeTier: 'Gold', passScore: 75, xp: 100,
    questions: [
      { text: 'In STAR, the letters stand for:', options: ['Skill, Task, Ability, Result', 'Situation, Task, Action, Result', 'Story, Team, Action, Review', 'Situation, Timing, Answer, Recap'], answer: 1,
        insight: 'STAR turns a vague project into a structured, evidence-backed story.' },
      { text: 'The "Action" in STAR should describe:', options: ['The team\'s collective actions', 'The steps YOU specifically took', 'The advisor\'s guidance', 'All alternatives'], answer: 1,
        insight: 'Panels probe for YOUR contribution — "we" hides the very thing they\'re scoring.' },
      { text: 'The highest-value "Result" includes:', options: ['"It went well"', 'A quantified outcome — "reduced errors by 30%"', 'Whose fault the problem was', 'A motivational quote'], answer: 1,
        insight: 'Quantification converts a claim into evidence panels remember.' },
    ],
  },
  {
    id: 'd3a', day: 3, session: 'Afternoon', title: 'ATS Resume Keyword Hunt & Quantifier Forge',
    desc: 'Optimize bullet points to beat ATS scanners with action verbs and metric density.',
    badgeTitle: 'ATS Resume Architect', badgeTier: 'Platinum', passScore: 80, xp: 150,
    questions: [
      { text: 'Which resume bullet is strongest?', options: ['Worked on a machine learning project', 'Built a crop-disease classifier (CNN, 92% accuracy) used by 40+ farmers', 'Was part of the ML team', 'ML project done in final year'], answer: 1,
        insight: 'Specific tools + a number = evidence. Vague verbs get filtered by both ATS and humans.' },
      { text: 'What do ATS systems typically parse poorly?', options: ['Standard headings', 'Text inside tables, text boxes, and images', 'Bullet points', 'Reverse-chronological dates'], answer: 1,
        insight: 'Keep the layout single-column and text-based so the parser reads every word.' },
      { text: '"Responsible for testing" is weak because it:', options: ['Is too technical', 'Is passive and unquantified — "Designed 60+ test cases catching 14 defects" is stronger', 'Is too short', 'Shouldn\'t be on a resume'], answer: 1,
        insight: 'Action verb + metric beats a passive duty statement every time.' },
    ],
  },
  {
    id: 'd4m', day: 4, session: 'Morning', title: '90-Second TMAY Elevator Pitch Arena',
    desc: 'Master "Tell Me About Yourself" using the Present → Past → Future → Fit formula.',
    badgeTitle: 'Elevator Pitch Champion', badgeTier: 'Gold', passScore: 75, xp: 100,
    questions: [
      { text: 'The 90-second TMAY formula is:', options: ['Childhood → School → College → Family', 'Present → Past → Future → Fit', 'Hobbies → Strengths → Weaknesses', 'Name → Marks → Address'], answer: 1,
        insight: 'Lead with your strongest current relevance; use the past only as supporting evidence.' },
      { text: 'The "Present" segment should open with:', options: ['"I was born in…"', 'Your current identity + strongest relevant credential', '"Myself Rahul from XYZ city…"', 'Your hobbies'], answer: 1,
        insight: 'The first line is your highest-leverage moment — position, don\'t recite.' },
      { text: 'The "Fit" ending means:', options: ['Physical fitness', 'Explicitly connecting your trajectory to THIS role/company', 'Fitting the time limit', 'Matching the dress code'], answer: 1,
        insight: 'Closing on fit tells the panel why you — not a generic candidate — belong here.' },
    ],
  },
  {
    id: 'd4a', day: 4, session: 'Afternoon', title: 'Behavioral Trap Question Dodge',
    desc: 'Navigate high-stakes HR traps: "Why should we hire you?" & salary/location questions.',
    badgeTitle: 'HR Trap Buster', badgeTier: 'Platinum', passScore: 80, xp: 150,
    questions: [
      { text: 'On "What is your weakness?", the recommended approach is:', options: ['"I have no weaknesses"', 'A real, non-fatal weakness + concrete improvement already underway', '"I work too hard"', 'List three weaknesses fully'], answer: 1,
        insight: 'Honesty + a fix shows self-awareness and growth — the trait behind the question.' },
      { text: '"Salary expectations?" for a fresher is best answered by:', options: ['Quoting the highest figure heard', '"I\'m flexible within your standard fresher band; may I know the typical range?"', '"Whatever you give is fine"', 'Refusing to discuss'], answer: 1,
        insight: 'Show market awareness and composure without boxing yourself in.' },
      { text: '"Why should we hire you?" should center on:', options: ['Your financial need', 'The specific match between your proven skills and their stated needs', 'Your college\'s reputation', 'A request for a chance'], answer: 1,
        insight: 'Map your evidence to their need — specificity beats enthusiasm.' },
    ],
  },
  {
    id: 'd5m', day: 5, session: 'Morning', title: 'Weapon Check & Reverse Questioning Showdown',
    desc: 'Consolidate all tools and master closing the interview by interviewing the interviewer.',
    badgeTitle: 'Strategic Tactician', badgeTier: 'Gold', passScore: 75, xp: 100,
    questions: [
      { text: 'A "reverse question" is:', options: ['Repeating the interviewer\'s question', 'A thoughtful question YOU ask the panel at the end', 'A trick question from HR', 'Answering in reverse order'], answer: 1,
        insight: 'Question quality is a final high-signal sample of how you\'ll engage as an employee.' },
      { text: 'Which reverse question should you NEVER ask first?', options: ['"What does success look like in 6 months?"', '"How many leaves and what is the hike policy?"', '"How is the team structured?"', '"What do you enjoy about working here?"'], answer: 1,
        insight: 'Leading with perks signals the wrong priorities — save logistics for the offer stage.' },
      { text: '"What questions do you have for us?" — answering "None" signals:', options: ['Efficiency', 'Low engagement and a missed final impression', 'Full preparation', 'Politeness'], answer: 1,
        insight: 'Always carry 2–3 researched questions — silence here reads as disinterest.' },
    ],
  },
  {
    id: 'd5a', day: 5, session: 'Afternoon', title: 'THE MOCK BATTLE: Full Placement Combat',
    desc: 'Simulated multi-question panel for the complete Placement Readiness Index.',
    badgeTitle: 'Placement Conquest Champion', badgeTier: 'Platinum', passScore: 85, xp: 300,
    questions: [
      { text: 'Stress question: "Your CGPA is mediocre. Why not reject you now?" Best response:', options: ['Defend every semester', 'Brief ownership + pivot to compensating evidence, delivered calmly', '"Marks don\'t matter in real life"', '"Toppers also fail"'], answer: 1,
        insight: 'Composure under attack IS the test — ownership plus evidence wins.' },
      { text: 'The interviewer stays silent for 10 seconds after your complete answer. Best move:', options: ['Immediately add more to fill silence', 'Hold composed silence — the pause is often a patience test', 'Ask "Was that correct?"', 'Repeat your conclusion'], answer: 1,
        insight: 'Filling nervous silence dilutes a strong answer — composure holds the line.' },
    ],
  },
];
