import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, FileText, CheckCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import classService from '../../services/classService';

const UploadMaterialModal = ({ isOpen, onClose, classId, onUploaded }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
  const dragOverRef = useRef(false);

  const handleFileSelect = (selectedFiles) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const validFiles = [];
    const errors = [];

    Array.from(selectedFiles).forEach((file) => {
      if (file.type !== 'application/pdf') {
        errors.push(`${file.name}: Only PDF files are allowed`);
        return;
      }

      if (file.size > 50 * 1024 * 1024) {
        errors.push(`${file.name}: File size must be less than 50MB`);
        return;
      }

      validFiles.push(file);
    });

    if (errors.length > 0) {
      setError(errors.join(', '));
      toast.error(errors[0]);
    } else {
      setError(null);
    }

    setFiles((prev) => [...prev, ...validFiles]);
  };

  const handleInputChange = (e) => {
    const selectedFiles = e.target.files;
    handleFileSelect(selectedFiles);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    dragOverRef.current = true;
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    dragOverRef.current = false;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    dragOverRef.current = false;
    const droppedFiles = e.dataTransfer.files;
    handleFileSelect(droppedFiles);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (files.length === 0) {
      setError('Please select at least one PDF file');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setUploadProgress(0);

      // Upload files one by one
      const totalFiles = files.length;
      let uploadedCount = 0;

      for (const file of files) {
        await classService.uploadMaterial(classId, file);
        uploadedCount++;
        setUploadProgress((uploadedCount / totalFiles) * 100);
      }

      setSuccess(true);
      toast.success(`${totalFiles} material${totalFiles > 1 ? 's' : ''} uploaded successfully!`);

      // Reset after 2 seconds
      setTimeout(() => {
        onUploaded();
        resetForm();
      }, 2000);
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || 'Failed to upload material. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Error uploading material:', err);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const resetForm = () => {
    setFiles([]);
    setError(null);
    setSuccess(false);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
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
              <h2 className="text-2xl font-bold text-slate-50">Upload Material</h2>
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
                  <h3 className="text-xl font-semibold text-slate-50 mb-2">Upload Successful!</h3>
                  <p className="text-slate-400 text-sm">
                    {files.length} file{files.length > 1 ? 's have' : ' has'} been added to the class materials.
                  </p>
                  <p className="text-xs text-slate-500 mt-4">
                    Redirecting you back...
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

                  {/* Drop Zone */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                      dragOverRef.current
                        ? 'border-indigo-500 bg-indigo-500/5'
                        : 'border-slate-600 hover:border-slate-500'
                    } ${files.length > 0 ? 'bg-green-500/5 border-green-500' : ''}`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      multiple
                      onChange={handleInputChange}
                      className="hidden"
                      disabled={loading}
                    />

                    {files.length > 0 ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                      >
                        <FileText className="w-12 h-12 text-green-500 mx-auto mb-2" />
                        <p className="font-semibold text-slate-50">{files.length} file{files.length > 1 ? 's' : ''} selected</p>
                        <p className="text-xs text-slate-400 mt-2">
                          Total: {(files.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs text-indigo-400 hover:text-indigo-300 mt-3"
                          disabled={loading}
                        >
                          Add more files
                        </button>
                      </motion.div>
                    ) : (
                      <div>
                        <Upload className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                        <p className="font-medium text-slate-50">Drag PDFs here or click</p>
                        <p className="text-xs text-slate-400 mt-2">
                          Multiple files supported • Maximum 50 MB each
                        </p>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-sm text-indigo-400 hover:text-indigo-300 mt-4"
                          disabled={loading}
                        >
                          Browse files
                        </button>
                      </div>
                    )}
                  </div>

                  {/* File List */}
                  {files.length > 0 && (
                    <div className="mt-4 max-h-48 overflow-y-auto space-y-2">
                      {files.map((file, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <FileText className="w-5 h-5 text-green-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-slate-50 truncate">{file.name}</p>
                              <p className="text-xs text-slate-400">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="p-1 hover:bg-slate-600 rounded transition-colors flex-shrink-0"
                            disabled={loading}
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* Upload Progress */}
                  {loading && (
                    <motion.div
                      className="mt-4"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-sm text-slate-400">Uploading...</p>
                        <p className="text-sm font-semibold text-slate-50">
                          {Math.round(uploadProgress)}%
                        </p>
                      </div>
                      <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${uploadProgress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* Buttons */}
                  <div className="flex gap-3 mt-6">
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
                      disabled={loading || files.length === 0}
                    >
                      <Upload size={20} />
                      {loading ? `Uploading ${Math.round(uploadProgress)}%...` : `Upload ${files.length > 0 ? `(${files.length})` : ''}`}
                    </button>
                  </div>

                  <p className="text-xs text-slate-400 text-center mt-4">
                    Only PDF files are supported
                  </p>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default UploadMaterialModal;
