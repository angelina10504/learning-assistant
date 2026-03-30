import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookPlus, Copy, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import classService from '../../services/classService';

const CreateClassModal = ({ isOpen, onClose, onCreated }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    mode: 'compulsory',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [generatedCode, setGeneratedCode] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError(null);
  };

  const handleModeChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      mode: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Class name is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await classService.createClass(
        formData.name,
        formData.description
      );

      const newClass = response.data;
      setGeneratedCode(newClass.classCode);
      setSuccess(true);
      toast.success('Class created!');

      // Auto-close after 3 seconds and notify parent
      setTimeout(() => {
        onCreated(newClass);
        resetForm();
      }, 3000);
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || 'Failed to create class. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Error creating class:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      mode: 'compulsory',
    });
    setError(null);
    setSuccess(null);
    setGeneratedCode(null);
    onClose();
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    toast.success('Class code copied to clipboard!');
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
              <h2 className="text-2xl font-bold text-slate-50">Create New Class</h2>
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
                  className="text-center py-6"
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
                  <h3 className="text-xl font-semibold text-slate-50 mb-2">Class Created!</h3>
                  <p className="text-slate-400 mb-6">
                    Share this code with your students to let them join.
                  </p>

                  {/* Generated Code */}
                  <div className="bg-slate-700 rounded-lg p-4 mb-4">
                    <p className="text-xs text-slate-400 mb-2">Class Code</p>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-2xl font-mono font-bold text-indigo-400">
                        {generatedCode}
                      </p>
                      <button
                        onClick={handleCopyCode}
                        className="p-2 hover:bg-slate-600 rounded-lg transition-colors"
                        title="Copy to clipboard"
                      >
                        <Copy size={20} className="text-slate-300" />
                      </button>
                    </div>
                  </div>

                  <p className="text-sm text-slate-400">
                    You'll be redirected to your dashboard shortly...
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

                  {/* Class Name */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Class Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="e.g., Advanced Mathematics"
                      className="input-base"
                      disabled={loading}
                    />
                  </div>

                  {/* Description */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Optional. Describe what this class is about..."
                      className="input-base resize-none h-24"
                      disabled={loading}
                    />
                  </div>

                  {/* Mode Selection */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-300 mb-3">
                      Class Mode
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center p-3 border border-slate-700 rounded-lg hover:bg-slate-700/30 cursor-pointer transition-colors">
                        <input
                          type="radio"
                          name="mode"
                          value="compulsory"
                          checked={formData.mode === 'compulsory'}
                          onChange={handleModeChange}
                          className="w-4 h-4 accent-indigo-500"
                          disabled={loading}
                        />
                        <div className="ml-3 flex-1">
                          <p className="font-medium text-slate-50">Compulsory</p>
                          <p className="text-xs text-slate-400">
                            Students must complete assigned materials
                          </p>
                        </div>
                      </label>

                      <label className="flex items-center p-3 border border-slate-700 rounded-lg hover:bg-slate-700/30 cursor-pointer transition-colors">
                        <input
                          type="radio"
                          name="mode"
                          value="self-learning"
                          checked={formData.mode === 'self-learning'}
                          onChange={handleModeChange}
                          className="w-4 h-4 accent-indigo-500"
                          disabled={loading}
                        />
                        <div className="ml-3 flex-1">
                          <p className="font-medium text-slate-50">Self-learning</p>
                          <p className="text-xs text-slate-400">
                            Students learn at their own pace
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3">
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
                      <BookPlus size={20} />
                      {loading ? 'Creating...' : 'Create Class'}
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

export default CreateClassModal;
