import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Evaluation } from './DatabaseService';

// Define the NEW 8 STUDENT EVALUATION DOMAINS WITH 3 INDICATORS EACH
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

/**
 * Generates a PDF report for an evaluation
 * @param evaluation - The evaluation data to include in the PDF
 * @param studentName - The name of the student being evaluated
 */
export const generateEvaluationPdf = (evaluation: Evaluation, studentName: string) => {
  const doc = new jsPDF();

  // Start with initial Y position
  let currentY = 20;

  // Header section - compact design
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42); // Dark blue color
  doc.text('Student Evaluation Report', 20, currentY);
  currentY += 10;

  // Compact meta grid - 3-column layout
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  
  const leftColumnX = 20;
  const middleColumnX = 80;
  const rightColumnX = 140;
  
  // First row of metadata
  doc.text(`Student: ${studentName}`, leftColumnX, currentY);
  doc.text(`Subject: ${evaluation.subject}`, middleColumnX, currentY);
  doc.text(`Grade: ${evaluation.grade}`, rightColumnX, currentY);
  currentY += 7;
  
  // Second row of metadata
  doc.text(`Date: ${evaluation.date}`, leftColumnX, currentY);
  doc.text(`Evaluator: ${evaluation.evaluator}`, middleColumnX, currentY); // Fixed evaluator name
  doc.text(`Evaluation #: ${evaluation.evaluationNumber}`, rightColumnX, currentY);
  currentY += 12; // Additional spacing

  // Scores Summary as autoTable
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('Scores Summary', 20, currentY);
  currentY += 8;

  // Prepare scores summary table data
  const scoresSummaryData: any[] = [];
  
  // Process all 8 domains in pairs (first 4 pairs of left/right)
  for (let i = 0; i < 4; i++) {
    const leftDomain = evaluationDomains[i];
    const rightDomain = evaluationDomains[i + 4];
    
    const leftScore = evaluation.domainScores[leftDomain.id];
    const rightScore = evaluation.domainScores[rightDomain.id];
    
    const leftScoreText = leftScore === null ? 'N/A' : leftScore.toFixed(2);
    const rightScoreText = rightScore === null ? 'N/A' : rightScore.toFixed(2);
    
    scoresSummaryData.push([
      `${leftDomain.name}`,
      `${leftScoreText}`,
      `${rightDomain.name}`,
      `${rightScoreText}`
    ]);
  }
  
  // Add Overall Score row
  const overallScoreText = evaluation.overallScore === null ? 'N/A' : evaluation.overallScore.toFixed(2);
  scoresSummaryData.push(['Overall Score', overallScoreText, '', '']);

  // Add the scores summary table (without header row)
  autoTable(doc, {
    startY: currentY,
    body: scoresSummaryData,
    theme: 'grid',
    styles: { 
      fontSize: 9,
      cellPadding: 4
    },
    headStyles: {
      fillColor: [15, 23, 42], // Dark blue header
      textColor: [255, 255, 255], // White text
      fontSize: 10
    },
    bodyStyles: {
      fillColor: [255, 255, 255]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // Very light blue for alternate rows
    },
    columnStyles: {
      0: { cellWidth: 60, halign: 'left' }, // Left domain column
      1: { cellWidth: 25, halign: 'center' }, // Left score column
      2: { cellWidth: 60, halign: 'left' }, // Right domain column
      3: { cellWidth: 25, halign: 'center' } // Right score column
    },
    margin: { top: currentY, left: 20, right: 20 },
    tableWidth: 'wrap'
  });

  // Update currentY to position after the scores table
  currentY = (doc as any).lastAutoTable.finalY + 10;

  // Indicators Table
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('Full Indicators', 20, currentY);
  currentY += 8;

  // Prepare table data for indicators
  const tableData: any[] = [];
  tableData.push(['Domain', 'Indicator', 'Rating']);
  
  for (const domain of evaluationDomains) {
    let domainAdded = false;
    
    for (let i = 0; i < domain.indicators.length; i++) {
      const indicatorKey = `${domain.id}-${i}`;
      const rating = evaluation.ratings[indicatorKey];
      
      // Add domain name only for the first indicator in each domain
      if (!domainAdded) {
        tableData.push([
          domain.name,
          domain.indicators[i],
          rating?.toString() || 'N/A'
        ]);
        domainAdded = true;
      } else {
        tableData.push([
          '', // Empty domain cell
          domain.indicators[i],
          rating?.toString() || 'N/A'
        ]);
      }
    }
  }

  // Add the indicators table with proper pagination settings and adjusted margins for page 2
  autoTable(doc, {
    startY: currentY,
    head: [tableData[0]], // Header row
    body: tableData.slice(1), // Data rows
    theme: 'grid',
    styles: { 
      fontSize: 8,
      cellPadding: 3 // Reduced padding for compact layout
    },
    headStyles: {
      fillColor: [15, 23, 42], // Dark blue header
      textColor: [255, 255, 255], // White text
      fontSize: 9
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // Very light blue for alternate rows
    },
    columnStyles: {
      0: { cellWidth: 40, halign: 'left' }, // Domain column - 30%
      1: { cellWidth: 105, halign: 'left' }, // Indicator column - 55%
      2: { cellWidth: 25, halign: 'center' } // Rating column - 15%
    },
    // Handle page breaks properly with adjusted margins
    margin: { top: 12, bottom: 12, left: 10, right: 10 },
    pageBreak: 'auto',
    tableWidth: 'wrap'
  });

  // Update currentY to position after the indicators table
  currentY = (doc as any).lastAutoTable.finalY + 10;

  // Qualitative Notes Section
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('Qualitative Notes', 20, currentY);
  currentY += 8;

  // Strengths
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text('Strengths:', 20, currentY);
  currentY += 7;
  
  // Split strengths text into lines and add to document
  const strengthsLines: string[] = doc.splitTextToSize(
    evaluation.strengths || 'No strengths noted.', 
    170
  );
  strengthsLines.forEach((line: string, index: number) => {
    doc.text(line, 25, currentY + (index * 6));
  });
  
  // Calculate where to place the next section based on strength lines
  currentY += (strengthsLines.length * 6) + 6;
  
  // Areas for Development
  doc.text('Areas for Development:', 20, currentY);
  currentY += 7;
  
  // Split development areas text into lines and add to document
  const developmentLines: string[] = doc.splitTextToSize(
    evaluation.developmentAreas || 'No development areas noted.', 
    170
  );
  developmentLines.forEach((line: string, index: number) => {
    doc.text(line, 25, currentY + (index * 6));
  });
  
  // Calculate where to place the next section based on development lines
  currentY += (developmentLines.length * 6) + 6;
  
  // Additional Notes
  doc.text('Additional Notes:', 20, currentY);
  currentY += 7;
  
  // Split notes text into lines and add to document
  const notesLines: string[] = doc.splitTextToSize(
    evaluation.notes || 'No additional notes.', 
    170
  );
  notesLines.forEach((line: string, index: number) => {
    doc.text(line, 25, currentY + (index * 6));
  });

  // Calculate final Y position for the line separator
  const finalY = currentY + (notesLines.length * 6) + 15;

  // Footer line separator
  doc.line(20, finalY, 190, finalY); // Line separator

  // Add footers to all pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Get page dimensions
    const pageWidth = (doc as any).internal.pageSize.width || (doc as any).internal.pageSize.getWidth();
    const pageHeight = (doc as any).internal.pageSize.height || (doc as any).internal.pageSize.getHeight();
    
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    
    // Bottom Left Branding
    doc.text("Generated by EvalView", 10, pageHeight - 10);
    
    // Bottom Right Page Number
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 10, pageHeight - 10, { align: "right" });
  }

  // Generate filename in the requested format: [StudentName]_Evaluation_[EvalNumber]_[Date].pdf
  const sanitizedStudentName = studentName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
  const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const fileName = `${sanitizedStudentName}_Evaluation_${evaluation.evaluationNumber}_${dateStr}.pdf`;
  
  // Save the PDF with the formatted filename
  doc.save(fileName);
};