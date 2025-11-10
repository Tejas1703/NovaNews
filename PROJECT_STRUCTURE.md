# 🗂️ Project Structure Overview

## Complete File Tree

```
news-report-generator/
│
├── 📱 Frontend (Next.js App)
│   ├── app/
│   │   ├── layout.tsx                    # Root layout
│   │   ├── page.tsx                      # Home page
│   │   ├── globals.css                   # Global styles + animations
│   │   │
│   │   ├── news/                         # ✨ News Search Feature
│   │   │   ├── page.tsx                  # Main page (modal + search)
│   │   │   ├── README.md                 # Feature documentation
│   │   │   └── components/
│   │   │       ├── UserNameModal.tsx     # User input modal
│   │   │       └── SearchInterface.tsx   # Search UI & results
│   │   │
│   │   └── api/                          # API Routes
│   │       ├── user/
│   │       │   └── route.ts              # POST - Create/find user
│   │       └── search/
│   │           └── route.ts              # POST - Semantic search
│   │
│   └── public/                           # Static assets
│
├── 🗄️ Backend (Database Layer)
│   ├── lib/
│   │   ├── models.ts                     # MongoDB operations (Prisma)
│   │   ├── Weaviate.ts                   # Weaviate vector operations
│   │   ├── workflow.ts                   # Integrated workflows
│   │   └── (s3.ts - DELETED)             # ❌ No longer used
│   │
│   └── prisma/
│       └── schema.prisma                 # Database schema (User, Search, Article)
│
├── 📚 Documentation
│   ├── README.md                         # Main project README
│   ├── FRONTEND_SETUP.md                 # Frontend guide (THIS IS THE MAIN GUIDE)
│   ├── QUICK_START.md                    # Quick reference
│   ├── DATABASE_README.md                # Database architecture
│   │
│   └── docs/
│       ├── SETUP.md                      # Setup instructions
│       ├── ARCHITECTURE.md               # Architecture diagrams
│       └── DATA_FLOW.md                  # Data flow documentation
│
└── ⚙️ Configuration
    ├── package.json                      # Dependencies
    ├── tsconfig.json                     # TypeScript config
    ├── next.config.ts                    # Next.js config
    ├── eslint.config.mjs                 # ESLint config
    ├── postcss.config.mjs                # PostCSS config
    └── .env                              # Environment variables (YOU NEED TO CREATE THIS)
```

## 🔑 Key Files to Know

### Frontend Entry Points
| File | Purpose | Route |
|------|---------|-------|
| `app/news/page.tsx` | News search page | `/news` |
| `app/page.tsx` | Home page | `/` |
| `app/layout.tsx` | Root layout | All pages |

### API Endpoints
| File | Method | Endpoint | Purpose |
|------|--------|----------|---------|
| `app/api/user/route.ts` | POST | `/api/user` | Create/find user |
| `app/api/search/route.ts` | POST | `/api/search` | Semantic search |

### Backend Utilities
| File | Purpose | Used By |
|------|---------|---------|
| `lib/models.ts` | MongoDB CRUD | API routes |
| `lib/Weaviate.ts` | Vector search | `lib/workflow.ts` |
| `lib/workflow.ts` | Integrated ops | API routes |

## 🏗️ Architecture (2-Tier)

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                             │
│  ┌──────────────┐  ┌─────────────────────────────────────┐  │
│  │ UserNameModal│  │      SearchInterface                 │  │
│  │   (Modal)    │  │  - Search bar                        │  │
│  │              │  │  - Results display                   │  │
│  │              │  │  - Loading states                    │  │
│  └──────────────┘  └─────────────────────────────────────┘  │
│         │                        │                           │
│         ▼                        ▼                           │
│   /api/user              /api/search                         │
└─────────────────────────────────────────────────────────────┘
                │                        │
                ▼                        ▼
┌─────────────────────────────────────────────────────────────┐
│                      BACKEND (lib/)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  models.ts   │  │ workflow.ts  │  │ Weaviate.ts  │      │
│  │  (Prisma)    │  │ (Integrated) │  │  (Vectors)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                │                        │
                ▼                        ▼
┌─────────────────────┐      ┌─────────────────────┐
│      MongoDB        │      │      Weaviate       │
│                     │      │                     │
│  - User records     │      │  - Article vectors  │
│  - Search history   │      │  - Full metadata    │
│  - Article refs     │      │  - Embeddings       │
└─────────────────────┘      └─────────────────────┘
```

## 📊 Data Models

### MongoDB (Prisma)
```typescript
User {
  id: string
  name: string
  searches: Search[]
  articles: Article[]
  createdAt: DateTime
}

Search {
  id: string
  query: string
  userId: string
  workflowStatus: string
  isFeasible: boolean
  articlesFound: number
  createdAt: DateTime
}

Article {
  id: string
  url: string
  WeaviateId: string
  createdById: string
  isEmbedded: boolean
  processingStatus: string
  createdAt: DateTime
}
```

### Weaviate (Vector DB)
```typescript
ArticleMetadata {
  articleId: string
  title: string
  description: string
  content: string         // Full article text
  source: string
  url: string
  author: string
  category: string
  tags: string[]
  publishedAt: string
  userId: string
  searchQuery: string
  createdAt: string
}
+ vector: number[1536]    // OpenAI embedding
```

## 🔄 User Workflows

### 1. First-Time User
```
1. Visit /news
2. See UserNameModal
3. Enter name → POST /api/user
4. User created in MongoDB
5. Name saved to localStorage
6. Modal closes → SearchInterface shown
```

### 2. Returning User
```
1. Visit /news
2. Check localStorage for name
3. If found → Skip modal
4. Show SearchInterface immediately
```

### 3. Search Flow
```
1. Enter query → Click Search
2. POST /api/search { query, userName }
3. Backend:
   a. Find/create user (MongoDB)
   b. Log search (MongoDB)
   c. Generate embedding (OpenAI)
   d. Query vectors (Weaviate)
   e. Format results
4. Display results on frontend
```

## 📦 Dependencies

### Production
```json
{
  "@prisma/client": "^6.19.0",
  "weaviate-ts-client": "latest",
  "@heroicons/react": "^2.x",
  "next": "15.x",
  "react": "^19.x"
}
```

### AI/Embeddings (Needed for search)
```json
{
  "@ai-sdk/openai": "latest",
  "ai": "latest"
}
```

**Note**: AI SDK packages not yet installed. Install when ready to use embeddings:
```powershell
npm install @ai-sdk/openai ai
```

## 🌍 Environment Variables

Create `.env` file:
```env
# MongoDB
DATABASE_URL="mongodb+srv://..."

# Weaviate
Weaviate_API_KEY="pc-..."
Weaviate_ENVIRONMENT="us-east-1"
Weaviate_INDEX_NAME="tech-news"

# OpenAI
OPENAI_API_KEY="sk-..."
```

## 🚀 Quick Start Commands

```powershell
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run development server
npm run dev

# Open app
# Navigate to: http://localhost:3000/news
```

## ✅ What's Working

- ✅ User modal UI
- ✅ Search interface UI
- ✅ API routes (user, search)
- ✅ MongoDB integration
- ✅ Weaviate integration
- ✅ TypeScript types
- ✅ Responsive design
- ✅ Error handling
- ✅ Loading states

## ⚠️ What's Needed

- ⏳ Environment variables (`.env`)
- ⏳ AI SDK packages (`@ai-sdk/openai`, `ai`)
- ⏳ Weaviate index with articles
- ⏳ HuggingFace dataset loaded (optional)

## 📖 Read Next

1. **FRONTEND_SETUP.md** - Detailed frontend guide
2. **QUICK_START.md** - Quick reference for database ops
3. **docs/SETUP.md** - Full setup instructions
4. **app/news/README.md** - News feature documentation

## 🎯 Summary

You now have:
- ✅ Complete 2-tier architecture (MongoDB + Weaviate)
- ✅ Modern Next.js frontend with user modal
- ✅ Google/ChatGPT-style search interface
- ✅ API routes for user management and search
- ✅ Integrated workflow functions
- ✅ TypeScript + Tailwind CSS
- ✅ Clean, documented codebase

**Ready to search tech news! 🚀**
