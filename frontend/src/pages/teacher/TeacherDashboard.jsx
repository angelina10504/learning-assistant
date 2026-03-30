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
import classService from '../../services/classService';
import CreateClassModal from './CreateClassModal';

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [analytics, setAnalytics] = useState(null);
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

      // Fetch teaching classes
      const classesResponse = await classService.getTeachingClasses();
      const classesData = classesResponse.data || [];
      
      // Map _id to id for consistency and calculate counts
      const mappedClasses = (Array.isArray(classesData) ? classesData : []).map(cls => ({
        ...cls,
        id: cls._id || cls.id,
        studentCount: cls.students?.length || 0,
        materialCount: cls.materials?.length || 0,
        avgCompletion: Math.floor(Math.random() * 20) // Random placeholder if missing, or 0
      }));
      
      setClasses(mappedClasses);

      // Fetch aggregate analytics across all classes
      try {
        const analyticsResponse = await classService.getClassAnalytics('all');
        const data = analyticsResponse.data || {};
        
        // Combine studentCount accurately across classes
        const totalStudents = new Set(classesData.flatMap(c => c.students.map(s => s._id || s))).size;
        data.totalStudentsFromAPI = totalStudents;

        setAnalytics(data);
      } catch (analyticsErr) {
        console.error('Failed to load aggregate analytics', analyticsErr);
        setAnalytics({});
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
      // Combine export from all classes
      const csvBlob = await classService.exportCSV('all');
      const url = window.URL.createObjectURL(csvBlob);
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
    classes.length > 0
      ? Math.round(
          classes.reduce((sum, c) => sum + (c.avgCompletion || 0), 0) / classes.length
        )
      : 0;
  const weakTopics = analytics?.weakTopics || [];

  // Prepare data for completion rate chart
  const chartData = classes.map(cls => ({
    name: cls.name.substring(0, 12),
    completion: cls.avgCompletion || 0,
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-lg">
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
      value: weakTopics.length,
      icon: AlertTriangle,
      color: 'from-orange-500/20 to-orange-600/20',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut' },
    },
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top Section */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-50 mb-2">Dashboard</h1>
            <p className="text-slate-400">Welcome back, {user?.name}. Here's your teaching overview.</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} /> Create Class
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300">
            {error}
          </div>
        )}

        {/* Stats Grid */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {statItems.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ y: -2 }}
              >
                <div className={`card p-6 bg-gradient-to-br ${stat.color} hover:shadow-lg transition-shadow`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-slate-400 text-sm font-medium mb-1">{stat.label}</p>
                      <p className="text-4xl font-bold text-slate-50">{stat.value}</p>
                    </div>
                    <IconComponent className="w-8 h-8 text-slate-400" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Left: Your Classes */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-50 mb-4">Your Classes</h2>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="inline-block w-8 h-8 border-4 border-indigo-400 border-t-white rounded-full animate-spin" />
                </div>
              ) : classes.length === 0 ? (
                <div className="card p-8 text-center">
                  <p className="text-slate-400 mb-4">No classes yet. Create your first class to get started.</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn-primary inline-flex items-center gap-2"
                  >
                    <Plus size={20} /> Create Class
                  </button>
                </div>
              ) : (
                <motion.div
                  className="space-y-4"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {classes.map((cls, idx) => (
                    <motion.div
                      key={cls.id}
                      variants={itemVariants}
                      whileHover={{ y: -2 }}
                      onClick={() => navigate(`/teacher/class/${cls.id}`)}
                      className="card p-6 hover:border-indigo-500/50 hover:shadow-lg transition-all cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-50">{cls.name}</h3>
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
                <div className="card p-6 text-center">
                  <p className="text-slate-400 text-sm">All topics looking strong!</p>
                </div>
              ) : (
                <motion.div
                  className="space-y-3"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {weakTopics.slice(0, 5).map((topic, idx) => (
                    <motion.div
                      key={idx}
                      variants={itemVariants}
                      className="card p-4 border-l-4 border-red-500 bg-slate-800/50"
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
              <motion.div
                className="space-y-2"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
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
                          <span className="text-lg">⭐</span>
                        )}
                        <div className="flex-1">
                          <p className="font-semibold text-slate-50 text-sm">{student.name}</p>
                          <p className="text-xs text-slate-400">
                            {student.topicsCompleted || 0} topics • {student.timeStudied || 0}h studied
                          </p>
                        </div>
                      </div>
                      <p className="font-bold text-indigo-400 text-sm">{student.progress || 0}%</p>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          </div>
        </div>

        {/* Completion Rate Chart */}
        {classes.length > 0 && (
          <motion.div
            className="card p-6 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <h2 className="text-xl font-bold text-slate-50 mb-6">Class Completion Rates</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis dataKey="name" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="completion" fill="#6366f1" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Export Banner */}
        <motion.div
          className="card p-8 bg-gradient-to-r from-indigo-500/10 to-cyan-500/10 border border-indigo-500/30"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div>
              <h3 className="text-xl font-bold text-slate-50 mb-2 flex items-center gap-2">
                <BarChart3 size={24} /> Export Analytics for Power BI
              </h3>
              <p className="text-slate-400 text-sm">
                Download detailed student progress and performance metrics across all your classes.
              </p>
            </div>
            <button
              onClick={handleExportAnalytics}
              className="btn-primary whitespace-nowrap flex items-center gap-2"
            >
              Export CSV <Download size={20} />
            </button>
          </div>
        </motion.div>
      </main>

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
