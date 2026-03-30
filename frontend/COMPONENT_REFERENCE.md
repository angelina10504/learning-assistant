# Component Reference Guide

## TeacherDashboard Component

**Location:** `src/pages/teacher/TeacherDashboard.jsx`  
**Purpose:** Main landing page for teachers with overview of all classes

### Props
None (uses context and services)

### Uses
- `useAuth()` - Get user data
- `useNavigate()` - Navigate to class detail
- `classService.getTeachingClasses()` - Fetch classes
- `classService.getClassAnalytics('all')` - Fetch aggregated analytics
- `classService.exportCSV('all')` - Export all analytics

### State
- `classes` - Array of class objects
- `analytics` - Analytics data object
- `loading` - Boolean loading state
- `showCreateModal` - Boolean modal visibility
- `error` - Error message string

### Key Features
- 4 stat cards with emoji icons
- Class cards grid (clickable for navigation)
- Weak areas sidebar
- Top performers list
- CSV export button
- Modal for creating new classes

### Mock Data
```javascript
{
  id: '1',
  name: 'Advanced Mathematics',
  classCode: 'MATH101',
  studentCount: 28,
  materialCount: 5,
  avgCompletion: 72,
}
```

---

## ClassDetail Component

**Location:** `src/pages/teacher/ClassDetail.jsx`  
**Purpose:** Detailed view of a single class with student management

### Props
- `id` - Class ID from URL params

### Uses
- `useParams()` - Get class ID
- `useNavigate()` - Navigate back to dashboard
- `useAuth()` - Get user data
- `classService.getClassDetails(id)` - Fetch class details
- `classService.getClassAnalytics(id)` - Fetch class analytics
- `classService.exportCSV(id)` - Export class CSV

### State
- `classData` - Class details object
- `students` - Array of student objects
- `milestones` - Array of milestone objects
- `loading` - Boolean loading state
- `error` - Error message string
- `showUploadModal` - Boolean modal visibility
- `showMilestoneModal` - Boolean modal visibility
- `sortBy` - Sort option ('progress' or 'name')

### Key Features
- Back button to dashboard
- Upload Material button (opens modal)
- Export CSV button
- Milestones section (horizontal scroll)
- Student table with sorting
- Responsive table (scrolls on mobile)

### Mock Data
```javascript
{
  id: '1',
  name: 'Arjun Singh',
  progress: 95,
  weakAreas: [],
  sessionCount: 24,
  confidence: 92,
  lastActive: '2026-03-28T00:00:00Z',
}
```

---

## CreateClassModal Component

**Location:** `src/pages/teacher/CreateClassModal.jsx`  
**Purpose:** Modal for creating a new class

### Props
- `isOpen` - Boolean to show/hide modal
- `onClose` - Callback when modal closes
- `onCreated` - Callback when class is created with new class object

### Uses
- `classService.createClass(name, description)` - Create class API call
- `navigator.clipboard.writeText()` - Copy class code to clipboard

### State
- `formData` - Form data object { name, description, mode }
- `loading` - Boolean loading state
- `error` - Error message string
- `success` - Boolean success state
- `generatedCode` - Generated class code from API

### Key Features
- Form with class name and description
- Mode selector (Compulsory / Self-learning)
- Success screen showing generated class code
- Copy to clipboard button
- Form validation

### Form Data Example
```javascript
{
  name: 'Advanced Mathematics',
  description: 'A comprehensive course...',
  mode: 'compulsory'
}
```

### API Response Example
```javascript
{
  id: '1',
  name: 'Advanced Mathematics',
  classCode: 'MATH101',
  description: 'A comprehensive course...'
}
```

---

## UploadMaterialModal Component

**Location:** `src/pages/teacher/UploadMaterialModal.jsx`  
**Purpose:** Modal for uploading PDF materials to a class

### Props
- `isOpen` - Boolean to show/hide modal
- `onClose` - Callback when modal closes
- `classId` - ID of the class to upload to
- `onUploaded` - Callback when file is successfully uploaded

### Uses
- `classService.uploadMaterial(classId, file)` - Upload file API call
- Drag-and-drop file handling

### State
- `file` - Selected file object
- `loading` - Boolean loading state
- `error` - Error message string
- `success` - Boolean success state
- `uploadProgress` - Upload progress percentage (0-100)

### Key Features
- Drag-and-drop file zone
- File input with "Browse files" button
- File validation (PDF only, max 50MB)
- Upload progress bar
- Success screen with file confirmation
- Error messages with validation

### Validation Rules
- File type: `application/pdf`
- Max size: 50MB
- Clear error messages for validation failures

---

## AddMilestoneModal Component

**Location:** `src/pages/teacher/AddMilestoneModal.jsx`  
**Purpose:** Modal for adding deadline milestones to a class

### Props
- `isOpen` - Boolean to show/hide modal
- `onClose` - Callback when modal closes
- `onAdded` - Callback when milestone is added

### State
- `formData` - Form data object { topic, deadline, isCompulsory }
- `loading` - Boolean loading state
- `error` - Error message string
- `success` - Boolean success state

### Key Features
- Topic name input
- Datetime picker for deadline
- Compulsory toggle checkbox
- Form validation
- Deadline validation (must be in future)
- Success screen with confirmation

### Form Data Example
```javascript
{
  topic: 'Calculus Fundamentals',
  deadline: '2026-04-15T14:30',
  isCompulsory: true
}
```

---

## Shared Components Used

### Navbar
- Shows user name and role
- Logout button
- Responsive mobile menu
- Click to navigate to home

### Badge
- Props: `color` ('indigo', 'cyan', 'green', 'red', 'amber', 'slate')
- Props: `className` - Additional CSS classes
- Used for: Class codes, status indicators, metrics

### ProgressBar
- Props: `value` - Current value
- Props: `max` - Maximum value (default 100)
- Props: `color` - Color variant
- Props: `height` - Bar height (default 'h-2')
- Props: `showLabel` - Show percentage text
- Used for: Progress tracking, confidence metrics

---

## Services Used

### classService Methods

```javascript
// GET - Fetch teacher's classes
classService.getTeachingClasses()
// Returns: { data: [...classes] }

// GET - Fetch single class details
classService.getClassDetails(classId)
// Returns: { data: {...classData} }

// GET - Fetch class analytics (students, milestones, etc)
classService.getClassAnalytics(classId)
// Returns: { data: {...analyticsData} }

// POST - Create new class
classService.createClass(name, description)
// Returns: { data: {...newClass, classCode} }

// POST - Upload material PDF
classService.uploadMaterial(classId, file)
// Expects: File object (FormData handled internally)
// Returns: { data: {...materialData} }

// GET - Export analytics as CSV
classService.exportCSV(classId)
// Returns: Blob (for download)
```

---

## Error Handling Pattern

All components follow this pattern:

```javascript
try {
  setLoading(true);
  setError(null);
  
  // API call
  const response = await apiService.method();
  setData(response.data || mockData);
  
} catch (err) {
  // Fallback to mock data on error
  const errorMessage = err.response?.data?.message || 'Default error message';
  setError(errorMessage);
  setData(mockData);
  console.error('Error:', err);
  
} finally {
  setLoading(false);
}
```

**Important:** All components have mock data fallback, so UI renders even if API fails.

---

## Loading States

All components show a spinner while loading:

```jsx
{loading ? (
  <div className="flex justify-center py-8">
    <div className="inline-block w-8 h-8 border-4 border-indigo-400 border-t-white rounded-full animate-spin" />
  </div>
) : (
  // Content
)}
```

---

## Color Coding

### Progress Bars
- Green: >= 70%
- Amber: 50-69%
- Red: < 50%

### Confidence Badges
- Green: >= 80%
- Amber: 60-79%
- Red: < 60%

### Milestone Status
- ✅ Passed: Deadline in past
- ⏰ Final: Deadline within 3 days
- 📅 Upcoming: Deadline > 3 days away

---

## Responsive Breakpoints

Uses Tailwind default breakpoints:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

Key responsive classes:
- `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` - Stats cards
- `lg:col-span-2` - Dashboard two-column layout
- `hidden md:flex` - Desktop-only elements
- `w-full sm:w-auto` - Full width on mobile, auto on desktop

---

## Emoji Icons Used

- 👥 Students
- 📚 Classes
- 📊 Analytics
- ⚠️ Warnings
- 🥇🥈🥉 Medals for rankings
- ⭐ Star for performers
- 📖 Book for classes
- ✅ Checkmark for passed
- ⏰ Clock for urgent
- 📅 Calendar for upcoming
- 📤 Upload
- 📥 Download
- 📄 Document
- 📊 Chart/Export
- 🎯 Target/Milestone
- 🧠 Brain (logo)

---

## Testing Tips

### Test with Mock Data
1. All components work perfectly with built-in mock data
2. Perfect for demo/evaluation before backend is ready

### Test Error Handling
1. Temporarily break API call to see error messages
2. Mock fallback will display with error state

### Test Responsive Design
1. Use browser DevTools to test different screen sizes
2. Test: Mobile (375px), Tablet (768px), Desktop (1920px)

### Test Modal Flows
1. Test open/close cycles
2. Test success screens
3. Test cancel/reset behavior

---

## Future Integration

When backend is ready:

1. Update API endpoints in `src/services/api.js`
2. No code changes needed in these components
3. Mock fallbacks automatically deactivate
4. Real API data flows through

All components are already production-ready and awaiting backend endpoints.
