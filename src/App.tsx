import { useState, useEffect } from 'react';
import { db } from './DatabaseService';
import type { Teacher, Evaluation } from './DatabaseService';
import { calculateScores } from './scoreCalculator';
import { generateEvaluationPdf } from './pdfGenerator';
import './App.css';

// Type definitions for better type safety
type ViewType = 'home' | 'addTeacher' | 'teacherDetail' | 'evaluation' | 'review';
type TeacherInput = Omit<Teacher, 'id' | 'createdAt'> & {
  employeeId?: string;
};

// Define the evaluation structure
const evaluationDomains = [
  {
    id: 'learning-environment',
    name: 'Learning Environment',
    indicators: [
      'Creates a positive and inclusive classroom environment.',
      'Establishes clear routines and expectations.',
      'Manages behavior and instructional time effectively.'
    ]
  },
  {
    id: 'teaching-learning',
    name: 'Teaching & Learning',
    indicators: [
      'Lesson objectives/explanations are clear.',
      'Uses effective teaching strategies and questioning.',
      'Demonstrates strong subject knowledge.'
    ]
  },
  {
    id: 'student-engagement',
    name: 'Student Engagement',
    indicators: [
      'Students are actively involved in learning.',
      'Students have opportunities to think, question, discuss, or collaborate.',
      'Students demonstrate appropriate independence in learning.'
    ]
  },
  {
    id: 'assessment-progress',
    name: 'Assessment & Student Progress',
    indicators: [
      'Checks student understanding during the lesson.',
      'Provides useful feedback.',
      'Responds appropriately to student needs and understanding.'
    ]
  },
  {
    id: 'curriculum-professionalism',
    name: 'Curriculum & Professionalism',
    indicators: [
      'Lesson activities align with curriculum objectives.',
      'Teacher demonstrates professional conduct.',
      'Teacher communicates clearly and professionally.'
    ]
  },
  {
    id: 'resources-technology',
    name: 'Resources & Technology',
    indicators: [
      'Uses appropriate instructional resources.',
      'Uses technology appropriately when relevant.',
      'Uses classroom/school resources effectively.'
    ]
  }
];

type RatingValue = 1 | 2 | 3 | 4 | 'N/O';

function App() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [newTeacher, setNewTeacher] = useState<TeacherInput>({
    firstName: '',
    lastName: '',
    subject: '',
    grade: '',
    employeeId: undefined
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Evaluation state
  const [currentEvaluation, setCurrentEvaluation] = useState<Evaluation | null>(null);
  const [currentDomainIndex, setCurrentDomainIndex] = useState(0);
  const [evaluationStep, setEvaluationStep] = useState<'rating' | 'final'>('rating');
  
  // Review state
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);
  
  // Search state for teacher dropdown
  const [teacherSearchTerm, setTeacherSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Load teachers from database when component mounts
  useEffect(() => {
    const loadTeachers = async () => {
      try {
        const loadedTeachers = await db.teachers.toArray();
        setTeachers(loadedTeachers);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load teachers:', err);
        setError('Failed to load teachers from database');
        setLoading(false);
      }
    };

    loadTeachers();
  }, []);

  // Filter teachers based on search term
  const filteredTeachers = teachers.filter(teacher => 
    `${teacher.firstName} ${teacher.lastName}`.toLowerCase().includes(teacherSearchTerm.toLowerCase())
  );

  // Sort teachers alphabetically by name
  const sortedTeachers = [...filteredTeachers].sort((a, b) => 
    `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
  );

  const handleAddTeacher = () => {
    setCurrentView('addTeacher');
  };

  const handleSaveTeacher = async () => {
    if (!newTeacher.firstName.trim() || !newTeacher.lastName.trim()) {
      alert('First Name and Last Name are required.');
      return;
    }

    try {
      const teacher: Teacher = {
        id: Date.now().toString(), // Using timestamp as unique ID
        firstName: newTeacher.firstName.trim(),
        lastName: newTeacher.lastName.trim(),
        subject: newTeacher.subject.trim(),
        grade: newTeacher.grade.trim(),
        employeeId: newTeacher.employeeId?.trim(),
        createdAt: new Date().toISOString()
      };

      // Save to database
      await db.teachers.add(teacher);
      
      // Update local state
      setTeachers(prev => [...prev, teacher]);
      setNewTeacher({ firstName: '', lastName: '', subject: '', grade: '', employeeId: '' });
      setCurrentView('home');
    } catch (err) {
      console.error('Failed to save teacher:', err);
      alert('Failed to save teacher. Please try again.');
    }
  };

  const handleCancel = () => {
    setNewTeacher({ firstName: '', lastName: '', subject: '', grade: '', employeeId: '' });
    setCurrentView('home');
  };

  const handleSelectTeacher = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setCurrentView('teacherDetail');
    setTeacherSearchTerm(`${teacher.firstName} ${teacher.lastName}`);
    setShowDropdown(false);
  };

  const handleBackToHome = () => {
    setCurrentView('home');
    setSelectedTeacher(null);
    // Reset evaluation state when navigating away
    setCurrentEvaluation(null);
    setCurrentDomainIndex(0);
    setEvaluationStep('rating');
    setEvaluations([]);
    setSelectedEvaluation(null);
    setTeacherSearchTerm('');
    setShowDropdown(false);
  };

  // Navigate to review screen
  const goToReview = async () => {
    if (!selectedTeacher) return;
    
    try {
      // Load evaluations for the selected teacher
      const teacherEvaluations = await db.evaluations
        .where('teacherId')
        .equals(selectedTeacher.id)
        .sortBy('date'); // Sort by date (newest first)
      
      // Reverse the array to get newest first
      const sortedEvaluations = teacherEvaluations.reverse();
      
      setEvaluations(sortedEvaluations);
      setCurrentView('review');
    } catch (err) {
      console.error('Failed to load evaluations:', err);
      alert('Failed to load evaluations. Please try again.');
    }
  };

  // Start new evaluation
  const startNewEvaluation = async () => {
    if (!selectedTeacher) return;
    
    // Get the next evaluation number for this teacher
    const existingEvaluations = await db.evaluations.where('teacherId').equals(selectedTeacher.id).toArray();
    const nextEvaluationNumber = existingEvaluations.length + 1;
    
    // Create new evaluation
    const newEvaluation: Evaluation = {
      id: Date.now().toString(),
      teacherId: selectedTeacher.id,
      evaluationNumber: nextEvaluationNumber,
      evaluator: 'Current User', // This could come from user profile in future
      subject: selectedTeacher.subject,
      grade: selectedTeacher.grade,
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
      
      // Go back to teacher detail
      setCurrentView('teacherDetail');
    } catch (err) {
      console.error('Failed to save evaluation:', err);
      alert('Failed to save evaluation. Please try again.');
    }
  };

  // Download PDF for current evaluation
  const downloadCurrentEvaluationPdf = () => {
    if (currentEvaluation && selectedTeacher) {
      const teacherName = `${selectedTeacher.firstName} ${selectedTeacher.lastName}`;
      generateEvaluationPdf(currentEvaluation, teacherName);
    }
  };

  // Download PDF for selected evaluation - direct function call without state manipulation
  const downloadSelectedEvaluationPdf = (evaluation: Evaluation) => {
    if (selectedTeacher) {
      const teacherName = `${selectedTeacher.firstName} ${selectedTeacher.lastName}`;
      generateEvaluationPdf(evaluation, teacherName);
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
        
        // Update the evaluations list
        setEvaluations(prev => prev.filter(evaluationItem => evaluationItem.id !== evaluationId));
        
        // If we're currently viewing the deleted evaluation, go back to history
        if (selectedEvaluation && selectedEvaluation.id === evaluationId) {
          setSelectedEvaluation(null);
          setCurrentView('review');
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

  // Get current domain
  const currentDomain = evaluationDomains[currentDomainIndex];
  
  // Get current rating for an indicator
  const getCurrentRating = (domainId: string, indicatorIndex: number): RatingValue | null => {
    if (!currentEvaluation) return null;
    const indicatorKey = `${domainId}-${indicatorIndex}`;
    const rating = currentEvaluation.ratings[indicatorKey];
    return rating as RatingValue || null;
  };

  // Format score for display (show N/A for null scores)
  const formatScore = (score: number | null): string => {
    return score === null ? 'N/A' : score.toFixed(2);
  };

  if (loading) {
    return (
      <div className="app-container">
        <h1 className="main-title">EvalFlow</h1>
        <p>Loading teachers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-container">
        <h1 className="main-title">EvalFlow</h1>
        <p>Error: {error}</p>
        <p>Please refresh the page or try again.</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      {currentView === 'home' && (
        <div className="home-screen">
          <h1 className="main-title">EvalFlow</h1>
          
          <div className="searchable-dropdown">
            <div className="dropdown-header">
              <input
                type="text"
                className="teacher-search-input"
                placeholder="Search for a teacher..."
                value={teacherSearchTerm}
                onChange={(e) => {
                  setTeacherSearchTerm(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
              />
              {showDropdown && (
                <div className="dropdown-menu">
                  {sortedTeachers.length === 0 ? (
                    <div className="dropdown-item disabled">
                      {teachers.length === 0 ? 'No teachers added yet.' : 'No teachers found.'}
                    </div>
                  ) : (
                    sortedTeachers.map(teacher => (
                      <div 
                        key={teacher.id} 
                        className="dropdown-item"
                        onClick={() => handleSelectTeacher(teacher)}
                      >
                        <div className="teacher-info">
                          <span className="teacher-name">{teacher.firstName} {teacher.lastName}</span>
                          <span className="teacher-meta">• {teacher.subject} • {teacher.grade}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
          
          <button 
            className="add-teacher-btn"
            onClick={handleAddTeacher}
          >
            ＋ Teacher
          </button>
        </div>
      )}

      {currentView === 'addTeacher' && (
        <div className="add-teacher-screen">
          <h2>Add New Teacher</h2>
          
          <div className="form-group">
            <label htmlFor="firstName">First Name</label>
            <input
              id="firstName"
              type="text"
              value={newTeacher.firstName}
              onChange={(e) => setNewTeacher({...newTeacher, firstName: e.target.value})}
              placeholder="Enter first name"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="lastName">Last Name</label>
            <input
              id="lastName"
              type="text"
              value={newTeacher.lastName}
              onChange={(e) => setNewTeacher({...newTeacher, lastName: e.target.value})}
              placeholder="Enter last name"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="subject">Subject</label>
            <input
              id="subject"
              type="text"
              value={newTeacher.subject}
              onChange={(e) => setNewTeacher({...newTeacher, subject: e.target.value})}
              placeholder="Enter subject"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="grade">Grade/Class</label>
            <input
              id="grade"
              type="text"
              value={newTeacher.grade}
              onChange={(e) => setNewTeacher({...newTeacher, grade: e.target.value})}
              placeholder="Enter grade/class"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="employeeId">Employee ID (optional)</label>
            <input
              id="employeeId"
              type="text"
              value={newTeacher.employeeId}
              onChange={(e) => setNewTeacher({...newTeacher, employeeId: e.target.value})}
              placeholder="Enter employee ID"
            />
          </div>
          
          <div className="button-group">
            <button 
              className="save-teacher-btn"
              onClick={handleSaveTeacher}
            >
              Save Teacher
            </button>
            <button 
              className="cancel-btn"
              onClick={handleCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {currentView === 'teacherDetail' && selectedTeacher && (
        <div className="teacher-detail-screen">
          <h2>{selectedTeacher.firstName} {selectedTeacher.lastName}</h2>
          
          <div className="teacher-details">
            <p><strong>Subject:</strong> {selectedTeacher.subject}</p>
            <p><strong>Grade/Class:</strong> {selectedTeacher.grade}</p>
            {selectedTeacher.employeeId && (
              <p><strong>Employee ID:</strong> {selectedTeacher.employeeId}</p>
            )}
          </div>
          
          <div className="teacher-actions">
            <button 
              className="primary-action-btn"
              onClick={startNewEvaluation}
            >
              New Evaluation
            </button>
            
            <button 
              className="secondary-action-btn"
              onClick={goToReview}
            >
              Review
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

      {currentView === 'review' && selectedTeacher && (
        <div className="review-screen">
          <h2>Evaluation History for {selectedTeacher.firstName} {selectedTeacher.lastName}</h2>
          
          {evaluations.length === 0 ? (
            <div className="empty-state">
              <p>No evaluations found for this teacher.</p>
              <p>Click 'New Evaluation' to begin.</p>
            </div>
          ) : (
            <div className="evaluations-list">
              {evaluations.map(evaluation => (
                <div key={evaluation.id} className="evaluation-card">
                  <div className="evaluation-summary">
                    <div className="evaluation-meta">
                      <p><strong>Evaluation #{evaluation.evaluationNumber}</strong></p>
                      <p><strong>Date:</strong> {evaluation.date}</p>
                      <p><strong>Evaluator:</strong> {evaluation.evaluator}</p>
                      <p><strong>Subject:</strong> {evaluation.subject}</p>
                      <p><strong>Grade:</strong> {evaluation.grade}</p>
                    </div>
                    <div className="evaluation-scores">
                      <p><strong>Overall Score:</strong> {formatScore(evaluation.overallScore)}</p>
                    </div>
                  </div>
                  <div className="evaluation-actions">
                    <button 
                      className="view-details-btn"
                      onClick={() => viewEvaluationDetails(evaluation)}
                    >
                      View Details
                    </button>
                    <button 
                      className="download-pdf-btn"
                      onClick={() => downloadSelectedEvaluationPdf(evaluation)}
                    >
                      Download PDF
                    </button>
                    <button 
                      className="delete-btn"
                      onClick={() => deleteEvaluation(evaluation.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <button 
            className="back-btn"
            onClick={handleBackToHome}
          >
            ← Back to Home
          </button>
        </div>
      )}

      {currentView === 'evaluation' && selectedEvaluation && (
        <div className="evaluation-details-screen">
          <h2>Evaluation Details</h2>
          
          <div className="evaluation-metadata">
            <p><strong>Evaluator:</strong> {selectedEvaluation.evaluator}</p>
            <p><strong>Subject:</strong> {selectedEvaluation.subject}</p>
            <p><strong>Grade:</strong> {selectedEvaluation.grade}</p>
            <p><strong>Date:</strong> {selectedEvaluation.date}</p>
            <p><strong>Evaluation #:</strong> {selectedEvaluation.evaluationNumber}</p>
          </div>
          
          {/* Scores Summary */}
          <div className="scores-summary">
            <h4>Scores Summary</h4>
            <div className="domain-scores">
              {evaluationDomains.map(domain => (
                <div key={domain.id} className="domain-score-item">
                  <span className="domain-name">{domain.name}:</span>
                  <span className="domain-score">{formatScore(selectedEvaluation.domainScores[domain.id])}</span>
                </div>
              ))}
            </div>
            <div className="overall-score">
              <span className="overall-label">Overall Score:</span>
              <span className="overall-value">{formatScore(selectedEvaluation.overallScore)}</span>
            </div>
          </div>
          
          {/* All Indicators with Ratings */}
          <div className="all-indicators-section">
            <h4>All Indicators</h4>
            {evaluationDomains.map(domain => (
              <div key={domain.id} className="domain-indicators">
                <h5>{domain.name}</h5>
                <div className="indicators-list">
                  {domain.indicators.map((indicator, indicatorIndex) => {
                    const indicatorKey = `${domain.id}-${indicatorIndex}`;
                    const rating = selectedEvaluation.ratings[indicatorKey];
                    
                    return (
                      <div key={indicatorKey} className="indicator-rating">
                        <p className="indicator-text">{indicatorIndex + 1}. {indicator}</p>
                        <span className="indicator-rating-display">Rating: {rating}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          
          {/* Strengths, Development Areas, and Notes */}
          <div className="evaluation-notes">
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
              className="download-pdf-btn"
              onClick={() => downloadSelectedEvaluationPdf(selectedEvaluation)}
            >
              Download PDF
            </button>
            <button 
              className="back-btn"
              onClick={goBackToReview}
            >
              ← Back to History
            </button>
          </div>
        </div>
      )}

      {currentView === 'evaluation' && currentEvaluation && selectedTeacher && !selectedEvaluation && (
        <div className="evaluation-screen">
          <h2>Evaluation for {selectedTeacher.firstName} {selectedTeacher.lastName}</h2>
          <p><strong>Evaluator:</strong> {currentEvaluation.evaluator}</p>
          <p><strong>Subject:</strong> {currentEvaluation.subject}</p>
          <p><strong>Grade:</strong> {currentEvaluation.grade}</p>
          <p><strong>Date:</strong> {currentEvaluation.date}</p>
          <p><strong>Evaluation #:</strong> {currentEvaluation.evaluationNumber}</p>
          
          {/* Progress indicator */}
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
          
          {evaluationStep === 'rating' && (
            <div className="domain-rating-section">
              <h3>{currentDomain.name}</h3>
              
              <div className="indicators-list">
                {currentDomain.indicators.map((indicator, indicatorIndex) => {
                  const indicatorKey = `${currentDomain.id}-${indicatorIndex}`;
                  const currentRating = getCurrentRating(currentDomain.id, indicatorIndex);
                  
                  return (
                    <div key={indicatorKey} className="indicator-rating">
                      <p className="indicator-text">{indicatorIndex + 1}. {indicator}</p>
                      
                      <div className="rating-buttons">
                        {[4, 3, 2, 1].map(rating => (
                          <button
                            key={rating}
                            className={`rating-btn ${currentRating === rating ? 'selected' : ''}`}
                            onClick={() => handleRateIndicator(currentDomain.id, indicatorIndex, rating as RatingValue)}
                          >
                            {rating}
                          </button>
                        ))}
                        <button
                          className={`rating-btn ${currentRating === 'N/O' ? 'selected' : ''}`}
                          onClick={() => handleRateIndicator(currentDomain.id, indicatorIndex, 'N/O')}
                        >
                          N/O
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="navigation-buttons">
                {currentDomainIndex > 0 && (
                  <button 
                    className="prev-domain-btn"
                    onClick={goToPreviousDomain}
                  >
                    ← Previous Domain
                  </button>
                )}
                
                {currentDomainIndex < evaluationDomains.length - 1 ? (
                  <button 
                    className="next-domain-btn"
                    onClick={goToNextDomain}
                  >
                    Next Domain →
                  </button>
                ) : (
                  <button 
                    className="finish-rating-btn"
                    onClick={completeRatingPhase}
                  >
                    Finish Rating →
                  </button>
                )}
              </div>
            </div>
          )}
          
          {evaluationStep === 'final' && (
            <div className="final-evaluation-screen">
              <h3>Final Details</h3>
              
              {/* Display calculated scores */}
              <div className="scores-summary">
                <h4>Scores Summary</h4>
                <div className="domain-scores">
                  {evaluationDomains.map(domain => (
                    <div key={domain.id} className="domain-score-item">
                      <span className="domain-name">{domain.name}:</span>
                      <span className="domain-score">{formatScore(currentEvaluation.domainScores[domain.id])}</span>
                    </div>
                  ))}
                </div>
                <div className="overall-score">
                  <span className="overall-label">Overall Score:</span>
                  <span className="overall-value">{formatScore(currentEvaluation.overallScore)}</span>
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="strengths">Strengths</label>
                <textarea
                  id="strengths"
                  value={currentEvaluation.strengths}
                  onChange={(e) => {
                    const updatedEvaluation = {...currentEvaluation, strengths: e.target.value};
                    setCurrentEvaluation(updatedEvaluation);
                  }}
                  placeholder="What did the teacher do well?"
                  rows={4}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="developmentAreas">Areas for Development</label>
                <textarea
                  id="developmentAreas"
                  value={currentEvaluation.developmentAreas}
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
                  value={currentEvaluation.notes}
                  onChange={(e) => {
                    const updatedEvaluation = {...currentEvaluation, notes: e.target.value};
                    setCurrentEvaluation(updatedEvaluation);
                  }}
                  placeholder="Additional observations and evidence"
                  rows={6}
                />
              </div>
              
              <div className="button-group">
                <button 
                  className="download-pdf-btn"
                  onClick={downloadCurrentEvaluationPdf}
                >
                  Download PDF
                </button>
                <button 
                  className="save-evaluation-btn"
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