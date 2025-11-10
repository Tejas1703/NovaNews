# Frontend Setup & Usage Guide

## 🎯 What We Built

A modern, AI-powered news search application with:
- **User authentication modal** (MongoDB storage)
- **Semantic search interface** (Google/ChatGPT style)
- **Real-time search** via Weaviate vector database
- **Responsive design** with Tailwind CSS

## 📁 Files Created

### Frontend Components
```
app/news/
├── page.tsx                          # Main page with modal & search
├── README.md                         # Feature documentation
└── components/
    ├── UserNameModal.tsx             # User name input modal
    └── SearchInterface.tsx           # Search UI & results display
```

### API Routes
```
app/api/
├── user/
│   └── route.ts                      # POST - Create/find user
└── search/
    └── route.ts                      # POST - Semantic search
```

### Styles
```
app/globals.css                       # Custom animations & utilities
```

## 🚀 How to Run

### 1. Install Dependencies
```powershell
npm install
```

**Dependencies installed:**
- `@heroicons/react` - UI icons ✅ Already installed

### 2. Environment Variables
Make sure your `.env` file has:

```env
# MongoDB
DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/database"

# Weaviate
Weaviate_API_KEY="pc-xxxxxxxxxxxxx"
Weaviate_ENVIRONMENT="us-east-1"
Weaviate_INDEX_NAME="tech-news"

# OpenAI (for embeddings)
OPENAI_API_KEY="sk-xxxxxxxxxxxxx"
```

### 3. Database Setup
```powershell
# Generate Prisma client
npx prisma generate

# (Optional) Push schema to MongoDB
npx prisma db push
```

### 4. Start Development Server
```powershell
npm run dev
```

### 5. Open in Browser
Navigate to: **http://localhost:3000/news**

## 📱 User Experience

### First Visit
1. Page loads with a modal: "Welcome to NovaNews"
2. User enters their name (min 2 characters)
3. Clicks "Continue"
4. Name saved to MongoDB + localStorage
5. Modal closes → Search interface appears

### Returning Visit
1. Page checks localStorage for saved name
2. If found, skips modal
3. Shows personalized greeting: "Welcome, [Name]"
4. User can start searching immediately

### Search Flow
1. User types query (e.g., "artificial intelligence")
2. Clicks "Search" button
3. Loading spinner appears
4. Backend:
   - Logs search in MongoDB
   - Generates embedding via OpenAI
   - Queries Weaviate for similar articles
5. Results displayed with:
   - Title (clickable)
   - Source, author, category
   - Publication date
   - Relevance score
   - Description/excerpt

## 🔧 API Endpoints

### `POST /api/user`
**Create or find user**

Request:
```json
{
  "name": "John Doe"
}
```

Response:
```json
{
  "success": true,
  "userId": "507f1f77bcf86cd799439011",
  "userName": "John Doe",
  "isNewUser": true
}
```

### `POST /api/search`
**Semantic search**

Request:
```json
{
  "query": "machine learning trends",
  "userName": "John Doe",
  "limit": 10
}
```

Response:
```json
{
  "success": true,
  "query": "machine learning trends",
  "searchId": "507f1f77bcf86cd799439012",
  "count": 10,
  "results": [
    {
      "id": "article-123",
      "title": "ML Trends in 2025",
      "description": "Latest developments...",
      "content": "Full content...",
      "source": "TechCrunch",
      "url": "https://...",
      "author": "Jane Smith",
      "category": "Machine Learning",
      "publishedAt": "2025-11-10T00:00:00Z",
      "score": 0.95
    }
  ]
}
```

## 🎨 Design Features

### UI Components
- **Modal**:
  - Backdrop blur effect
  - Centered with fade-in animation
  - Input validation
  - Prevents background scrolling

- **Search Interface**:
  - Sticky header with branding
  - Large search bar with icon
  - Smooth transitions
  - Loading states
  - Error handling

- **Results**:
  - Card-based layout
  - Hover effects
  - Metadata badges
  - Truncated text with line-clamp
  - Direct article links

### Animations
- Fade-in on modal open
- Search bar transitions
- Result card hover effects
- Loading spinner
- Smooth state changes

### Responsive Design
- Mobile-friendly
- Flexible layouts
- Adaptive spacing
- Touch-friendly buttons

## 🔍 Testing the App

### Test User Creation
1. Open DevTools → Network tab
2. Navigate to `/news`
3. Enter name in modal
4. Check Network for POST to `/api/user`
5. Verify MongoDB has new User document

### Test Search
1. Enter query: "artificial intelligence"
2. Click Search
3. Check Network for POST to `/api/search`
4. Verify:
   - MongoDB has new Search document
   - Results appear on page
   - Metadata displayed correctly

### Test Persistence
1. Search for something
2. Refresh page
3. Modal should NOT appear (name from localStorage)
4. You're logged in automatically

### Clear User Data
```javascript
// In browser console:
localStorage.clear();
// Refresh page → modal appears again
```

## ⚠️ Prerequisites

Before the search works, you need:

1. **Weaviate Index Setup**:
   ```
   - Index name: "tech-news"
   - Dimension: 1536 (OpenAI embeddings)
   - Metric: cosine
   - Namespace: "articles" (or default)
   ```

2. **Articles in Weaviate**:
   - You need articles with embeddings
   - Load HuggingFace dataset (next step)
   - Or manually add articles via `lib/workflow.ts`

3. **OpenAI API Access**:
   - Valid API key
   - Access to `text-embedding-3-small` model

## 📊 Data Flow

```
User Input → Frontend
                ↓
         /api/user (MongoDB)
                ↓
         User created/found
                ↓
       Search Interface
                ↓
         /api/search
                ↓
    MongoDB (log search)
                ↓
   OpenAI (generate embedding)
                ↓
    Weaviate (query vectors)
                ↓
    Format results → Frontend
                ↓
         Display results
```

## 🐛 Troubleshooting

### Modal doesn't appear
- Clear localStorage: `localStorage.clear()`
- Check browser console for errors
- Verify `page.tsx` is rendering

### Search returns no results
- Check Weaviate has articles
- Verify Weaviate_API_KEY is correct
- Check browser console for API errors
- Ensure OpenAI API key is valid

### API errors
- Check `.env` file is in root directory
- Restart dev server after env changes
- Check MongoDB connection string
- Verify Prisma client is generated

### Styling issues
- Ensure Tailwind CSS is configured
- Check `globals.css` is imported
- Verify `@heroicons/react` is installed

## 🔄 Next Steps

1. **Load Dataset**: 
   - Use HuggingFace `MongoDB/tech-news-embeddings`
   - Create script to load into Weaviate
   - See: `docs/DATASET_LOADING.md` (to be created)

2. **Enhance UI**:
   - Add search history
   - Filters (date, category, source)
   - Dark mode
   - Keyboard shortcuts

3. **Add Features**:
   - Bookmark articles
   - Export results to PDF
   - Share search results
   - Related articles

4. **Optimize**:
   - Add caching (Redis)
   - Pagination for results
   - Infinite scroll
   - Search suggestions

## 📝 Code Quality

All frontend components:
- ✅ TypeScript strict mode
- ✅ No linting errors
- ✅ Proper error handling
- ✅ Loading states
- ✅ Input validation
- ✅ Responsive design
- ✅ Accessibility (ARIA labels possible)

## 🎉 Ready to Use!

Your news search app is ready! Just need to:
1. Set up environment variables
2. Load some articles into Weaviate
3. Run `npm run dev`
4. Visit `/news` and start searching!
