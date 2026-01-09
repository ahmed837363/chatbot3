/**
 * Human Evaluation Harness
 * 
 * Tools for generating evaluation samples, scoring rubrics, and
 * exporting data for human evaluation of chatbot quality.
 */

import { Character, Message, WorldInfo, Role } from '../types';

// ============================================
// TYPES
// ============================================

export interface EvalSample {
  id: string;
  timestamp: number;
  context: {
    worldInfo: Partial<WorldInfo>;
    character: {
      name: string;
      description: string;
      lore?: string;
    };
    conversationHistory: { role: string; speaker: string; content: string }[];
    prompt: string; // The triggering message/context
  };
  responses: {
    baseline: string; // Response without RAG
    enhanced: string; // Response with RAG
    // Optionally more variants
    [key: string]: string;
  };
  retrievedContext?: string; // What RAG retrieved (for analysis)
  ratings?: EvalRatings;
}

export interface EvalRatings {
  raterId?: string;
  timestamp?: number;
  // Per-response ratings (1-5 scale)
  baseline: ResponseRating;
  enhanced: ResponseRating;
  // Pairwise preference
  preference: 'baseline' | 'enhanced' | 'tie';
  preferenceReason?: string;
  // Overall notes
  notes?: string;
}

export interface ResponseRating {
  personaConsistency: number; // 1-5: Does it match character personality/lore?
  factualGrounding: number; // 1-5: Uses correct facts (names, relationships)?
  emotionalAppropriateness: number; // 1-5: Tone fits the situation?
  naturalness: number; // 1-5: Reads like natural human speech?
  coherence: number; // 1-5: Logically follows from context?
  overall: number; // 1-5: Overall quality
}

export interface EvalConfig {
  numSamples: number;
  includeRagContext: boolean;
  randomizePresentationOrder: boolean;
  blindLabels: boolean; // If true, label as "Response A/B" instead of "baseline/enhanced"
}

// ============================================
// EVALUATION RUBRIC
// ============================================

export const EVAL_RUBRIC = {
  personaConsistency: {
    name: 'Persona Consistency',
    description: 'Does the response match the character\'s personality, lore, and established traits?',
    scale: {
      1: 'Completely out of character, contradicts personality/lore',
      2: 'Mostly out of character, major inconsistencies',
      3: 'Partially consistent, some inconsistencies',
      4: 'Mostly consistent, minor issues',
      5: 'Perfectly in character, matches all known traits',
    },
  },
  factualGrounding: {
    name: 'Factual Grounding',
    description: 'Does the response use correct facts (names, relationships, events, locations)?',
    scale: {
      1: 'Major factual errors (wrong names, relationships, events)',
      2: 'Several factual errors',
      3: 'Some factual errors or vague where should be specific',
      4: 'Mostly accurate, minor issues',
      5: 'Completely accurate, uses specific correct details',
    },
  },
  emotionalAppropriateness: {
    name: 'Emotional Appropriateness',
    description: 'Does the emotional tone fit the situation and character\'s established emotional state?',
    scale: {
      1: 'Completely wrong emotional tone',
      2: 'Mostly wrong, jarring emotional mismatch',
      3: 'Partially appropriate, some emotional mismatch',
      4: 'Mostly appropriate emotional response',
      5: 'Perfectly appropriate, nuanced emotional expression',
    },
  },
  naturalness: {
    name: 'Naturalness',
    description: 'Does the response read like natural human speech/action?',
    scale: {
      1: 'Very robotic, unnatural phrasing throughout',
      2: 'Mostly unnatural, stilted language',
      3: 'Mixed, some natural and some unnatural parts',
      4: 'Mostly natural, minor awkwardness',
      5: 'Completely natural, reads like real person',
    },
  },
  coherence: {
    name: 'Coherence',
    description: 'Does the response logically follow from the conversation context?',
    scale: {
      1: 'Makes no sense given context',
      2: 'Mostly incoherent, major logical gaps',
      3: 'Partially coherent, some logical issues',
      4: 'Mostly coherent, minor issues',
      5: 'Perfectly coherent, natural flow from context',
    },
  },
  overall: {
    name: 'Overall Quality',
    description: 'Considering all factors, how good is this response?',
    scale: {
      1: 'Very poor, would break immersion',
      2: 'Poor, noticeable issues',
      3: 'Acceptable, but room for improvement',
      4: 'Good, minor issues only',
      5: 'Excellent, high-quality response',
    },
  },
};

// ============================================
// SAMPLE GENERATION
// ============================================

export function createEvalSample(
  id: string,
  character: Character,
  worldInfo: WorldInfo,
  conversationHistory: Message[],
  triggerMessage: string,
  baselineResponse: string,
  enhancedResponse: string,
  retrievedContext?: string
): EvalSample {
  return {
    id,
    timestamp: Date.now(),
    context: {
      worldInfo: {
        scenario: worldInfo.scenario,
        currentLocation: worldInfo.currentLocation,
        currentTime: worldInfo.currentTime,
        storyTracker: worldInfo.storyTracker,
      },
      character: {
        name: character.name,
        description: character.description,
        lore: character.lore,
      },
      conversationHistory: conversationHistory.slice(-10).map(m => ({
        role: m.role,
        speaker: m.characterName || (m.role === Role.USER ? 'User' : m.role),
        content: m.content.slice(0, 500), // Truncate for readability
      })),
      prompt: triggerMessage,
    },
    responses: {
      baseline: baselineResponse,
      enhanced: enhancedResponse,
    },
    retrievedContext,
  };
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

export function exportSamplesToCSV(samples: EvalSample[], blindLabels = true): string {
  const headers = [
    'Sample ID',
    'Character Name',
    'Scenario',
    'Location',
    'Conversation Context',
    'Trigger',
    blindLabels ? 'Response A' : 'Baseline Response',
    blindLabels ? 'Response B' : 'Enhanced Response',
    'Persona Consistency (A)',
    'Factual Grounding (A)',
    'Emotional Appropriateness (A)',
    'Naturalness (A)',
    'Coherence (A)',
    'Overall (A)',
    'Persona Consistency (B)',
    'Factual Grounding (B)',
    'Emotional Appropriateness (B)',
    'Naturalness (B)',
    'Coherence (B)',
    'Overall (B)',
    'Preference (A/B/tie)',
    'Preference Reason',
    'Notes',
  ];

  const rows = samples.map((sample, index) => {
    // Randomize order for blind evaluation
    const showEnhancedFirst = blindLabels && index % 2 === 1;
    const responseA = showEnhancedFirst ? sample.responses.enhanced : sample.responses.baseline;
    const responseB = showEnhancedFirst ? sample.responses.baseline : sample.responses.enhanced;

    const contextSummary = sample.context.conversationHistory
      .map(m => `${m.speaker}: ${m.content.slice(0, 100)}...`)
      .join(' | ');

    return [
      sample.id,
      sample.context.character.name,
      sample.context.worldInfo.scenario?.slice(0, 200) || '',
      sample.context.worldInfo.currentLocation || '',
      contextSummary.slice(0, 500),
      sample.context.prompt.slice(0, 300),
      escapeCSV(responseA),
      escapeCSV(responseB),
      '', '', '', '', '', '', // Rating placeholders for A
      '', '', '', '', '', '', // Rating placeholders for B
      '', '', '', // Preference placeholders
    ];
  });

  return [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
}

export function exportSamplesToJSON(samples: EvalSample[]): string {
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    rubric: EVAL_RUBRIC,
    samples,
  }, null, 2);
}

export function exportRubricMarkdown(): string {
  let md = '# Human Evaluation Rubric\n\n';
  md += 'Rate each response on the following criteria (1-5 scale):\n\n';

  for (const [key, rubric] of Object.entries(EVAL_RUBRIC)) {
    md += `## ${rubric.name}\n\n`;
    md += `${rubric.description}\n\n`;
    md += '| Score | Description |\n';
    md += '|-------|-------------|\n';
    for (const [score, desc] of Object.entries(rubric.scale)) {
      md += `| ${score} | ${desc} |\n`;
    }
    md += '\n';
  }

  md += '## Pairwise Preference\n\n';
  md += 'After rating both responses individually, indicate which response you prefer overall:\n';
  md += '- **A**: Response A is better\n';
  md += '- **B**: Response B is better\n';
  md += '- **tie**: Both responses are equally good\n\n';
  md += 'Provide a brief reason for your preference.\n';

  return md;
}

// ============================================
// ANALYSIS FUNCTIONS
// ============================================

export function analyzeRatings(samples: EvalSample[]): EvalAnalysis {
  const ratedSamples = samples.filter(s => s.ratings);
  
  if (ratedSamples.length === 0) {
    return {
      totalSamples: samples.length,
      ratedSamples: 0,
      baselineAvg: emptyRatingAvg(),
      enhancedAvg: emptyRatingAvg(),
      preferenceDistribution: { baseline: 0, enhanced: 0, tie: 0 },
      improvements: {},
      significantDifferences: [],
    };
  }

  const baselineScores: ResponseRating[] = ratedSamples.map(s => s.ratings!.baseline);
  const enhancedScores: ResponseRating[] = ratedSamples.map(s => s.ratings!.enhanced);

  const baselineAvg = averageRatings(baselineScores);
  const enhancedAvg = averageRatings(enhancedScores);

  const preferences = ratedSamples.map(s => s.ratings!.preference);
  const preferenceDistribution = {
    baseline: preferences.filter(p => p === 'baseline').length,
    enhanced: preferences.filter(p => p === 'enhanced').length,
    tie: preferences.filter(p => p === 'tie').length,
  };

  const improvements: Record<string, number> = {};
  for (const key of Object.keys(baselineAvg) as (keyof ResponseRating)[]) {
    improvements[key] = enhancedAvg[key] - baselineAvg[key];
  }

  const significantDifferences: string[] = [];
  for (const [key, diff] of Object.entries(improvements)) {
    if (Math.abs(diff) >= 0.5) { // 0.5+ point difference is significant
      const direction = diff > 0 ? 'improved' : 'declined';
      significantDifferences.push(`${key}: ${direction} by ${Math.abs(diff).toFixed(2)} points`);
    }
  }

  return {
    totalSamples: samples.length,
    ratedSamples: ratedSamples.length,
    baselineAvg,
    enhancedAvg,
    preferenceDistribution,
    improvements,
    significantDifferences,
  };
}

interface EvalAnalysis {
  totalSamples: number;
  ratedSamples: number;
  baselineAvg: ResponseRating;
  enhancedAvg: ResponseRating;
  preferenceDistribution: { baseline: number; enhanced: number; tie: number };
  improvements: Record<string, number>;
  significantDifferences: string[];
}

function emptyRatingAvg(): ResponseRating {
  return {
    personaConsistency: 0,
    factualGrounding: 0,
    emotionalAppropriateness: 0,
    naturalness: 0,
    coherence: 0,
    overall: 0,
  };
}

function averageRatings(ratings: ResponseRating[]): ResponseRating {
  if (ratings.length === 0) return emptyRatingAvg();
  
  const sum = ratings.reduce((acc, r) => ({
    personaConsistency: acc.personaConsistency + r.personaConsistency,
    factualGrounding: acc.factualGrounding + r.factualGrounding,
    emotionalAppropriateness: acc.emotionalAppropriateness + r.emotionalAppropriateness,
    naturalness: acc.naturalness + r.naturalness,
    coherence: acc.coherence + r.coherence,
    overall: acc.overall + r.overall,
  }), emptyRatingAvg());

  const n = ratings.length;
  return {
    personaConsistency: sum.personaConsistency / n,
    factualGrounding: sum.factualGrounding / n,
    emotionalAppropriateness: sum.emotionalAppropriateness / n,
    naturalness: sum.naturalness / n,
    coherence: sum.coherence / n,
    overall: sum.overall / n,
  };
}

function escapeCSV(str: string): string {
  return str.replace(/[\n\r]/g, ' ').replace(/"/g, '""');
}

// ============================================
// SAMPLE SCENARIOS FOR TESTING
// ============================================

export const EVAL_SCENARIOS = [
  {
    id: 'relationship_recall',
    name: 'Relationship Memory',
    description: 'Test if character remembers relationship details correctly',
    prompt: 'Do you remember when we first met?',
  },
  {
    id: 'lore_consistency',
    name: 'Lore Consistency',
    description: 'Test if character stays consistent with backstory',
    prompt: 'Tell me about your past.',
  },
  {
    id: 'emotional_response',
    name: 'Emotional Response',
    description: 'Test appropriate emotional reaction',
    prompt: "I'm feeling really down today.",
  },
  {
    id: 'conflict_handling',
    name: 'Conflict Handling',
    description: 'Test character response to disagreement',
    prompt: "I think you're completely wrong about this.",
  },
  {
    id: 'factual_grounding',
    name: 'Factual Grounding',
    description: 'Test use of established facts',
    prompt: 'What do you know about this place?',
  },
  {
    id: 'multi_turn_coherence',
    name: 'Multi-turn Coherence',
    description: 'Test maintaining context across turns',
    prompt: 'And what happened after that?',
  },
  {
    id: 'personality_expression',
    name: 'Personality Expression',
    description: 'Test character-specific mannerisms',
    prompt: 'What do you think we should do next?',
  },
  {
    id: 'group_dynamics',
    name: 'Group Dynamics',
    description: 'Test awareness of other characters',
    prompt: 'What do you think about the others?',
  },
];

// ============================================
// EXPORT
// ============================================

export const evalHarness = {
  createSample: createEvalSample,
  exportToCSV: exportSamplesToCSV,
  exportToJSON: exportSamplesToJSON,
  exportRubric: exportRubricMarkdown,
  analyzeRatings,
  RUBRIC: EVAL_RUBRIC,
  SCENARIOS: EVAL_SCENARIOS,
};
