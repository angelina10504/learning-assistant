import { useState, useRef, useEffect } from 'react';
import { Calendar, Download, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { downloadICSFile, getGoogleCalendarURL } from '../../utils/calendarExport';

/**
 * @param {{ title: string, description?: string, startDate: Date|string, endDate?: Date|string|null, className?: string }} props
 */
const AddToCalendarButton = ({ title, description = '', startDate, endDate = null, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const eventData = { title, description, startDate, endDate };

  const handleDownloadICS = () => {
    downloadICSFile(eventData);
    setIsOpen(false);
  };

  const handleGoogleCalendar = () => {
    window.open(getGoogleCalendarURL(eventData), '_blank');
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-200 text-cyan-300 hover:text-cyan-200"
        style={{
          background: 'rgba(34,211,238,0.08)',
          border: '1px solid rgba(34,211,238,0.15)',
        }}
        title="Add to Calendar"
      >
        <Calendar size={13} />
        Add to Calendar
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 z-50 w-52 rounded-xl overflow-hidden shadow-xl"
            style={{
              background: 'rgba(15,23,42,0.97)',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <button
              onClick={handleGoogleCalendar}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/[0.05] transition-colors text-left"
            >
              <ExternalLink size={15} className="text-cyan-400 flex-shrink-0" />
              <div>
                <p className="font-medium">Google Calendar</p>
                <p className="text-[10px] text-white/40">Opens in new tab</p>
              </div>
            </button>
            <div className="h-px bg-white/[0.06]" />
            <button
              onClick={handleDownloadICS}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/[0.05] transition-colors text-left"
            >
              <Download size={15} className="text-indigo-400 flex-shrink-0" />
              <div>
                <p className="font-medium">Download .ics</p>
                <p className="text-[10px] text-white/40">Apple / Outlook / other</p>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AddToCalendarButton;
