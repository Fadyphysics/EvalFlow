import { useState, useEffect } from 'react';
import { db } from './DatabaseService';
import type { Class, Student, Evaluation } from './DatabaseService';
import { calculateScores } from './scoreCalculator';
import { generateEvaluationPdf } from './pdfGenerator';
import './App.css';

// Type definitions for better type safety
type ViewType = 'home' | 'addClass' | 'classDetail' | 'addStudent' | 'studentDetail' | 'evaluation' | 'review' | 'settings';
type ClassInput = Omit<Class, 'id' | 'createdAt'>;

// Define the evaluation structure - NEW 8 STUDENT DOMAINS WITH 3 INDICATORS EACH
const evaluationDomains = [
  {
    id: 'participation-engagement',
    name: 'Participation & Engagement',
    indicators: [
      'Actively participates in class discussions and activities.',
      'Shows interest and enthusiasm for learning.',
      'Remains focused and attentive during lessons.'
    ]
  },
  {
    id: 'understanding-learning',
    name: 'Understanding & Learning',
    indicators: [
      'Demonstrates good comprehension of concepts taught.',
      'Applies knowledge to new situations effectively.',
      'Asks thoughtful questions to deepen understanding.'
    ]
  },
  {
    id: 'thinking-problem-solving',
    name: 'Thinking & Problem Solving',
    indicators: [
      'Thinks critically and analytically.',
      'Approaches problems with creativity and logic.',
      'Works through challenges independently.'
    ]
  },
  {
    id: 'independent-learning',
    name: 'Independent Learning',
    indicators: [
      'Completes tasks without constant supervision.',
      'Takes initiative in learning activities.',
      'Self-regulates learning behaviors effectively.'
    ]
  },
  {
    id: 'collaboration-communication',
    name: 'Collaboration & Communication',
    indicators: [
      'Works well with peers in group activities.',
      'Communicates ideas clearly and respectfully.',
      'Listens actively to others during discussions.'
    ]
  },
  {
    id: 'behaviour-conduct',
    name: 'Behaviour & Classroom Conduct',
    indicators: [
      'Follows classroom rules and expectations.',
      'Shows respect to teachers and classmates.',
      'Handles conflicts appropriately.'
    ]
  },
  {
    id: 'homework-assignments',
    name: 'Homework & Assignments',
    indicators: [
      'Completes assignments on time consistently.',
      'Produces quality work that reflects effort.',
      'Seeks help when facing difficulties with tasks.'
    ]
  },
  {
    id: 'habits-progress',
    name: 'Learning Habits & Progress',
    indicators: [
      'Demonstrates consistent improvement over time.',
      'Develops effective study habits and routines.',
      'Takes responsibility for own learning progress.'
    ]
  }
];

type RatingValue = 1 | 2 | 3 | 4; // REMOVED 'N/O' OPTION

// Type for evaluation progress tracking
interface EvaluationProgress {
  currentScore: number | null;
  previousScore: number | null;
  difference: number | null;
  direction: 'improvement' | 'decline' | 'unchanged';
  cumulativeAverage: number | null;
}

function App() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [newClass, setNewClass] = useState<ClassInput>({
    name: '',
    subject: '',
    grade: ''
  });
  const [newStudent, setNewStudent] = useState<Omit<Student, 'id' | 'createdAt'>>({
    firstName: '',
    lastName: '',
    classId: '',
    studentId: undefined
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Global teacher profile state
  const [teacherProfile, setTeacherProfile] = useState<{ name: string, school?: string }>({ name: 'Current User' });
  const [tempProfileName, setTempProfileName] = useState('');
  const [tempProfileSchool, setTempProfileSchool] = useState('');
  
  // Evaluation state
  const [currentEvaluation, setCurrentEvaluation] = useState<Evaluation | null>(null);
  const [currentDomainIndex, setCurrentDomainIndex] = useState(0);
  const [evaluationStep, setEvaluationStep] = useState<'rating' | 'final'>('rating');
  
  // Review state
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);

  // Load classes, students, and teacher profile from database when component mounts
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load classes and students
        const loadedClasses = await db.classes.toArray();
        const loadedStudents = await db.students.toArray();
        setClasses(loadedClasses);
        setStudents(loadedStudents);
        
        // Load teacher profile from localStorage
        const savedProfile = localStorage.getItem('teacherProfile');
        if (savedProfile) {
          const parsedProfile = JSON.parse(savedProfile);
          setTeacherProfile(parsedProfile);
          setTempProfileName(parsedProfile.name);
          setTempProfileSchool(parsedProfile.school || '');
        } else {
          // Set default profile
          setTempProfileName('Current User');
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('Failed to load classes and students from database');
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Filter students by selected class
  const classStudents = selectedClass 
    ? students.filter(student => student.classId === selectedClass.id)
    : [];

  // Sort students alphabetically by name
  const sortedClassStudents = [...classStudents].sort((a, b) => 
    `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
  );

  const handleAddClass = () => {
    setCurrentView('addClass');
  };

  const handleSaveClass = async () => {
    if (!newClass.name.trim()) {
      alert('Class name is required.');
      return;
    }

    try {
      const newClassRecord: Class = {
        id: Date.now().toString(), // Using timestamp as unique ID
        name: newClass.name.trim(),
        subject: newClass.subject.trim(),
        grade: newClass.grade.trim(),
        createdAt: new Date().toISOString()
      };

      // Save to database
      await db.classes.add(newClassRecord);
      
      // Update local state
      setClasses(prev => [...prev, newClassRecord]);
      setNewClass({ name: '', subject: '', grade: '' });
      setCurrentView('home');
    } catch (err) {
      console.error('Failed to save class:', err);
      alert('Failed to save class. Please try again.');
    }
  };

  const handleCancelClass = () => {
    setNewClass({ name: '', subject: '', grade: '' });
    setCurrentView('home');
  };

  const handleSelectClass = (classRecord: Class) => {
    setSelectedClass(classRecord);
    setCurrentView('classDetail');
  };

  const handleBackToHome = () => {
    setCurrentView('home');
    setSelectedClass(null);
    setSelectedStudent(null);
    // Reset evaluation state when navigating away
    setCurrentEvaluation(null);
    setCurrentDomainIndex(0);
    setEvaluationStep('rating');
    setEvaluations([]);
    setSelectedEvaluation(null);
  };

  const handleBackToClass = () => {
    setCurrentView('classDetail');
    setSelectedStudent(null);
    // Reset evaluation state when navigating away
    setCurrentEvaluation(null);
    setCurrentDomainIndex(0);
    setEvaluationStep('rating');
    setEvaluations([]);
    setSelectedEvaluation(null);
  };

  // Go back to student detail from review
  const handleBackToStudent = () => {
    setCurrentView('studentDetail');
    // Don't reset selectedStudent so we stay on the same student
    // Reset evaluation state when navigating away
    setCurrentEvaluation(null);
    setCurrentDomainIndex(0);
    setEvaluationStep('rating');
    setSelectedEvaluation(null);
  };

  // Add student to class
  const handleAddStudent = () => {
    if (!selectedClass) return;
    
    setNewStudent({
      firstName: '',
      lastName: '',
      classId: selectedClass.id,
      studentId: undefined
    });
    setCurrentView('addStudent');
  };

  const handleSaveStudent = async () => {
    if (!newStudent.firstName.trim() || !newStudent.lastName.trim()) {
      alert('First Name and Last Name are required.');
      return;
    }

    try {
      const student: Student = {
        id: Date.now().toString(), // Using timestamp as unique ID
        firstName: newStudent.firstName.trim(),
        lastName: newStudent.lastName.trim(),
        classId: newStudent.classId,
        studentId: newStudent.studentId?.trim(),
        createdAt: new Date().toISOString()
      };

      // Save to database
      await db.students.add(student);
      
      // Update local state
      setStudents(prev => [...prev, student]);
      setNewStudent({
        firstName: '',
        lastName: '',
        classId: selectedClass?.id || '',
        studentId: undefined
      });
      setCurrentView('classDetail');
    } catch (err) {
      console.error('Failed to save student:', err);
      alert('Failed to save student. Please try again.');
    }
  };

  const handleCancelStudent = () => {
    setNewStudent({
      firstName: '',
      lastName: '',
      classId: selectedClass?.id || '',
      studentId: undefined
    });
    setCurrentView('classDetail');
  };

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    setCurrentView('studentDetail');
  };

  // Navigate to review screen
  const goToReview = async () => {
    if (!selectedStudent) return;
    
    try {
      // Load evaluations for the selected student
      const studentEvaluations = await db.evaluations
        .where('studentId')
        .equals(selectedStudent.id)
        .sortBy('createdAt'); // Sort by creation time (newest first)
      
      // Reverse the array to get newest first
      const sortedEvaluations = studentEvaluations.reverse();
      
      setEvaluations(sortedEvaluations);
      setCurrentView('review');
    } catch (err) {
      console.error('Failed to load evaluations:', err);
      alert('Failed to load evaluations. Please try again.');
    }
  };

  // Calculate progress between two evaluations
  const calculateProgress = (current: Evaluation, previous: Evaluation): EvaluationProgress => {
    const currentScore = current.overallScore;
    const previousScore = previous.overallScore;
    
    let difference: number | null = null;
    let direction: 'improvement' | 'decline' | 'unchanged' = 'unchanged';
    
    if (currentScore !== null && previousScore !== null) {
      difference = currentScore - previousScore;
      
      if (difference > 0.05) {
        direction = 'improvement'; // Improvement
      } else if (difference < -0.05) {
        direction = 'decline'; // Decline
      } else {
        direction = 'unchanged'; // Unchanged
      }
    }
    
    // Calculate cumulative average
    let cumulativeAverage: number | null = null;
    if (currentScore !== null && previousScore !== null) {
      cumulativeAverage = (currentScore + previousScore) / 2;
    } else if (currentScore !== null) {
      cumulativeAverage = currentScore;
    } else if (previousScore !== null) {
      cumulativeAverage = previousScore;
    }
    
    return {
      currentScore,
      previousScore,
      difference,
      direction,
      cumulativeAverage
    };
  };

  // Start new evaluation
  const startNewEvaluation = async () => {
    if (!selectedStudent) return;
    
    // Get the existing evaluations for this student to determine the next evaluation number
    const existingEvaluations = await db.evaluations.where('studentId').equals(selectedStudent.id).toArray();
    // Sort by date to get the latest
    const sortedEvaluations = existingEvaluations.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const nextEvaluationNumber = sortedEvaluations.length + 1;
    
    // Get the student's class to get subject and grade info
    const studentClass = classes.find(c => c.id === selectedStudent.classId);
    
    // Create new evaluation with teacher's profile name
    const newEvaluation: Evaluation = {
      id: Date.now().toString(),
      studentId: selectedStudent.id,
      evaluationNumber: nextEvaluationNumber,
      evaluator: teacherProfile.name, // Use teacher profile name
      subject: studentClass?.subject || '',
      grade: studentClass?.grade || '',
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
      ratings: {}, // Will store indicator ratings
      domainScores: {}, // Will be calculated as ratings are added
      overallScore: null, // Will be calculated as ratings are added
      strengths: '',
      developmentAreas: '',
      notes: '',
      createdAt: new Date().toISOString()
    };
    
    setCurrentEvaluation(newEvaluation);
    setCurrentDomainIndex(0);
    setEvaluationStep('rating');
    setCurrentView('evaluation');
  };

  // Handle rating selection
  const handleRateIndicator = (domainId: string, indicatorIndex: number, rating: RatingValue) => {
    if (!currentEvaluation) return;
    
    const indicatorKey = `${domainId}-${indicatorIndex}`;
    const updatedRatings = {
      ...currentEvaluation.ratings,
      [indicatorKey]: rating
    };
    
    // Create updated evaluation with new ratings
    const updatedEvaluation = {
      ...currentEvaluation,
      ratings: updatedRatings
    };
    
    // Calculate updated scores based on new ratings
    const evaluationWithScores = calculateScores(updatedEvaluation);
    
    setCurrentEvaluation(evaluationWithScores);
  };

  // Navigate to next domain
  const goToNextDomain = () => {
    if (currentDomainIndex < evaluationDomains.length - 1) {
      setCurrentDomainIndex(currentDomainIndex + 1);
    }
  };

  // Navigate to previous domain
  const goToPreviousDomain = () => {
    if (currentDomainIndex > 0) {
      setCurrentDomainIndex(currentDomainIndex - 1);
    }
  };

  // Complete evaluation and move to final step
  const completeRatingPhase = () => {
    if (currentDomainIndex === evaluationDomains.length - 1) {
      setEvaluationStep('final');
    }
  };

  // Handle final evaluation submission
  const handleSaveEvaluation = async () => {
    if (!currentEvaluation) {
      alert('No evaluation to save.');
      return;
    }
    
    try {
      // Calculate final scores before saving
      const evaluationToSave = calculateScores(currentEvaluation);
      
      // Save the evaluation to the database
      await db.evaluations.add(evaluationToSave);
      
      // Show success message
      alert(`Evaluation #${evaluationToSave.evaluationNumber} saved successfully.`);
      
      // Reset evaluation state
      setCurrentEvaluation(null);
      setCurrentDomainIndex(0);
      setEvaluationStep('rating');
      
      // Go back to student detail
      setCurrentView('studentDetail');
    } catch (err) {
      console.error('Failed to save evaluation:', err);
      alert('Failed to save evaluation. Please try again.');
    }
  };

  // Download PDF for current evaluation
  const downloadCurrentEvaluationPdf = () => {
    if (currentEvaluation && selectedStudent) {
      const studentName = `${selectedStudent.firstName} ${selectedStudent.lastName}`;
      generateEvaluationPdf(currentEvaluation, studentName);
    }
  };

  // Download PDF for selected evaluation - direct function call without state manipulation
  const downloadSelectedEvaluationPdf = (evaluation: Evaluation) => {
    if (selectedStudent) {
      const studentName = `${selectedStudent.firstName} ${selectedStudent.lastName}`;
      generateEvaluationPdf(evaluation, studentName);
    }
  };

  // View evaluation details
  const viewEvaluationDetails = (evaluation: Evaluation) => {
    setSelectedEvaluation(evaluation);
    setCurrentView('evaluation'); // We'll reuse the evaluation view for details
  };

  // Delete an evaluation
  const deleteEvaluation = async (evaluationId: string) => {
    if (window.confirm('Are you sure you want to delete this evaluation?')) {
      try {
        await db.evaluations.delete(evaluationId);
        
        // If we're currently viewing the deleted evaluation, go back to history
        if (selectedEvaluation && selectedEvaluation.id === evaluationId) {
          setSelectedEvaluation(null);
          setCurrentView('review');
        }
        
        // Reload evaluations for the current student
        if (selectedStudent) {
          const updatedEvaluations = await db.evaluations
            .where('studentId')
            .equals(selectedStudent.id)
            .sortBy('createdAt');
          
          // Reverse the array to get newest first
          const sortedEvaluations = updatedEvaluations.reverse();
          setEvaluations(sortedEvaluations);
        }
        
        alert('Evaluation deleted successfully.');
      } catch (err) {
        console.error('Failed to delete evaluation:', err);
        alert('Failed to delete evaluation. Please try again.');
      }
    }
  };

  // Go back from evaluation details to review
  const goBackToReview = () => {
    setCurrentView('review');
    setSelectedEvaluation(null);
  };

  // Open settings/profile modal
  const openSettings = () => {
    setTempProfileName(teacherProfile.name);
    setTempProfileSchool(teacherProfile.school || '');
    setCurrentView('settings');
  };

  // Save teacher profile
  const saveTeacherProfile = () => {
    if (tempProfileName.trim()) {
      const newProfile = { 
        name: tempProfileName.trim(),
        school: tempProfileSchool.trim() || '' 
      };
      setTeacherProfile(newProfile);
      localStorage.setItem('teacherProfile', JSON.stringify(newProfile));
      setCurrentView('home');
    }
  };

  // Cancel profile editing
  const cancelProfileEdit = () => {
    setTempProfileName(teacherProfile.name);
    setTempProfileSchool(teacherProfile.school || '');
    setCurrentView('home');
  };

  // Get current rating for an indicator
  const getCurrentRating = (domainId: string, indicatorIndex: number): RatingValue | null => {
    if (!currentEvaluation) return null;
    const indicatorKey = `${domainId}-${indicatorIndex}`;
    const rating = currentEvaluation.ratings[indicatorKey];
    return rating as RatingValue || null;
  };

  // Format score for display (with safety guards for undefined/null values)
  const formatScore = (score: number | null | undefined): string => {
    if (score === undefined || score === null || isNaN(Number(score))) return 'N/A';
    return score.toFixed(2);
  };

  if (loading) {
    return (
      <div className="app-container">
        <div className="header-with-settings">
          <h1 className="main-title">EvalView</h1>
          <button 
            className="settings-btn"
            onClick={openSettings}
            title="Edit Teacher Profile"
          >
            ⚙️
          </button>
        </div>
        <p>Loading classes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-container">
        <div className="header-with-settings">
          <h1 className="main-title">EvalView</h1>
          <button 
            className="settings-btn"
            onClick={openSettings}
            title="Edit Teacher Profile"
          >
            ⚙️
          </button>
        </div>
        <p>Error: {error}</p>
        <p>Please refresh the page or try again.</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      {currentView === 'home' && (
        <div className="home-screen">
          <div className="header-with-settings">
            <div>
              <h1 className="main-title">EvalView</h1>
              <p className="subheading">Student Performance</p>
            </div>
            <button 
              className="settings-btn"
              onClick={openSettings}
              title="Edit Teacher Profile"
            >
              ⚙️
            </button>
          </div>
          
          <div className="classes-list">
            <h2>Classes</h2>
            <p className="subheading">Select a class to manage student evaluations</p>
            {classes.length === 0 ? (
              <div className="card empty-state">
                <h3>No classes yet</h3>
                <p>Add your first class to begin managing student evaluations.</p>
                <button 
                  className="btn btn-primary"
                  onClick={handleAddClass}
                >
                  ＋ Add Class
                </button>
              </div>
            ) : (
              <div className="classes-grid">
                {[...classes]
                  .sort((a, b) => a.name.localeCompare(b.name)) // Sort alphabetically by class name
                  .map(classRecord => (
                    <div 
                      key={classRecord.id} 
                      className="class-card card"
                      onClick={() => handleSelectClass(classRecord)}
                    >
                      <div className="class-info">
                        <span className="class-name">{classRecord.name.toUpperCase()}</span>
                        <span className="class-meta">• {classRecord.subject} • {classRecord.grade}</span>
                        <span className="class-meta">
                          {students.filter(s => s.classId === classRecord.id).length} student{students.filter(s => s.classId === classRecord.id).length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
          
          {classes.length > 0 && (
            <button 
              className="btn btn-primary add-class-btn"
              onClick={handleAddClass}
            >
              ＋ Add Class
            </button>
          )}
        </div>
      )}

      {currentView === 'settings' && (
        <div className="settings-screen">
          <div className="header-with-settings">
            <h1 className="main-title">Teacher Profile</h1>
            <button 
              className="settings-btn"
              onClick={openSettings}
              title="Edit Teacher Profile"
            >
              ⚙️
            </button>
          </div>
          
          <div className="card profile-form">
            <div className="form-group">
              <label htmlFor="teacherName">Your Name</label>
              <input
                id="teacherName"
                type="text"
                value={tempProfileName}
                onChange={(e) => setTempProfileName(e.target.value)}
                placeholder="Enter your full name"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="teacherSchool">School (optional)</label>
              <input
                id="teacherSchool"
                type="text"
                value={tempProfileSchool}
                onChange={(e) => setTempProfileSchool(e.target.value)}
                placeholder="Enter your school name"
              />
            </div>
            
            <div className="button-group">
              <button 
                className="btn btn-primary save-profile-btn"
                onClick={saveTeacherProfile}
              >
                Save Profile
              </button>
              <button 
                className="btn btn-secondary cancel-btn"
                onClick={cancelProfileEdit}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {currentView === 'addClass' && (
        <div className="add-class-screen">
          <h2>Add New Class</h2>
          
          <div className="form-group">
            <label htmlFor="className">Class Name</label>
            <input
              id="className"
              type="text"
              value={newClass.name}
              onChange={(e) => setNewClass({...newClass, name: e.target.value})}
              placeholder="Enter class name"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="classSubject">Subject</label>
            <input
              id="classSubject"
              type="text"
              value={newClass.subject}
              onChange={(e) => setNewClass({...newClass, subject: e.target.value})}
              placeholder="Enter subject"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="classGrade">Grade/Level</label>
            <input
              id="classGrade"
              type="text"
              value={newClass.grade}
              onChange={(e) => setNewClass({...newClass, grade: e.target.value})}
              placeholder="Enter grade/level"
            />
          </div>
          
          <div className="button-group">
            <button 
              className="save-class-btn"
              onClick={handleSaveClass}
            >
              Save Class
            </button>
            <button 
              className="cancel-btn"
              onClick={handleCancelClass}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {currentView === 'classDetail' && selectedClass && (
        <div className="class-detail-screen">
          <div className="header-with-settings">
            <div>
              <h1 className="main-title">{selectedClass.name}</h1>
              <p className="subheading">{selectedClass.subject} • {selectedClass.grade}</p>
            </div>
            <button 
              className="settings-btn"
              onClick={openSettings}
              title="Edit Teacher Profile"
            >
              ⚙️
            </button>
          </div>
          
          <div className="card class-details">
            <h3>Students</h3>
            {sortedClassStudents.length === 0 ? (
              <div className="empty-state">
                <p>No students in this class.</p>
                <p>Click 'Add Student' to add students.</p>
              </div>
            ) : (
              <div className="students-list">
                {sortedClassStudents.map(student => (
                  <div 
                    key={student.id} 
                    className="student-card card"
                    onClick={() => handleSelectStudent(student)}
                  >
                    <div className="student-info">
                      <span className="student-name">{student.firstName} {student.lastName}</span>
                      {student.studentId && <span className="student-meta">• {student.studentId}</span>}
                      {(() => {
                        // Get evaluations for this student to show evaluation count
                        const studentEvaluations = evaluations.filter(evaluation => evaluation.studentId === student.id);
                        
                        if (studentEvaluations.length === 0) {
                          return <span className="student-meta">• No evaluation</span>;
                        } else {
                          return <span className="student-meta">• {studentEvaluations.length} evaluation{studentEvaluations.length !== 1 ? 's' : ''}</span>;
                        }
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="class-actions">
            <button 
              className="btn btn-primary primary-action-btn"
              onClick={handleAddStudent}
            >
              + Add Student
            </button>
          </div>
          
          <button 
            className="back-btn"
            onClick={handleBackToHome}
          >
            ← Back to Home
          </button>
        </div>
      )}

      {currentView === 'addStudent' && selectedClass && (
        <div className="add-student-screen">
          <h2>Add New Student to {selectedClass.name}</h2>
          
          <div className="form-group">
            <label htmlFor="studentFirstName">First Name</label>
            <input
              id="studentFirstName"
              type="text"
              value={newStudent.firstName}
              onChange={(e) => setNewStudent({...newStudent, firstName: e.target.value})}
              placeholder="Enter first name"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="studentLastName">Last Name</label>
            <input
              id="studentLastName"
              type="text"
              value={newStudent.lastName}
              onChange={(e) => setNewStudent({...newStudent, lastName: e.target.value})}
              placeholder="Enter last name"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="studentId">Student ID (optional)</label>
            <input
              id="studentId"
              type="text"
              value={newStudent.studentId || ''}
              onChange={(e) => setNewStudent({...newStudent, studentId: e.target.value})}
              placeholder="Enter student ID"
            />
          </div>
          
          <div className="button-group">
            <button 
              className="save-student-btn"
              onClick={handleSaveStudent}
            >
              Save Student
            </button>
            <button 
              className="cancel-btn"
              onClick={handleCancelStudent}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {currentView === 'studentDetail' && selectedStudent && (
        <div className="student-detail-screen">
          <div className="header-with-settings">
            <div>
              <h1 className="main-title">{selectedStudent.firstName} {selectedStudent.lastName}</h1>
              <p className="subheading">
                {selectedClass && `${selectedClass.grade} • ${selectedClass.subject}`}
                {selectedStudent.studentId && ` • ${selectedStudent.studentId}`}
              </p>
            </div>
            <button 
              className="settings-btn"
              onClick={openSettings}
              title="Edit Teacher Profile"
            >
              ⚙️
            </button>
          </div>
          
          {/* Show evaluation history summary */}
          <div className="evaluation-history-summary">
            <div className="card">
              <h3>Performance Overview</h3>
              {(() => {
                // Get evaluations for this student to show progress
                const studentEvaluations = evaluations.filter(evaluation => evaluation.studentId === selectedStudent.id);
                const sortedEvals = [...studentEvaluations].sort((a, b) => 
                  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );
                
                if (sortedEvals.length === 0) {
                  return (
                    <div className="no-evaluations-message">
                      <p>No evaluation recorded. This student is performing normally.</p>
                    </div>
                  );
                } else if (sortedEvals.length === 1) {
                  // Single evaluation - First Evaluation
                  const firstEvaluation = sortedEvals[0];
                  return (
                    <div className="first-evaluation-summary">
                      <h4>First Evaluation</h4>
                      <div className="scores-summary">
                        <div className="score-card">
                          <div className="score-value">{formatScore(firstEvaluation.overallScore)}</div>
                          <div className="score-label">Overall Score</div>
                        </div>
                      </div>
                      <p><strong>Date:</strong> {firstEvaluation.date}</p>
                    </div>
                  );
                } else {
                  // Multiple evaluations - Show progress from last two
                  const currentEval = sortedEvals[0]; // Most recent
                  const previousEval = sortedEvals[1]; // Second most recent
                  
                  const progress = calculateProgress(currentEval, previousEval);
                  
                  // Determine direction symbol and color
                  let directionSymbol = '→';
                  let directionColor = 'var(--ev-info)'; // Blue for unchanged
                  let directionLabel = 'Unchanged';
                  
                  if (progress.direction === 'improvement') {
                    directionSymbol = '↑';
                    directionColor = 'var(--ev-success)'; // Green for improvement
                    directionLabel = 'Improved';
                  } else if (progress.direction === 'decline') {
                    directionSymbol = '↓';
                    directionColor = 'var(--ev-danger)'; // Red for decline
                    directionLabel = 'Declined';
                  }
                  
                  return (
                    <div className="progress-summary">
                      <h4>Progress Tracking</h4>
                      <div className="progress-metrics">
                        <div className="metric">
                          <span className="metric-label">Current ({currentEval.evaluationNumber})</span>
                          <span className="metric-value">{formatScore(progress.currentScore)}</span>
                        </div>
                        <div className="metric">
                          <span className="metric-label">Previous ({previousEval.evaluationNumber})</span>
                          <span className="metric-value">{formatScore(progress.previousScore)}</span>
                        </div>
                        <div className="metric">
                          <span className="metric-label">Change</span>
                          <span 
                            className="metric-value" 
                            style={{ color: directionColor, fontWeight: 'bold' }}
                          >
                            {progress.difference !== null ? `${progress.difference >= 0 ? '+' : ''}${progress.difference.toFixed(2)}` : 'N/A'} {directionSymbol}
                          </span>
                        </div>
                        <div className="metric">
                          <span className="metric-label">Avg.</span>
                          <span className="metric-value">{formatScore(progress.cumulativeAverage)}</span>
                        </div>
                      </div>
                      <div className="progress-status" style={{ color: directionColor }}>
                        {directionLabel}
                      </div>
                    </div>
                  );
                }
              })()}
            </div>
          </div>
          
          <div className="student-actions">
            <button 
              className="btn btn-primary primary-action-btn"
              onClick={startNewEvaluation}
            >
              + New Evaluation
            </button>
            
            <button 
              className="btn btn-secondary secondary-action-btn"
              onClick={goToReview}
            >
              Review History
            </button>
          </div>
          
          <button 
            className="back-btn"
            onClick={handleBackToClass}
          >
            ← Back to Class
          </button>
        </div>
      )}

      {currentView === 'review' && selectedStudent && (
        <div className="review-screen">
          <div className="header-with-settings">
            <div>
              <h1 className="main-title">Evaluation History</h1>
              <p className="subheading">For {selectedStudent.firstName} {selectedStudent.lastName}</p>
            </div>
            <button 
              className="settings-btn"
              onClick={openSettings}
              title="Edit Teacher Profile"
            >
              ⚙️
            </button>
          </div>
          
          {evaluations.length === 0 ? (
            <div className="card empty-state">
              <h3>No evaluations yet</h3>
              <p>This student has not been evaluated yet.</p>
              <button 
                className="btn btn-primary"
                onClick={startNewEvaluation}
              >
                Start First Evaluation
              </button>
            </div>
          ) : (
            <div className="evaluations-timeline">
              {[...evaluations].reverse().map((evaluation, index) => {
                // Calculate progress compared to previous evaluation if available
                let progressInfo = null;
                if (index < evaluations.length - 1) { // Not the oldest evaluation
                  const previousEval = evaluations[index + 1]; // Next in original order (older)
                  const progress = calculateProgress(evaluation, previousEval);
                  
                  // Determine direction symbol and color
                  let directionSymbol = '→';
                  let directionColor = 'var(--ev-info)'; // Blue for unchanged
                  
                  if (progress.direction === 'improvement') {
                    directionSymbol = '↑';
                    directionColor = 'var(--ev-success)'; // Green for improvement
                  } else if (progress.direction === 'decline') {
                    directionSymbol = '↓';
                    directionColor = 'var(--ev-danger)'; // Red for decline
                  }
                  
                  progressInfo = {
                    difference: progress.difference,
                    directionSymbol,
                    directionColor
                  };
                }
                
                return (
                  <div key={evaluation.id} className="evaluation-card card">
                    <div className="evaluation-header">
                      <h3>Evaluation #{evaluation.evaluationNumber}</h3>
                      <p className="evaluation-date">{evaluation.date}</p>
                    </div>
                    
                    <div className="evaluation-overview">
                      <div className="overview-score">
                        <div className="score-value">{formatScore(evaluation.overallScore)}</div>
                        <div className="score-label">Overall Score</div>
                      </div>
                      
                      {progressInfo && (
                        <div className="overview-progress">
                          <div className="progress-change" style={{ color: progressInfo.directionColor }}>
                            {progressInfo.difference !== null ? `${progressInfo.difference >= 0 ? '+' : ''}${progressInfo.difference.toFixed(2)} ${progressInfo.directionSymbol}` : 'N/A'}
                          </div>
                          <div className="progress-label">vs Previous</div>
                        </div>
                      )}
                    </div>
                    
                    <div className="evaluation-details">
                      <p><strong>Evaluator:</strong> {evaluation.evaluator}</p>
                      <p><strong>Subject:</strong> {evaluation.subject}</p>
                      <p><strong>Grade:</strong> {evaluation.grade}</p>
                    </div>
                    
                    <div className="evaluation-actions">
                      <button 
                        className="btn btn-secondary view-details-btn"
                        onClick={() => viewEvaluationDetails(evaluation)}
                      >
                        View Details
                      </button>
                      <button 
                        className="btn btn-primary download-pdf-btn"
                        onClick={() => downloadSelectedEvaluationPdf(evaluation)}
                      >
                        Download PDF
                      </button>
                      <button 
                        className="btn btn-destructive delete-btn"
                        onClick={() => deleteEvaluation(evaluation.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          <button 
            className="back-btn"
            onClick={handleBackToStudent}
          >
            ← Back to Student
          </button>
        </div>
      )}

      {currentView === 'evaluation' && selectedEvaluation && (
        <div className="evaluation-details-screen">
          <div className="header-with-settings">
            <div>
              <h1 className="main-title">Evaluation Details</h1>
              <p className="subheading">
                <strong>Evaluator:</strong> {selectedEvaluation.evaluator} • 
                <strong> Subject:</strong> {selectedEvaluation.subject} • 
                <strong> Grade:</strong> {selectedEvaluation.grade} • 
                <strong> Date:</strong> {selectedEvaluation.date} • 
                <strong> Evaluation #:</strong> {selectedEvaluation.evaluationNumber}
              </p>
            </div>
            <button 
              className="settings-btn"
              onClick={openSettings}
              title="Edit Teacher Profile"
            >
              ⚙️
            </button>
          </div>
          
          {/* Scores Summary */}
          <div className="card scores-summary">
            <h3>Scores Summary</h3>
            <div className="domain-scores-grid">
              {evaluationDomains.map(domain => (
                <div key={domain.id} className="domain-score-item card">
                  <div className="domain-name">{domain.name}</div>
                  <div className="domain-score">{formatScore(selectedEvaluation.domainScores[domain.id])}</div>
                </div>
              ))}
            </div>
            <div className="overall-score-card card">
              <div className="overall-label">Overall Score</div>
              <div className="overall-value">{formatScore(selectedEvaluation.overallScore)}</div>
            </div>
          </div>
          
          {/* All Indicators with Ratings */}
          <div className="card all-indicators-section">
            <h3>All Indicators</h3>
            {evaluationDomains.map(domain => (
              <div key={domain.id} className="domain-indicators">
                <h4>{domain.name}</h4>
                <div className="indicators-list">
                  {domain.indicators.map((indicator, indicatorIndex) => {
                    const indicatorKey = `${domain.id}-${indicatorIndex}`;
                    const rating = selectedEvaluation.ratings[indicatorKey];
                    
                    return (
                      <div key={indicatorKey} className="indicator-rating card">
                        <div className="indicator-text-container">
                          <span className="indicator-number">{indicatorIndex + 1}.</span>
                          <span className="indicator-text">{indicator}</span>
                        </div>
                        <div className={`indicator-rating-display rating-${rating}`}>
                          {rating === 4 ? '4 - Excellent' : 
                           rating === 3 ? '3 - Good' : 
                           rating === 2 ? '2 - Developing' : 
                           rating === 1 ? '1 - Needs Improvement' : 'Not Rated'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          
          {/* Strengths, Development Areas, and Notes */}
          <div className="evaluation-notes card">
            <h3>Notes</h3>
            <div className="form-group">
              <h4>Strengths</h4>
              <p className="note-content">{selectedEvaluation.strengths || 'No strengths noted.'}</p>
            </div>
            
            <div className="form-group">
              <h4>Areas for Development</h4>
              <p className="note-content">{selectedEvaluation.developmentAreas || 'No development areas noted.'}</p>
            </div>
            
            <div className="form-group">
              <h4>Evidence / Notes</h4>
              <p className="note-content">{selectedEvaluation.notes || 'No additional notes.'}</p>
            </div>
          </div>
          
          <div className="button-group">
            <button 
              className="btn btn-primary download-pdf-btn"
              onClick={() => downloadSelectedEvaluationPdf(selectedEvaluation)}
            >
              Download PDF
            </button>
            <button 
              className="btn btn-secondary back-btn"
              onClick={goBackToReview}
            >
              ← Back to History
            </button>
          </div>
        </div>
      )}

      {currentView === 'evaluation' && currentEvaluation && selectedStudent && !selectedEvaluation && (
        <div className="evaluation-screen">
          <div className="header-with-settings">
            <div>
              <h1 className="main-title">Evaluation for {selectedStudent.firstName} {selectedStudent.lastName}</h1>
              <p className="subheading">
                <strong>Evaluator:</strong> {currentEvaluation.evaluator} • 
                <strong> Subject:</strong> {currentEvaluation.subject} • 
                <strong> Grade:</strong> {currentEvaluation.grade} • 
                <strong> Date:</strong> {currentEvaluation.date} • 
                <strong> Evaluation #:</strong> {currentEvaluation.evaluationNumber}
              </p>
            </div>
            <button 
              className="settings-btn"
              onClick={openSettings}
              title="Edit Teacher Profile"
            >
              ⚙️
            </button>
          </div>
          
          {/* Progress indicator */}
          <div className="card progress-indicator-container">
            <div className="progress-indicator">
              {evaluationDomains.map((domain, index) => (
                <span 
                  key={domain.id}
                  className={`progress-step ${index === currentDomainIndex ? 'active' : index < currentDomainIndex ? 'completed' : ''}`}
                >
                  {index + 1}
                </span>
              ))}
            </div>
            <div className="current-domain-info">
              <h3>{evaluationDomains[currentDomainIndex].name}</h3>
              <p>Domain {currentDomainIndex + 1} of {evaluationDomains.length}</p>
            </div>
          </div>
          
          {evaluationStep === 'rating' && (
            <div className="domain-rating-section card">
              <h3>{evaluationDomains[currentDomainIndex].name}</h3>
              
              <div className="indicators-list">
                {evaluationDomains[currentDomainIndex].indicators.map((indicator, indicatorIndex) => {
                  const indicatorKey = `${evaluationDomains[currentDomainIndex].id}-${indicatorIndex}`;
                  const currentRating = getCurrentRating(evaluationDomains[currentDomainIndex].id, indicatorIndex);
                  
                  return (
                    <div key={indicatorKey} className="indicator-rating card">
                      <p className="indicator-text">{indicatorIndex + 1}. {indicator}</p>
                      
                      <div className="rating-buttons">
                        <div className="rating-option-container">
                          <button
                            className={`rating-btn ${currentRating === 4 ? 'selected excellent' : 'unselected'}`}
                            onClick={() => handleRateIndicator(evaluationDomains[currentDomainIndex].id, indicatorIndex, 4)}
                          >
                            <div className="rating-value">4</div>
                            <div className="rating-label">Excellent</div>
                          </button>
                          
                          <button
                            className={`rating-btn ${currentRating === 3 ? 'selected good' : 'unselected'}`}
                            onClick={() => handleRateIndicator(evaluationDomains[currentDomainIndex].id, indicatorIndex, 3)}
                          >
                            <div className="rating-value">3</div>
                            <div className="rating-label">Good</div>
                          </button>
                          
                          <button
                            className={`rating-btn ${currentRating === 2 ? 'selected developing' : 'unselected'}`}
                            onClick={() => handleRateIndicator(evaluationDomains[currentDomainIndex].id, indicatorIndex, 2)}
                          >
                            <div className="rating-value">2</div>
                            <div className="rating-label">Developing</div>
                          </button>
                          
                          <button
                            className={`rating-btn ${currentRating === 1 ? 'selected needs-improvement' : 'unselected'}`}
                            onClick={() => handleRateIndicator(evaluationDomains[currentDomainIndex].id, indicatorIndex, 1)}
                          >
                            <div className="rating-value">1</div>
                            <div className="rating-label">Needs Improvement</div>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="navigation-buttons">
                <div className="nav-button-group">
                  {currentDomainIndex > 0 && (
                    <button 
                      className="btn btn-secondary prev-domain-btn"
                      onClick={goToPreviousDomain}
                    >
                      ← Previous Domain
                    </button>
                  )}
                  
                  {currentDomainIndex < evaluationDomains.length - 1 ? (
                    <button 
                      className="btn btn-primary next-domain-btn"
                      onClick={goToNextDomain}
                    >
                      Next Domain →
                    </button>
                  ) : (
                    <button 
                      className="btn btn-primary finish-rating-btn"
                      onClick={completeRatingPhase}
                    >
                      Finish Rating →
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {evaluationStep === 'final' && (
            <div className="final-evaluation-screen">
              <div className="card">
                <h3>Final Details</h3>
                
                {/* Display calculated scores */}
                <div className="scores-summary">
                  <h4>Scores Summary</h4>
                  <div className="domain-scores-grid">
                    {evaluationDomains.map(domain => (
                      <div key={domain.id} className="domain-score-item card">
                        <div className="domain-name">{domain.name}</div>
                        <div className="domain-score">{formatScore(currentEvaluation.domainScores[domain.id])}</div>
                      </div>
                    ))}
                  </div>
                  <div className="overall-score-card card">
                    <div className="overall-label">Overall Score</div>
                    <div className="overall-value">{formatScore(currentEvaluation.overallScore)}</div>
                  </div>
                </div>
              </div>
              
              <div className="card">
                <div className="form-group">
                  <label htmlFor="strengths">Strengths</label>
                  <textarea
                    id="strengths"
                    value={currentEvaluation.strengths || ''}
                    onChange={(e) => {
                      const updatedEvaluation = {...currentEvaluation, strengths: e.target.value};
                      setCurrentEvaluation(updatedEvaluation);
                    }}
                    placeholder="What did the student do well?"
                    rows={4}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="developmentAreas">Areas for Development</label>
                  <textarea
                    id="developmentAreas"
                    value={currentEvaluation.developmentAreas || ''}
                    onChange={(e) => {
                      const updatedEvaluation = {...currentEvaluation, developmentAreas: e.target.value};
                      setCurrentEvaluation(updatedEvaluation);
                    }}
                    placeholder="What could be improved?"
                    rows={4}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="notes">Evidence / Notes</label>
                  <textarea
                    id="notes"
                    value={currentEvaluation.notes || ''}
                    onChange={(e) => {
                      const updatedEvaluation = {...currentEvaluation, notes: e.target.value};
                      setCurrentEvaluation(updatedEvaluation);
                    }}
                    placeholder="Additional observations and evidence"
                    rows={6}
                  />
                </div>
              </div>
              
              <div className="button-group">
                <button 
                  className="btn btn-secondary download-pdf-btn"
                  onClick={downloadCurrentEvaluationPdf}
                >
                  Download PDF
                </button>
                <button 
                  className="btn btn-primary save-evaluation-btn"
                  onClick={handleSaveEvaluation}
                >
                  Save Evaluation
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
