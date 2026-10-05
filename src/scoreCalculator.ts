import type { Evaluation } from './DatabaseService';

// Define the domain IDs to match those in App.tsx
const DOMAIN_IDS = [
  'learning-environment',
  'teaching-learning',
  'student-engagement',
  'assessment-progress',
  'curriculum-professionalism',
  'resources-technology'
];

/**
 * Calculates the domain score for a given domain based on its ratings
 * @param ratings - The ratings object containing indicator ratings
 * @param domainId - The ID of the domain to calculate score for
 * @returns The domain score rounded to 2 decimal places, or null if all indicators are N/O
 */
export function calculateDomainScore(ratings: Record<string, 1 | 2 | 3 | 4 | "N/O">, domainId: string): number | null {
  // Find all indicators for this domain
  const domainIndicators = Object.keys(ratings).filter(key => key.startsWith(`${domainId}-`));
  
  if (domainIndicators.length === 0) {
    return null; // No ratings for this domain
  }

  // Calculate sum of numeric ratings and count of observed indicators
  let sum = 0;
  let observedCount = 0;

  for (const indicatorKey of domainIndicators) {
    const rating = ratings[indicatorKey];
    
    if (typeof rating === 'number') {
      sum += rating;
      observedCount++;
    }
    // Skip "N/O" ratings
  }

  // If no observed indicators, return null
  if (observedCount === 0) {
    return null;
  }

  // Calculate average and round to 2 decimal places
  const average = sum / observedCount;
  return Math.round(average * 100) / 100;
}

/**
 * Calculates the overall score based on domain scores
 * @param domainScores - The domain scores object
 * @returns The overall score rounded to 2 decimal places, or null if all domains are null
 */
export function calculateOverallScore(domainScores: Record<string, number | null>): number | null {
  // Get all domain scores that are not null
  const validScores = Object.values(domainScores).filter(score => score !== null) as number[];
  
  // If no valid domain scores, return null
  if (validScores.length === 0) {
    return null;
  }

  // Calculate average of valid domain scores
  const sum = validScores.reduce((acc, score) => acc + score, 0);
  const average = sum / validScores.length;
  
  // Round to 2 decimal places
  return Math.round(average * 100) / 100;
}

/**
 * Updates an evaluation object with calculated domain and overall scores
 * @param evaluation - The evaluation object to update
 * @returns The updated evaluation object with scores
 */
export function calculateScores(evaluation: Evaluation): Evaluation {
  // Calculate domain scores
  const domainScores: Record<string, number | null> = {};
  
  for (const domainId of DOMAIN_IDS) {
    domainScores[domainId] = calculateDomainScore(evaluation.ratings, domainId);
  }

  // Calculate overall score based on domain scores
  const overallScore = calculateOverallScore(domainScores);

  // Return updated evaluation with calculated scores
  return {
    ...evaluation,
    domainScores,
    overallScore
  };
}