# NovaNews - Semantic News Search

## Overview
The `/news` page provides an AI-powered semantic search interface for technology news articles. It features a Google/ChatGPT-style search experience with user management.

## Features

### 1. **User Name Modal**
- On first visit, users are prompted to enter their name
- Name is stored in MongoDB and localStorage for persistence
- Modal has validation (minimum 2 characters)
- Smooth animations and backdrop blur

### 2. **Search Interface**
- Clean, minimal design similar to Google Search
- Real-time semantic search using Weaviate vector database
- Results include:
  - Article title (clickable link)
  - Description/excerpt
  - Source, author, category
  - Publication date
  - Relevance score

### 3. **Responsive Design**
- Mobile-friendly layout
- Sticky header with NovaNews branding
- Smooth transitions and hover effects
- Loading states with spinner

## Components

### `/app/news/page.tsx`
Main page component that:
- Manages user authentication state
- Handles localStorage persistence
- Renders modal and search interface
- Uses `useTransition` for smooth state updates

### `/app/news/components/UserNameModal.tsx`
Modal component that:
- Captures user name input
- Validates input (min 2 chars, not empty)
- Prevents background scrolling when open
- Sends user data to API
- Stores name in localStorage

### `/app/news/components/SearchInterface.tsx`
Search interface component that:
- Displays NovaNews header with user greeting
- Handles search form submission
- Calls `/api/search` endpoint
- Renders search results with metadata
- Shows loading/error states
- Formats dates and relevance scores
- Provides direct links to articles

## API Routes

### `POST /api/user`
Creates or finds a user in MongoDB.

**Request:**
```json
{
  "name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "userId": "507f1f77bcf86cd799439011",
  "userName": "John Doe",
  "isNewUser": true
}
```

### `POST /api/search`
Performs semantic search across articles.

**Request:**
```json
{
  "query": "artificial intelligence",
  "userName": "John Doe",
  "limit": 10
}
```

**Response:**
```json
{
  "success": true,
  "query": "artificial intelligence",
  "searchId": "507f1f77bcf86cd799439012",
  "count": 10,
  "results": [
    {
      "id": "article-123",
      "title": "AI Breakthrough in 2025",
      "description": "A new AI model...",
      "content": "Full article content...",
      "source": "TechCrunch",
      "url": "https://...",
      "author": "Jane Smith",
      "category": "AI",
      "publishedAt": "2025-11-10T00:00:00Z",
      "score": 0.95
    }
  ]
}
```

## Styling

### Global Styles (`/app/globals.css`)
Custom animations and utilities:
- `.animate-fade-in` - Smooth fade-in animation
- `.line-clamp-2` / `.line-clamp-3` - Text truncation
- Responsive typography
- Tailwind CSS integration

### Color Scheme
- Primary: Blue (`#2563EB`)
- Background: White/Gray gradient
- Text: Gray scale for hierarchy
- Accents: Blue for links and CTAs

## User Flow

1. **First Visit:**
   - User sees modal asking for name
   - Enters name and clicks "Continue"
   - Name sent to `/api/user`, stored in MongoDB
   - Name saved to localStorage
   - Modal closes, search interface appears

2. **Returning Visit:**
   - Page loads, checks localStorage for name
   - If found, skips modal and shows search
   - User sees personalized greeting

3. **Search:**
   - User types query and submits
   - Loading spinner shown
   - `/api/search` called with query and userName
   - Search logged in MongoDB
   - Semantic search performed via Weaviate
   - Results displayed with metadata
   - Each result links to original article

## Technologies Used

- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Heroicons** - UI icons
- **MongoDB (Prisma)** - User & search tracking
- **Weaviate** - Vector search
- **OpenAI Embeddings** - Semantic search

## Environment Variables Required

```env
# MongoDB
DATABASE_URL="mongodb+srv://..."

# Weaviate
Weaviate_API_KEY="pc-..."
Weaviate_ENVIRONMENT="us-east-1"
Weaviate_INDEX_NAME="tech-news"

# OpenAI (for embeddings)
OPENAI_API_KEY="sk-..."
```

## Future Enhancements

- [ ] Search history display
- [ ] Bookmarking articles
- [ ] Advanced filters (date range, source, category)
- [ ] Export search results to PDF
- [ ] User profile management
- [ ] Dark mode toggle
- [ ] Search suggestions/autocomplete
- [ ] Related articles recommendations

## Notes

- User names are case-sensitive
- Search queries generate embeddings via OpenAI
- Results are ranked by semantic similarity score
- Maximum 50 results per search (configurable)
- Articles open in new tab when clicked
