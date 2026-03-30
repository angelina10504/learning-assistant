import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Upload, Download, Plus, CheckCircle, Clock, Calendar, FileText, Trash2, Copy, Cpu } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/shared/Navbar';
import Badge from '../../components/shared/Badge';
import ProgressBar from '../../components/shared/ProgressBar';
import classService from '../../services/classService';
import UploadMaterialModal from './UploadMaterialModal';
import AddMilestoneModal from './AddMilestoneModal';
import EditMilestoneModal from './EditMilestoneModal';

const ClassDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
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

  useEffect(() => {
    fetchData();
  }, [id]);

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

      // Extract students from analytics
      setStudents(
        (analytics.students || mockStudents).sort(
          (a, b) => (b.progress || 0) - (a.progress || 0)
        )
      );

      // Fetch milestones from class data
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

      // Fetch materials
      try {
        const materialsResponse = await classService.getClassMaterials(id);
        setMaterials(materialsResponse.data || []);
      } catch (err) {
        console.error('Error fetching materials:', err);
        setMaterials([]);
      }
    } catch (err) {
      console.error('Error fetching class data:', err);
      // Use mock data
      setClassData(mockClassData);
      setStudents(mockStudents);
      setMilestones([]);
      setMaterials([]);
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
      fetchData(); // Refresh to show any updated stats if applicable
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

  const topicProgressData = [
    { topic: 'Algebra', confidence: 82 },
    { topic: 'Calculus', confidence: 45 },
    { topic: 'Integration', confidence: 55 },
    { topic: 'Derivatives', confidence: 38 },
  ];

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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
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

  const rowVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i) => ({
      opacity: 1,
      x: 0,
      transition: { duration: 0.3, delay: i * 0.05 },
    }),
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-indigo-400 border-t-white rounded-full animate-spin" />
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/teacher/dashboard')}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              title="Back to dashboard"
            >
              <ArrowLeft size={24} className="text-slate-400" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-slate-50">{classData?.name || 'Class'}</h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge color="indigo" className="cursor-pointer" onClick={handleCopyClassCode}>
                  <span className="font-mono text-sm">{classData?.classCode || 'CODE'}</span>
                  <Copy size={14} className="ml-1 inline" />
                </Badge>
                <span className="text-xs text-slate-400">Click to copy</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              onClick={handleVectorize}
              className="btn-primary flex-1 sm:flex-none flex items-center justify-center gap-2"
            >
              <Cpu size={20} /> Vectorize for AI
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn-secondary flex-1 sm:flex-none flex items-center justify-center gap-2"
            >
              <Upload size={20} /> Upload Material
            </button>
            <button
              onClick={handleExportCSV}
              className="btn-secondary flex-1 sm:flex-none flex items-center justify-center gap-2"
            >
              <Download size={20} /> Export CSV
            </button>
            <button
              onClick={handleDeleteClass}
              className="btn-danger flex-1 sm:flex-none flex items-center justify-center gap-2"
            >
              <Trash2 size={20} /> Delete
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300">
            {error}
          </div>
        )}

        {/* Milestones Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-slate-50">Milestones</h2>
            <button
              onClick={() => setShowMilestoneModal(true)}
              className="btn-primary text-sm flex items-center gap-2"
            >
              <Plus size={20} /> Add Milestone
            </button>
          </div>

          {milestones.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-slate-400 mb-4">No milestones yet. Create one to set deadlines for your students.</p>
              <button
                onClick={() => setShowMilestoneModal(true)}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Plus size={20} /> Add Milestone
              </button>
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
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

        {/* Materials Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-slate-50">Course Materials ({materials.length})</h2>
          </div>

          {materials.length === 0 ? (
            <div className="card p-8 text-center">
              <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-400 mb-4">No materials uploaded yet.</p>
              <button
                onClick={() => setShowUploadModal(true)}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Upload size={20} /> Upload Material
              </button>
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {materials.map((material, idx) => (
                <motion.div
                  key={material._id || idx}
                  variants={itemVariants}
                  whileHover={{ y: -2 }}
                  className="card p-4"
                >
                  <div className="flex items-start gap-3">
                    <FileText className="w-10 h-10 text-indigo-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-50 text-sm truncate" title={material.originalName}>
                        {material.originalName}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        {material.fileSize ? `${(material.fileSize / 1024 / 1024).toFixed(2)} MB` : 'Size unknown'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {material.uploadedAt ? new Date(material.uploadedAt).toLocaleDateString() : 'Date unknown'}
                      </p>
                    </div>
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
        </motion.div>

        {/* Student Table */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-slate-50">Students ({students.length})</h2>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input-base text-sm py-1 w-auto"
            >
              <option value="progress">Sort by Progress</option>
              <option value="name">Sort by Name</option>
            </select>
          </div>

          {students.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-slate-400">No students enrolled yet.</p>
            </div>
          ) : (
            <motion.div
              className="card overflow-x-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/50 bg-slate-900/50">
                    <th className="px-4 py-3 text-left font-semibold text-slate-300">Student</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-300 min-w-32">
                      Progress
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-300">Weak Areas</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-300">Sessions</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-300">
                      Confidence
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-300">Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStudents.map((student, idx) => (
                    <motion.tr
                      key={student.id}
                      custom={idx}
                      variants={rowVariants}
                      initial="hidden"
                      animate="visible"
                      className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors"
                    >
                      {/* Student Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {student.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .substring(0, 2)}
                          </div>
                          <span className="text-slate-50 font-medium">{student.name}</span>
                        </div>
                      </td>

                      {/* Progress Bar */}
                      <td className="px-4 py-3">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-slate-400">
                              {Math.round(student.progress || 0)}%
                            </span>
                          </div>
                          <ProgressBar
                            value={student.progress || 0}
                            max={100}
                            color={student.progress >= 70 ? 'green' : student.progress >= 50 ? 'amber' : 'red'}
                            height="h-1"
                          />
                        </div>
                      </td>

                      {/* Weak Areas */}
                      <td className="px-4 py-3">
                        {student.weakAreas && student.weakAreas.length > 0 ? (
                          <div className="flex gap-1 flex-wrap">
                            {student.weakAreas.slice(0, 2).map((area, idx) => (
                              <Badge key={idx} color="red" className="text-xs">
                                {area}
                              </Badge>
                            ))}
                            {student.weakAreas.length > 2 && (
                              <Badge color="slate" className="text-xs">
                                +{student.weakAreas.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>

                      {/* Sessions */}
                      <td className="px-4 py-3 text-center">
                        <span className="font-semibold text-slate-50">{student.sessionCount || 0}</span>
                      </td>

                      {/* Confidence Badge */}
                      <td className="px-4 py-3 text-center">
                        <Badge color={getConfidenceBadgeColor(student.confidence || 0)}>
                          {Math.round(student.confidence || 0)}%
                        </Badge>
                      </td>

                      {/* Last Active */}
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {student.lastActive
                          ? new Date(student.lastActive).toLocaleDateString()
                          : 'Never'}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}
        </div>
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
    </div>
  );
};

// Mock data
const mockClassData = {
  id: '1',
  name: 'Advanced Mathematics',
  classCode: 'MATH101',
  description: 'A comprehensive course on advanced mathematical concepts.',
};

const mockStudents = [
  {
    id: '1',
    name: 'Arjun Singh',
    progress: 95,
    weakAreas: [],
    sessionCount: 24,
    confidence: 92,
    lastActive: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    name: 'Priya Sharma',
    progress: 88,
    weakAreas: ['Calculus'],
    sessionCount: 22,
    confidence: 85,
    lastActive: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    name: 'Rohan Patel',
    progress: 72,
    weakAreas: ['Calculus', 'Integration'],
    sessionCount: 18,
    confidence: 68,
    lastActive: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    name: 'Neha Gupta',
    progress: 55,
    weakAreas: ['Derivatives', 'Calculus', 'Integration'],
    sessionCount: 12,
    confidence: 50,
    lastActive: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default ClassDetail;
