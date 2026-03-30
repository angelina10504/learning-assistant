import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Target, Save, CheckCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import classService from '../../services/classService';

const EditMilestoneModal = ({ isOpen, onClose, classId, milestone, onUpdated }) => {
  const [formData, setFormData] = useState({
    topic: '',
    deadline: '',
    isCompulsory: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (milestone) {
      const deadlineDate = new Date(milestone.deadline);
      const formattedDeadline = deadlineDate.toISOString().slice(0, 16);
      
      setFormData({
        topic: milestone.topic || '',
        deadline: formattedDeadline,
        isCompulsory: milestone.isCompulsory !== undefined ? milestone.isCompulsory : true,
      });
    }
  }, [milestone]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.topic.trim()) {
      setError('Topic name is required');
      return;
    }

    if (!formData.deadline) {
      setError('Deadline is required');
      return;
    }

    const deadlineDate = new Date(formData.deadline);
    if (deadlineDate < new Date()) {
      setError('Deadline must be in the future');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await classService.updateMilestone(
        classId,
        milestone.id || milestone._id,
        formData.topic,
        formData.deadline,
        formData.isCompulsory
      );

      setSuccess(true);
      toast.success('Milestone updated successfully!');

      setTimeout(() => {
        onUpdated();
        resetForm();
      }, 1500);
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to update milestone. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Error updating milestone:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this milestone?')) {
      return;
    }

    try {
      setLoading(true);
      await classService.deleteMilestone(classId, milestone.id || milestone._id);
      toast.success('Milestone deleted successfully!');
      onUpdated();
      resetForm();
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to delete milestone.';
      toast.error(errorMessage);
      console.error('Error deleting milestone:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      topic: '',
      deadline: '',
      isCompulsory: true,
    });
    setError(null);
    setSuccess(false);
    onClose();
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    return now.toISOString().slice(0, 16);
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { duration: 0.3, ease: 'easeOut' },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: 10,
      transition: { duration: 0.2 },
    },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            className="card w-full max-w-md"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Header */}
            <div className="flex justify-between items-center px-6 pt-6 mb-4">
              <h2 className="text-2xl font-bold text-slate-50">Edit Milestone</h2>
              <button
                onClick={resetForm}
                className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
                disabled={loading}
                title="Close modal"
              >
                <X size={24} className="text-slate-400" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 pb-6">
              {success ? (
                <motion.div
                  className="text-center py-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.div
                    className="flex justify-center mb-4"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 0.6 }}
                  >
                    <CheckCircle className="w-12 h-12 text-green-500" />
                  </motion.div>
                  <h3 className="text-xl font-semibold text-slate-50 mb-2">
                    Milestone Updated!
                  </h3>
                  <p className="text-slate-400 text-sm">
                    "{formData.topic}" has been updated successfully.
                  </p>
                  <p className="text-xs text-slate-500 mt-4">
                    Updating class details...
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit}>
                  {/* Error State */}
                  {error && (
                    <motion.div
                      className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      {error}
                    </motion.div>
                  )}

                  {/* Topic Input */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Topic Name *
                    </label>
                    <input
                      type="text"
                      name="topic"
                      value={formData.topic}
                      onChange={handleInputChange}
                      placeholder="e.g., Calculus Fundamentals"
                      className="input-base"
                      disabled={loading}
                      autoFocus
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      The topic or material this milestone covers
                    </p>
                  </div>

                  {/* Deadline Input */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Deadline *
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 w-5 h-5 text-slate-400 pointer-events-none" />
                      <input
                        type="datetime-local"
                        name="deadline"
                        value={formData.deadline}
                        onChange={handleInputChange}
                        min={getMinDateTime()}
                        className="input-base pl-10"
                        disabled={loading}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      When students must complete this milestone
                    </p>
                  </div>

                  {/* Compulsory Checkbox */}
                  <div className="mb-6">
                    <label className="flex items-center gap-3 p-3 border border-slate-700 rounded-lg hover:bg-slate-700/30 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        name="isCompulsory"
                        checked={formData.isCompulsory}
                        onChange={handleInputChange}
                        className="w-4 h-4 accent-indigo-500"
                        disabled={loading}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-slate-50">Compulsory</p>
                        <p className="text-xs text-slate-400">
                          Students must complete this to progress
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="btn-danger flex items-center justify-center gap-2"
                      disabled={loading}
                    >
                      <Trash2 size={18} />
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="btn-secondary flex-1"
                      disabled={loading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary flex-1 flex items-center justify-center gap-2"
                      disabled={loading}
                    >
                      <Save size={20} />
                      {loading ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default EditMilestoneModal;
