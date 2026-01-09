# RAG & Human Evaluation System

This document describes the Retrieval-Augmented Generation (RAG) system and human evaluation harness integrated into the chatbot.

## Overview

The RAG system improves response quality by:
1. **Hybrid Search** - BM25 lexical + vector semantic search for better retrieval
2. **Re-ranking** - Importance, recency, and character-specific boosts
3. **Citations** - Track which facts are used for verification
4. **Grounding** - Few-shot examples prevent hallucination
5. **Verification** - Post-generation fact-checking against citations
6. **Memory Summarization** - Consolidate old conversations into summaries

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        App.tsx                              │
│  - Initializes RAG on startup                               │
│  - Indexes characters/world/conversation on changes         │
│  - Syncs RAG settings with UI                               │
│  - Collects user feedback (👍/👎) for training              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    apiService.ts                            │
│  - getCharacterReplyStream() retrieves RAG context          │
│  - Injects retrieved facts + few-shot grounding examples    │
│  - Candidate generation + reranking (optional)              │
│  - Post-generation verification against citations           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    ragService.ts                            │
│  - VectorStore: In-memory + IndexedDB persistence           │
│  - BM25 Index: Lexical search for exact matches             │
│  - Hybrid Search: BM25 + vector combined (30/70 split)      │
│  - Re-ranking: Character boost, type boost, diversification │
│  - Citations: Track which chunks are used                   │
│  - Summarization: Consolidate old conversations             │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. ragService.ts

Core RAG functionality:

- **VectorStore**: Stores chunked documents with embeddings
  - Persists to IndexedDB for cross-session continuity
  - Automatic pruning when capacity exceeded
  - Metadata filtering (by character, session, type)

- **Embeddings**: Two modes
  - **LM Studio**: Uses `/v1/embeddings` endpoint (preferred)
  - **TF-IDF fallback**: Simple browser-based embeddings when LM Studio unavailable

- **Retrieval**: Multi-factor scoring
  - Cosine similarity (primary)
  - Recency boost (exponential decay over 24h)
  - Importance weighting (profiles > lore > conversation)

### 2. Chunk Types

| Type | Description | Importance |
|------|-------------|------------|
| `character_profile` | Character description | 0.9 |
| `character_lore` | Backstory/secrets | 0.85 |
| `relationship` | Relationship with another character | 0.8 |
| `development` | Traits, beliefs, fears, desires | 0.75 |
| `growth_moment` | Key character development moments | 0.7 |
| `world_info` | Scenario, location, story tracker | 0.6-0.85 |
| `story_memory` | Events, plot points | 0.85-0.9 |
| `conversation` | Recent dialogue | 0.5-0.8 |

### 3. Configuration

Default settings in `ragService.ts`:

```typescript
const DEFAULT_CONFIG: RAGConfig = {
  topK: 8,              // Chunks to retrieve
  similarityThreshold: 0.3, // Minimum similarity
  recencyWeight: 0.15,  // Weight for recent chunks
  importanceWeight: 0.2, // Weight for important chunks
  embeddingDimension: 384,
  maxChunks: 2000,      // Max stored chunks
  chunkSize: 500,       // Characters per chunk
  chunkOverlap: 50,     // Overlap between chunks
};
```

## Usage

### Enabling/Disabling RAG

In the UI: Settings → "🧠 RAG Memory" checkbox

Programmatically:
```typescript
import { setRagEnabled, isRagEnabled } from './services/apiService';

setRagEnabled(true);  // Enable
setRagEnabled(false); // Disable
console.log(isRagEnabled()); // Check status
```

### Manual Indexing

```typescript
import { 
  indexCharacterForRag, 
  indexWorldInfoForRag, 
  indexConversationForRag 
} from './services/apiService';

// Index a character
await indexCharacterForRag(character, sessionId);

// Index world info
await indexWorldInfoForRag(worldInfo, sessionId);

// Index conversation
await indexConversationForRag(messages, sessionId);
```

### Getting Stats

```typescript
import { getRagStats } from './services/apiService';

const stats = getRagStats();
console.log(stats);
// { totalChunks: 150, byType: { character_profile: 20, relationship: 45, ... } }
```

---

# Human Evaluation Harness

## Purpose

Structured evaluation of chatbot responses to:
1. Measure improvement from RAG integration
2. Identify specific failure modes
3. Guide iterative prompt/retrieval tuning

## Components

### 1. evalHarness.ts

- **Sample Generation**: Create paired baseline/enhanced response samples
- **Export Functions**: CSV and JSON export for evaluation sheets
- **Rubric**: Standardized 1-5 rating scales
- **Analysis**: Aggregate results and identify significant differences

### 2. Evaluation Metrics

| Metric | Description |
|--------|-------------|
| **Persona Consistency** | Does response match character personality/lore? |
| **Factual Grounding** | Uses correct facts (names, relationships, events)? |
| **Emotional Appropriateness** | Tone fits the situation? |
| **Naturalness** | Reads like natural human speech? |
| **Coherence** | Logically follows from context? |
| **Overall** | Holistic quality rating |

Each rated 1-5:
- 1 = Very poor
- 2 = Poor
- 3 = Acceptable
- 4 = Good
- 5 = Excellent

### 3. Pairwise Preference

After rating individually, evaluators choose:
- **A** (baseline is better)
- **B** (enhanced/RAG is better)
- **tie** (equally good)

## Running Evaluation

### Step 1: Generate Samples

```typescript
import { createEvalSample, EvalSample } from './services/evalHarness';

// Generate a sample with both baseline and RAG-enhanced responses
const sample = createEvalSample(
  'sample_001',
  character,
  worldInfo,
  conversationHistory,
  'What do you remember about our first meeting?',
  baselineResponse,    // Response without RAG
  enhancedResponse,    // Response with RAG
  retrievedContext     // Optional: what RAG retrieved
);
```

### Step 2: Export for Evaluation

```typescript
import { exportSamplesToCSV, exportSamplesToJSON, exportRubricMarkdown } from './services/evalHarness';

// Export samples to CSV (for spreadsheet evaluation)
const csv = exportSamplesToCSV(samples, true); // true = blind labels (A/B instead of baseline/enhanced)

// Export to JSON (for programmatic processing)
const json = exportSamplesToJSON(samples);

// Export rubric as markdown (for evaluator reference)
const rubric = exportRubricMarkdown();
```

### Step 3: Analyze Results

```typescript
import { analyzeRatings } from './services/evalHarness';

// After ratings are collected
const analysis = analyzeRatings(samples);

console.log(analysis);
// {
//   totalSamples: 100,
//   ratedSamples: 85,
//   baselineAvg: { personaConsistency: 3.2, ... },
//   enhancedAvg: { personaConsistency: 4.1, ... },
//   preferenceDistribution: { baseline: 15, enhanced: 60, tie: 10 },
//   improvements: { personaConsistency: 0.9, ... },
//   significantDifferences: ['personaConsistency: improved by 0.90 points', ...]
// }
```

## Test Scenarios

Built-in scenarios for comprehensive testing:

| ID | Name | Tests |
|----|------|-------|
| `relationship_recall` | Relationship Memory | Remembers relationship details |
| `lore_consistency` | Lore Consistency | Stays consistent with backstory |
| `emotional_response` | Emotional Response | Appropriate emotional reaction |
| `conflict_handling` | Conflict Handling | Response to disagreement |
| `factual_grounding` | Factual Grounding | Uses established facts |
| `multi_turn_coherence` | Multi-turn Coherence | Context across turns |
| `personality_expression` | Personality Expression | Character-specific mannerisms |
| `group_dynamics` | Group Dynamics | Awareness of other characters |

## Best Practices

### For Sample Generation
- Use diverse conversation contexts
- Include edge cases (conflict, emotional intensity, factual questions)
- Balance solo and group conversation samples
- Include samples where RAG should help and samples where it might not

### For Evaluators
- Read the rubric carefully before starting
- Rate each response independently before comparing
- Don't skip the preference question
- Add notes for unusual cases
- Take breaks to avoid fatigue bias

### For Analysis
- Need 3+ raters per sample for reliability
- Use majority/average for final scores
- Track inter-rater agreement
- Investigate high-disagreement samples

---

## Troubleshooting

### RAG not retrieving relevant content

1. Check if indexing completed: `console.log(getRagStats())`
2. Verify LM Studio embeddings endpoint is accessible
3. Try lowering `similarityThreshold` in config
4. Check if chunks are being created for the content type you expect

### LM Studio embeddings failing

The system falls back to TF-IDF embeddings automatically. Quality may be lower but functionality continues.

To verify:
```typescript
// In browser console
const { ragService } = await import('./services/ragService');
// Check console for "Using LM Studio embeddings" or "Using simple TF-IDF embeddings"
```

### IndexedDB storage issues

Clear RAG storage:
```typescript
import { ragService } from './services/ragService';
await ragService.clear();
```

---

## Performance Notes

- **Indexing**: Async, debounced (2s delay after changes)
- **Retrieval**: ~10-50ms with in-memory store
- **Embedding**: ~50-200ms per chunk with LM Studio, instant with TF-IDF
- **Storage**: ~1-5KB per chunk, 2000 max chunks = ~2-10MB IndexedDB

For large character libraries (50+ characters), consider:
- Increasing `maxChunks` to 5000
- Reducing `chunkSize` to 300 for more granular retrieval
- Enabling only for active session characters
