# Quick Start - News Report Generator

## 🎯 Architecture at a Glance

**2-Tier Data System**:
1. **MongoDB** → User data, search logs & article references
2. **Weaviate** → Article metadata (full content) & embeddings

## 📦 Installation

```powershell
# Database clients
npm install prisma @prisma/client @Weaviate-database/Weaviate

# AI/Embeddings
npm install ai @ai-sdk/openai

# UI Icons
npm install @heroicons/react

# Generate Prisma client
npx prisma generate

# (Optional) Push schema to MongoDB
npx prisma db push
```

## 🔑 Environment Setup

Create `.env`:

```env
# MongoDB
DATABASE_URL="mongodb+srv://user:pass@cluster.mongodb.net/newsdb?retryWrites=true"

# OpenAI (for embeddings)
OPENAI_API_KEY="sk-..."

# Weaviate
Weaviate_API_KEY="pc-..."
Weaviate_ENVIRONMENT="us-east-1"
Weaviate_INDEX_NAME="tech-news"
```

## ⚙️ Setup Services

### 1. Weaviate Index
- Go to [Weaviate.io](https://www.Weaviate.io/)
- Create index:
  - Name: `tech-news` (or match Weaviate_INDEX_NAME)
  - Dimensions: `1536` (OpenAI text-embedding-3-small)
  - Metric: `cosine`

### 2. MongoDB Atlas
- Create free cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
- Whitelist your IP (0.0.0.0/0 for development)
- Get connection string

## 💻 Usage Examples

### Store an Article (MongoDB + Weaviate)

```typescript
import { storeArticleWithEmbedding } from '@/lib/workflow';

const result = await storeArticleWithEmbedding({
  title: 'AI Advances in 2025',
  description: 'Latest AI developments',
  content: 'Full article text goes here...',
  source: 'TechCrunch',
  url: 'https://example.com/article',
  author: 'Jane Smith',
  category: 'Technology',
  tags: ['AI', 'ML'],
  publishedAt: '2025-11-10T00:00:00Z',
  createdById: userId,
});

// MongoDB: Stores reference (id, url, WeaviateId)
// Weaviate: Stores full metadata + embedding
```

### Search Similar Articles

```typescript
import { searchSimilarArticles } from '@/lib/workflow';

const similar = await searchSimilarArticles('machine learning', {
  topK: 10,
  category: 'Technology',
  userId: userId,
});

// Queries Weaviate and returns full metadata
```

### User Management

```typescript
import { findOrCreateUserByName, getUserSearchHistory } from '@/lib/models';

// Create or find user
const user = await findOrCreateUserByName('John Doe');

// Get search history
const searches = await getUserSearchHistory(user.id, 20);
```

### Delete Article

```typescript
import { deleteArticleCompletely } from '@/lib/workflow';

// Deletes from both MongoDB and Weaviate
await deleteArticleCompletely(articleId);
```

## 🌐 Frontend Usage

Visit `/news` in your browser to use the search interface:

```powershell
npm run dev
# Navigate to: http://localhost:3000/news
```

**Features:**
- User name modal (stored in MongoDB + localStorage)
- Semantic search interface
- Results with full article metadata
- Google/ChatGPT-style design

## 📁 File Reference

- `lib/models.ts` - MongoDB operations (User, Search, Article references)
- `lib/Weaviate.ts` - Vector operations (embeddings, metadata)
- `lib/workflow.ts` - ⭐ **Use these integrated functions!**
- `app/news/` - Frontend search interface
- `app/api/` - API routes (user, search)

## 🧪 Testing

```typescript
// Test MongoDB
import { prisma } from '@/lib/models';
const user = await prisma.user.create({ data: { name: 'Test User' } });

// Test Weaviate
import { getIndexStats } from '@/lib/Weaviate';
const stats = await getIndexStats();

// Test search via API
fetch('/api/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    query: 'artificial intelligence', 
    userName: 'Test User',
    limit: 10 
  })
});
```

## 📚 Full Documentation

- `FRONTEND_SETUP.md` - Frontend setup and usage guide ⭐ **Start here!**
- `PROJECT_STRUCTURE.md` - Complete project overview
- `DATABASE_README.md` - Database architecture details
- `docs/SETUP.md` - Complete setup guide
- `app/news/README.md` - News feature documentation

## 🚀 Ready to Go!

1. ✅ Set up `.env` file
2. ✅ Create Weaviate index
3. ✅ Run `npm run dev`
4. ✅ Visit `/news` and start searching!

All database operations are handled by `lib/workflow.ts`! 🎉
