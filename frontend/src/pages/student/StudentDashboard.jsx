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
import classService from '../../services/classService';
import sessionService from '../../services/sessionService';

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
          progress: cls.progress || 0, // Populated by /enrolled backend
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

    fetchClasses();
    fetchDashboard();
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

  const startNewSession = async (classId) => {
    try {
      const response = await sessionService.startSession(classId);
      const newSession = response.data;
      toast.success('Study session started!');
      navigate(`/student/session/${newSession._id || newSession.id}`);
    } catch (err) {
      console.error('Start session error:', err);
      toast.error(err.response?.data?.message || 'Failed to start session');
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
    <div className="min-h-screen bg-slate-900">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-50 mb-2">Dashboard</h1>
          <p className="text-slate-400">Welcome back! Continue your learning journey</p>
        </div>

        {/* Stats Row */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {statCards.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={index}
                  className="card p-6 text-center hover:bg-slate-700/50 transition-colors"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="flex justify-center mb-3">
                    <Icon className="w-8 h-8 text-indigo-400" />
                  </div>
                  <p className="text-3xl font-bold text-slate-50 mb-1">{stat.value}</p>
                  <p className="text-sm text-slate-400">{stat.label}</p>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Continue Learning Banner */}
        {sessions.length > 0 && (
          <motion.div
            className="mb-8 card p-6 bg-gradient-to-r from-indigo-600/20 to-cyan-600/20 border-indigo-500/30 cursor-pointer hover:from-indigo-600/30 hover:to-cyan-600/30 transition-all duration-200"
            onClick={() => resumeSession(sessions[0].id)}
            whileHover={{ scale: 1.01 }}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-50 mb-1 flex items-center gap-2">
                  <BookMarked className="w-5 h-5" />
                  {sessions[0].topicName}
                </h3>
                <p className="text-sm text-slate-300 mb-2">{sessions[0].lastContext}</p>
                <p className="text-xs text-slate-400">
                  {sessions[0].className} • Session {sessions[0].sessionNumber}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  resumeSession(sessions[0].id);
                }}
                className="btn-primary whitespace-nowrap"
              >
                Resume →
              </button>
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
                <h2 className="text-2xl font-bold text-slate-50">My Classes</h2>
                <button
                  onClick={() => setJoinModalOpen(true)}
                  className="btn-primary text-sm flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Join Class
                </button>
              </div>

              {loadingClasses ? (
                <div className="text-center py-8">
                  <svg className="w-8 h-8 animate-spin mx-auto text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              ) : classes.length === 0 ? (
                <div className="card p-8 text-center">
                  <p className="text-slate-400 mb-4">No classes yet</p>
                  <button
                    onClick={() => setJoinModalOpen(true)}
                    className="btn-primary"
                  >
                    Join your first class
                  </button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {classes.map((cls, idx) => (
                    <motion.div
                      key={cls.id}
                      className="card p-5 hover:bg-slate-700/50 transition-colors"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
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

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startNewSession(cls.id);
                        }}
                        className="btn-primary text-sm w-full flex items-center justify-center gap-2"
                      >
                        <Play className="w-4 h-4" />
                        Start Study Session
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </section>

            {/* Weak Areas Section */}
            {weakAreas.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-slate-50 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-6 h-6 text-amber-500" />
                  Weak Areas
                </h2>
                <div className="grid gap-4">
                  {weakAreas.map((area, idx) => (
                    <motion.div
                      key={idx}
                      className="card p-4 border-l-4 border-l-amber-500 bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-slate-50">{area.topic}</h4>
                          <p className="text-xs text-slate-400 mt-1">
                            You found this difficult. Practice to improve!
                          </p>
                        </div>
                        <button
                          onClick={() => navigate(`/student/practice/${area.topicId}`)}
                          className="btn-primary text-sm whitespace-nowrap ml-4"
                        >
                          Practice →
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
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
                className="card p-4 mt-4 bg-green-600/10 border-green-600/30"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <p className="text-sm text-green-300">
                  ✓ Keep it up! You're {Math.round(
                    (roadmap.filter(t => t.status === 'completed').length / roadmap.length) * 100
                  )}% through the course.
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </main>

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
