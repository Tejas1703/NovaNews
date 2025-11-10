# Data Flow & Architecture Diagram

## 🏗️ 2-Tier Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         USER REQUEST                                  │
│            { name: "Alice", query: "AI news" } via /news             │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      MONGODB (Prisma)                                │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ User { id, name, createdAt }                                   │  │
│  │ Search { id, query, userId, timestamps }                       │  │
│  │ Article { id, url, WeaviateId*, processingStatus, ... }       │  │
│  │                                     ↑ Reference to Weaviate!   │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  Stores: User data, search logs, article references only             │
└──────────┬──────────────────────────────────────────────────────────┘
           │
           │ WeaviateId reference
           │
           ▼
┌────────────────────────────────────────────────────────────────────┐
│   Weaviate (Vector Database)                                        │
│                                                                      │
│ Vector ID: article-{mongoId}                                        │
│ Values: [0.123, -0.456, ...] ← 1536-dimensional embedding           │
│ Metadata: {                                                         │
│   articleId: "mongo-id",                                            │
│   title: "Article Title",                                           │
│   description: "Summary",                                           │
│   content: "Full article text...",  ← COMPLETE CONTENT HERE!       │
│   source: "TechCrunch",                                             │
│   url: "https://...",                                               │
│   author: "Jane Smith",                                             │
│   category: "AI",                                                   │
│   tags: ["AI", "ML"],                                               │
│   publishedAt: "2025-11-10T...",                                    │
│   userId: "user-id",                                                │
│   createdAt: "2025-11-10T..."                                       │
│ }                                                                    │
│                                                                      │
│ Stores: Full article content, metadata, AND semantic embeddings     │
└──────────────────────────────────────────────────────────────────────┘
```

## 📊 Complete User Workflow

### Step 1: User Visits /news

```typescript
// Frontend checks localStorage
const storedName = localStorage.getItem('userName');

if (!storedName) {
  // Show modal → User enters name → POST /api/user
  
  POST /api/user
  Body: { name: "Alice" }
  
  // Backend
  findOrCreateUserByName("Alice")
    → MongoDB: User { id: "user-123", name: "Alice", createdAt: ... }
  
  // Response
  { userId: "user-123", userName: "Alice", isNewUser: true }
  
  // Frontend saves to localStorage
  localStorage.setItem('userName', 'Alice');
  localStorage.setItem('userId', 'user-123');
}

// Modal closes, search interface appears
```

### Step 2: User Searches for News

```typescript
// User types: "latest AI breakthroughs"
// Frontend calls API

POST /api/search
Body: {
  query: "latest AI breakthroughs",
  userName: "Alice",
  limit: 10
}

// Backend Actions:
// 1. Find user
const user = await findOrCreateUserByName("Alice");
  → MongoDB: User { id: "user-123", ... }

// 2. Log search
const searchRecord = await logUserSearch(user.id, "latest AI breakthroughs");
  → MongoDB: Search {
      id: "search-456",
      query: "latest AI breakthroughs",
      userId: "user-123",
      createdAt: "2025-11-10T10:00:00Z"
    }

// 3. Generate embedding via OpenAI
const embedding = await generateEmbedding("latest AI breakthroughs");
  → OpenAI API: [0.123, -0.456, ...] (1536 numbers)

// 4. Query Weaviate for similar articles
const results = await querySimilarArticles(
  embedding,
  10,  // topK
  "articles"  // namespace
);
  → Weaviate returns: [
      {
        id: "article-article-789",
        score: 0.95,
        metadata: {
          articleId: "article-789",
          title: "GPT-5 Released",
          description: "OpenAI releases...",
          content: "Full article text...",
          source: "TechCrunch",
          author: "Jane Smith",
          category: "AI",
          tags: ["GPT", "OpenAI"],
          url: "https://...",
          publishedAt: "2025-11-09T..."
        }
      },
      // ... more results
    ]

// 5. Format and return results
return {
  success: true,
  query: "latest AI breakthroughs",
  searchId: "search-456",
  count: 10,
  results: [ /* formatted results */ ]
}
```

### Step 3: User Views Results

```typescript
// Frontend displays results with:
- Article title (clickable link)
- Source, author, category
- Publication date
- Description/excerpt
- Relevance score (0.95 = 95% match)

// User clicks article → Opens in new tab
```

## 📝 Storing New Articles

### Backend: Store Article with Embedding

```typescript
await storeArticleWithEmbedding({
  title: "GPT-5 Released",
  description: "OpenAI releases GPT-5...",
  content: "Full article content goes here...",  // Complete text
  source: "TechCrunch",
  url: "https://techcrunch.com/gpt5",
  author: "Jane Smith",
  category: "AI",
  tags: ["GPT", "OpenAI"],
  publishedAt: "2025-11-09T00:00:00Z",
  createdById: "user-123",
  searchQuery: "latest AI breakthroughs"
})

// Internal Flow:
// 1. Create MongoDB reference
const article = await createArticleReference({
  url: "https://techcrunch.com/gpt5",
  createdById: "user-123"
});
  → MongoDB: Article {
      id: "article-789",
      url: "https://techcrunch.com/gpt5",
      createdById: "user-123",
      processingStatus: "pending",
      createdAt: "2025-11-10T..."
    }

// 2. Store in Weaviate with embedding
const WeaviateId = await storeArticleEmbedding(
  article.id,
  {
    articleId: article.id,
    title: "GPT-5 Released",
    description: "OpenAI releases GPT-5...",
    content: "Full article content goes here...",
    source: "TechCrunch",
    url: "https://techcrunch.com/gpt5",
    author: "Jane Smith",
    category: "AI",
    tags: ["GPT", "OpenAI"],
    publishedAt: "2025-11-09T00:00:00Z",
    userId: "user-123",
    searchQuery: "latest AI breakthroughs",
    createdAt: new Date().toISOString()
  },
  "articles"  // namespace
);
  → Weaviate: Vector {
      id: "article-article-789",
      values: [0.123, -0.456, ...],  // 1536 dims from OpenAI
      metadata: { /* all fields above */ }
    }

// 3. Update MongoDB with Weaviate reference
await updateArticleWeaviateId(article.id, WeaviateId);
  → MongoDB: Article {
      id: "article-789",
      url: "https://techcrunch.com/gpt5",
      WeaviateId: "article-article-789",  // ← Link established!
      isEmbedded: true,
      processingStatus: "completed",
      embeddedAt: "2025-11-10T..."
    }

// Result
{
  success: true,
  articleId: "article-789",
  WeaviateId: "article-article-789",
  url: "https://techcrunch.com/gpt5"
}
```

## 🔄 Batch Operations

### Storing Multiple Articles

```typescript
await batchStoreArticlesWithEmbeddings([
  {
    title: "GPT-5 Released",
    content: "Full article...",
    // ... metadata
  },
  {
    title: "New AI Chip Unveiled",
    content: "Full article...",
    // ... metadata
  },
  // ... more articles
], "user-123");

// Processes each article:
// - Creates MongoDB reference
// - Generates embedding
// - Stores in Weaviate
// - Links MongoDB → Weaviate

// Returns:
{
  success: true,
  stored: 2,
  failed: 0,
  results: [
    { articleId: "article-789", WeaviateId: "article-article-789" },
    { articleId: "article-790", WeaviateId: "article-article-790" }
  ]
}
```

## 🔍 Search Workflow

### Semantic Search for Similar Articles

```typescript
searchSimilarArticles("machine learning trends", {
  topK: 10,
  category: "AI",
  userId: "user-123"
})

// What happens:
// 1. Generate embedding for query
generateEmbedding("machine learning trends")
  → [0.789, -0.234, ...]

// 2. Build filter for Weaviate
filter = {
  category: { $eq: "AI" },
  userId: { $eq: "user-123" }
}

// 3. Query Weaviate for similar vectors
querySimilarArticles([0.789, -0.234, ...], {
  topK: 10,
  filter: filter,
  namespace: "articles"
})
  → Weaviate: [
      {
        id: "article-article-789",
        score: 0.92,  // 92% similar
        metadata: {
          articleId: "article-789",
          title: "GPT-5 Released",
          content: "Full text...",  // ← Retrieved from Weaviate!
          source: "TechCrunch",
          category: "AI",
          // ... all metadata
        }
      },
      // ... 9 more results
    ]

// No MongoDB query needed for article content!
// Weaviate has everything: metadata + embeddings
```

## 📋 Data Storage Breakdown

### What's Stored Where

#### MongoDB (Lightweight References)
```json
User: {
  "_id": "user-123",
  "name": "Alice",
  "createdAt": "2025-11-10T10:00:00Z"
}

Search: {
  "_id": "search-456",
  "userId": "user-123",
  "query": "latest AI breakthroughs",
  "createdAt": "2025-11-10T10:00:00Z"
}

Article: {
  "_id": "article-789",
  "url": "https://techcrunch.com/gpt5",
  "WeaviateId": "article-article-789",  // ← Reference to Weaviate!
  "createdById": "user-123",
  "isEmbedded": true,
  "processingStatus": "completed",
  "embeddedAt": "2025-11-10T10:15:00Z",
  "createdAt": "2025-11-10T10:15:00Z"
}
```

#### Weaviate (Full Article Content + Embeddings)
```json
{
  "id": "article-article-789",
  "values": [0.123, -0.456, ..., 0.789],  // 1536 numbers (embedding)
  "metadata": {
    "articleId": "article-789",
    "title": "GPT-5 Released",
    "description": "OpenAI releases GPT-5 with breakthrough capabilities",
    "content": "This is the complete article text with all paragraphs, details, and information. It can be thousands of words long...",  // ← FULL TEXT!
    "source": "TechCrunch",
    "url": "https://techcrunch.com/gpt5",
    "author": "Jane Smith",
    "category": "AI",
    "tags": ["GPT", "OpenAI", "AI"],
    "publishedAt": "2025-11-09T08:00:00Z",
    "userId": "user-123",
    "searchQuery": "latest AI breakthroughs",
    "createdAt": "2025-11-10T10:15:00Z"
  }
}
```

## 🔄 Complete Data Flow Summary

```
┌──────────────────┐
│   User Visits    │
│     /news        │
└────────┬─────────┘
         │
         ▼
┌─────────────────────┐
│  Enter Name (Modal) │
│  "Alice"            │
└────────┬────────────┘
         │
         ▼ POST /api/user
┌──────────────────────────┐
│  MongoDB: Create User    │
│  { id, name, createdAt } │
└────────┬─────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Search Interface       │
│  Query: "AI news"       │
└────────┬────────────────┘
         │
         ▼ POST /api/search
┌──────────────────────────────┐
│  1. MongoDB: Log Search      │
│  2. OpenAI: Generate Embed   │
│  3. Weaviate: Query Vectors  │
│  4. Return Results           │
└────────┬─────────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Display Results        │
│  - Title                │
│  - Description          │
│  - Source, Author       │
│  - Relevance Score      │
└─────────────────────────┘
```

## 🎯 Key Advantages

### Why 2-Tier is Better for Search

1. **MongoDB stays lean**
   - Only stores IDs and references
   - Fast queries for user/search tracking
   - Low storage costs

2. **Weaviate handles content**
   - Stores full article text
   - Stores all metadata
   - Provides semantic search
   - Single source of truth for articles

3. **Simple architecture**
   - No need to sync content across databases
   - One query gets everything (metadata + content)
   - Fewer moving parts
   - Easier to maintain

4. **Cost-effective**
   - No S3 storage needed
   - Weaviate metadata is included in vector storage
   - Simpler billing

## 📚 Related Documentation

- **FRONTEND_SETUP.md** - Frontend usage and API details
- **PROJECT_STRUCTURE.md** - Complete file structure
- **DATABASE_README.md** - Database architecture
- **QUICK_START.md** - Quick reference guide
- **docs/SETUP.md** - Full setup instructions

---

**Architecture: 2-Tier (MongoDB + Weaviate) - Optimized for Search** 🚀
    ↓
MongoDB (create document reference)
    ↓
Return download link to user
```

## 💡 Key Benefits

1. **MongoDB stays lightweight**
   - Only stores IDs, references, and workflow state
   - Fast queries for user data
   - Low storage costs

2. **Weaviate handles content**
   - Full article text + metadata
   - Semantic search capabilities
   - No text duplication in MongoDB

3. **S3 stores files**
   - Unlimited storage capacity
   - CDN capabilities
   - Cost-effective for large files

4. **Easy synchronization**
   - `lib/workflow.ts` functions handle all 3 databases
   - Atomic operations where possible
   - Clear reference linking (WeaviateId, s3Key)

## 📚 Related Files

- `lib/models.ts` - MongoDB/Prisma operations
- `lib/Weaviate.ts` - Weaviate vector operations
- `lib/s3.ts` - AWS S3 file operations
- `lib/workflow.ts` - ⭐ **Integrated multi-database workflows**
- `prisma/schema.prisma` - MongoDB schema definition
- `docs/SETUP.md` - Complete setup instructions
- `QUICK_START.md` - Quick reference guide
