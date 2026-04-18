import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Clock, Flame, Lightbulb, BookMarked, GraduationCap, Pin, AlertTriangle, Plus, Play } from 'lucide-react';
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
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joiningClass, setJoiningClass] = useState(false);
  const [activeStatuses, setActiveStatuses] = useState({});

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

    fetchClasses();
    fetchDashboard();
    fetchActiveStatus();
  }, []);

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
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-50 mb-2">Dashboard</h1>
          <p className="text-sm sm:text-base text-slate-400">Welcome back! Continue your learning journey</p>
        </div>

        {/* Stats Row */}
        {loadingDashboard ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map(i => <StatCardSkeleton key={i} />)}
          </div>
        ) : stats && (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
            variants={containerVariants}
            initial="initial"
            animate="animate"
          >
            {statCards.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={index}
                  className="card p-6 text-center hover:border-white/[0.12] transition-all duration-300"
                  variants={itemVariants}
                >
                  <div className="flex justify-center mb-3">
                    <Icon className="w-8 h-8 text-indigo-400" />
                  </div>
                  <p className="text-3xl font-bold text-slate-50 mb-1">{stat.value}</p>
                  <p className="text-sm text-slate-400">{stat.label}</p>
                </motion.div>
              );
            })}
          </motion.div>
        )}

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
            <TopicRoadmap
              topics={roadmap}
              title="Study Roadmap"
              subtitle="Current Course Progress"
            />
            {roadmap.filter(t => t.status === 'completed').length > 0 && (
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
