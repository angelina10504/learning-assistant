import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Download } from 'lucide-react';
import classService from '../../services/classService';
import toast from 'react-hot-toast';

const FilePreviewModal = ({ isOpen, onClose, file, classId }) => {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !file || !classId) return;

    let objectUrl = null;
    
    // Fetch preview 
    const loadPreview = async () => {
      try {
        setLoading(true);
        const res = await classService.getMaterialPreview(classId, file._id || file.id);
        const blob = new Blob([res.data], { type: file.mimeType || 'application/pdf' });
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      } catch (err) {
        console.error('Error fetching file preview', err);
        toast.error('Failed to load file preview.');
        setUrl(null);
      } finally {
        setLoading(false);
      }
    };
    
    loadPreview();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      setUrl(null);
    };
  }, [isOpen, file, classId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-white truncate" title={file?.originalName}>
              {file?.originalName || 'File Preview'}
            </h3>
          </div>
          
          <div className="flex items-center gap-3 ml-4">
            {url && (
              <a 
                href={url} 
                download={file?.originalName || 'download'}
                className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors"
                title="Download file"
              >
                <Download size={20} />
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 relative bg-slate-800/50">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
              <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-medium text-indigo-200/70 animate-pulse">
                Loading secure document...
              </p>
            </div>
          )}
          
          {!loading && url && (
            <iframe
              src={url}
              title={file?.originalName}
              className="w-full h-full border-none bg-white"
            />
          )}

          {!loading && !url && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
              <span className="mb-2">Document could not be loaded for preview.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilePreviewModal;
