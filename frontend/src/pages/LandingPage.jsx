import { useRef, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  Brain,
  Upload,
  Sparkles,
  BarChart3,
  BookOpen,
  Bell,
  ClipboardList,
  Map,
  GraduationCap,
  ChevronDown,
} from 'lucide-react';

/* ─── Keyframe injection ────────────────────────────────────────────────────── */
const GLOBAL_STYLES = `
  @keyframes auroraShift1 {
    0%   { transform: translateX(-5%) scaleX(1.1); opacity: 0.7; }
    50%  { transform: translateX(5%) scaleX(1.0); opacity: 1; }
    100% { transform: translateX(-3%) scaleX(1.15); opacity: 0.8; }
  }
  @keyframes auroraShift2 {
    0%   { transform: translateX(5%) scaleY(1.0); opacity: 0.6; }
    50%  { transform: translateX(-8%) scaleY(1.2); opacity: 0.9; }
    100% { transform: translateX(3%) scaleY(1.1); opacity: 0.7; }
  }
  @keyframes auroraFloat {
    0%   { transform: translate(0px, 0px) scale(1); }
    33%  { transform: translate(60px, -20px) scale(1.1); }
    66%  { transform: translate(-40px, 15px) scale(0.95); }
    100% { transform: translate(0px, 0px) scale(1); }
  }
  @keyframes gridDrift {
    0%   { transform: translate(0px, 0px); }
    100% { transform: translate(60px, 60px); }
  }
  @keyframes blink {
    0%, 100% { border-color: transparent; }
    50%       { border-color: #818cf8; }
  }
  @keyframes typing {
    from { width: 0; }
    to   { width: 100%; }
  }
`;

/* ─── Section divider ────────────────────────────────────────────────────── */
const Divider = () => (
  <div
    aria-hidden
    className="w-full h-px"
    style={{
      background:
        'linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.35) 30%, rgba(34,211,238,0.25) 70%, transparent 100%)',
    }}
  />
);

/* ─── Fade-in wrapper ────────────────────────────────────────────────────── */
const FadeIn = ({ children, delay = 0, className = '' }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 36 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
};

/* ─── Tech pill ──────────────────────────────────────────────────────────── */
const TechPill = ({ name }) => (
  <motion.span
    whileHover={{ y: -4, boxShadow: '0 0 18px rgba(34,211,238,0.22)' }}
    transition={{ type: 'spring', stiffness: 300, damping: 18 }}
    className="shrink-0 px-5 py-2 rounded-full text-sm font-medium text-slate-200 border border-white/10 cursor-default"
    style={{
      background: 'rgba(255,255,255,0.05)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(34,211,238,0.18)',
    }}
  >
    {name}
  </motion.span>
);

/* ─── Feature card ───────────────────────────────────────────────────────── */
const FeatureCard = ({ icon: Icon, title, desc, color, delay }) => (
  <FadeIn delay={delay} className="h-full">
    <motion.div
      whileHover={{ scale: 1.02, rotateX: 3, rotateY: -3 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      style={{
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        transformStyle: 'preserve-3d',
      }}
      className="relative h-full rounded-2xl border border-white/10 p-6 overflow-hidden group cursor-default"
    >
      {/* Hover radial glow */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${color}30 0%, transparent 65%)`,
        }}
      />
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 relative z-10"
        style={{ background: `${color}1a`, border: `1px solid ${color}40` }}
      >
        <Icon size={22} style={{ color }} />
      </div>
      <h3 className="text-base font-semibold text-slate-100 mb-1 relative z-10">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed relative z-10">{desc}</p>
    </motion.div>
  </FadeIn>
);

/* ─── How It Works step ──────────────────────────────────────────────────── */
const Step = ({ icon: Icon, title, desc, index }) => (
  <FadeIn delay={index * 0.15}>
    <div className="flex flex-col items-center text-center px-4">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 relative"
        style={{
          background: 'rgba(99,102,241,0.12)',
          border: '1px solid rgba(99,102,241,0.3)',
        }}
      >
        <Icon size={28} className="text-indigo-400" />
        <span
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
          style={{ background: 'linear-gradient(135deg,#6366f1,#818cf8)' }}
        >
          {index + 1}
        </span>
      </div>
      <h3 className="text-lg font-semibold text-slate-100 mb-2">{title}</h3>
      <p className="text-sm text-slate-400 max-w-[220px] leading-relaxed">{desc}</p>
    </div>
  </FadeIn>
);

/* ─── Typing tagline ─────────────────────────────────────────────────────── */
const TypingTagline = ({ text }) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex justify-center mb-10">
      <span
        style={{
          display: 'inline-block',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          width: visible ? '100%' : '0',
          animation: visible ? 'typing 1.4s steps(44, end) forwards' : 'none',
          borderRight: '2px solid #818cf8',
          paddingRight: '2px',
          animationDelay: '0s',
          borderRightColor: visible ? undefined : 'transparent',
        }}
        className="text-lg sm:text-xl text-slate-400 max-w-xl leading-relaxed"
        data-typing-cursor
      >
        {text}
      </span>
      <style>{`
        [data-typing-cursor] {
          animation: typing 1.4s steps(44, end) forwards, blink 0.75s step-end 1.4s infinite;
        }
      `}</style>
    </div>
  );
};

/* ─── Main Page ──────────────────────────────────────────────────────────── */
const LandingPage = () => {
  /* Smooth scroll + keyframe injection */
  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';
    const el = document.createElement('style');
    el.id = 'landing-keyframes';
    el.textContent = GLOBAL_STYLES;
    if (!document.getElementById('landing-keyframes')) document.head.appendChild(el);
    return () => {
      document.documentElement.style.scrollBehavior = '';
      el.remove();
    };
  }, []);

  /* Cursor-following spotlight state */
  const heroRef = useRef(null);
  const [cursor, setCursor] = useState({ x: 50, y: 50 }); // percent
  const handleMouseMove = useCallback((e) => {
    const rect = heroRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCursor({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }, []);

  const features = [
    {
      icon: ClipboardList,
      title: 'Personalized Study Plans',
      desc: 'AI generates a bespoke roadmap for each student based on their prior knowledge and goals.',
      color: '#818cf8',
    },
    {
      icon: Brain,
      title: 'AI Tutor with RAG',
      desc: "A LangChain agent retrieves answers directly from your course materials — no hallucinations.",
      color: '#34d399',
    },
    {
      icon: BookOpen,
      title: 'Assessments & Quizzes',
      desc: 'Adaptive quizzes auto-generated from uploaded content to test real comprehension.',
      color: '#22d3ee',
    },
    {
      icon: Map,
      title: 'Mastery Heatmap',
      desc: 'Visual topic-by-student heatmap lets teachers spot weak areas at a glance.',
      color: '#f472b6',
    },
    {
      icon: Bell,
      title: 'Smart Alerts',
      desc: "Proactive flags for struggling students and class-wide weak topics before it's too late.",
      color: '#fb923c',
    },
    {
      icon: Sparkles,
      title: 'Pre-Assessment Personalization',
      desc: 'Students declare prior knowledge upfront so the plan skips what they already know.',
      color: '#a78bfa',
    },
  ];

  const techStack = [
    'React 19', 'Node.js', 'MongoDB', 'FastAPI',
    'LangChain', 'ChromaDB', 'Groq LLM', 'Tailwind CSS 4', 'Framer Motion',
  ];

  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* Subtle animated grid overlay — behind everything */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          animation: 'gridDrift 20s linear infinite',
        }}
      />
      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        onMouseMove={handleMouseMove}
        className="relative min-h-screen flex flex-col items-center justify-center px-4 text-center overflow-hidden"
      >
        {/* Subtle mesh fill — top portion only */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 70% 55% at 20% 30%, rgba(99,102,241,0.14) 0%, transparent 65%),
              radial-gradient(ellipse 60% 50% at 80% 15%, rgba(167,139,250,0.12) 0%, transparent 60%),
              radial-gradient(ellipse 55% 45% at 55% 80%, rgba(34,211,238,0.08) 0%, transparent 60%),
              radial-gradient(ellipse 40% 35% at 10% 70%, rgba(129,140,248,0.07) 0%, transparent 55%)
            `,
          }}
        />

        {/* Cursor-following spotlight — chases the mouse */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(600px circle at ${cursor.x}% ${cursor.y}%, rgba(99,102,241,0.22) 0%, rgba(167,139,250,0.12) 35%, transparent 70%)`,
            transition: 'background 0.08s ease-out',
          }}
        />

        {/* Aurora gradient band — CATALYST style, bottom 50-60% of hero */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          {/* Layer 1 — warm pink/magenta, slow drift left */}
          <div
            className="absolute bottom-0 left-0 right-0 h-[60%]"
            style={{
              background: 'linear-gradient(90deg, rgba(236,72,153,0.45) 0%, rgba(167,139,250,0.55) 30%, rgba(244,114,182,0.45) 60%, rgba(192,132,252,0.35) 100%)',
              filter: 'blur(80px)',
              animation: 'auroraShift1 8s ease-in-out infinite alternate',
            }}
          />
          {/* Layer 2 — indigo/blue undertone, slow drift right */}
          <div
            className="absolute bottom-0 left-0 right-0 h-[50%]"
            style={{
              background: 'linear-gradient(90deg, rgba(99,102,241,0.35) 0%, rgba(34,211,238,0.25) 40%, rgba(99,102,241,0.45) 70%, rgba(167,139,250,0.35) 100%)',
              filter: 'blur(100px)',
              animation: 'auroraShift2 12s ease-in-out infinite alternate',
            }}
          />
          {/* Layer 3 — bright magenta accent spot, floats */}
          <div
            className="absolute bottom-[10%] left-[30%] w-[500px] h-[300px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(255,129,255,0.25) 0%, transparent 70%)',
              filter: 'blur(60px)',
              animation: 'auroraFloat 15s ease-in-out infinite',
            }}
          />
          {/* Top vignette — keeps text readable */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to bottom, rgba(2,6,23,1) 0%, rgba(2,6,23,0.8) 30%, rgba(2,6,23,0.1) 60%, rgba(2,6,23,0.3) 100%)',
            }}
          />
        </div>

        {/* Nav — perfectly centered with absolute trick */}
        <nav className="absolute top-0 left-0 right-0 z-20 flex items-center px-8 py-4">
          <div className="flex items-center gap-2">
            <Brain size={22} className="text-indigo-400" />
            <span className="font-semibold text-slate-100 tracking-wide text-sm">StudyAgent</span>
          </div>
          {/* Center nav pills — absolutely centered on the navbar */}
          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-1 px-2 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] backdrop-blur-md">
            <a href="#how-it-works" className="px-4 py-1.5 rounded-full text-xs font-medium text-white/60 hover:text-white hover:bg-white/[0.06] transition-all">How It Works</a>
            <a href="#features" className="px-4 py-1.5 rounded-full text-xs font-medium text-white/60 hover:text-white hover:bg-white/[0.06] transition-all">Features</a>
            <a href="#tech-stack" className="px-4 py-1.5 rounded-full text-xs font-medium text-white/60 hover:text-white hover:bg-white/[0.06] transition-all">Tech Stack</a>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <Link to="/login" className="text-sm text-slate-400 hover:text-slate-100 transition-colors px-3 py-1.5 rounded-full border border-white/[0.08] hover:border-white/20">Sign In</Link>
            <Link
              to="/register"
              className="text-sm font-medium px-4 py-2 rounded-full text-white transition-all duration-200 hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)' }}
            >
              Get Started
            </Link>
          </div>
        </nav>

        {/* Hero copy */}
        <div className="relative z-10 max-w-4xl mx-auto mt-16">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium text-indigo-300 border border-indigo-500/30 mb-8"
            style={{ background: 'rgba(99,102,241,0.08)' }}
          >
            <Sparkles size={13} />
            Powered by LangChain + Groq + ChromaDB
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl sm:text-6xl md:text-7xl font-extrabold leading-[1.08] tracking-tight mb-8"
            style={{
              background: 'linear-gradient(135deg, #f1f5f9 0%, #c7d2fe 40%, #a5b4fc 70%, #818cf8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Agentic Study
            <br />
            Planner
          </motion.h1>

          {/* Typing tagline */}
          <TypingTagline text="AI that teaches, tracks, and transforms learning." />

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.38 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to="/login?role=student"
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl font-semibold text-base text-white transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                boxShadow: '0 0 32px rgba(99,102,241,0.35)',
              }}
            >
              <BookOpen size={18} className="inline mr-2 -mt-0.5" />
              Student Login
            </Link>
            <Link
              to="/login?role=teacher"
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl font-semibold text-base text-slate-100 border border-white/15 hover:border-indigo-500/50 hover:bg-white/5 transition-all duration-300"
              style={{ backdropFilter: 'blur(12px)' }}
            >
              <GraduationCap size={18} className="inline mr-2 -mt-0.5" />
              Teacher Login
            </Link>
          </motion.div>
        </div>

        {/* Dashboard preview mockup */}
        <FadeIn delay={0.5} className="mt-14 w-full max-w-5xl mx-auto relative z-10">
          <div className="relative mx-4" style={{ perspective: '1200px' }}>
            <div
              className="rounded-xl border border-white/10 overflow-hidden"
              style={{
                transform: 'rotateX(8deg) rotateY(-2deg)',
                transformOrigin: 'center center',
                boxShadow: '0 25px 80px rgba(0,0,0,0.5), 0 0 40px rgba(99,102,241,0.15)',
                background: 'rgba(15,23,42,0.9)',
              }}
            >
              {/* Fake browser chrome */}
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5 bg-white/[0.03]">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                </div>
                <div className="flex-1 ml-3">
                  <div className="max-w-xs mx-auto h-5 rounded-md bg-white/[0.06] border border-white/[0.08] flex items-center justify-center">
                    <span className="text-[10px] text-white/30">studyagent.app/dashboard</span>
                  </div>
                </div>
              </div>
              {/* Fake dashboard content */}
              <div className="p-6 grid grid-cols-3 gap-4">
                {/* Sidebar */}
                <div className="col-span-1 space-y-3">
                  <div className="h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/20 w-full" />
                  <div className="h-6 rounded-lg bg-white/[0.04] w-3/4" />
                  <div className="h-6 rounded-lg bg-white/[0.04] w-5/6" />
                  <div className="h-6 rounded-lg bg-white/[0.04] w-2/3" />
                  <div className="h-6 rounded-lg bg-white/[0.04] w-4/5" />
                </div>
                {/* Main content */}
                <div className="col-span-2 space-y-4">
                  <div className="flex gap-3">
                    <div className="flex-1 h-20 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 border border-white/[0.06]" />
                    <div className="flex-1 h-20 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-white/[0.06]" />
                    <div className="flex-1 h-20 rounded-xl bg-gradient-to-br from-pink-500/20 to-rose-500/10 border border-white/[0.06]" />
                  </div>
                  {/* Heatmap mockup */}
                  <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
                    <div className="h-3 w-32 rounded bg-white/10 mb-3" />
                    <div className="grid grid-cols-6 gap-1.5">
                      {[
                        'bg-emerald-500/40','bg-blue-500/30','bg-emerald-500/40','bg-yellow-500/30','bg-emerald-500/40','bg-blue-500/30',
                        'bg-blue-500/30','bg-yellow-500/30','bg-red-500/30','bg-blue-500/30','bg-emerald-500/40','bg-yellow-500/30',
                        'bg-emerald-500/40','bg-emerald-500/40','bg-blue-500/30','bg-emerald-500/40','bg-blue-500/30','bg-emerald-500/40',
                      ].map((color, i) => (
                        <div key={i} className={`h-5 rounded ${color}`} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Reflection glow */}
            <div
              aria-hidden
              className="absolute -bottom-8 left-[10%] right-[10%] h-16 rounded-full"
              style={{
                background: 'radial-gradient(ellipse, rgba(99,102,241,0.15) 0%, transparent 70%)',
                filter: 'blur(20px)',
              }}
            />
          </div>
        </FadeIn>

        {/* Scroll cue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-slate-600 z-10"
        >
          <span className="text-xs tracking-widest uppercase">Scroll</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
          >
            <ChevronDown size={16} />
          </motion.div>
        </motion.div>
      </section>

      <Divider />

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="relative py-28 px-4 overflow-hidden z-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 65% 50% at 50% 50%, rgba(99,102,241,0.07) 0%, transparent 70%)',
          }}
        />
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-16">
            <span className="text-xs uppercase tracking-[0.2em] text-indigo-400 font-semibold mb-3 block">
              The Flow
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-100 tracking-tight">
              How It Works
            </h2>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 relative">
            <div
              aria-hidden
              className="hidden sm:block absolute top-8 left-[16%] right-[16%] h-px"
              style={{
                background:
                  'linear-gradient(90deg, transparent, rgba(99,102,241,0.4), rgba(34,211,238,0.4), transparent)',
              }}
            />
            <Step index={0} icon={Upload} title="Teacher Uploads PDFs"
              desc="Course materials are vectorized and stored in ChromaDB for instant AI retrieval." />
            <Step index={1} icon={Brain} title="Student Studies with AI"
              desc="The LangChain agent answers questions, flags weak topics, and adapts to the student." />
            <Step index={2} icon={BarChart3} title="Teacher Sees Analytics"
              desc="Mastery heatmaps, smart alerts, and per-student progress in real time." />
          </div>
        </div>
      </section>

      <Divider />

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <section id="features" className="relative py-28 px-4 overflow-hidden z-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 55% 45% at 15% 60%, rgba(167,139,250,0.08) 0%, transparent 60%),
              radial-gradient(ellipse 50% 40% at 85% 30%, rgba(34,211,238,0.07) 0%, transparent 60%)
            `,
          }}
        />
        <div className="max-w-6xl mx-auto">
          <FadeIn className="text-center mb-16">
            <span className="text-xs uppercase tracking-[0.2em] text-cyan-400 font-semibold mb-3 block">
              What's Inside
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-100 tracking-tight">
              Key Features
            </h2>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <FeatureCard key={f.title} {...f} delay={i * 0.15} />
            ))}
          </div>
        </div>
      </section>

      <Divider />

      {/* ── TECH STACK ───────────────────────────────────────────────────── */}
      <section id="tech-stack" className="relative py-24 px-4 overflow-hidden z-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(99,102,241,0.06) 0%, transparent 70%)',
          }}
        />
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-10">
            <span className="text-xs uppercase tracking-[0.2em] text-violet-400 font-semibold mb-3 block">
              Built With
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-100 tracking-tight">
              Tech Stack
            </h2>
          </FadeIn>

          <FadeIn delay={0.1}>
            <div className="flex flex-wrap justify-center gap-3">
              {techStack.map((t) => (
                <TechPill key={t} name={t} />
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      <Divider />

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="relative py-12 px-4">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 70% 80% at 50% 100%, rgba(99,102,241,0.06) 0%, transparent 70%)',
          }}
        />
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-2">
            <Brain size={18} className="text-indigo-400" />
            <span className="text-sm font-semibold text-slate-300">StudyAgent</span>
          </div>
          <p className="text-sm text-slate-500 text-center">
            AI that teaches, tracks, and transforms learning.
          </p>
          <p className="text-sm text-slate-500">Built by Angelina</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
