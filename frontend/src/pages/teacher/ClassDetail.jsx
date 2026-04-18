import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Upload, Download, Plus, CheckCircle, Clock, Calendar, FileText, Trash2, Copy, Cpu, LayoutGrid, BarChart3, Users, BookOpen, Flag, AlertCircle, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/shared/Navbar';
import Badge from '../../components/shared/Badge';
import ProgressBar from '../../components/shared/ProgressBar';
import { CardSkeleton, StatCardSkeleton, TableRowSkeleton } from '../../components/ui/Skeleton';
import Button from '../../components/ui/Button';
import classService from '../../services/classService';
import UploadMaterialModal from './UploadMaterialModal';
import AddMilestoneModal from './AddMilestoneModal';
import EditMilestoneModal from './EditMilestoneModal';
import FilePreviewModal from '../../components/shared/FilePreviewModal';

const containerVariants = {
  animate: { transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const ClassDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [classData, setClassData] = useState(null);
  const [students, setStudents] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [showEditMilestoneModal, setShowEditMilestoneModal] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [sortBy, setSortBy] = useState('progress');
  const queryParams = new URLSearchParams(location.search);
  const [activeTab, setActiveTab] = useState(queryParams.get('tab') || 'overview');
  const [heatmapData, setHeatmapData] = useState(null);
  const [heatmapLoading, setHeatmapLoading] = useState(false);
  const [topicProgressData, setTopicProgressData] = useState([]);
  const [previewMaterial, setPreviewMaterial] = useState(null);
  const [alerts, setAlerts] = useState({ classWide: [], interventions: [], recommendations: [] });
  const [alertsLoading, setAlertsLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'heatmap' && !heatmapData) {
      fetchHeatmapData();
    }
    if (activeTab === 'alerts') {
      fetchAlertsData();
    }
  }, [activeTab, id]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchAlertsData();
    }, 60000);
    return () => clearInterval(interval);
  }, [id]);

  const fetchAlertsData = async () => {
    try {
      if (activeTab === 'alerts') setAlertsLoading(true);
      const response = await classService.getClassAlerts(id);
      setAlerts(response.data);
    } catch (err) {
      console.error('Error fetching alerts:', err);
    } finally {
      setAlertsLoading(false);
    }
  };

  const fetchHeatmapData = async () => {
    try {
      setHeatmapLoading(true);
      const response = await classService.getMasteryHeatmap(id);
      setHeatmapData(response.data);
    } catch (err) {
      console.error('Error fetching heatmap data:', err);
      toast.error('Failed to load mastery heatmap');
    } finally {
      setHeatmapLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const detailsResponse = await classService.getClassDetails(id);
      const classInfo = detailsResponse.data || {};
      setClassData({
        ...classInfo,
        id: classInfo._id || classInfo.id
      });

      const analyticsResponse = await classService.getClassAnalytics(id);
      const analytics = analyticsResponse.data || {};

      setStudents(analytics.students || []);
      setTopicProgressData(analytics.topicProgressData || []);

      fetchAlertsData();

      try {
        const milestonesResponse = await classService.getClassMilestones(id);
        const milestonesData = milestonesResponse.data || [];
        setMilestones(milestonesData.map(m => ({
          ...m,
          id: m._id || m.id
        })));
      } catch (err) {
        console.error('Error fetching milestones:', err);
        setMilestones([]);
      }

      try {
        const materialsResponse = await classService.getClassMaterials(id);
        setMaterials(materialsResponse.data || []);
      } catch (err) {
        console.error('Error fetching materials:', err);
        setMaterials([]);
      }
    } catch (err) {
      console.error('Error fetching class data:', err);
      setError('Unable to load class data. Please ensure materials are vectorized and students have generated study plans.');
    } finally {
      setLoading(false);
    }
  };

  const handleMaterialUploaded = () => {
    fetchData();
    toast.success('Material uploaded successfully!');
  };

  const handleMilestoneAdded = () => {
    fetchData();
    toast.success('Milestone added successfully!');
  };

  const handleMilestoneClick = (milestone) => {
    setSelectedMilestone(milestone);
    setShowEditMilestoneModal(true);
  };

  const handleMilestoneUpdated = () => {
    fetchData();
    setShowEditMilestoneModal(false);
    setSelectedMilestone(null);
  };

  const handleExportCSV = async () => {
    try {
      const csvBlob = await classService.exportCSV(id);
      const url = window.URL.createObjectURL(csvBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${classData?.name || 'class'}-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('CSV exported successfully!');
    } catch (err) {
      console.error('Error exporting CSV:', err);
      toast.error('Unable to export CSV. Please try again.');
    }
  };

  const handleDeleteClass = async () => {
    if (!window.confirm(`Are you sure you want to delete "${classData?.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await classService.deleteClass(id);
      toast.success('Class deleted successfully!');
      navigate('/teacher/dashboard');
    } catch (err) {
      console.error('Error deleting class:', err);
      toast.error('Unable to delete class. Please try again.');
    }
  };

  const handleCopyClassCode = () => {
    if (classData?.classCode) {
      navigator.clipboard.writeText(classData.classCode);
      toast.success('Class code copied to clipboard!');
    }
  };

  const handleVectorize = async () => {
    const toastId = toast.loading('Indexing materials for AI...');
    try {
      const response = await classService.vectorizeMaterials(id);
      const results = response.data.results || [];
      const successCount = results.filter(r => r.status === 'success').length;
      const failCount = results.filter(r => r.status === 'failed').length;

      if (successCount > 0) {
        toast.success(`Successfully vectorized ${successCount} files for AI!`, { id: toastId });
      } else if (failCount > 0) {
        toast.error(`Failed to vectorize ${failCount} files.`, { id: toastId });
      } else {
        toast.success(`No materials to vectorize.`, { id: toastId });
      }
      fetchData();
    } catch (err) {
      console.error('Vectorize error:', err);
      toast.error(err.response?.data?.message || 'Failed to vectorize materials for AI.', { id: toastId });
    }
  };

  const getConfidenceBadgeColor = (confidence) => {
    if (confidence >= 80) return 'green';
    if (confidence >= 60) return 'amber';
    return 'red';
  };

  const getMilestoneStatus = (deadline) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    if (deadlineDate < now) return { status: 'passed', icon: CheckCircle };
    const daysLeft = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 3) return { status: 'final', icon: Clock };
    return { status: 'upcoming', icon: Calendar };
  };

  const sortedStudents =
    sortBy === 'progress'
      ? [...students].sort((a, b) => (b.progress || 0) - (a.progress || 0))
      : [...students];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-lg">
          <p className="text-slate-300 text-sm font-medium">{payload[0].payload.topic}</p>
          <p className="text-indigo-400 text-sm font-bold">{payload[0].value}%</p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-slate-700/50 rounded-lg animate-pulse" />
              <div className="space-y-2">
                <div className="h-7 w-48 bg-slate-700/50 rounded animate-pulse" />
                <div className="h-5 w-24 bg-slate-700/30 rounded animate-pulse" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <StatCardSkeleton key={i} />)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top Nav Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/teacher/dashboard')}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              title="Back to dashboard"
            >
              <ArrowLeft size={24} className="text-slate-400" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-50">{classData?.name || 'Class'}</h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge color="indigo" className="cursor-pointer" onClick={handleCopyClassCode}>
                  <span className="font-mono text-sm">{classData?.classCode || 'CODE'}</span>
                  <Copy size={14} className="ml-1 inline" />
                </Badge>
                <span className="text-xs text-slate-400">Click to copy code</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
            <Button
              variant="secondary"
              onClick={handleVectorize}
              className="flex-1 sm:flex-none bg-indigo-500/10 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20"
            >
              <Cpu size={18} /> Vectorize
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowUploadModal(true)}
              className="flex-1 sm:flex-none"
            >
              <Upload size={18} /> Upload
            </Button>
            <Button
              variant="secondary"
              onClick={handleExportCSV}
              className="flex-1 sm:flex-none"
            >
              <Download size={18} /> Export
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteClass}
              className="flex-1 sm:flex-none px-3"
            >
              <Trash2 size={18} />
            </Button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex space-x-1 bg-slate-800/50 p-1 rounded-xl mb-8 w-fit border border-slate-700/50 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-indigo-500 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            <LayoutGrid size={18} />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('heatmap')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'heatmap'
                ? 'bg-indigo-500 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            <Flag size={18} />
            Mastery Heatmap
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all relative whitespace-nowrap ${
              activeTab === 'alerts'
                ? 'bg-indigo-500 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            <AlertCircle size={18} />
            Alerts
            {(alerts.classWide.length + alerts.interventions.length + alerts.recommendations.length) > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-slate-900">
                {alerts.classWide.length + alerts.interventions.length + alerts.recommendations.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'overview' ? (
          <>
            {/* Milestones Section */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-50">Milestones</h2>
                <Button onClick={() => setShowMilestoneModal(true)} className="text-sm">
                  <Plus size={20} /> Add Milestone
                </Button>
              </div>

              {milestones.length === 0 ? (
                <div className="card p-8 text-center flex flex-col items-center">
                  <Calendar className="w-12 h-12 text-slate-500 mb-4" />
                  <h3 className="text-lg font-bold text-slate-300 mb-1">No milestones yet</h3>
                  <p className="text-slate-500 mb-4">Create one to set deadlines for your students.</p>
                  <Button onClick={() => setShowMilestoneModal(true)}>
                    <Plus size={20} /> Add Milestone
                  </Button>
                </div>
              ) : (
                <motion.div
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                  variants={containerVariants}
                  initial="initial"
                  animate="animate"
                >
                  {milestones.map((milestone) => {
                    const { status, icon: StatusIcon } = getMilestoneStatus(milestone.deadline);
                    return (
                      <motion.div
                        key={milestone.id}
                        variants={itemVariants}
                        whileHover={{ y: -2 }}
                        onClick={() => handleMilestoneClick(milestone)}
                        className="card p-4 flex-shrink-0 min-w-0 cursor-pointer hover:border-indigo-500/50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-slate-50 text-sm break-words">
                              {milestone.topic}
                            </h3>
                            <p className="text-xs text-slate-400 mt-1">
                              {new Date(milestone.deadline).toLocaleDateString()}
                            </p>
                          </div>
                          <StatusIcon className="w-5 h-5 text-slate-400 ml-2" />
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Badge color="slate" className="text-xs">
                            {status}
                          </Badge>
                          {milestone.isCompulsory && (
                            <Badge color="red" className="text-xs">
                              Compulsory
                            </Badge>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </div>

            {/* Course Materials Section */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-50">Materials</h2>
                <Button variant="secondary" onClick={() => setShowUploadModal(true)} className="text-sm">
                  <Upload size={18} /> Upload Material
                </Button>
              </div>

              {materials.length === 0 ? (
                <div className="card p-8 text-center flex flex-col items-center">
                  <FileText className="w-12 h-12 text-slate-500 mb-4" />
                  <h3 className="text-lg font-bold text-slate-300 mb-1">No materials uploaded yet</h3>
                  <p className="text-slate-500">Upload course materials to get started.</p>
                </div>
              ) : (
                <motion.div
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                  variants={containerVariants}
                  initial="initial"
                  animate="animate"
                >
                  {materials.map((material) => (
                    <motion.div
                      key={material._id}
                      variants={itemVariants}
                      onClick={() => setPreviewMaterial(material)}
                      className="card p-4 flex items-center gap-3 cursor-pointer hover:border-indigo-500/50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                        <FileText size={20} />
                      </div>
                      <div className="min-w-0 overflow-hidden">
                        <h3 className="font-medium text-slate-50 text-sm truncate">{material.originalName}</h3>
                        <p className="text-xs text-slate-400">{new Date(material.uploadedAt).toLocaleDateString()}</p>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>

            {/* Topic Progress Chart */}
            <motion.div
              className="card p-6 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h2 className="text-xl font-bold text-slate-50 mb-6">Topic Progress Overview</h2>
              <div className="overflow-x-auto">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={topicProgressData}>
                    <defs>
                      <linearGradient id="colorConfidence" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis dataKey="topic" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="confidence"
                      stroke="#6366f1"
                      fillOpacity={1}
                      fill="url(#colorConfidence)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Students Section */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-50">Students</h2>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-400">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-slate-800 border-none text-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="progress">Progress</option>
                    <option value="name">Name</option>
                  </select>
                </div>
              </div>

              {students.length === 0 ? (
                <div className="card p-8 text-center flex flex-col items-center">
                  <Users className="w-12 h-12 text-slate-500 mb-4" />
                  <h3 className="text-lg font-bold text-slate-300 mb-1">No students enrolled yet</h3>
                  <p className="text-slate-500">Share the class code to invite students.</p>
                </div>
              ) : (
                <motion.div
                  className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
                  variants={containerVariants}
                  initial="initial"
                  animate="animate"
                >
                  {students
                    .sort((a, b) => {
                      if (sortBy === 'name') return a.name.localeCompare(b.name);
                      return b.progress - a.progress;
                    })
                    .map((student) => (
                      <motion.div
                        key={student._id}
                        variants={itemVariants}
                        className="card p-4 hover:border-indigo-500/30 transition-colors"
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold">
                            {student.name.charAt(0)}
                          </div>
                          <div className="min-w-0 overflow-hidden">
                            <h3 className="font-semibold text-slate-50 truncate">{student.name}</h3>
                            <p className="text-xs text-slate-400 truncate">{student.email}</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400">Mastery Progress</span>
                            <span className="text-slate-200 font-medium">{Math.round(student.progress)}%</span>
                          </div>
                          <ProgressBar progress={student.progress} size="sm" color="indigo" />

                          <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-700/50">
                            <div>
                              <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Score</span>
                              <span className="text-sm font-semibold text-slate-200">{Math.round(student.confidence || 0)}%</span>
                            </div>
                            <div>
                              <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Sessions</span>
                              <span className="text-sm font-semibold text-slate-200">{student.sessionCount || 0}</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                </motion.div>
              )}
            </div>
          </>
        ) : activeTab === 'heatmap' ? (
          <div className="space-y-6">
            {/* Weak Topic Alerts */}
            {heatmapData && heatmapData.topics.map(topic => {
              const weakCount = heatmapData.students.filter(s => s.mastery[topic] === 'emerging' || s.mastery[topic] === 'developing').length;
              const ratio = weakCount / heatmapData.students.length;
              if (ratio >= 0.4) {
                return (
                  <motion.div
                    key={`alert-${topic}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400"
                  >
                    <AlertCircle size={20} />
                    <span>
                      <strong className="font-bold">"{topic}"</strong> is a weak area for {Math.round(ratio * 100)}% of students — consider revisiting in class.
                    </span>
                  </motion.div>
                );
              }
              return null;
            })}

            {/* Heatmap Card */}
            <motion.div
              className="card p-0 overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="p-6 border-b border-slate-700/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-50">Topic Mastery Heatmap</h2>
                  <p className="text-slate-400 text-sm mt-1">Visualize mastery levels across all extracted topics</p>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-emerald-900/60 border border-emerald-500" />
                    <span className="text-emerald-400">Mastered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-indigo-900/60 border border-indigo-500" />
                    <span className="text-indigo-400">Proficient</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-blue-900/60 border border-blue-500" />
                    <span className="text-blue-400">Developing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-amber-900/60 border border-amber-500" />
                    <span className="text-amber-400">Emerging</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-slate-800/40 border border-slate-700" />
                    <span className="text-slate-500">Not Started</span>
                  </div>
                </div>
              </div>

              {heatmapLoading ? (
                <div className="p-8 space-y-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <TableRowSkeleton key={i} cols={5} />
                  ))}
                </div>
              ) : !heatmapData || heatmapData.topics.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center">
                  <Flag className="w-12 h-12 text-slate-500 mb-4" />
                  <h3 className="text-lg font-bold text-slate-300 mb-1">No study plans generated yet</h3>
                  <p className="text-slate-500 mt-2 max-w-sm mx-auto">
                    Students must generate a study plan from the course materials before mastery data can be visualized.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto relative">
                  {/* Scroll shadow indicators */}
                  <div className="pointer-events-none absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-slate-900/80 to-transparent z-20" />
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-900 sticky top-0 z-10">
                        <th className="p-4 text-left font-semibold text-slate-400 border-b border-r border-slate-700/50 sticky left-0 bg-slate-900 min-w-[150px] shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                          Student
                        </th>
                        {heatmapData.topics.map(topic => (
                          <th key={topic} className="p-4 text-left font-semibold text-slate-400 border-b border-slate-700/50 min-w-[120px]">
                            <div className="truncate w-full max-w-[150px]" title={topic}>
                              {topic}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {heatmapData.students.map((student) => (
                        <tr key={student.studentId} className="border-b border-slate-700/30">
                          <td className="p-4 font-medium text-slate-200 border-r border-slate-700/50 sticky left-0 bg-slate-900/95 z-[5] shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                            {student.name}
                          </td>
                          {heatmapData.topics.map(topic => {
                            const mastery = student.mastery[topic];
                            let cellClass = "";
                            let text = "";

                            switch(mastery) {
                              case 'mastered':
                                cellClass = "bg-emerald-900/40 border-emerald-500/50 text-emerald-400";
                                text = "Mastered";
                                break;
                              case 'proficient':
                                cellClass = "bg-indigo-900/40 border-indigo-500/50 text-indigo-400";
                                text = "Proficient";
                                break;
                              case 'developing':
                                cellClass = "bg-blue-900/40 border-blue-500/50 text-blue-400";
                                text = "Developing";
                                break;
                              case 'emerging':
                                cellClass = "bg-amber-900/40 border-amber-500/50 text-amber-400";
                                text = "Emerging";
                                break;
                              default:
                                cellClass = "bg-slate-800/40 text-slate-500 border-transparent";
                                text = "\u2014";
                            }

                            return (
                              <td key={`${student.studentId}-${topic}`} className="p-2 border-slate-700/30">
                                <div className={`h-10 flex items-center justify-center rounded-lg border text-xs font-medium ${cellClass}`}>
                                  {text}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}

                      {/* Aggregate Summary Row */}
                      <tr className="bg-slate-900/80 sticky bottom-0 border-t-2 border-slate-700">
                        <td className="p-4 font-bold text-slate-50 border-r border-slate-700/50 sticky left-0 bg-slate-900/95 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                          Class Summary
                        </td>
                        {heatmapData.topics.map(topic => {
                          const studentsOnTopic = heatmapData.students.map(s => s.mastery[topic]);
                          const strongCount = studentsOnTopic.filter(m => m === 'mastered').length;
                          const proficientCount = studentsOnTopic.filter(m => m === 'proficient').length;
                          const developingCount = studentsOnTopic.filter(m => m === 'developing').length;
                          const weakCount = studentsOnTopic.filter(m => m === 'emerging').length;
                          const total = heatmapData.students.length;

                          let majorityColor = "text-slate-500";
                          if (total > 0) {
                            if (strongCount > proficientCount && strongCount > developingCount && strongCount > weakCount) majorityColor = "text-emerald-400";
                            else if (proficientCount > strongCount && proficientCount > developingCount && proficientCount > weakCount) majorityColor = "text-indigo-400";
                            else if (developingCount > strongCount && developingCount > proficientCount && developingCount > weakCount) majorityColor = "text-blue-400";
                            else if (weakCount > strongCount && weakCount > proficientCount && weakCount > developingCount) majorityColor = "text-amber-400";
                          }

                          return (
                            <td key={`summary-${topic}`} className="p-4 border-slate-700/50">
                              <div className="flex flex-col gap-1">
                                <div className={`font-bold text-center ${majorityColor}`}>
                                  {total > 0 ? `${Math.round((Math.max(strongCount, proficientCount, developingCount, weakCount) / total) * 100)}%` : '0%'}
                                </div>
                                <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-slate-800">
                                  <div className="bg-emerald-500" style={{ width: `${(strongCount/total)*100}%` }} />
                                  <div className="bg-indigo-500" style={{ width: `${(proficientCount/total)*100}%` }} />
                                  <div className="bg-blue-500" style={{ width: `${(developingCount/total)*100}%` }} />
                                  <div className="bg-amber-500" style={{ width: `${(weakCount/total)*100}%` }} />
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          </div>
        ) : (
          /* Alerts View */
          <div className="space-y-6">
            {alertsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="card p-6 animate-pulse border-l-4 border-slate-700">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-10 h-10 rounded-full bg-slate-700"></div>
                      <div className="h-5 w-40 bg-slate-700 rounded"></div>
                    </div>
                    <div className="h-4 w-full bg-slate-800 rounded mb-2"></div>
                    <div className="h-4 w-2/3 bg-slate-800 rounded"></div>
                  </div>
                ))}
              </div>
            ) : (alerts.classWide.length === 0 && alerts.interventions.length === 0 && alerts.recommendations.length === 0) ? (
              <div className="card p-12 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-50 mb-2">Class is on Track!</h3>
                <p className="text-slate-400 max-w-md">No alerts at this time. All students are making steady progress and mastery levels are balanced.</p>
              </div>
            ) : (
              <motion.div
                className="space-y-6"
                variants={containerVariants}
                initial="initial"
                animate="animate"
              >
                {/* Class-Wide Alerts */}
                {alerts.classWide.length > 0 && (
                  <section className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Class-Wide Alerts</h3>
                    {alerts.classWide.map((alert, i) => (
                      <motion.div key={i} variants={itemVariants} className="card p-5 border-l-4 border-red-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-50 text-sm">Action Required</h4>
                            <p className="text-slate-400 text-sm mt-0.5">
                              <span className="text-red-400 font-medium">{alert.affectedCount} students</span> are struggling with
                              <span className="text-slate-200 font-semibold italic"> "{alert.topicName}"</span> &mdash; consider revisiting in your next lecture.
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="secondary"
                          onClick={() => toast.success("Noted! You can address this in your next class.")}
                          className="text-xs px-3 py-1.5 whitespace-nowrap"
                        >
                          Schedule Revision
                        </Button>
                      </motion.div>
                    ))}
                  </section>
                )}

                {/* Intervention Alerts */}
                {alerts.interventions.length > 0 && (
                  <section className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Intervention Warnings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {alerts.interventions.slice(0, 3).map((alert, i) => (
                        <motion.div key={i} variants={itemVariants} className="card p-5 border-l-4 border-amber-500 flex flex-col justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                              <Users className="w-5 h-5 text-amber-400" />
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-50 text-sm">{alert.studentName} is falling behind</h4>
                              <p className="text-slate-400 text-xs mt-1">
                                Has not started <span className="text-slate-200">"{alert.milestoneName}"</span>.
                                Deadline is in <span className="text-amber-400 font-medium">{alert.daysUntilDeadline} days</span>.
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-2 pt-4 border-t border-slate-700/30">
                            <span className="text-[10px] text-slate-500 italic">
                              Last session: {alert.lastSessionDate ? new Date(alert.lastSessionDate).toLocaleDateString() : 'Never'}
                            </span>
                            <Button
                              variant="secondary"
                              onClick={() => toast.success(`Reminder noted for ${alert.studentName}.`)}
                              className="text-xs px-2 py-1"
                            >
                              Send Reminder
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                      {alerts.interventions.length > 3 && (
                        <div className="flex items-center justify-center p-4">
                          <span className="text-xs text-slate-500 italic">+ {alerts.interventions.length - 3} more students need intervention</span>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {/* AI Recommendations */}
                {alerts.recommendations.length > 0 && (
                  <section className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">AI Recommendation</h3>
                    {alerts.recommendations.map((rec, i) => (
                      <motion.div key={i} variants={itemVariants} className="card p-6 border-l-4 border-cyan-500 bg-cyan-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center shrink-0">
                            <Info className="w-5 h-5 text-cyan-400" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-50 text-sm">Engagement Opportunity</h4>
                            <p className="text-slate-400 text-sm mt-0.5 max-w-xl">
                              <span className="text-cyan-400 font-medium italic">"{rec.topicName}"</span> is showing low average mastery ({rec.avgMasteryScore}%) across the class.
                              Consider adding supplementary material or extending the deadline.
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          onClick={() => setActiveTab('heatmap')}
                          className="text-xs px-4 py-2 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                        >
                          View Heatmap <ArrowRight size={14} />
                        </Button>
                      </motion.div>
                    ))}
                  </section>
                )}
              </motion.div>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      <UploadMaterialModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        classId={id}
        onUploaded={handleMaterialUploaded}
      />

      <AddMilestoneModal
        isOpen={showMilestoneModal}
        onClose={() => setShowMilestoneModal(false)}
        classId={id}
        onAdded={handleMilestoneAdded}
      />

      <EditMilestoneModal
        isOpen={showEditMilestoneModal}
        onClose={() => {
          setShowEditMilestoneModal(false);
          setSelectedMilestone(null);
        }}
        classId={id}
        milestone={selectedMilestone}
        onUpdated={handleMilestoneUpdated}
      />

      <FilePreviewModal
        isOpen={!!previewMaterial}
        onClose={() => setPreviewMaterial(null)}
        file={previewMaterial}
        classId={id}
      />
    </div>
  );
};

export default ClassDetail;
