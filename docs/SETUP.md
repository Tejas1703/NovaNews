# Complete Setup Guide

## Overview

This project uses a 2-tier architecture optimized for semantic news search:

- **MongoDB (Prisma)**: User tracking, search logs, and article references
- **Weaviate**: Article metadata (full content) + semantic search with embeddings

## Why This Architecture?

**MongoDB stores ONLY**:
- User records (name, createdAt)
- Search queries & workflow status
- Article references (id, url, WeaviateId, processingStatus)

**Weaviate stores**:
- Article embeddings (1536-dimensional vectors)
- Full article metadata (title, content, description, source, author, category, tags, etc.)

This keeps MongoDB lean and fast while leveraging Weaviate's vector search capabilities for semantic article discovery.

## Installation

### 1. Install Dependencies

```powershell
npm install prisma @prisma/client
npm install weaviate-ts-client
npm install ai @ai-sdk/openai
npm install @heroicons/react
```

### 2. Configure Environment Variables

Create `.env` in project root:

```env
#------------------------------------------
# MongoDB (via Prisma)
#------------------------------------------
DATABASE_URL="mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/news-db?retryWrites=true&w=majority"

#------------------------------------------
# OpenAI (for embeddings)
#------------------------------------------
OPENAI_API_KEY="sk-..."

#------------------------------------------
# Weaviate (vector database)
#------------------------------------------
Weaviate_API_KEY="weaviate-host:8080"
Weaviate_ENVIRONMENT="us-east-1"
Weaviate_INDEX_NAME="tech-news"
```

## Database Setup

### MongoDB Atlas

1. **Create Account**: [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. **Create Cluster**: Choose free M0 tier
3. **Create Database User**:
   - Username: `newsapp`
   - Password: Generate strong password
4. **Network Access**: Add your IP or `0.0.0.0/0` (for development)
5. **Get Connection String**:
   - Click "Connect" → "Connect your application"
   - Copy connection string
   - Replace `<password>` with your password
6. **Add to `.env`** as `DATABASE_URL`

### Weaviate

1. **Create Account**: [Weaviate.io](https://www.Weaviate.io/)
2. **Get API Key**:
   - Dashboard → API Keys → Create API Key
   - Copy key to `.env` as `Weaviate_API_KEY`
3. **Create Index**:
   - Name: `tech-news` (or match Weaviate_INDEX_NAME)
   - Dimensions: **1536** (for OpenAI text-embedding-3-small)
   - Metric: **cosine**
   - Pod Type: Starter (free tier) or serverless
4. **Add configuration** to `.env`:
   - `Weaviate_INDEX_NAME="tech-news"`
   - `Weaviate_ENVIRONMENT="us-east-1"` (or your region)
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "s3:PutObject",
           "s3:GetObject",
           "s3:DeleteObject",
           "s3:ListBucket"
         ],
         "Resource": [
           "arn:aws:s3:::news-reports-prod",
           "arn:aws:s3:::news-reports-prod/*"
         ]
       }
     ]
   }
   ```

5. **Save Access Keys** to `.env`

## Initialize Prisma

```powershell
# Generate Prisma client from schema
npx prisma generate

# Push schema to MongoDB
npx prisma db push

# (Optional) Open Prisma Studio to view data
npx prisma studio
```

### OpenAI API

1. **Create Account**: [platform.openai.com](https://platform.openai.com/)
2. **Get API Key**:
   - Go to API Keys section
   - Create new secret key
   - Copy to `.env` as `OPENAI_API_KEY`
3. **Note**: You'll be charged for embedding generation
   - Model: `text-embedding-3-small`
   - Cost: ~$0.02 per 1M tokens

## Prisma Setup

```powershell
# Generate Prisma Client
npx prisma generate

# (Optional) Push schema to MongoDB
npx prisma db push
```

## Verify Setup

### Test MongoDB Connection

```typescript
import { prisma } from '@/lib/models';

async function testMongoDB() {
  try {
    const user = await prisma.user.create({
      data: { name: 'Test User' }
    });
    console.log('✅ MongoDB connected:', user);
    
    await prisma.user.delete({ where: { id: user.id } });
  } catch (error) {
    console.error('❌ MongoDB error:', error);
  }
}

testMongoDB();
```

### Test Weaviate Connection

```typescript
import { getIndexStats } from '@/lib/Weaviate';

async function testWeaviate() {
  try {
    const stats = await getIndexStats();
    console.log('✅ Weaviate connected:', stats);
  } catch (error) {
    console.error('❌ Weaviate error:', error);
  }
}

testWeaviate();
```

### Test Full Workflow

```typescript
import { storeArticleWithEmbedding, searchSimilarArticles } from '@/lib/workflow';

async function testWorkflow() {
  try {
    // Store an article
    const result = await storeArticleWithEmbedding({
      title: 'Test Article',
      content: 'This is a test article about technology.',
      description: 'A test article',
      source: 'Test',
      url: 'https://example.com/test',
      category: 'Technology',
    });
    console.log('✅ Article stored:', result);
    
    // Search for similar articles
    const similar = await searchSimilarArticles('technology', { topK: 5 });
    console.log('✅ Search results:', similar);
  } catch (error) {
    console.error('❌ Workflow error:', error);
  }
}

testWorkflow();
```

## Schema Overview

### MongoDB Collections (via Prisma)

```prisma
model User {
  id        String   @id @default(auto()) @db.ObjectId
  name      String
  searches  Search[]
  articles  Article[]
  createdAt DateTime @default(now())
}

model Search {
  id                   String    @id @default(auto()) @db.ObjectId
  query                String
  userId               String?   @db.ObjectId
  workflowStatus       String?   @default("pending")
  isFeasible           Boolean?
  feasibilityReason    String?
  articlesFound        Int?      @default(0)
  createdAt            DateTime  @default(now())
  // ... timestamps
}

model Article {
  id               String   @id @default(auto()) @db.ObjectId
  url              String?  @unique
  WeaviateId       String?  @unique  // Reference to Weaviate vector
  createdById      String?  @db.ObjectId
  isEmbedded       Boolean? @default(false)
  processingStatus String?  @default("pending")
  createdAt        DateTime @default(now())
}
```

### Weaviate Metadata Structure

```typescript
{
  id: "article-{mongoId}",  // Vector ID
  values: [0.123, -0.456, ...],  // 1536-dim embedding
  metadata: {
    articleId: "mongo-id",
    title: "Article Title",
    description: "Summary",
    content: "Full article text...",
    source: "TechCrunch",
    url: "https://...",
    author: "John Doe",
    category: "Technology",
    tags: ["AI", "ML"],
    publishedAt: "2025-11-09T...",
    userId: "user-id",
    searchQuery: "AI news",
    createdAt: "2025-11-09T..."
  }
}
```

## Available Functions

See `lib/workflow.ts` for integrated functions that handle multiple databases:

### Article Operations
- `storeArticleWithEmbedding()` - Store in MongoDB + Weaviate
- `batchStoreArticlesWithEmbeddings()` - Batch process multiple articles
- `searchSimilarArticles()` - Semantic search via Weaviate
- `getArticleDetails()` - Get full metadata from Weaviate
- `deleteArticleCompletely()` - Delete from both MongoDB and Weaviate

### User Operations
- `getUserSearchHistory()` - Get user's search history

### Direct MongoDB Operations (lib/models.ts)
- `findOrCreateUserByName()` - User management
- `logUserSearch()` - Log search queries
- `updateSearchFeasibility()` - Update search status
- `createArticleReference()` - Create article reference

### Direct Weaviate Operations (lib/Weaviate.ts)
- `storeArticleEmbedding()` - Store vector with metadata
- `querySimilarArticles()` - Query by embedding
- `getArticleMetadata()` - Get metadata by ID
- `updateArticleMetadata()` - Update metadata
- `deleteArticleEmbedding()` - Delete from Weaviate

## Frontend Usage

The project includes a complete news search interface:

```powershell
# Start development server
npm run dev

# Navigate to news search
# http://localhost:3000/news
```

**Frontend Features:**
- User name modal (stored in MongoDB + localStorage)
- Semantic search interface (Google/ChatGPT style)
- Real-time search via `/api/search`
- Article results with full metadata

See `FRONTEND_SETUP.md` for detailed frontend documentation.

## API Endpoints

The following API routes are available:

### POST /api/user
Create or find a user
```json
{
  "name": "John Doe"
}
```

### POST /api/search
Perform semantic search
```json
{
  "query": "artificial intelligence",
  "userName": "John Doe",
  "limit": 10
}
```

## Troubleshooting

### Prisma Client Not Found
```powershell
npx prisma generate
```

### MongoDB Connection Fails
- Check `DATABASE_URL` format
- Verify network access in Atlas
- Ensure password doesn't contain special characters (URL encode if needed)

### Weaviate Index Not Found
- Verify `Weaviate_INDEX_NAME` matches created index name
- Check API key is correct
- Ensure index dimensions = 1536
- Check `Weaviate_ENVIRONMENT` matches your index region

### OpenAI API Errors
- Verify `OPENAI_API_KEY` is correct
- Check you have sufficient credits
- Ensure model `text-embedding-3-small` is accessible

### Type Errors
After modifying schema, always run:
```powershell
npx prisma generate
```

## Cost Estimation

**Free Tier Limits**:
- MongoDB Atlas: 512MB storage
- Weaviate: Starter tier with limitations
- OpenAI: Pay-as-you-go (~$0.02 per 1M tokens for embeddings)

**Paid Tier** (estimated monthly):
- MongoDB Atlas: ~$9/month (M2 shared cluster)
- Weaviate: ~$70/month (pod-based) or serverless pricing
- OpenAI: Variable based on usage

## Next Steps

1. ✅ Complete environment setup
2. ✅ Test all database connections
3. ✅ Visit `/news` to use the search interface
4. � Load HuggingFace dataset (optional)
5. 🔨 Customize UI and add features
6. 🚀 Deploy!

For more information:
- **Frontend Guide**: `FRONTEND_SETUP.md`
- **Project Structure**: `PROJECT_STRUCTURE.md`
- **Database Architecture**: `DATABASE_README.md`
- **Quick Reference**: `QUICK_START.md`
