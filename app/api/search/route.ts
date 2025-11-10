import { NextRequest, NextResponse } from 'next/server';
import { searchSimilarArticles } from '@/lib/workflow';
import { findOrCreateUserByName, logUserSearch } from '@/lib/models';

export async function POST(request: NextRequest) {
  try {
    const { query, userName, limit = 10 } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    if (!userName || typeof userName !== 'string') {
      return NextResponse.json(
        { error: 'User name is required' },
        { status: 400 }
      );
    }

    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2) {
      return NextResponse.json(
        { error: 'Query must be at least 2 characters' },
        { status: 400 }
      );
    }

    // Find or create user
    const user = await findOrCreateUserByName(userName.trim());

    // Log the search in MongoDB
    const searchRecord = await logUserSearch(user.id, trimmedQuery);

    // Perform semantic search using Weaviate
    const searchResults = await searchSimilarArticles(trimmedQuery, {
      topK: Math.min(limit, 50), // Max 50 results
      userId: user.id,
    });

    // Format results for frontend
    const results = searchResults.map((result) => {
      const content = result.metadata?.content;
      const contentStr = typeof content === 'string' ? content : '';
      
      return {
        id: result.articleId,
        title: result.title,
        description: result.metadata?.description as string || '',
        content: contentStr.substring(0, 500), // Truncate content
        source: result.source,
        url: result.url,
        author: result.metadata?.author as string,
        category: result.metadata?.category as string,
        publishedAt: result.metadata?.publishedAt as string,
        score: result.score || 0,
      };
    });

    return NextResponse.json({
      success: true,
      query: trimmedQuery,
      searchId: searchRecord.id,
      count: results.length,
      results,
    });
  } catch (error) {
    console.error('Error in search route:', error);
    return NextResponse.json(
      { 
        error: 'Search failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
