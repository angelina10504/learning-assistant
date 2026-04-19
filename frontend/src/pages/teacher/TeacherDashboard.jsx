import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, BookOpen, BarChart3, AlertTriangle, Plus, BookMarked, Download, Trophy, Medal, Copy } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/shared/Navbar';
import Badge from '../../components/shared/Badge';
import ProgressBar from '../../components/shared/ProgressBar';
import { CardSkeleton, StatCardSkeleton } from '../../components/ui/Skeleton';
import Button from '../../components/ui/Button';
import classService from '../../services/classService';
import CreateClassModal from './CreateClassModal';

const containerVariants = {
  animate: { transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [alertsSummary, setAlertsSummary] = useState({ totalWeakTopics: 0, totalInterventions: 0 });
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const classesResponse = await classService.getTeachingClasses();
      const classesData = classesResponse.data || [];

      const mappedClasses = (Array.isArray(classesData) ? classesData : []).map(cls => ({
        ...cls,
        id: cls._id || cls.id,
        studentCount: cls.studentCount || cls.students?.length || 0,
        materialCount: cls.materialCount || cls.materials?.length || 0,
        avgCompletion: cls.avgCompletion || 0,
      }));

      setClasses(mappedClasses);

      try {
        const analyticsResponse = await classService.getClassAnalytics('all');
        const data = analyticsResponse.data || {};
        const totalStudents = new Set(classesData.flatMap(c => c.students.map(s => s._id || s))).size;
        data.totalStudentsFromAPI = totalStudents;
        setAnalytics(data);
      } catch (analyticsErr) {
        console.error('Failed to load aggregate analytics', analyticsErr);
        setAnalytics({});
      }

      try {
        const alertsResponse = await classService.getAlertsSummary();
        setAlertsSummary(alertsResponse.data || { totalWeakTopics: 0, totalInterventions: 0 });
      } catch (alertsErr) {
        console.error('Failed to load alerts summary', alertsErr);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load dashboard data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleClassCreated = (newClass) => {
    const mappedClass = {
      ...newClass,
      id: newClass._id || newClass.id
    };
    setClasses([...classes, mappedClass]);
    setShowCreateModal(false);
    toast.success('Class created!');
  };

  const handleCopyClassCode = (classCode, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(classCode);
    toast.success('Class code copied to clipboard!');
  };

  const handleExportAnalytics = async () => {
    try {
      const response = await classService.exportCSV('all');
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('CSV exported!');
    } catch (err) {
      console.error('Error exporting analytics:', err);
      toast.error('Unable to export analytics. Please try again.');
    }
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 70) return 'green';
    if (percentage >= 50) return 'amber';
    return 'red';
  };

  const totalStudents = analytics?.totalStudentsFromAPI !== undefined
    ? analytics.totalStudentsFromAPI
    : classes.reduce((sum, c) => sum + (c.studentCount || 0), 0);
  const avgCompletion =
    classes.filter(c => c.studentCount > 0).length > 0
      ? Math.round(
          classes
            .filter(c => c.studentCount > 0)
            .reduce((sum, c) => sum + (c.avgCompletion || 0), 0) /
          classes.filter(c => c.studentCount > 0).length
        )
      : 0;
  const weakTopics = analytics?.weakTopics || [];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div
          className="border border-white/[0.08] rounded-xl p-3 shadow-lg"
          style={{ background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(12px)' }}
        >
          <p className="text-slate-300 text-sm font-medium">{payload[0].payload.name}</p>
          <p className="text-indigo-400 text-sm font-bold">{payload[0].value}%</p>
        </div>
      );
    }
    return null;
  };

  const statItems = [
    {
      label: 'Total Students',
      value: totalStudents,
      icon: Users,
      color: 'from-indigo-500/20 to-indigo-600/20',
    },
    {
      label: 'Active Classes',
      value: classes.length,
      icon: BookOpen,
      color: 'from-cyan-500/20 to-cyan-600/20',
    },
    {
      label: 'Avg Completion',
      value: `${avgCompletion}%`,
      icon: BarChart3,
      color: 'from-violet-500/20 to-violet-600/20',
    },
    {
      label: 'Weak Topics Flagged',
      value: alertsSummary.totalWeakTopics,
      icon: AlertTriangle,
      color: 'from-orange-500/20 to-orange-600/20',
      action: () => {
        if (classes.length > 0) {
          navigate(`/teacher/class/${classes[0].id}?tab=alerts`);
        }
      }
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
        {/* Top Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-50 mb-2">Dashboard</h1>
            <p className="text-sm sm:text-base text-slate-400">Welcome back, {user?.name}. Here's your teaching overview.</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus size={20} /> Create Class
          </Button>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300">
            {error}
          </div>
        )}

        {/* Stats Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map(i => <StatCardSkeleton key={i} />)}
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
            variants={containerVariants}
            initial="initial"
            animate="animate"
          >
            {statItems.map((stat, index) => {
              const IconComponent = stat.icon;
              const iconColors = ['rgba(99,102,241', 'rgba(34,211,238', 'rgba(167,139,250', 'rgba(251,191,36'];
              const iconC = iconColors[index] || iconColors[0];
              const iconTextColors = ['text-indigo-400', 'text-cyan-400', 'text-violet-400', 'text-amber-400'];
              return (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  whileHover={{ y: -2 }}
                  onClick={stat.action}
                  className={stat.action ? 'cursor-pointer' : ''}
                >
                  <div className="card p-6 hover:border-white/[0.12] transition-all duration-300">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-white/50 text-sm font-medium mb-1">{stat.label}</p>
                        <p className="text-3xl sm:text-4xl font-bold text-slate-50">{stat.value}</p>
                      </div>
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: `${iconC},0.1)`, border: `1px solid ${iconC},0.2)` }}
                      >
                        <IconComponent className={`w-5 h-5 ${iconTextColors[index]}`} />
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Left: Your Classes */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-50 mb-4">Your Classes</h2>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
                </div>
              ) : classes.length === 0 ? (
                <div className="card p-8 text-center flex flex-col items-center">
                  <BookOpen className="w-12 h-12 text-slate-500 mb-4" />
                  <h3 className="text-lg font-bold text-slate-300 mb-1">No classes yet</h3>
                  <p className="text-slate-500 mb-4">Create your first class to get started.</p>
                  <Button onClick={() => setShowCreateModal(true)}>
                    <Plus size={20} /> Create Class
                  </Button>
                </div>
              ) : (
                <motion.div
                  className="space-y-4"
                  variants={containerVariants}
                  initial="initial"
                  animate="animate"
                >
                  {classes.map((cls) => (
                    <motion.div
                      key={cls.id}
                      variants={itemVariants}
                      whileHover={{ y: -2 }}
                      onClick={() => navigate(`/teacher/class/${cls.id}`)}
                      className="card p-6 hover:border-white/[0.12] transition-all cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-base sm:text-lg font-semibold text-slate-50">{cls.name}</h3>
                          <Badge
                            color="indigo"
                            className="mt-2 cursor-pointer hover:bg-indigo-600 transition-colors"
                            onClick={(e) => handleCopyClassCode(cls.classCode, e)}
                          >
                            <span className="font-mono text-xs">{cls.classCode || 'CODE'}</span>
                            <Copy size={12} className="ml-1 inline" />
                          </Badge>
                        </div>
                        <BookMarked className="w-8 h-8 text-slate-400" />
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                        <div>
                          <p className="text-slate-400 mb-1">Students</p>
                          <p className="text-lg font-semibold text-slate-50">
                            {cls.studentCount || 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400 mb-1">Materials</p>
                          <p className="text-lg font-semibold text-slate-50">
                            {cls.materialCount || 0}
                          </p>
                        </div>
                      </div>

                      {cls.studentCount > 0 && (
                        <div className="mb-3">
                          <div className="flex justify-between items-center mb-2">
                            <p className="text-sm text-slate-400">Progress</p>
                            <p className="text-sm font-semibold text-slate-50">
                              {cls.avgCompletion || 0}%
                            </p>
                          </div>
                          <ProgressBar
                            value={cls.avgCompletion || 0}
                            color={getProgressColor(cls.avgCompletion || 0)}
                          />
                        </div>
                      )}

                      <p className="text-xs text-slate-400">
                        Click to view details and manage class
                      </p>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Class-Wide Weak Areas */}
            <div>
              <h2 className="text-xl font-bold text-slate-50 mb-4">Class-Wide Weak Areas</h2>
              {weakTopics.length === 0 ? (
                <div className="card p-6 text-center flex flex-col items-center">
                  <AlertTriangle className="w-12 h-12 text-slate-500 mb-3" />
                  <h3 className="text-base font-bold text-slate-300 mb-1">All topics looking strong!</h3>
                  <p className="text-slate-500 text-sm">No weak areas detected across your classes.</p>
                </div>
              ) : (
                <motion.div
                  className="space-y-3"
                  variants={containerVariants}
                  initial="initial"
                  animate="animate"
                >
                  {weakTopics.slice(0, 5).map((topic, idx) => (
                    <motion.div
                      key={idx}
                      variants={itemVariants}
                      className="card p-4 border-l-4 border-red-500"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-slate-50 text-sm">{topic.name}</h4>
                        <Badge color="red" className="text-xs">
                          {topic.strugglingCount || 0} struggling
                        </Badge>
                      </div>
                      <ProgressBar
                        value={topic.avgConfidence || 0}
                        max={100}
                        color="red"
                        height="h-1"
                      />
                      <p className="text-xs text-slate-400 mt-2">
                        Avg Confidence: {topic.avgConfidence || 0}%
                      </p>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>

            {/* Top Performers */}
            <div>
              <h2 className="text-xl font-bold text-slate-50 mb-4">Top Performers</h2>
              {(!analytics?.topPerformers || analytics.topPerformers.length === 0) ? (
                <div className="card p-6 text-center flex flex-col items-center">
                  <Trophy className="w-12 h-12 text-slate-500 mb-3" />
                  <h3 className="text-base font-bold text-slate-300 mb-1">No data yet</h3>
                  <p className="text-slate-500 text-sm">Performance data will appear as students study.</p>
                </div>
              ) : (
                <motion.div
                  className="space-y-2"
                  variants={containerVariants}
                  initial="initial"
                  animate="animate"
                >
                  {(analytics?.topPerformers || []).slice(0, 5).map((student, idx) => {
                    const medalColors = ['text-yellow-500', 'text-gray-400', 'text-orange-500', 'text-slate-300', 'text-slate-400'];
                    return (
                      <motion.div
                        key={idx}
                        variants={itemVariants}
                        className="card p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          {idx < 3 ? (
                            <Medal className={`w-5 h-5 ${medalColors[idx]}`} />
                          ) : (
                            <span className="text-lg">&#11088;</span>
                          )}
                          <div className="flex-1">
                            <p className="font-semibold text-slate-50 text-sm">{student.name}</p>
                            <p className="text-xs text-slate-400">
                              {student.topicsCompleted || 0} topics &bull; {student.timeStudied || 0}h studied
                            </p>
                          </div>
                        </div>
                        <p className="font-bold text-indigo-400 text-sm">{student.progress || 0}%</p>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Completion Rate Charts Per Class */}
        {classes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {classes.filter(c => c.studentProgresses?.length > 0).length === 0 ? (
                <div className="md:col-span-2 card p-6 text-center flex flex-col items-center">
                    <BarChart3 className="w-12 h-12 text-slate-500 mb-3" />
                    <h3 className="text-base font-bold text-slate-300 mb-1">No progress data yet</h3>
                    <p className="text-slate-500 text-sm">Student progress charts will appear as students begin studying.</p>
                </div>
            ) : (
                classes.filter(c => c.studentProgresses?.length > 0).map((cls, idx) => (
                    <motion.div
                        key={cls.id || idx}
                        className="card p-6 flex flex-col"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 + (idx * 0.1) }}
                    >
                        <h2 className="text-xl font-bold text-slate-50 mb-6">{cls.name} Completion Rates</h2>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={cls.studentProgresses}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" style={{ fontSize: '12px' }} />
                                <YAxis stroke="rgba(255,255,255,0.3)" style={{ fontSize: '12px' }} domain={[0, 100]} />
                                <Tooltip content={<CustomTooltip />} />
                                <defs>
                                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#818cf8" />
                                    <stop offset="100%" stopColor="#6366f1" />
                                  </linearGradient>
                                </defs>
                                <Bar dataKey="progress" fill="url(#barGradient)" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </motion.div>
                ))
            )}
          </div>
        )}

        {/* Export Banner */}
        <motion.div
          className="card p-6 sm:p-8 border-indigo-500/20"
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(34,211,238,0.05) 100%)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-50 mb-2 flex items-center gap-2">
                <BarChart3 size={24} /> Export Analytics for Power BI
              </h3>
              <p className="text-slate-400 text-sm">
                Download detailed student progress and performance metrics across all your classes.
              </p>
            </div>
            <Button onClick={handleExportAnalytics} className="whitespace-nowrap">
              Export CSV <Download size={20} />
            </Button>
          </div>
        </motion.div>
      </main>
      </div>

      {/* Create Class Modal */}
      <CreateClassModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleClassCreated}
      />
    </div>
  );
};

export default TeacherDashboard;
