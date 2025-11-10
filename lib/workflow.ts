/**
 * Integrated workflow helpers for the 2-tier architecture:
 * - MongoDB (Prisma): User data, search tracking, article references
 * - Weaviate: Article metadata and embeddings
 * 
 * Use these functions in your n8n workflow or API routes
 */

import {
  createArticleReference,
  updateArticleWeaviateId,
  updateArticleStatus,
  updateSearchStatus,
  prisma,
} from './models';
import {
  storeArticleEmbedding,
  querySimilarArticles,
  deleteArticleEmbedding,
  getArticleMetadata,
} from './weaviate';
import type { ArticleMetadata } from './weaviate';

// ============================================================================
// ARTICLE WORKFLOWS
// ============================================================================

export type ArticleInput = {
  title: string;
  description?: string;
  content: string;
  source?: string;
  url?: string;
  publishedAt?: Date;
  author?: string;
  category?: string;
  tags?: string[];
  createdById?: string;
  searchQuery?: string;
};

/**
 * Complete workflow: Store article reference in MongoDB AND metadata in Weaviate
 * This is the main function to use when adding new articles
 */
export async function storeArticleWithEmbedding(articleData: ArticleInput) {
  try {
    // Step 1: Create article reference in MongoDB
    const articleRef = await createArticleReference({
      url: articleData.url,
      createdById: articleData.createdById,
    });

    // Step 2: Update status to embedding
    await updateArticleStatus(articleRef.id, 'embedding');

    // Step 3: Prepare metadata for Weaviate
    const metadata: ArticleMetadata = {
      articleId: articleRef.id,
      title: articleData.title,
      description: articleData.description || '',
      content: articleData.content,
      source: articleData.source || '',
      url: articleData.url || '',
      publishedAt: articleData.publishedAt?.toISOString(),
      author: articleData.author,
      category: articleData.category,
      tags: articleData.tags,
      userId: articleData.createdById,
      searchQuery: articleData.searchQuery,
      createdAt: new Date().toISOString(),
    };

    // Step 4: Store in Weaviate (metadata + embedding)
    const weaviateId = await storeArticleEmbedding(
      articleRef.id,
      metadata
    );

    // Step 5: Update MongoDB with Weaviate ID
    await updateArticleWeaviateId(
      articleRef.id,
      weaviateId
    );

    return {
      success: true,
      articleId: articleRef.id,
      weaviateId: weaviateId,
      embeddingModel: 'text-embedding-3-small',
      metadata,
    };
  } catch (error) {
    console.error('Error in storeArticleWithEmbedding:', error);
    throw error;
  }
}

/**
 * Batch process multiple articles (for n8n loop)
 */
export async function batchStoreArticlesWithEmbeddings(
  articles: ArticleInput[],
  searchId?: string
) {
  const results = {
    success: [] as string[],
    failed: [] as { url?: string; error: string }[],
  };

  for (const articleData of articles) {
    try {
      const result = await storeArticleWithEmbedding(articleData);
      results.success.push(result.articleId);
    } catch (error) {
      results.failed.push({
        url: articleData.url,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Update search status
  if (searchId) {
    await updateSearchStatus(searchId, 'completed', results.success.length);
  }

  return {
    totalProcessed: articles.length,
    successCount: results.success.length,
    failedCount: results.failed.length,
    results,
  };
}

/**
 * Search for similar articles (semantic search)
 * Returns Weaviate matches with full metadata
 */
export async function searchSimilarArticles(
  query: string,
  options: {
    topK?: number;
    userId?: string;
    source?: string;
    category?: string;
  } = {}
) {
  try {
    // Build metadata filter
    const filter: Record<string, string | Record<string, string>> = {};
    
    if (options.userId) {
      filter.userId = { $eq: options.userId } as unknown as string;
    }
    if (options.source) {
      filter.source = { $eq: options.source } as unknown as string;
    }
    if (options.category) {
      filter.category = { $eq: options.category } as unknown as string;
    }

    // Query Weaviate for similar vectors
    const results = await querySimilarArticles(
      query,
      options.topK || 10,
      'articles',
      Object.keys(filter).length > 0 ? filter : undefined
    );

    return results;
  } catch (error) {
    console.error('Error in searchSimilarArticles:', error);
    throw error;
  }
}

/**
 * Get full article details from Weaviate by article ID
 */
export async function getArticleDetails(articleId: string) {
  try {
    // Get MongoDB reference
    const articleRef = await prisma.article.findUnique({
      where: { id: articleId },
      include: { createdBy: true },
    });

    if (!articleRef || !articleRef.weaviateId) {
      throw new Error('Article not found or not embedded');
    }

    // Get metadata from Weaviate
    const metadata = await getArticleMetadata(articleRef.weaviateId);

    return {
      ...articleRef,
      metadata,
    };
  } catch (error) {
    console.error('Error in getArticleDetails:', error);
    throw error;
  }
}

/**
 * Delete article from both MongoDB and Weaviate
 */
export async function deleteArticleCompletely(articleId: string) {
  try {
    // Get article ref to find Weaviate ID
    const articleRef = await prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!articleRef) {
      throw new Error(`Article ${articleId} not found`);
    }

    // Delete from Weaviate if exists
    if (articleRef.weaviateId) {
      await deleteArticleEmbedding(articleId);
    }

    // Delete from MongoDB
    await prisma.article.delete({
      where: { id: articleId },
    });

    return { success: true, deletedId: articleId };
  } catch (error) {
    console.error('Error in deleteArticleCompletely:', error);
    throw error;
  }
}

// ============================================================================
// USER WORKFLOWS
// ============================================================================

/**
 * Get user's search history with article counts
 */
export async function getUserSearchHistory(userId: string, limit: number = 10) {
  const searches = await prisma.search.findMany({
    where: {
      userId,
      workflowStatus: 'completed',
      isFeasible: true,
    },
    take: limit,
    orderBy: { createdAt: 'desc' },
  });

  return searches;
}
