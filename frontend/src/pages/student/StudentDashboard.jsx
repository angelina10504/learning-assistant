import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Clock, Flame, Lightbulb, BookMarked, GraduationCap, Pin, AlertTriangle, Plus, Play, TrendingUp, ClipboardList, Award } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import toast from 'react-hot-toast';
import Navbar from '../../components/shared/Navbar';
import ProgressBar from '../../components/shared/ProgressBar';
import Badge from '../../components/shared/Badge';
import TopicRoadmap from '../../components/student/TopicRoadmap';
import JoinClassModal from '../../components/student/JoinClassModal';
import { CardSkeleton, StatCardSkeleton } from '../../components/ui/Skeleton';
import Button from '../../components/ui/Button';
import classService from '../../services/classService';
import sessionService from '../../services/sessionService';
import useCountUp from '../../hooks/useCountUp';
import GlassTooltip from '../../components/ui/GlassTooltip';
import MasteryRing from '../../components/ui/MasteryRing';
import Sparkline from '../../components/ui/Sparkline';

const containerVariants = {
  animate: { transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState({
    topicsCompleted: { completed: 0, total: 0 },
    studyHours: 0,
    currentStreak: 0,
    avgConfidence: 0,
  });
  const [roadmap, setRoadmap] = useState([]);
  const [weakAreas, setWeakAreas] = useState([]);
  const [selectedRoadmapClass, setSelectedRoadmapClass] = useState(null);
  const [roadmapLoading, setRoadmapLoading] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joiningClass, setJoiningClass] = useState(false);
  const [activeStatuses, setActiveStatuses] = useState({});
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [trend, setTrend] = useState([]);

  // Animated stat counters
  const topicsCounter = useCountUp(stats.topicsCompleted?.completed || 0);
  const hoursCounter = useCountUp(stats.studyHours || 0, 1200, 1);
  const streakCounter = useCountUp(stats.currentStreak || 0);
  const confidenceCounter = useCountUp(stats.avgConfidence || 0);

  const stripMarkdown = (text) => {
    if (!text) return '';
    const stripped = text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/#{1,6}\s/g, '')
      .replace(/={3,}/g, '')
      .replace(/`{1,3}[^`]*`{1,3}/g, '')
      .replace(/\n+/g, ' ')
      .trim();
    return stripped.length > 80 ? stripped.substring(0, 80) + '...' : stripped;
  };

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoadingClasses(true);
        const response = await classService.getEnrolledClasses();
        const classesData = response.data || [];
        const mappedClasses = (Array.isArray(classesData) ? classesData : []).map(cls => ({
          ...cls,
          id: cls._id || cls.id,
          name: cls.name,
          teacherName: cls.teacherId?.name || cls.teacherName || 'Instructor',
          progress: cls.progress || 0,
          type: 'compulsory',
        }));
        setClasses(mappedClasses);
      } catch (err) {
        console.error('Fetch classes error', err);
      } finally {
        setLoadingClasses(false);
      }
    };

    const fetchDashboard = async () => {
      try {
        setLoadingDashboard(true);
        const response = await sessionService.getDashboardData();
        const data = response.data;
        if (data) {
          if (data.stats) setStats(data.stats);
          if (data.recentSessions) setSessions(data.recentSessions);
          if (data.roadmap) setRoadmap(data.roadmap);
          if (data.planClassId) setSelectedRoadmapClass(data.planClassId?.toString());
          if (data.weakAreas) setWeakAreas(data.weakAreas);
          if (data.trend) setTrend(data.trend);
        }
      } catch (err) {
        console.error('Fetch dashboard error', err);
      } finally {
        setLoadingDashboard(false);
      }
    };

    const fetchActiveStatus = async () => {
      try {
        const response = await sessionService.getActiveStatus();
        setActiveStatuses(response.data);
      } catch (err) {
         console.error('Fetch active status error', err);
      }
    };

    const fetchAnalytics = async () => {
      try {
        setAnalyticsLoading(true);
        const response = await sessionService.getStudentAnalytics();
        setAnalytics(response.data);
      } catch (err) {
        console.error('Fetch analytics error', err);
      } finally {
        setAnalyticsLoading(false);
      }
    };

    fetchClasses();
    fetchDashboard();
    fetchActiveStatus();
    fetchAnalytics();
  }, []);

  const fetchRoadmapForClass = async (classId) => {
    if (!classId) return;
    setRoadmapLoading(true);
    try {
      const response = await sessionService.getPlans(classId);
      const plans = response.data || [];
      if (plans.length > 0) {
        const latestPlan = plans[0]; // sorted by generatedAt desc from backend
        setRoadmap((latestPlan.topics || []).map(t => ({ name: t.name, status: t.status })));
      } else {
        setRoadmap([]);
      }
    } catch (err) {
      console.error('Fetch roadmap for class error', err);
      setRoadmap([]);
    } finally {
      setRoadmapLoading(false);
    }
  };

  const handleRoadmapClassChange = (classId) => {
    setSelectedRoadmapClass(classId);
    fetchRoadmapForClass(classId);
  };

  const handleJoinClass = async (classCode) => {
    setJoiningClass(true);
    setJoinError('');
    try {
      const response = await classService.joinClass(classCode);
      const newClass = response.data;
      const mappedClass = {
        ...newClass,
        id: newClass._id || newClass.id
      };
      setClasses([...classes, mappedClass]);
      setJoinModalOpen(false);
      toast.success('Joined class!');
    } catch (err) {
      console.error('Join class error:', err);
      let errorMsg = 'Failed to join class';

      if (err.response?.status === 403) {
        errorMsg = 'Only students can join classes. Please log in with a student account.';
      } else if (err.response?.status === 404) {
        errorMsg = 'Class not found. Please check the code and try again.';
      } else if (err.response?.status === 400) {
        errorMsg = err.response?.data?.message || 'Invalid class code or already enrolled.';
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      }

      setJoinError(errorMsg);
      toast.error(errorMsg);
      throw err;
    } finally {
      setJoiningClass(false);
    }
  };

  const resumeSession = (sessionId) => {
    navigate(`/student/session/${sessionId}`);
  };

  const startNewSession = (classId) => {
    const status = activeStatuses[classId];
    if (status?.activeSessionId) {
      navigate(`/student/session/${status.activeSessionId}`);
    } else if (status?.planId) {
      navigate(`/student/plan/${status.planId}`);
    } else {
      navigate(`/student/class/${classId}`);
    }
  };

  const openClassMaterials = (classId) => {
    navigate(`/student/class/${classId}`);
  };

  const formatDeadline = (deadline) => {
    if (!deadline) return null;
    const date = new Date(deadline);
    const today = new Date();
    const diff = date - today;
    const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return daysLeft > 0 ? `${daysLeft}d left` : 'Overdue';
  };

  const statCards = [
    {
      icon: BookOpen,
      label: 'Topics Completed',
      value: `${stats?.topicsCompleted.completed}/${stats?.topicsCompleted.total}`,
      counterRef: topicsCounter.ref,
      counterValue: `${topicsCounter.count}/${stats?.topicsCompleted.total}`,
    },
    {
      icon: Clock,
      label: 'Study Hours',
      value: `${stats?.studyHours}h`,
      counterRef: hoursCounter.ref,
      counterValue: `${hoursCounter.count}h`,
    },
    {
      icon: Flame,
      label: 'Day Streak',
      value: stats?.currentStreak,
      counterRef: streakCounter.ref,
      counterValue: streakCounter.count,
    },
    {
      icon: Lightbulb,
      label: 'Avg Confidence',
      value: `${stats?.avgConfidence}%`,
      counterRef: confidenceCounter.ref,
      counterValue: `${confidenceCounter.count}%`,
    },
  ];

  const overallMastery = stats.topicsCompleted?.total > 0
    ? Math.round((stats.topicsCompleted.completed / stats.topicsCompleted.total) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-[#050816]">
      {/* Ambient background glows */}
      <div className="fixed inset-0 pointer-events-none z-0" aria-hidden>
        <div className="absolute top-0 right-[20%] w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute bottom-[20%] left-[10%] w-[400px] h-[400px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.06) 0%, transparent 70%)', filter: 'blur(80px)' }} />
      </div>
      <div className="relative z-10">
      <Navbar />

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title + Tab Bar */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-50 mb-2">Dashboard</h1>
          <p className="text-sm sm:text-base text-slate-400 mb-6">Welcome back! Continue your learning journey</p>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            {[
              { id: 'dashboard', label: 'Overview', icon: BookOpen },
              { id: 'analytics', label: 'Analytics', icon: TrendingUp },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  activeTab === id
                    ? 'text-white shadow-lg'
                    : 'text-white/50 hover:text-white/80'
                }`}
                style={activeTab === id ? { background: 'linear-gradient(135deg, rgba(99,102,241,0.7) 0%, rgba(34,211,238,0.4) 100%)', boxShadow: '0 2px 16px rgba(99,102,241,0.25)' } : {}}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'dashboard' && (
        <>

        {/* Continue Learning Banner */}
        {sessions.length > 0 && (
          <motion.div
            className="mb-8 card p-6 cursor-pointer hover:border-indigo-400/40 transition-all duration-200"
            onClick={() => resumeSession(sessions[0].id)}
            whileHover={{ scale: 1.01 }}
            style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(34,211,238,0.06) 100%)', border: '1px solid rgba(99,102,241,0.2)' }}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-50 mb-1 flex items-center gap-2">
                  <BookMarked className="w-5 h-5" />
                  {sessions[0].topicName}
                </h3>
                <p className="text-sm text-slate-300 mb-2">{stripMarkdown(sessions[0].lastContext)}</p>
                <p className="text-xs text-slate-400">
                  {sessions[0].className} &bull; Session {sessions[0].sessionNumber}
                </p>
              </div>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  resumeSession(sessions[0].id);
                }}
                className="whitespace-nowrap"
              >
                Resume &rarr;
              </Button>
            </div>
          </motion.div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Classes and Weak Areas */}
          <div className="lg:col-span-2 space-y-8">
            {/* My Classes Section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-50">My Classes</h2>
                <Button
                  onClick={() => setJoinModalOpen(true)}
                  className="text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Join Class
                </Button>
              </div>

              {loadingClasses ? (
                <div className="grid gap-4">
                  {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
                </div>
              ) : classes.length === 0 ? (
                <div className="card p-8 text-center flex flex-col items-center">
                  <GraduationCap className="w-12 h-12 text-slate-500 mb-4" />
                  <h3 className="text-lg font-bold text-slate-300 mb-1">No classes yet</h3>
                  <p className="text-slate-500 mb-4">Join your first class to start learning</p>
                  <Button onClick={() => setJoinModalOpen(true)}>
                    Join your first class
                  </Button>
                </div>
              ) : (
                <motion.div
                  className="grid gap-4"
                  variants={containerVariants}
                  initial="initial"
                  animate="animate"
                >
                  {classes.map((cls) => (
                    <motion.div
                      key={cls.id}
                      className="card p-5 hover:border-white/[0.12] transition-all duration-300"
                      variants={itemVariants}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 cursor-pointer" onClick={() => openClassMaterials(cls.id)}>
                          <h3 className="font-semibold text-slate-50 mb-1">{cls.name}</h3>
                          <p className="text-sm text-slate-400 flex items-center gap-1">
                            <GraduationCap className="w-4 h-4" />
                            {cls.teacherName}
                          </p>
                        </div>
                        <Badge
                          color={cls.type === 'compulsory' ? 'red' : 'cyan'}
                          className="text-xs flex items-center gap-1"
                        >
                          {cls.type === 'compulsory' ? (
                            <>
                              <Pin className="w-3 h-3" />
                              Compulsory
                            </>
                          ) : (
                            <>
                              <BookOpen className="w-3 h-3" />
                              Self-Learning
                            </>
                          )}
                        </Badge>
                      </div>

                      <div className="space-y-2 mb-3">
                        <ProgressBar value={cls.progress} max={100} />
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>{cls.progress}% progress</span>
                          {cls.deadline && (
                            <span className={formatDeadline(cls.deadline).includes('Overdue') ? 'text-red-400' : 'text-amber-400'}>
                              {formatDeadline(cls.deadline)}
                            </span>
                          )}
                        </div>
                      </div>

                      <Button
                        variant={activeStatuses[cls.id]?.activeSessionId ? 'secondary' : 'primary'}
                        onClick={(e) => {
                          e.stopPropagation();
                          startNewSession(cls.id);
                        }}
                        className={`text-sm w-full ${
                          activeStatuses[cls.id]?.activeSessionId ? 'text-indigo-400 border-indigo-500/50 hover:bg-indigo-500/10' : ''
                        }`}
                      >
                        <Play className="w-4 h-4" />
                        {activeStatuses[cls.id]?.activeSessionId ? 'Resume Session \u2192' : 'Start Study Session'}
                      </Button>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </section>

            {/* Weak Areas Section */}
            {weakAreas.length > 0 && (
              <section>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-50 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-6 h-6 text-amber-500" />
                  Weak Areas
                </h2>
                <motion.div
                  className="grid gap-4"
                  variants={containerVariants}
                  initial="initial"
                  animate="animate"
                >
                  {weakAreas.map((area, idx) => (
                    <motion.div
                      key={idx}
                      className="card p-4 border-l-4 border-l-amber-500 cursor-pointer hover:border-white/[0.12] transition-all duration-300"
                      variants={itemVariants}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-slate-50">{area.topic}</h4>
                          <p className="text-xs text-slate-400 mt-1">
                            You found this difficult. Practice to improve!
                          </p>
                        </div>
                        <Button
                          onClick={() => navigate(`/student/practice/${area.topicId}`)}
                          className="text-sm whitespace-nowrap ml-4"
                        >
                          Practice &rarr;
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </section>
            )}
          </div>

          {/* Right Column - Roadmap */}
          <div className="lg:col-span-1">
            {/* Mastery Ring */}
            <div className="card p-5 mb-4 flex items-center justify-center">
              <MasteryRing percentage={overallMastery} size={130} />
            </div>

            {/* Class Selector — only shown when enrolled in 2+ classes */}
            {classes.length > 1 && (
              <div className="mb-3">
                <div className="relative">
                  <select
                    value={selectedRoadmapClass || ''}
                    onChange={(e) => handleRoadmapClassChange(e.target.value)}
                    className="w-full appearance-none rounded-xl px-4 py-2.5 pr-10 text-sm font-medium text-white/90 cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id} style={{ background: '#0f172a', color: '#e2e8f0' }}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            )}

            {roadmapLoading ? (
              <div className="card p-8 text-center">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-white/40">Loading roadmap...</p>
              </div>
            ) : (
              <TopicRoadmap
                topics={roadmap}
                title="Study Roadmap"
                subtitle={
                  classes.length > 1
                    ? (classes.find(c => c.id === selectedRoadmapClass)?.name || 'Current Course Progress')
                    : 'Current Course Progress'
                }
              />
            )}

            {!roadmapLoading && roadmap.filter(t => t.status === 'completed').length > 0 && (
              <motion.div
                className="card p-4 mt-4 border border-green-500/20"
                style={{ background: 'rgba(34,197,94,0.06)' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <p className="text-sm text-green-300">
                  Keep it up! You're {Math.round(
                    (roadmap.filter(t => t.status === 'completed').length / roadmap.length) * 100
                  )}% through the course.
                </p>
              </motion.div>
            )}
          </div>
        </div>
        </>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            {analyticsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="card p-4 h-24 animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
                ))}
              </div>
            ) : !analytics ? (
              <div className="card p-16 text-center">
                <TrendingUp className="w-12 h-12 text-indigo-400/40 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white/60 mb-2">No analytics yet</h3>
                <p className="text-white/30 text-sm">Complete study sessions and quizzes to unlock your analytics</p>
              </div>
            ) : (<>

            {/* Compute fallbacks: new backend has topicBreakdown/quizHistory,
                old backend has topicPerformance/quizTimeline — support both */}
            {(() => {
              // Normalise topicBreakdown — fall back to topicPerformance shape
              if (!analytics.topicBreakdown || analytics.topicBreakdown.length === 0) {
                analytics._topicBreakdown = (analytics.topicPerformance || []).map(t => ({
                  topicName: t.name,
                  className: t.className,
                  masteryScore: t.finalQuizScore ?? (t.status === 'completed' ? 80 : t.sessionsCount > 0 ? 40 : 0),
                  masteryTier: t.status === 'completed' ? 'mastered' : t.sessionsCount > 0 ? 'developing' : 'not_started',
                  quizScore: t.finalQuizScore ?? null,
                  quizAttempts: t.quizAttempts || 0,
                  sessionCount: t.sessionsCount || 0,
                  totalMinutes: t.totalMinutes || 0,
                })).sort((a, b) => b.masteryScore - a.masteryScore);
              } else {
                analytics._topicBreakdown = analytics.topicBreakdown;
              }
              // Normalise quizHistory — fall back to quizTimeline shape
              if (!analytics.quizHistory || analytics.quizHistory.length === 0) {
                analytics._quizHistory = (analytics.quizTimeline || []).map(r => ({
                  topicName: r.topic,
                  score: r.score,
                  passed: r.passed,
                  date: r.date,
                  attemptNumber: r.attempt || 1,
                }));
              } else {
                analytics._quizHistory = analytics.quizHistory;
              }
              // Normalise dailyActivity — fall back to studyActivity (sparse)
              if (!analytics.dailyActivity || analytics.dailyActivity.length === 0) {
                const actMap = {};
                (analytics.studyActivity || []).forEach(d => { actMap[d.date] = d.minutes; });
                analytics._dailyActivity = Array.from({ length: 28 }, (_, i) => {
                  const d = new Date(); d.setDate(d.getDate() - (27 - i));
                  const key = d.toISOString().split('T')[0];
                  return { date: key, minutes: actMap[key] || 0 };
                });
              } else {
                analytics._dailyActivity = analytics.dailyActivity;
              }
              return null;
            })()}

            {/* ROW 1: Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {(() => {
                const tc = analytics.summary?.completedTopics ?? stats?.topicsCompleted?.completed ?? 0;
                const tt = analytics.summary?.totalTopics ?? stats?.topicsCompleted?.total ?? 0;
                const sh = Math.round((analytics.summary?.totalStudyMinutes ?? 0) / 60 * 10) / 10;
                const qs = analytics.summary?.avgQuizScore ?? 0;
                const conf = stats?.avgConfidence ?? 0;
                const cards = [
                  { label: 'Topics Completed', value: `${tc}/${tt}`, color: '#34d399', icon: BookOpen, percent: tt > 0 ? (tc / tt) * 100 : 0, sparklineData: trend.map(d => d.sessions) },
                  { label: 'Study Hours', value: `${sh}h`, color: '#818cf8', icon: Clock, percent: Math.min(sh / 10 * 100, 100), sparklineData: trend.map(d => d.minutes) },
                  { label: 'Day Streak', value: stats?.currentStreak ?? 0, color: '#f97316', icon: Flame, percent: Math.min((stats?.currentStreak ?? 0) / 7 * 100, 100) },
                  { label: 'Quizzes Taken', value: analytics.summary?.totalQuizzesTaken ?? 0, color: '#22d3ee', icon: ClipboardList, percent: 100 },
                  { label: 'Avg Quiz Score', value: `${qs}%`, color: qs >= 70 ? '#34d399' : qs >= 40 ? '#fbbf24' : '#f87171', icon: Award, percent: qs },
                  { label: 'Avg Confidence', value: `${conf}%`, color: conf >= 70 ? '#34d399' : conf >= 40 ? '#fbbf24' : '#f87171', icon: Lightbulb, percent: conf },
                ];
                return cards.map((stat, i) => {
                  const Icon = stat.icon;
                  return (
                    <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="card p-4 text-center">
                      <div className="h-5 flex items-center justify-center mb-1">
                        {Icon && <Icon className="w-5 h-5" style={{ color: stat.color }} />}
                      </div>
                      <p className="text-white/50 text-[10px] uppercase tracking-wider mb-1">{stat.label}</p>
                      <p className="text-2xl font-bold text-white">{stat.value}</p>
                      <div className="mt-2 h-1 rounded-full bg-white/[0.06]">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(stat.percent, 100)}%`, background: stat.color }} />
                      </div>
                      {stat.sparklineData && stat.sparklineData.length > 0 && (
                        <div className="mt-3 flex justify-center">
                          <Sparkline data={stat.sparklineData} color={stat.color} width={80} height={24} />
                        </div>
                      )}
                    </motion.div>
                  );
                });
              })()}
            </div>

            {/* ROW 2: Topic Mastery Breakdown + Quiz Performance Over Time */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Left: Topic Mastery Breakdown */}
              <motion.div className="card p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <h3 className="text-lg font-bold text-white mb-1">Topic Mastery Breakdown</h3>
                <p className="text-white/40 text-xs mb-5">All topics from your study plans, sorted by mastery</p>
                {analytics._topicBreakdown && analytics._topicBreakdown.length > 0 ? (
                  <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                    {analytics._topicBreakdown.map((t, idx) => {
                      const tierColor = t.masteryTier === 'mastered' ? '#34d399'
                        : t.masteryTier === 'proficient' ? '#818cf8'
                        : t.masteryTier === 'developing' ? '#fbbf24'
                        : t.masteryTier === 'emerging' ? '#f97316'
                        : '#475569';
                      const tierLabel = t.masteryTier === 'not_started' ? 'Not Started'
                        : t.masteryTier.charAt(0).toUpperCase() + t.masteryTier.slice(1);
                      return (
                        <div key={idx}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm text-white/80 truncate max-w-[55%]" title={t.topicName}>{t.topicName}</span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${tierColor}22`, color: tierColor, border: `1px solid ${tierColor}44` }}>{tierLabel}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                              <motion.div
                                className="h-full rounded-full"
                                style={{ background: tierColor }}
                                initial={{ width: 0 }}
                                animate={{ width: `${t.masteryScore}%` }}
                                transition={{ duration: 0.8, delay: 0.1 + idx * 0.04 }}
                              />
                            </div>
                            <span className="text-xs font-bold text-white/70 w-8 text-right">{t.masteryScore}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <BookOpen className="w-10 h-10 text-white/10 mb-3" />
                    <p className="text-white/30 text-sm text-center">No topics in your study plans yet.<br />Generate a study plan to see mastery.</p>
                  </div>
                )}
              </motion.div>

              {/* Right: Quiz Performance Over Time */}
              <motion.div className="card p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <h3 className="text-lg font-bold text-white mb-1">Quiz Performance Over Time</h3>
                <p className="text-white/40 text-xs mb-5">Your quiz scores plotted chronologically — dashed line is pass threshold (70%)</p>
                {analytics._quizHistory && analytics._quizHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={analytics._quizHistory} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="quizGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.5} />
                          <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" style={{ fontSize: '10px' }}
                        tickFormatter={d => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })} />
                      <YAxis domain={[0, 100]} stroke="rgba(255,255,255,0.3)" style={{ fontSize: '11px' }} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="border border-white/[0.08] rounded-xl p-3" style={{ background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(12px)' }}>
                                <p className="text-white text-xs font-bold mb-1">{d.topicName}</p>
                                <p className="text-white/60 text-xs">{new Date(d.date).toLocaleDateString()} &bull; Score: <span className={d.passed ? 'text-emerald-400' : 'text-red-400'}>{d.score}%</span> &bull; Attempt #{d.attemptNumber}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <ReferenceLine y={70} stroke="rgba(251,191,36,0.5)" strokeDasharray="5 5"
                        label={{ value: 'Pass: 70%', position: 'insideTopRight', fill: 'rgba(251,191,36,0.7)', fontSize: 10 }} />
                      <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2}
                        fill="url(#quizGrad)" dot={{ r: 4, fill: '#818cf8', strokeWidth: 0 }}
                        activeDot={{ r: 6, fill: '#34d399', strokeWidth: 0 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center" style={{ height: 280 }}>
                    <Award className="w-12 h-12 text-white/10 mb-3" />
                    <p className="text-white/30 text-sm text-center">Complete your first quiz to see your performance trends</p>
                  </div>
                )}
              </motion.div>
            </div>

            {/* ROW 3: Study Activity Heatmap + Focus Recommendations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Left: 28-day Heatmap */}
              <motion.div className="card p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <h3 className="text-lg font-bold text-white mb-1">Study Activity</h3>
                <p className="text-white/40 text-xs mb-5">Last 4 weeks of study activity</p>
                {analytics._dailyActivity && analytics._dailyActivity.some(d => d.minutes > 0) ? (() => {
                  const totalMin = analytics._dailyActivity.reduce((s, d) => s + d.minutes, 0);
                  const activeDays = analytics._dailyActivity.filter(d => d.minutes > 0).length;
                  return (
                    <>
                      <div className="mb-3">
                        <div className="grid grid-cols-7 gap-1 mb-1">
                          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                            <div key={i} className="text-center text-[9px] text-white/30">{d}</div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                          {analytics._dailyActivity.map((day, idx) => {
                            let bg = 'rgba(255,255,255,0.03)';
                            if (day.minutes >= 45) bg = '#6366f1';
                            else if (day.minutes >= 15) bg = 'rgba(99,102,241,0.55)';
                            else if (day.minutes > 0)  bg = 'rgba(99,102,241,0.25)';
                            return (
                              <div key={idx} title={`${day.date}: ${day.minutes} min`}
                                className="aspect-square rounded-sm transition-opacity hover:opacity-80"
                                style={{ background: bg }} />
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mb-4">
                        {[
                          { label: 'None', bg: 'rgba(255,255,255,0.03)' },
                          { label: '1-15m', bg: 'rgba(99,102,241,0.25)' },
                          { label: '15-45m', bg: 'rgba(99,102,241,0.55)' },
                          { label: '45m+', bg: '#6366f1' },
                        ].map(l => (
                          <div key={l.label} className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-sm" style={{ background: l.bg }} />
                            <span className="text-[9px] text-white/40">{l.label}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-center text-xs text-white/40 border-t border-white/[0.06] pt-3">
                        Total: <span className="text-white/70 font-semibold">{Math.round(totalMin / 60 * 10) / 10}h</span> across <span className="text-white/70 font-semibold">{activeDays} days</span>
                      </p>
                    </>
                  );
                })() : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Clock className="w-10 h-10 text-white/10 mb-3" />
                    <p className="text-white/30 text-sm text-center">Start a study session to build your activity heatmap</p>
                  </div>
                )}
              </motion.div>

              {/* Right: Focus Recommendations */}
              <motion.div className="card p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                <h3 className="text-lg font-bold text-white mb-1">Focus Recommendations</h3>
                <p className="text-white/40 text-xs mb-5">Personalised suggestions based on your data</p>
                <div className="space-y-3">
                  {(() => {
                    const recs = [];
                    const breakdown = analytics._topicBreakdown || [];
                    const streak = stats?.currentStreak ?? 0;

                    if (streak === 0)
                      recs.push({ icon: '&#128293;', title: 'Build a streak', desc: 'Start a session today — daily practice makes the biggest difference.' });

                    breakdown.filter(t => (t.masteryTier === 'emerging' || t.masteryScore < 40) && t.masteryScore < 80)
                      .slice(0, 2)
                      .forEach(t => recs.push({ icon: '&#128204;', title: t.topicName, desc: `Mastery is ${t.masteryScore}%. A focused revision session would help.` }));

                    breakdown.filter(t => t.quizAttempts > 0 && t.quizScore !== null && t.quizScore < 70)
                      .slice(0, 1)
                      .forEach(t => recs.push({ icon: '&#128260;', title: t.topicName, desc: `You scored ${t.quizScore}% on the quiz. Review and retry to pass!` }));

                    if (recs.length === 0 && breakdown.length > 0 && breakdown.every(t => t.masteryTier === 'mastered'))
                      recs.push({ icon: '&#127881;', title: 'Amazing work!', desc: "You've mastered all topics in your current plans." });

                    if (recs.length === 0)
                      recs.push({ icon: '&#128161;', title: 'Keep it up', desc: "You're making steady progress. Keep going with your study roadmap!" });

                    return recs.slice(0, 4).map((r, idx) => (
                      <div key={idx} className="flex items-start gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-white/[0.03]"
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <span className="text-xl mt-0.5" dangerouslySetInnerHTML={{ __html: r.icon }} />
                        <div>
                          <p className="text-sm font-bold text-white mb-0.5">{r.title}</p>
                          <p className="text-xs text-white/50 leading-relaxed">{r.desc}</p>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </motion.div>
            </div>
            </>)}
          </div>
        )}

      </main>
      </div>

      {/* Join Class Modal */}
      <JoinClassModal
        isOpen={joinModalOpen}
        onClose={() => {
          setJoinModalOpen(false);
          setJoinError('');
        }}
        onJoin={handleJoinClass}
      />
    </div>
  );
};

export default StudentDashboard;
