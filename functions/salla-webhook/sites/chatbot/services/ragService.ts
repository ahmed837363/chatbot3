/**
 * RAG (Retrieval-Augmented Generation) Service
 * 
 * Provides vector storage, embedding generation, and semantic retrieval
 * for grounding LLM responses in factual character/story data.
 */

import { Character, Message, Relationship, CharacterDevelopment, WorldInfo, Role } from '../types';

// ============================================
// TYPES
// ============================================

export interface RAGChunk {
  id: string;
  text: string;
  embedding: number[];
  metadata: ChunkMetadata;
  timestamp: number;
}

export interface ChunkMetadata {
  type: 'character_profile' | 'character_lore' | 'relationship' | 'development' | 
        'world_info' | 'story_memory' | 'conversation' | 'growth_moment';
  characterId?: string;
  characterName?: string;
  targetCharacterId?: string;
  targetCharacterName?: string;
  sessionId?: string;
  importance: number; // 0-1, higher = more important
  recency: number; // timestamp for recency weighting
}

export interface RetrievalResult {
  chunk: RAGChunk;
  score: number; // Combined similarity + importance + recency score
  rawSimilarity: number;
}

export interface RAGConfig {
  topK: number; // Number of chunks to retrieve
  similarityThreshold: number; // Minimum similarity to include
  recencyWeight: number; // How much to weight recent chunks (0-1)
  importanceWeight: number; // How much to weight importance (0-1)
  embeddingDimension: number; // Dimension of embeddings
  maxChunks: number; // Maximum chunks in store before pruning
  chunkSize: number; // Target chunk size in characters
  chunkOverlap: number; // Overlap between chunks
}

// Default configuration
const DEFAULT_CONFIG: RAGConfig = {
  topK: 8,
  similarityThreshold: 0.3,
  recencyWeight: 0.15,
  importanceWeight: 0.2,
  embeddingDimension: 384, // Good balance of quality and speed
  maxChunks: 2000,
  chunkSize: 500,
  chunkOverlap: 50,
};

// ============================================
// BM25 LEXICAL SEARCH
// ============================================

class BM25Index {
  private documents: Map<string, string[]> = new Map(); // id -> tokens
  private docLengths: Map<string, number> = new Map();
  private avgDocLength = 0;
  private idf: Map<string, number> = new Map();
  private termFrequencies: Map<string, Map<string, number>> = new Map(); // docId -> term -> count
  private k1 = 1.5;
  private b = 0.75;

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s']/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 1);
  }

  addDocument(id: string, text: string): void {
    const tokens = this.tokenize(text);
    this.documents.set(id, tokens);
    this.docLengths.set(id, tokens.length);
    
    // Count term frequency for this document
    const tf = new Map<string, number>();
    for (const token of tokens) {
      tf.set(token, (tf.get(token) || 0) + 1);
    }
    this.termFrequencies.set(id, tf);
    
    this.updateStats();
  }

  removeDocument(id: string): void {
    this.documents.delete(id);
    this.docLengths.delete(id);
    this.termFrequencies.delete(id);
    this.updateStats();
  }

  private updateStats(): void {
    // Calculate average document length
    const lengths = Array.from(this.docLengths.values());
    this.avgDocLength = lengths.length ? lengths.reduce((a, b) => a + b, 0) / lengths.length : 0;
    
    // Calculate IDF for all terms
    const N = this.documents.size;
    const docFreq = new Map<string, number>();
    
    for (const tf of this.termFrequencies.values()) {
      for (const term of tf.keys()) {
        docFreq.set(term, (docFreq.get(term) || 0) + 1);
      }
    }
    
    this.idf.clear();
    for (const [term, df] of docFreq.entries()) {
      // IDF with smoothing
      this.idf.set(term, Math.log((N - df + 0.5) / (df + 0.5) + 1));
    }
  }

  search(query: string, topK: number = 10): Array<{ id: string; score: number }> {
    const queryTokens = this.tokenize(query);
    const scores: Map<string, number> = new Map();

    for (const [docId, tf] of this.termFrequencies.entries()) {
      const docLen = this.docLengths.get(docId) || 0;
      let score = 0;

      for (const token of queryTokens) {
        const termFreq = tf.get(token) || 0;
        if (termFreq === 0) continue;

        const idfScore = this.idf.get(token) || 0;
        // BM25 formula
        const numerator = termFreq * (this.k1 + 1);
        const denominator = termFreq + this.k1 * (1 - this.b + this.b * (docLen / this.avgDocLength));
        score += idfScore * (numerator / denominator);
      }

      if (score > 0) {
        scores.set(docId, score);
      }
    }

    // Sort by score descending
    return Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topK)
      .map(([id, score]) => ({ id, score }));
  }

  clear(): void {
    this.documents.clear();
    this.docLengths.clear();
    this.termFrequencies.clear();
    this.idf.clear();
    this.avgDocLength = 0;
  }
}

// ============================================
// VECTOR STORE (In-Memory + IndexedDB Persistence)
// ============================================

class VectorStore {
  private chunks: Map<string, RAGChunk> = new Map();
  private config: RAGConfig;
  private dbName = 'rpchat_rag_db';
  private storeName = 'chunks';
  private db: IDBDatabase | null = null;
  private initialized = false;
  private bm25Index: BM25Index = new BM25Index(); // BM25 lexical search

  constructor(config: Partial<RAGConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Open IndexedDB
      this.db = await this.openDatabase();
      
      // Load existing chunks from IndexedDB
      const storedChunks = await this.loadFromDB();
      storedChunks.forEach(chunk => {
        this.chunks.set(chunk.id, chunk);
        this.bm25Index.addDocument(chunk.id, chunk.text); // Index for BM25
      });
      
      this.initialized = true;
      console.log(`RAG VectorStore initialized with ${this.chunks.size} chunks`);
    } catch (error) {
      console.warn('IndexedDB not available, using in-memory store only:', error);
      this.initialized = true;
    }
  }

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
    });
  }

  private async loadFromDB(): Promise<RAGChunk[]> {
    if (!this.db) return [];
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  private async saveToDB(chunk: RAGChunk): Promise<void> {
    if (!this.db) return;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(chunk);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  private async deleteFromDB(id: string): Promise<void> {
    if (!this.db) return;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async add(chunk: RAGChunk): Promise<void> {
    await this.initialize();
    
    // Check if we need to prune
    if (this.chunks.size >= this.config.maxChunks) {
      await this.pruneOldest(Math.floor(this.config.maxChunks * 0.1));
    }
    
    this.chunks.set(chunk.id, chunk);
    this.bm25Index.addDocument(chunk.id, chunk.text); // Index for BM25
    await this.saveToDB(chunk);
  }

  async addBatch(chunks: RAGChunk[]): Promise<void> {
    for (const chunk of chunks) {
      await this.add(chunk);
    }
  }

  async delete(id: string): Promise<void> {
    this.chunks.delete(id);
    this.bm25Index.removeDocument(id); // Remove from BM25
    await this.deleteFromDB(id);
  }

  async deleteByMetadata(filter: Partial<ChunkMetadata>): Promise<number> {
    let deleted = 0;
    
    for (const [id, chunk] of this.chunks.entries()) {
      let matches = true;
      for (const [key, value] of Object.entries(filter)) {
        if (chunk.metadata[key as keyof ChunkMetadata] !== value) {
          matches = false;
          break;
        }
      }
      
      if (matches) {
        await this.delete(id);
        deleted++;
      }
    }
    
    return deleted;
  }

  private async pruneOldest(count: number): Promise<void> {
    // Sort by timestamp (oldest first), considering importance
    const sorted = Array.from(this.chunks.values())
      .sort((a, b) => {
        // Higher importance = less likely to prune
        const aScore = a.timestamp * (1 + a.metadata.importance);
        const bScore = b.timestamp * (1 + b.metadata.importance);
        return aScore - bScore;
      });
    
    const toDelete = sorted.slice(0, count);
    for (const chunk of toDelete) {
      await this.delete(chunk.id);
    }
    
    console.log(`Pruned ${toDelete.length} old RAG chunks`);
  }

  search(queryEmbedding: number[], options: Partial<{
    topK: number;
    filter: Partial<ChunkMetadata>;
    minSimilarity: number;
  }> = {}): RetrievalResult[] {
    const topK = options.topK ?? this.config.topK;
    const minSimilarity = options.minSimilarity ?? this.config.similarityThreshold;
    const now = Date.now();
    
    const results: RetrievalResult[] = [];
    
    for (const chunk of this.chunks.values()) {
      // Apply metadata filter
      if (options.filter) {
        let matches = true;
        for (const [key, value] of Object.entries(options.filter)) {
          if (chunk.metadata[key as keyof ChunkMetadata] !== value) {
            matches = false;
            break;
          }
        }
        if (!matches) continue;
      }
      
      // Calculate cosine similarity
      const rawSimilarity = cosineSimilarity(queryEmbedding, chunk.embedding);
      
      if (rawSimilarity < minSimilarity) continue;
      
      // Calculate recency boost (exponential decay over 24 hours)
      const ageHours = (now - chunk.metadata.recency) / (1000 * 60 * 60);
      const recencyBoost = Math.exp(-ageHours / 24) * this.config.recencyWeight;
      
      // Calculate importance boost
      const importanceBoost = chunk.metadata.importance * this.config.importanceWeight;
      
      // Combined score
      const score = rawSimilarity * (1 - this.config.recencyWeight - this.config.importanceWeight) 
                  + recencyBoost 
                  + importanceBoost;
      
      results.push({ chunk, score, rawSimilarity });
    }
    
    // Sort by combined score
    results.sort((a, b) => b.score - a.score);
    
    return results.slice(0, topK);
  }

  // Hybrid search: combines BM25 lexical + vector semantic search
  hybridSearch(
    query: string,
    queryEmbedding: number[],
    options: Partial<{
      topK: number;
      filter: Partial<ChunkMetadata>;
      minSimilarity: number;
      bm25Weight: number; // 0-1, how much to weight BM25 vs vector
    }> = {}
  ): RetrievalResult[] {
    const topK = options.topK ?? this.config.topK;
    const bm25Weight = options.bm25Weight ?? 0.3; // Default 30% BM25, 70% vector
    const now = Date.now();

    // Get BM25 results (get more than needed for re-ranking)
    const bm25Results = this.bm25Index.search(query, topK * 3);
    const bm25Scores = new Map(bm25Results.map(r => [r.id, r.score]));
    
    // Normalize BM25 scores to 0-1
    const maxBm25 = Math.max(...bm25Results.map(r => r.score), 1);
    
    // Combine with vector search
    const results: RetrievalResult[] = [];
    const minSimilarity = options.minSimilarity ?? this.config.similarityThreshold * 0.5; // Lower threshold for hybrid
    
    for (const chunk of this.chunks.values()) {
      // Apply metadata filter
      if (options.filter) {
        let matches = true;
        for (const [key, value] of Object.entries(options.filter)) {
          if (chunk.metadata[key as keyof ChunkMetadata] !== value) {
            matches = false;
            break;
          }
        }
        if (!matches) continue;
      }
      
      // Vector similarity
      const rawSimilarity = cosineSimilarity(queryEmbedding, chunk.embedding);
      
      // BM25 score (normalized)
      const bm25Score = (bm25Scores.get(chunk.id) || 0) / maxBm25;
      
      // Skip if both scores are too low
      if (rawSimilarity < minSimilarity && bm25Score < 0.1) continue;
      
      // Recency boost
      const ageHours = (now - chunk.metadata.recency) / (1000 * 60 * 60);
      const recencyBoost = Math.exp(-ageHours / 24) * this.config.recencyWeight;
      
      // Importance boost
      const importanceBoost = chunk.metadata.importance * this.config.importanceWeight;
      
      // Hybrid score: weighted combination of BM25 and vector
      const baseScore = (1 - bm25Weight) * rawSimilarity + bm25Weight * bm25Score;
      const score = baseScore * (1 - this.config.recencyWeight - this.config.importanceWeight)
                  + recencyBoost
                  + importanceBoost;
      
      results.push({ chunk, score, rawSimilarity });
    }
    
    // Sort by combined score
    results.sort((a, b) => b.score - a.score);
    
    return results.slice(0, topK);
  }

  // Re-rank results with additional signals
  rerank(
    results: RetrievalResult[],
    options: {
      characterId?: string;
      boostTypes?: ChunkMetadata['type'][];
      diversify?: boolean; // Ensure variety of chunk types
    } = {}
  ): RetrievalResult[] {
    let reranked = results.map(r => ({ ...r }));
    
    // Boost results for the speaking character
    if (options.characterId) {
      reranked = reranked.map(r => ({
        ...r,
        score: r.chunk.metadata.characterId === options.characterId 
          ? r.score * 1.4 // 40% boost for speaking character's own data
          : r.score,
      }));
    }
    
    // Boost specific types
    if (options.boostTypes?.length) {
      reranked = reranked.map(r => ({
        ...r,
        score: options.boostTypes!.includes(r.chunk.metadata.type)
          ? r.score * 1.2 // 20% boost for preferred types
          : r.score,
      }));
    }
    
    // Re-sort after boosting
    reranked.sort((a, b) => b.score - a.score);
    
    // Diversify: ensure mix of chunk types in top results
    if (options.diversify && reranked.length > 4) {
      const seenTypes = new Set<string>();
      const diversified: RetrievalResult[] = [];
      const rest: RetrievalResult[] = [];
      
      for (const r of reranked) {
        if (!seenTypes.has(r.chunk.metadata.type) && diversified.length < Math.ceil(reranked.length / 2)) {
          diversified.push(r);
          seenTypes.add(r.chunk.metadata.type);
        } else {
          rest.push(r);
        }
      }
      
      // Interleave diversified with remaining by score
      const final: RetrievalResult[] = [];
      let d = 0, r = 0;
      while (d < diversified.length || r < rest.length) {
        if (d < diversified.length) final.push(diversified[d++]);
        if (r < rest.length) final.push(rest[r++]);
      }
      
      return final;
    }
    
    return reranked;
  }

  getStats(): { totalChunks: number; byType: Record<string, number> } {
    const byType: Record<string, number> = {};
    
    for (const chunk of this.chunks.values()) {
      byType[chunk.metadata.type] = (byType[chunk.metadata.type] || 0) + 1;
    }
    
    return {
      totalChunks: this.chunks.size,
      byType,
    };
  }

  async clear(): Promise<void> {
    this.chunks.clear();
    
    if (this.db) {
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.clear();
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    }
  }
}

// ============================================
// EMBEDDING SERVICE
// ============================================

// Simple TF-IDF-like embeddings for browser compatibility
// Falls back to this if LM Studio embeddings aren't available
class SimpleEmbedder {
  private vocabulary: Map<string, number> = new Map();
  private idf: Map<string, number> = new Map();
  private dimension: number;
  private documents: string[] = [];

  constructor(dimension: number = 384) {
    this.dimension = dimension;
  }

  // Tokenize and normalize text
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 2);
  }

  // Build vocabulary from a corpus
  buildVocabulary(documents: string[]): void {
    this.documents = documents;
    const docFrequency: Map<string, number> = new Map();
    
    // Count document frequency for each term
    for (const doc of documents) {
      const tokens = new Set(this.tokenize(doc));
      for (const token of tokens) {
        docFrequency.set(token, (docFrequency.get(token) || 0) + 1);
      }
    }
    
    // Sort by frequency and take top N for vocabulary
    const sorted = Array.from(docFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, this.dimension);
    
    // Build vocabulary index and IDF
    sorted.forEach(([token, freq], index) => {
      this.vocabulary.set(token, index);
      this.idf.set(token, Math.log(documents.length / (1 + freq)));
    });
  }

  // Generate embedding for text
  embed(text: string): number[] {
    const tokens = this.tokenize(text);
    const embedding = new Array(this.dimension).fill(0);
    
    // Count term frequency
    const tf: Map<string, number> = new Map();
    for (const token of tokens) {
      tf.set(token, (tf.get(token) || 0) + 1);
    }
    
    // Calculate TF-IDF vector
    for (const [token, count] of tf.entries()) {
      const index = this.vocabulary.get(token);
      if (index !== undefined) {
        const idfValue = this.idf.get(token) || 1;
        embedding[index] = (count / tokens.length) * idfValue;
      }
    }
    
    // Add semantic hash for words not in vocabulary
    for (const token of tokens) {
      if (!this.vocabulary.has(token)) {
        // Use hash to distribute unknown tokens
        const hash = this.simpleHash(token);
        const index = Math.abs(hash) % this.dimension;
        embedding[index] += 0.1;
      }
    }
    
    // Normalize
    return normalize(embedding);
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }
}

// LM Studio Embedding Service
class LMStudioEmbedder {
  private baseUrl: string;
  private model: string;
  private cache: Map<string, number[]> = new Map();
  private cacheMaxSize = 1000;

  constructor(baseUrl: string = 'http://127.0.0.1:1234/v1', model: string = 'text-embedding') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.model = model;
  }

  async embed(text: string): Promise<number[]> {
    // Check cache
    const cacheKey = text.slice(0, 200); // Use first 200 chars as key
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          input: text.slice(0, 2000), // Limit input length
        }),
      });

      if (!response.ok) {
        throw new Error(`Embedding request failed: ${response.statusText}`);
      }

      const data = await response.json();
      const embedding = data?.data?.[0]?.embedding;
      
      if (!Array.isArray(embedding)) {
        throw new Error('Invalid embedding response');
      }

      // Cache result
      if (this.cache.size >= this.cacheMaxSize) {
        // Remove oldest entries
        const keys = Array.from(this.cache.keys());
        keys.slice(0, 100).forEach(k => this.cache.delete(k));
      }
      this.cache.set(cacheKey, embedding);

      return embedding;
    } catch (error) {
      console.warn('LM Studio embedding failed, using fallback:', error);
      throw error;
    }
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    // Process in batches of 10 to avoid overwhelming the API
    const results: number[][] = [];
    const batchSize = 10;
    
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const embeddings = await Promise.all(batch.map(t => this.embed(t)));
      results.push(...embeddings);
    }
    
    return results;
  }
}

// ============================================
// MAIN RAG SERVICE
// ============================================

class RAGService {
  private vectorStore: VectorStore;
  private lmEmbedder: LMStudioEmbedder;
  private simpleEmbedder: SimpleEmbedder;
  private useLMStudioEmbeddings = true;
  private config: RAGConfig;
  private initialized = false;

  constructor(config: Partial<RAGConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.vectorStore = new VectorStore(this.config);
    this.lmEmbedder = new LMStudioEmbedder();
    this.simpleEmbedder = new SimpleEmbedder(this.config.embeddingDimension);
  }

  async initialize(lmStudioBaseUrl?: string): Promise<void> {
    if (this.initialized) return;

    if (lmStudioBaseUrl) {
      this.lmEmbedder = new LMStudioEmbedder(lmStudioBaseUrl);
    }

    await this.vectorStore.initialize();

    // Test LM Studio embeddings
    try {
      await this.lmEmbedder.embed('test');
      this.useLMStudioEmbeddings = true;
      console.log('RAG: Using LM Studio embeddings');
    } catch {
      this.useLMStudioEmbeddings = false;
      console.log('RAG: Using simple TF-IDF embeddings (LM Studio embeddings unavailable)');
    }

    this.initialized = true;
  }

  private async getEmbedding(text: string): Promise<number[]> {
    if (this.useLMStudioEmbeddings) {
      try {
        return await this.lmEmbedder.embed(text);
      } catch {
        // Fall back to simple embedder
        return this.simpleEmbedder.embed(text);
      }
    }
    return this.simpleEmbedder.embed(text);
  }

  // ============================================
  // INDEXING FUNCTIONS
  // ============================================

  async indexCharacter(character: Character, sessionId?: string): Promise<void> {
    const chunks: RAGChunk[] = [];
    const now = Date.now();

    // Index character profile
    if (character.description) {
      const profileChunks = chunkText(character.description, this.config.chunkSize, this.config.chunkOverlap);
      
      for (let i = 0; i < profileChunks.length; i++) {
        const text = `Character: ${character.name}\nProfile: ${profileChunks[i]}`;
        chunks.push({
          id: `char_profile_${character.id}_${i}`,
          text,
          embedding: await this.getEmbedding(text),
          metadata: {
            type: 'character_profile',
            characterId: character.id,
            characterName: character.name,
            sessionId,
            importance: 0.9, // High importance for profile
            recency: now,
          },
          timestamp: now,
        });
      }
    }

    // Index character lore
    if (character.lore) {
      const loreChunks = chunkText(character.lore, this.config.chunkSize, this.config.chunkOverlap);
      
      for (let i = 0; i < loreChunks.length; i++) {
        const text = `Character: ${character.name}\nBackstory/Lore: ${loreChunks[i]}`;
        chunks.push({
          id: `char_lore_${character.id}_${i}`,
          text,
          embedding: await this.getEmbedding(text),
          metadata: {
            type: 'character_lore',
            characterId: character.id,
            characterName: character.name,
            sessionId,
            importance: 0.85,
            recency: now,
          },
          timestamp: now,
        });
      }
    }

    // Index relationships
    if (character.relationships?.length) {
      for (const rel of character.relationships) {
        const relText = formatRelationshipForIndexing(character.name, rel);
        chunks.push({
          id: `char_rel_${character.id}_${rel.targetId}`,
          text: relText,
          embedding: await this.getEmbedding(relText),
          metadata: {
            type: 'relationship',
            characterId: character.id,
            characterName: character.name,
            targetCharacterId: rel.targetId,
            targetCharacterName: rel.targetName,
            sessionId,
            importance: 0.8,
            recency: rel.lastInteraction || now,
          },
          timestamp: now,
        });
      }
    }

    // Index character development
    if (character.development) {
      const devText = formatDevelopmentForIndexing(character.name, character.development);
      if (devText) {
        chunks.push({
          id: `char_dev_${character.id}`,
          text: devText,
          embedding: await this.getEmbedding(devText),
          metadata: {
            type: 'development',
            characterId: character.id,
            characterName: character.name,
            sessionId,
            importance: 0.75,
            recency: now,
          },
          timestamp: now,
        });
      }

      // Index growth moments separately
      if (character.development.growthMoments?.length) {
        for (let i = 0; i < character.development.growthMoments.length; i++) {
          const moment = character.development.growthMoments[i];
          const momentText = `${character.name} growth moment: ${moment}`;
          chunks.push({
            id: `char_growth_${character.id}_${i}`,
            text: momentText,
            embedding: await this.getEmbedding(momentText),
            metadata: {
              type: 'growth_moment',
              characterId: character.id,
              characterName: character.name,
              sessionId,
              importance: 0.7,
              recency: now,
            },
            timestamp: now,
          });
        }
      }
    }

    // Remove old chunks for this character first
    await this.vectorStore.deleteByMetadata({ characterId: character.id });
    
    // Add new chunks
    await this.vectorStore.addBatch(chunks);
  }

  async indexWorldInfo(worldInfo: WorldInfo, sessionId?: string): Promise<void> {
    const chunks: RAGChunk[] = [];
    const now = Date.now();

    if (worldInfo.scenario) {
      const text = `World Scenario: ${worldInfo.scenario}`;
      chunks.push({
        id: `world_scenario_${sessionId || 'global'}`,
        text,
        embedding: await this.getEmbedding(text),
        metadata: {
          type: 'world_info',
          sessionId,
          importance: 0.85,
          recency: now,
        },
        timestamp: now,
      });
    }

    if (worldInfo.storyTracker) {
      const text = `Story Progress: ${worldInfo.storyTracker}`;
      chunks.push({
        id: `world_tracker_${sessionId || 'global'}`,
        text,
        embedding: await this.getEmbedding(text),
        metadata: {
          type: 'world_info',
          sessionId,
          importance: 0.8,
          recency: now,
        },
        timestamp: now,
      });
    }

    if (worldInfo.currentLocation) {
      const text = `Current Location: ${worldInfo.currentLocation}`;
      chunks.push({
        id: `world_location_${sessionId || 'global'}`,
        text,
        embedding: await this.getEmbedding(text),
        metadata: {
          type: 'world_info',
          sessionId,
          importance: 0.6,
          recency: now,
        },
        timestamp: now,
      });
    }

    await this.vectorStore.addBatch(chunks);
  }

  async indexConversation(messages: Message[], sessionId?: string): Promise<void> {
    const now = Date.now();
    
    // Index recent messages (last 20) for conversation context
    const recentMessages = messages.slice(-20);
    const conversationChunks: string[] = [];
    let currentChunk = '';
    
    for (const msg of recentMessages) {
      const speaker = msg.characterName || (msg.role === Role.USER ? 'User' : msg.role);
      const line = `${speaker}: ${msg.content}`;
      
      if (currentChunk.length + line.length > this.config.chunkSize) {
        if (currentChunk) conversationChunks.push(currentChunk);
        currentChunk = line;
      } else {
        currentChunk += (currentChunk ? '\n' : '') + line;
      }
    }
    if (currentChunk) conversationChunks.push(currentChunk);

    // Delete old conversation chunks for this session
    await this.vectorStore.deleteByMetadata({ type: 'conversation', sessionId });

    // Add new chunks
    for (let i = 0; i < conversationChunks.length; i++) {
      const text = `Recent Conversation:\n${conversationChunks[i]}`;
      const chunk: RAGChunk = {
        id: `conv_${sessionId || 'global'}_${i}`,
        text,
        embedding: await this.getEmbedding(text),
        metadata: {
          type: 'conversation',
          sessionId,
          importance: 0.5 + (i / conversationChunks.length) * 0.3, // More recent = higher importance
          recency: now,
        },
        timestamp: now,
      };
      await this.vectorStore.add(chunk);
    }
  }

  async indexStoryMemory(storyMemory: { events?: string[]; relationships?: string[]; plotPoints?: string[] }, sessionId?: string): Promise<void> {
    const now = Date.now();
    const chunks: RAGChunk[] = [];

    if (storyMemory.events?.length) {
      const text = `Key Story Events:\n${storyMemory.events.join('\n')}`;
      chunks.push({
        id: `story_events_${sessionId || 'global'}`,
        text,
        embedding: await this.getEmbedding(text),
        metadata: {
          type: 'story_memory',
          sessionId,
          importance: 0.85,
          recency: now,
        },
        timestamp: now,
      });
    }

    if (storyMemory.plotPoints?.length) {
      const text = `Plot Points:\n${storyMemory.plotPoints.join('\n')}`;
      chunks.push({
        id: `story_plot_${sessionId || 'global'}`,
        text,
        embedding: await this.getEmbedding(text),
        metadata: {
          type: 'story_memory',
          sessionId,
          importance: 0.9,
          recency: now,
        },
        timestamp: now,
      });
    }

    await this.vectorStore.addBatch(chunks);
  }

  // ============================================
  // RETRIEVAL FUNCTIONS
  // ============================================

  async retrieve(
    query: string,
    options: {
      characterId?: string;
      sessionId?: string;
      types?: ChunkMetadata['type'][];
      topK?: number;
      useHybrid?: boolean; // Use hybrid BM25+vector search
      diversify?: boolean; // Ensure variety of chunk types
    } = {}
  ): Promise<RetrievalResult[]> {
    await this.initialize();
    
    const queryEmbedding = await this.getEmbedding(query);
    const useHybrid = options.useHybrid ?? true; // Default to hybrid search
    
    // Build filter
    const filter: Partial<ChunkMetadata> = {};
    if (options.sessionId) filter.sessionId = options.sessionId;
    
    // Get initial results using hybrid or vector-only search
    let results: RetrievalResult[];
    if (useHybrid) {
      results = this.vectorStore.hybridSearch(query, queryEmbedding, {
        topK: (options.topK || this.config.topK) * 2, // Get more, then re-rank
        filter: Object.keys(filter).length ? filter : undefined,
        bm25Weight: 0.3, // 30% lexical, 70% semantic
      });
    } else {
      results = this.vectorStore.search(queryEmbedding, {
        topK: (options.topK || this.config.topK) * 2,
        filter: Object.keys(filter).length ? filter : undefined,
      });
    }

    // Filter by type if specified
    if (options.types?.length) {
      results = results.filter(r => options.types!.includes(r.chunk.metadata.type));
    }

    // Re-rank with character boost and diversification
    results = this.vectorStore.rerank(results, {
      characterId: options.characterId,
      boostTypes: ['character_profile', 'relationship', 'character_lore'],
      diversify: options.diversify ?? true,
    });

    return results.slice(0, options.topK || this.config.topK);
  }

  async retrieveForCharacter(
    characterName: string,
    context: string,
    targetName?: string,
    sessionId?: string
  ): Promise<{ prompt: string; citations: Array<{ id: string; type: string; text: string; score: number }> }> {
    // Build a rich query combining character context and current conversation
    const query = `${characterName} ${targetName ? `talking to ${targetName}` : ''} ${context}`;
    
    const results = await this.retrieve(query, {
      sessionId,
      topK: this.config.topK,
      useHybrid: true,
      diversify: true,
    });

    // Build citations for verification/display
    const citations = results.map((r, i) => ({
      id: `[${i + 1}]`,
      type: r.chunk.metadata.type,
      text: r.chunk.text.slice(0, 200),
      score: r.score,
    }));

    if (!results.length) return { prompt: '', citations: [] };

    // Format retrieved chunks for prompt injection with citation markers
    const sections: string[] = [];
    
    // Group by type for cleaner formatting
    const byType: Record<string, Array<{ text: string; citation: string }>> = {};
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const type = result.chunk.metadata.type;
      if (!byType[type]) byType[type] = [];
      byType[type].push({ 
        text: result.chunk.text, 
        citation: `[${i + 1}]` 
      });
    }

    // Format each section with citation markers
    if (byType.character_profile?.length) {
      sections.push(`[CHARACTER FACTS]\n${byType.character_profile.map(c => `${c.text} ${c.citation}`).join('\n')}`);
    }
    if (byType.character_lore?.length) {
      sections.push(`[BACKSTORY]\n${byType.character_lore.map(c => `${c.text} ${c.citation}`).join('\n')}`);
    }
    if (byType.relationship?.length) {
      sections.push(`[RELATIONSHIPS]\n${byType.relationship.map(c => `${c.text} ${c.citation}`).join('\n')}`);
    }
    if (byType.development?.length) {
      sections.push(`[CHARACTER GROWTH]\n${byType.development.map(c => `${c.text} ${c.citation}`).join('\n')}`);
    }
    if (byType.growth_moment?.length) {
      sections.push(`[KEY MOMENTS]\n${byType.growth_moment.map(c => `${c.text} ${c.citation}`).join('\n')}`);
    }
    if (byType.world_info?.length) {
      sections.push(`[WORLD CONTEXT]\n${byType.world_info.map(c => `${c.text} ${c.citation}`).join('\n')}`);
    }
    if (byType.story_memory?.length) {
      sections.push(`[STORY SO FAR]\n${byType.story_memory.map(c => `${c.text} ${c.citation}`).join('\n')}`);
    }

    if (!sections.length) return { prompt: '', citations: [] };

    const prompt = `
=== RETRIEVED FACTS (Use these for accuracy) ===
${sections.join('\n\n')}
=== END RETRIEVED FACTS ===

IMPORTANT: Base your response on the above facts. Do not contradict them.
`;
    return { prompt, citations };
  }

  // Legacy method for backward compatibility
  async retrieveForCharacterSimple(
    characterName: string,
    context: string,
    targetName?: string,
    sessionId?: string
  ): Promise<string> {
    const { prompt } = await this.retrieveForCharacter(characterName, context, targetName, sessionId);
    return prompt;
  }

  getStats() {
    return this.vectorStore.getStats();
  }

  async clear(): Promise<void> {
    await this.vectorStore.clear();
  }

  // Rebuild vocabulary for simple embedder using all indexed texts
  async rebuildVocabulary(): Promise<void> {
    const stats = this.vectorStore.getStats();
    if (stats.totalChunks === 0) return;

    // This would require accessing all chunk texts
    // For now, we'll rely on LM Studio embeddings or skip this
    console.log('Vocabulary rebuild requested - using LM Studio embeddings');
  }

  // Summarize and consolidate old conversation memories
  async summarizeConversations(
    sessionId: string,
    summarizer: (text: string) => Promise<string>
  ): Promise<void> {
    // Get all conversation chunks for this session
    const results = await this.retrieve('', {
      sessionId,
      types: ['conversation'],
      topK: 100,
      useHybrid: false,
    });

    if (results.length < 10) return; // Not enough to summarize

    // Collect old chunks (keep most recent 5)
    const sortedByTime = results.sort((a, b) => 
      b.chunk.metadata.recency - a.chunk.metadata.recency
    );
    const toKeep = sortedByTime.slice(0, 5);
    const toSummarize = sortedByTime.slice(5);

    if (toSummarize.length < 5) return; // Not enough to summarize

    // Combine old conversation chunks
    const combinedText = toSummarize
      .map(r => r.chunk.text)
      .join('\n\n');

    try {
      // Use external summarizer (LLM call)
      const summary = await summarizer(combinedText);
      
      // Delete old chunks
      for (const r of toSummarize) {
        await this.vectorStore.delete(r.chunk.id);
      }

      // Add summarized chunk
      const summaryChunk: RAGChunk = {
        id: `conv_summary_${sessionId}_${Date.now()}`,
        text: `[CONVERSATION SUMMARY]\n${summary}`,
        embedding: await this.getEmbedding(summary),
        metadata: {
          type: 'story_memory',
          sessionId,
          importance: 0.8, // High importance for summaries
          recency: Date.now(),
        },
        timestamp: Date.now(),
      };
      await this.vectorStore.add(summaryChunk);

      console.log(`Summarized ${toSummarize.length} conversation chunks into 1`);
    } catch (error) {
      console.warn('Failed to summarize conversations:', error);
    }
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    // Pad shorter array with zeros
    const maxLen = Math.max(a.length, b.length);
    a = [...a, ...new Array(maxLen - a.length).fill(0)];
    b = [...b, ...new Array(maxLen - b.length).fill(0)];
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function normalize(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (magnitude === 0) return vector;
  return vector.map(v => v / magnitude);
}

function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  let currentChunk = '';
  let overlapBuffer = '';
  
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > chunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      // Keep last part for overlap
      const words = currentChunk.split(' ');
      overlapBuffer = words.slice(-Math.ceil(overlap / 5)).join(' ');
      currentChunk = overlapBuffer + ' ' + sentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

function formatRelationshipForIndexing(characterName: string, rel: Relationship): string {
  const trustLevel = rel.trust > 50 ? 'deeply trusts' : rel.trust > 20 ? 'trusts' : 
                     rel.trust > 0 ? 'somewhat trusts' : rel.trust > -20 ? 'is wary of' : 
                     rel.trust > -50 ? 'distrusts' : 'deeply distrusts';
  
  const affectionLevel = rel.affection > 50 ? 'adores' : rel.affection > 20 ? 'likes' :
                         rel.affection > 0 ? 'is warm toward' : rel.affection > -20 ? 'is cool toward' :
                         rel.affection > -50 ? 'dislikes' : 'despises';

  let text = `${characterName}'s relationship with ${rel.targetName}:\n`;
  text += `- Type: ${rel.type.replace('_', ' ')}\n`;
  text += `- ${characterName} ${trustLevel} ${rel.targetName}\n`;
  text += `- ${characterName} ${affectionLevel} ${rel.targetName}\n`;
  text += `- Familiarity: ${rel.familiarity}/100\n`;
  
  if (rel.history?.length) {
    text += `- History: ${rel.history.slice(-3).join('; ')}`;
  }
  
  return text;
}

function formatDevelopmentForIndexing(characterName: string, dev: CharacterDevelopment): string {
  const parts: string[] = [`${characterName}'s character development:`];
  
  if (dev.traits?.length) parts.push(`Traits: ${dev.traits.join(', ')}`);
  if (dev.beliefs?.length) parts.push(`Beliefs: ${dev.beliefs.join(', ')}`);
  if (dev.fears?.length) parts.push(`Fears: ${dev.fears.join(', ')}`);
  if (dev.desires?.length) parts.push(`Desires: ${dev.desires.join(', ')}`);
  if (dev.flaws?.length) parts.push(`Flaws: ${dev.flaws.join(', ')}`);
  if (dev.arc) parts.push(`Character Arc: ${dev.arc}`);
  
  return parts.length > 1 ? parts.join('\n') : '';
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const ragService = new RAGService();

export {
  RAGService,
  VectorStore,
  cosineSimilarity,
  normalize,
  chunkText,
};
