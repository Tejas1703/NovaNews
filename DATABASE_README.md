# News Report Generator - Database Architecture

## ✅ Complete Implementation

This project implements a **2-tier specialized database architecture** optimized for AI-powered news search with semantic search capabilities.

## 🏗️ Architecture

```
┌─────────────┐     ┌──────────────┐
│   MongoDB   │     │   Weaviate   │
│   (Prisma)  │────►│  (Vectors)   │
│             │     │              │
│ User data   │     │ Article      │
│ Search logs │     │ metadata     │
│ References  │     │ + embeddings │
└─────────────┘     └──────────────┘
```

### What's Stored Where

**MongoDB** (lightweight, fast queries, reference tracking)
- User: `{ id, name, createdAt }`
- Search: `{ query, userId, timestamps }`
- Article: `{ id, url, WeaviateId, isEmbedded, processingStatus }`  ← Reference only!

**Weaviate** (semantic search, full content storage)
- Article embeddings (1536-dim vectors from OpenAI)
- **Full metadata**: title, description, content (full text), source, author, category, tags, publishedAt, etc.

## 📁 Files Created

### Core Libraries
- ✅ `prisma/schema.prisma` - MongoDB schema (User, Search, Article)
- ✅ `lib/models.ts` - MongoDB/Prisma operations
- ✅ `lib/Weaviate.ts` - Weaviate vector operations
- ✅ `lib/workflow.ts` - **⭐ Integrated multi-database workflows**

### Frontend
- ✅ `app/news/page.tsx` - News search interface
- ✅ `app/news/components/UserNameModal.tsx` - User input modal
- ✅ `app/news/components/SearchInterface.tsx` - Search UI
- ✅ `app/api/user/route.ts` - User management API
- ✅ `app/api/search/route.ts` - Semantic search API

### Documentation
- ✅ `FRONTEND_SETUP.md` - Frontend setup and usage guide
- ✅ `PROJECT_STRUCTURE.md` - Complete project overview
- ✅ `QUICK_START.md` - Quick reference guide
- ✅ `docs/SETUP.md` - Complete setup instructions
- ✅ `docs/DATA_FLOW.md` - Detailed data flow & architecture diagrams
- ✅ `app/news/README.md` - News feature documentation

## 🚀 Quick Start

### 1. Install Dependencies

```powershell
npm install prisma @prisma/client
npm install @Weaviate-database/Weaviate
npm install @ai-sdk/openai ai
npm install @heroicons/react
```

### 2. Configure Environment

Create `.env`:

```env
# MongoDB
DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/database"

# OpenAI (for embeddings)
OPENAI_API_KEY="sk-..."

# Weaviate
Weaviate_API_KEY="pc-..."
Weaviate_ENVIRONMENT="us-east-1"
Weaviate_INDEX_NAME="tech-news"
```

### 3. Setup Databases

```powershell
# MongoDB - Generate Prisma Client
npx prisma generate

# (Optional) Push schema to MongoDB
npx prisma db push

# Weaviate: Create index at Weaviate.io
# - Name: tech-news (or match Weaviate_INDEX_NAME)
# - Dimensions: 1536 (for OpenAI text-embedding-3-small)
# - Metric: cosine
# - Namespace: articles (optional, default works too)
```

### 4. Run the Application

```powershell
# Start development server
npm run dev

# Visit the news search page
# http://localhost:3000/news
```

### 5. Use in Your Code

```typescript
import { storeArticleWithEmbedding, searchSimilarArticles } from '@/lib/workflow';

// Store article (MongoDB + Weaviate automatically)
await storeArticleWithEmbedding({
  title: 'AI Breakthrough in 2025',
  content: 'Full article text...',
  description: 'Summary of the article',
  source: 'TechCrunch',
  url: 'https://techcrunch.com/...',
  author: 'Jane Smith',
  category: 'AI',
  tags: ['artificial-intelligence', 'machine-learning'],
  publishedAt: '2025-11-10T00:00:00Z',
  createdById: userId,
});

// Search for similar articles
const results = await searchSimilarArticles('machine learning trends', {
  topK: 10,
  category: 'AI',
  userId: userId,
});
```

## 💡 Key Features

### Semantic Search
Find similar articles by meaning, not keywords:

```typescript
import { searchSimilarArticles } from '@/lib/workflow';

const results = await searchSimilarArticles('artificial intelligence', {
  topK: 10,
  category: 'Technology',
  source: 'TechCrunch',
});
// Returns articles with full metadata from Weaviate
```

### User Management
Track users and their search history:

```typescript
import { findOrCreateUserByName, getUserSearchHistory } from '@/lib/models';

// Create or find user
const user = await findOrCreateUserByName('John Doe');

// Get search history
const searches = await getUserSearchHistory(user.id, 20);
```

## 🔄 Frontend Integration

The architecture includes a complete frontend for news search:

1. **User Modal** → User enters name → Stored in MongoDB
2. **Search Interface** → User searches for news
3. **API Call** → `/api/search` with query and userName
4. **Embedding Generation** → OpenAI creates vector from query
5. **Semantic Search** → Weaviate finds similar articles
6. **Results Display** → Full article metadata shown to user

Visit `/news` to see the interface in action!

## 📊 Data Flow

```
User Input (Name)
    ↓
MongoDB (create/find user)
    ↓
localStorage (remember user)
    ↓
User Search Query
    ↓
MongoDB (log search)
    ↓
OpenAI (generate embedding)
    ↓
Weaviate (vector similarity search)
    ↓
Return Results (with full metadata)
    ↓
Display to User
```

See `docs/DATA_FLOW.md` for detailed diagrams and `FRONTEND_SETUP.md` for frontend usage.

## 🛠️ Available Functions

All in `lib/workflow.ts`:

### Articles
- `storeArticleWithEmbedding()` - Store in MongoDB + Weaviate
- `batchStoreArticlesWithEmbeddings()` - Batch process multiple articles
- `searchSimilarArticles()` - Semantic search via Weaviate
- `getArticleDetails()` - Get full metadata from Weaviate
- `deleteArticleCompletely()` - Delete from both MongoDB and Weaviate

### Users & Search
- `getUserSearchHistory()` - Get user's search history from MongoDB

See `lib/models.ts` for direct MongoDB operations:
- `findOrCreateUserByName()` - User management
- `logUserSearch()` - Log search queries
- `createArticleReference()` - Create article reference in MongoDB

See `lib/Weaviate.ts` for direct Weaviate operations:
- `storeArticleEmbedding()` - Store vector with metadata
- `querySimilarArticles()` - Query by embedding
- `getArticleMetadata()` - Get metadata by ID
- `updateArticleMetadata()` - Update metadata
- `deleteArticleEmbedding()` - Delete from Weaviate

## 📚 Documentation

- **Frontend Guide**: `FRONTEND_SETUP.md` ⭐ **Start here for UI setup**
- **Project Overview**: `PROJECT_STRUCTURE.md`
- **Quick Reference**: `QUICK_START.md`
- **Complete Setup**: `docs/SETUP.md`
- **Architecture Details**: `docs/DATA_FLOW.md`
- **News Feature**: `app/news/README.md`

## ✨ Benefits of This Architecture

1. **MongoDB stays lightweight** - Only stores references and tracking data
2. **Weaviate handles semantic search** - Find similar articles by meaning, not keywords
3. **All content in Weaviate** - Full article text, metadata, and embeddings together
4. **Single function calls** - `lib/workflow.ts` handles synchronization automatically
5. **Scalable** - Each database scales independently
6. **Simple & Clean** - 2-tier is easier to maintain than 3-tier
7. **Cost-effective** - No S3 storage costs for this use case

## 🎯 Next Steps

1. ✅ Set up environment variables (`.env` file)
2. ✅ Install AI SDK packages: `npm install @ai-sdk/openai ai`
3. ✅ Create Weaviate index (1536 dimensions, cosine metric)
4. 📊 Load HuggingFace dataset into Weaviate (optional)
5. 🚀 Run `npm run dev` and visit `/news`
6. 🔍 Start searching for tech news!

## 🌟 Features Ready to Use

- ✅ **User Management** - Name modal with MongoDB storage
- ✅ **Semantic Search** - AI-powered article search
- ✅ **Beautiful UI** - Google/ChatGPT-style interface
- ✅ **Search History** - Track all user searches
## Current Status

- ✅ **MongoDB Setup** - Prisma schema & models
- ✅ **Article References** - MongoDB tracks Weaviate articles
- ✅ **Weaviate Integration** - Vector search operations
- ✅ **Workflow Helpers** - Combined operations
- ✅ **Full Metadata** - Rich article information in results
- ✅ **Responsive Design** - Works on mobile and desktop

## 💡 Loading Sample Data

To get started with searching, you can:

1. **Use HuggingFace Dataset** (recommended):
   - Dataset: `MongoDB/tech-news-embeddings`
   - Contains pre-computed embeddings for tech articles
   - Load into Weaviate using a custom script

2. **Manual Article Addition**:
   ```typescript
   import { storeArticleWithEmbedding } from '@/lib/workflow';
   
   await storeArticleWithEmbedding({
     title: 'Sample Article',
     content: 'Full article text...',
     description: 'Brief summary',
     source: 'TechCrunch',
     url: 'https://example.com/article',
     author: 'John Doe',
     category: 'AI',
     tags: ['artificial-intelligence', 'machine-learning'],
     publishedAt: new Date().toISOString(),
     createdById: userId,
   });
   ```

---

**Ready to build!** All database operations are handled by functions in `lib/workflow.ts`. 
Visit `/news` to start searching! 🎉
