import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Hash, LogIn } from 'lucide-react';

const JoinClassModal = ({ isOpen, onClose, onJoin }) => {
  const [classCode, setClassCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!classCode.trim()) {
      setError('Please enter a class code');
      return;
    }

    if (classCode.length !== 6) {
      setError('Class code must be 6 characters');
      return;
    }

    setLoading(true);
    try {
      await onJoin(classCode.toUpperCase());
      setClassCode('');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to join class');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl max-w-md w-full p-6"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-50">Join a Class</h2>
              <motion.button
                onClick={onClose}
                className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <X className="w-6 h-6 text-slate-400" />
              </motion.button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Class Code Input */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Class Code
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={classCode}
                    onChange={(e) => {
                      setClassCode(e.target.value.toUpperCase());
                      setError('');
                    }}
                    placeholder="Enter 6-character code"
                    maxLength="6"
                    className="input-base pl-10 text-center text-lg font-mono tracking-widest"
                    disabled={loading}
                    autoFocus
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Ask your teacher for the class code
                </p>
              </div>

              {/* Error Message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <p className="text-sm text-red-300">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <motion.button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary flex-1"
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  type="submit"
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                  disabled={loading || !classCode.trim()}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Joining...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      Join
                    </>
                  )}
                </motion.button>
              </div>
            </form>

            {/* Help text */}
            <motion.div
              className="mt-6 pt-6 border-t border-slate-700/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <p className="text-xs text-slate-400">
                Your teacher will provide a class code during class. Once joined, you'll see class materials and assignments here.
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default JoinClassModal;
