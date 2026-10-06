# EvalFlow Migration Map

## Project Overview

EvalFlow (also referred to as EvalView in project documentation) is an offline-first teacher evaluation system built with React, TypeScript, and Vite. It provides a complete solution for managing teacher evaluations with local data persistence, scoring calculations, and PDF report generation.

### Core Features
- Offline-first architecture with IndexedDB storage
- Teacher management system
- Comprehensive evaluation framework with six domains
- Dynamic scoring calculation system
- PDF report generation
- Progressive Web App capabilities

## Architecture Overview

### Technology Stack
- **Frontend Framework**: React 19.2.8
- **Build Tool**: Vite 8.3.0
- **Language**: TypeScript ~6.0.2
- **Linting**: Oxlint 1.81.0
- **Database**: Dexie.js (IndexedDB wrapper) 4.4.6
- **PDF Generation**: jsPDF 4.2.1 + jspdf-autotable 5.0.8 + html2canvas 1.4.1
- **PWA Support**: vite-plugin-pwa 2.0.0
- **Deployment**: gh-pages 7.0.1

### Project Structure
```
src/
├── App.tsx                 # Main application component
├── DatabaseService.ts      # Dexie database schema and models
├── scoreCalculator.ts      # Scoring logic and calculations
├── pdfGenerator.ts         # PDF generation functionality
├── main.tsx               # Entry point
├── App.css                # Main styling
└── index.css              # Global styles
```

## Component Tree

```
App (Root Component)
├── Home Screen
│   ├── Teacher Search Dropdown
│   └── Add Teacher Button
├── Add Teacher Screen
│   ├── Form Inputs (Name, Subject, Grade, Employee ID)
│   └── Action Buttons
├── Teacher Detail Screen
│   ├── Teacher Information Display
│   ├── New Evaluation Button
│   ├── Review Button
│   └── Back Button
├── Review Screen
│   ├── Evaluations List
│   ├── Individual Evaluation Cards
│   └── Action Buttons (View, Download PDF, Delete)
├── Evaluation Screen (Rating Phase)
│   ├── Domain Navigation
│   ├── Indicator Rating Interface
│   └── Progress Indicators
├── Evaluation Screen (Final Phase)
│   ├── Scores Summary
│   ├── Text Areas (Strengths, Development Areas, Notes)
│   └── Action Buttons (Download PDF, Save)
└── Evaluation Details Screen
    ├── Metadata Display
    ├── Scores Summary
    ├── All Indicators with Ratings
    ├── Notes Section
    └── Action Buttons
```

## Database Schema & Dexie Models

### Teacher Model ([DatabaseService.ts](file:///c%3A/Users/ahmed/Desktop/EvalView/EvalView/src/DatabaseService.ts))
```typescript
interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  subject: string;
  grade: string;
  employeeId?: string;
  createdAt: string;
}
```

### Evaluation Model ([DatabaseService.ts](file:///c%3A/Users/ahmed/Desktop/EvalView/EvalView/src/DatabaseService.ts))
```typescript
interface Evaluation {
  id: string;
  teacherId: string;
  evaluationNumber: number;
  evaluator: string;
  subject: string;
  grade: string;
  date: string;
  ratings: Record<string, 1 | 2 | 3 | 4 | "N/O">;
  domainScores: Record<string, number | null>;
  overallScore: number | null;
  strengths: string;
  developmentAreas: string;
  notes: string;
  createdAt: string;
}
```

### Dexie Database Schema
```typescript
class EvalFlowDatabase extends Dexie {
  teachers!: Table<Teacher>;
  evaluations!: Table<Evaluation>;

  constructor() {
    super('EvalFlowDatabase');
    this.version(2).stores({
      teachers: 'id, firstName, lastName, subject, grade, employeeId, createdAt',
      evaluations: 'id, teacherId, evaluationNumber, date, createdAt'
    });
  }
}
```

## Scoring Logic & Rating Scales

### Rating Values
- 1: Lowest performance level
- 2: Below standard
- 3: Meeting standard
- 4: Above standard
- N/O: Not Observed

### Evaluation Domains ([App.tsx](file:///c%3A/Users/ahmed/Desktop/EvalView/EvalView/src/App.tsx), [pdfGenerator.ts](file:///c%3A/Users/ahmed/Desktop/EvalView/EvalView/src/pdfGenerator.ts))
1. **Learning Environment**
   - Creates a positive and inclusive classroom environment
   - Establishes clear routines and expectations
   - Manages behavior and instructional time effectively

2. **Teaching & Learning**
   - Lesson objectives/explanations are clear
   - Uses effective teaching strategies and questioning
   - Demonstrates strong subject knowledge

3. **Student Engagement**
   - Students are actively involved in learning
   - Students have opportunities to think, question, discuss, or collaborate
   - Students demonstrate appropriate independence in learning

4. **Assessment & Student Progress**
   - Checks student understanding during the lesson
   - Provides useful feedback
   - Responds appropriately to student needs and understanding

5. **Curriculum & Professionalism**
   - Lesson activities align with curriculum objectives
   - Teacher demonstrates professional conduct
   - Teacher communicates clearly and professionally

6. **Resources & Technology**
   - Uses appropriate instructional resources
   - Uses technology appropriately when relevant
   - Uses classroom/school resources effectively

### Scoring Calculations ([scoreCalculator.ts](file:///c%3A/Users/ahmed/Desktop/EvalView/EvalView/src/scoreCalculator.ts))

#### Domain Score Calculation
- Average of all numeric ratings (1-4) for indicators in the domain
- Excludes "N/O" ratings from calculation
- Returns null if all indicators are "N/O"

#### Overall Score Calculation
- Average of all non-null domain scores
- Returns null if all domain scores are null

## PDF Generation Mechanism ([pdfGenerator.ts](file:///c%3A/Users/ahmed/Desktop/EvalView/EvalView/src/pdfGenerator.ts))

### Process Flow
1. Creates new jsPDF instance
2. Adds header section with evaluation metadata
3. Generates scores summary table with domain and overall scores
4. Creates indicators table showing all domain indicators with ratings
5. Adds qualitative notes section (strengths, development areas, notes)
6. Includes footer with page numbers and branding
7. Saves file with formatted name: `[TeacherName]_Evaluation_[EvalNumber]_[Date].pdf`

### Libraries Used
- **jsPDF**: Core PDF generation library
- **jspdf-autotable**: Table creation and formatting
- **html2canvas**: (Not actually used in this file, but imported in dependencies)

### Layout Structure
- Header with teacher and evaluation metadata
- Two-column scores summary table
- Detailed indicators table with domain, indicator, and rating columns
- Qualitative notes section with text wrapping
- Footer with page numbers and branding

## PWA Setup & Service Worker ([vite.config.ts](file:///c%3A/Users/ahmed/Desktop/EvalView/EvalView/vite.config.ts))

### Configuration
- Register type: `autoUpdate`
- Workbox glob patterns for caching assets (JS, CSS, HTML, images)
- Navigate fallback: `/EvalFlow/index.html`
- Manifest configuration with app metadata and icons

### Manifest Properties
- Name: "EvalFlow - Teacher Evaluation System"
- Short name: "EvalFlow"
- Description: "Offline-first Teacher Evaluation Application"
- Display: standalone
- Theme color: #1e3a8a
- Multiple icon sizes (192x192, 512x512) with maskable variants

## Key Files for Future Migration Stages

### Critical Application Logic
- [App.tsx](file:///c%3A/Users/ahmed/Desktop/EvalView/EvalView/src/App.tsx) - Main component logic, state management, UI rendering
- [DatabaseService.ts](file:///c%3A/Users/ahmed/Desktop/EvalView/EvalView/src/DatabaseService.ts) - Database schema, models, and Dexie integration
- [scoreCalculator.ts](file:///c%3A/Users/ahmed/Desktop/EvalView/EvalView/src/scoreCalculator.ts) - Scoring algorithms and business logic
- [pdfGenerator.ts](file:///c%3A/Users/ahmed/Desktop/EvalView/EvalView/src/pdfGenerator.ts) - PDF export functionality

### Configuration Files
- [vite.config.ts](file:///c%3A/Users/ahmed/Desktop/EvalView/EvalView/vite.config.ts) - Build configuration, PWA setup
- [package.json](file:///c%3A/Users/ahmed/Desktop/EvalView/EvalView/package.json) - Dependencies, scripts, project metadata
- [tsconfig.json](file:///c%3A/Users/ahmed/Desktop/EvalView/EvalView/tsconfig.json), [tsconfig.app.json](file:///c%3A/Users/ahmed/Desktop/EvalView/EvalView/tsconfig.app.json), [tsconfig.node.json](file:///c%3A/Users/ahmed/Desktop/EvalView/EvalView/tsconfig.node.json) - TypeScript compilation options
- [.oxlintrc.json](file:///c%3A/Users/ahmed/Desktop/EvalView/EvalView/.oxlintrc.json) - Linting rules

### Styling
- [App.css](file:///c%3A/Users/ahmed/Desktop/EvalView/EvalView/src/App.css) - Component-specific styles
- [index.css](file:///c%3A/Users/ahmed/Desktop/EvalView/EvalView/src/index.css) - Global styles

### Entry Point
- [main.tsx](file:///c%3A/Users/ahmed/Desktop/EvalView/EvalView/src/main.tsx) - Application entry point

## Current Build Status

✅ **Application builds successfully** with no errors. The build process completes in approximately 4.37 seconds and generates optimized bundles with PWA service worker support.