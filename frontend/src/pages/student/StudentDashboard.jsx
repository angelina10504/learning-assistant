import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Clock, Flame, Lightbulb, BookMarked, GraduationCap, Pin, AlertTriangle, Plus, Play, TrendingUp, ClipboardList, Award } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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
    },
    {
      icon: Clock,
      label: 'Study Hours',
      value: `${stats?.studyHours}h`,
    },
    {
      icon: Flame,
      label: 'Day Streak',
      value: stats?.currentStreak,
    },
    {
      icon: Lightbulb,
      label: 'Avg Confidence',
      value: `${stats?.avgConfidence}%`,
    },
  ];

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

        {/* ── ANALYTICS TAB ── */}
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            {analyticsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="card p-4 h-24 animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
                ))}
              </div>
            ) : !analytics || (analytics.topicPerformance.length === 0 && analytics.quizTimeline.length === 0) ? (
              <div className="card p-16 text-center">
                <TrendingUp className="w-12 h-12 text-indigo-400/40 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white/60 mb-2">No analytics yet</h3>
                <p className="text-white/30 text-sm">Complete study sessions and quizzes to unlock your analytics</p>
              </div>
            ) : (<>

            {/* Summary Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Topics Completed', value: `${stats?.topicsCompleted?.completed ?? 0}/${stats?.topicsCompleted?.total ?? 0}`, color: '#34d399', icon: BookOpen },
                { label: 'Study Hours', value: `${Math.round(analytics.summary.totalStudyMinutes / 60 * 10) / 10}h`, color: '#818cf8', icon: Clock },
                { label: 'Day Streak', value: stats?.currentStreak ?? 0, color: '#f97316', icon: Flame },
                { label: 'Quizzes Taken', value: analytics.summary.totalQuizzesTaken, color: '#22d3ee', icon: ClipboardList },
                { label: 'Avg Quiz Score', value: `${analytics.summary.avgQuizScore}%`, color: '#fbbf24', icon: Award },
                { label: 'Avg Confidence', value: `${stats?.avgConfidence ?? 0}%`, color: '#a78bfa', icon: Lightbulb },
              ].map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className="card p-4 text-center"
                  >
                    {/* Fixed-height icon slot so all cards align */}
                    <div className="h-5 flex items-center justify-center mb-1">
                      {Icon ? <Icon className="w-5 h-5" style={{ color: stat.color }} /> : null}
                    </div>
                    <p className="text-white/50 text-[10px] uppercase tracking-wider mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                    <div className="mt-2 h-1 rounded-full bg-white/[0.06]">
                      <div className="h-full rounded-full" style={{ width: '60%', background: stat.color }} />
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Row 1: Mastery Donut + Topic Quiz Scores */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Mastery Distribution Donut */}
              <motion.div
                className="card p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h3 className="text-lg font-bold text-white mb-6">My Mastery Distribution</h3>
                {(() => {
                  const pieData = Object.entries(analytics.tierCounts)
                    .filter(([, v]) => v > 0)
                    .map(([name, value]) => ({ name, value }));
                  const COLORS = { Mastered: '#34d399', Proficient: '#818cf8', Developing: '#60a5fa', Emerging: '#fbbf24', 'Not Started': '#475569' };
                  const total = pieData.reduce((s, d) => s + d.value, 0);

                  return pieData.length > 0 ? (
                    <div className="flex items-center justify-center gap-8">
                      <ResponsiveContainer width={180} height={180}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={75}
                            paddingAngle={3}
                            dataKey="value"
                            stroke="none"
                          >
                            {pieData.map((entry) => (
                              <Cell key={entry.name} fill={COLORS[entry.name]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}
                            itemStyle={{ color: '#f1f5f9' }}
                            formatter={(value) => [`${value} (${Math.round(value / total * 100)}%)`, '']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2">
                        {pieData.map(d => (
                          <div key={d.name} className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full" style={{ background: COLORS[d.name] }} />
                            <span className="text-sm text-white/70">{d.name}</span>
                            <span className="text-sm font-bold text-white ml-auto">{d.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-white/40 text-center py-8">No mastery data yet — complete some topics first</p>
                  );
                })()}
              </motion.div>

              {/* Topic Performance Bar Chart */}
              <motion.div
                className="card p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h3 className="text-lg font-bold text-white mb-6">Topic Quiz Scores</h3>
                {analytics.topicPerformance.filter(t => t.finalQuizScore != null).length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={analytics.topicPerformance.filter(t => t.finalQuizScore != null)} layout="vertical" margin={{ left: 20 }}>
                      <defs>
                        <linearGradient id="studentBarGrad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="#22d3ee" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} stroke="rgba(255,255,255,0.3)" style={{ fontSize: '11px' }} />
                      <YAxis type="category" dataKey="name" width={100} stroke="rgba(255,255,255,0.3)" style={{ fontSize: '11px' }} tick={{ fill: 'rgba(255,255,255,0.6)' }} />
                      <Tooltip
                        contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}
                        itemStyle={{ color: '#f1f5f9' }}
                        formatter={(value) => [`${value}%`, 'Quiz Score']}
                      />
                      <Bar dataKey="finalQuizScore" fill="url(#studentBarGrad)" radius={[0, 6, 6, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-white/40 text-center py-8">No quiz scores yet — complete topic assessments</p>
                )}
              </motion.div>
            </div>

            {/* Row 2: Study Activity + Quiz Score Trend */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Study Activity Over Time */}
              <motion.div
                className="card p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <h3 className="text-lg font-bold text-white mb-6">Study Activity</h3>
                {analytics.studyActivity.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={analytics.studyActivity}>
                      <defs>
                        <linearGradient id="activityGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.6} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" style={{ fontSize: '10px' }} tickFormatter={(d) => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })} />
                      <YAxis stroke="rgba(255,255,255,0.3)" style={{ fontSize: '11px' }} />
                      <Tooltip
                        contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}
                        itemStyle={{ color: '#f1f5f9' }}
                        labelFormatter={(d) => new Date(d).toLocaleDateString()}
                        formatter={(value, name) => [name === 'minutes' ? `${value} min` : value, name === 'minutes' ? 'Study Time' : 'Messages']}
                      />
                      <Area type="monotone" dataKey="minutes" stroke="#6366f1" fillOpacity={1} fill="url(#activityGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-white/40 text-center py-8">Start studying to see your activity trend</p>
                )}
              </motion.div>

              {/* Quiz Score Trend */}
              <motion.div
                className="card p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <h3 className="text-lg font-bold text-white mb-6">Quiz Score Trend</h3>
                {analytics.quizTimeline.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={analytics.quizTimeline}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" style={{ fontSize: '10px' }} tickFormatter={(d) => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })} />
                      <YAxis domain={[0, 100]} stroke="rgba(255,255,255,0.3)" style={{ fontSize: '11px' }} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="border border-white/[0.08] rounded-xl p-3" style={{ background: 'rgba(15,23,42,0.95)' }}>
                                <p className="text-white text-sm font-bold">{data.topic}</p>
                                <p className="text-white/60 text-xs">Score: {data.score}% &bull; {data.passed ? 'Passed' : 'Failed'} &bull; Attempt #{data.attempt}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Line type="monotone" dataKey="score" stroke="#22d3ee" strokeWidth={2} dot={{ fill: '#22d3ee', r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: '#22d3ee' }} />
                      <Line type="monotone" dataKey={() => 70} stroke="rgba(251,191,36,0.3)" strokeDasharray="5 5" dot={false} name="Pass Threshold" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-white/40 text-center py-8">Take quizzes to see your score trend</p>
                )}
              </motion.div>
            </div>

            {/* Topic Breakdown Table */}
            <motion.div
              className="card p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <h3 className="text-lg font-bold text-white mb-6">Topic Breakdown</h3>
              {analytics.topicPerformance.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        <th className="text-left py-3 px-4 text-white/50 text-xs uppercase tracking-wider font-semibold">Topic</th>
                        <th className="text-left py-3 px-4 text-white/50 text-xs uppercase tracking-wider font-semibold">Status</th>
                        <th className="text-left py-3 px-4 text-white/50 text-xs uppercase tracking-wider font-semibold">Sessions</th>
                        <th className="text-left py-3 px-4 text-white/50 text-xs uppercase tracking-wider font-semibold">Time</th>
                        <th className="text-left py-3 px-4 text-white/50 text-xs uppercase tracking-wider font-semibold">In-Session Accuracy</th>
                        <th className="text-left py-3 px-4 text-white/50 text-xs uppercase tracking-wider font-semibold">Quiz Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.topicPerformance.map((topic, idx) => {
                        const statusColors = {
                          completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                          in_progress: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                          needs_review: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                          pending: 'bg-white/[0.04] text-white/40 border-white/[0.06]',
                        };
                        const accuracy = topic.inSessionTotal > 0 ? Math.round(topic.inSessionCorrect / topic.inSessionTotal * 100) : null;

                        return (
                          <tr key={idx} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                            <td className="py-3 px-4">
                              <p className="text-white text-sm font-medium">{topic.name}</p>
                              <p className="text-white/30 text-xs">{topic.className}</p>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`text-xs px-2 py-1 rounded-full border ${statusColors[topic.status] || statusColors.pending}`}>
                                {topic.status?.replace('_', ' ') || 'pending'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-white/80 text-sm">{topic.sessionsCount}</td>
                            <td className="py-3 px-4 text-white/80 text-sm">{topic.totalMinutes}m</td>
                            <td className="py-3 px-4">
                              {accuracy !== null ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-12 h-1.5 rounded-full bg-white/[0.06]">
                                    <div className="h-full rounded-full" style={{ width: `${accuracy}%`, background: accuracy >= 70 ? '#34d399' : accuracy >= 40 ? '#fbbf24' : '#f87171' }} />
                                  </div>
                                  <span className="text-white/80 text-sm">{accuracy}%</span>
                                </div>
                              ) : (
                                <span className="text-white/30 text-sm">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {topic.finalQuizScore != null ? (
                                <span className={`text-sm font-bold ${topic.finalQuizScore >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                  {topic.finalQuizScore}%
                                </span>
                              ) : (
                                <span className="text-white/30 text-sm">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-white/40 text-center py-8">No topic data yet</p>
              )}
            </motion.div>
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
