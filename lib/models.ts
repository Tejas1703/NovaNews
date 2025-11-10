import { PrismaClient, Prisma } from '@prisma/client';

// Single Prisma client instance
export const prisma = new PrismaClient();

// ============================================================================
// USER OPERATIONS
// ============================================================================

// Find a user by name or create if not found.
export async function findOrCreateUserByName(name: string) {
  if (!name || !name.trim()) throw new Error('name is required');
  const trimmed = name.trim();

  // findFirst is used because `name` is not unique in the schema
  let user = await prisma.user.findFirst({ where: { name: trimmed } });
  if (!user) {
    user = await prisma.user.create({ data: { name: trimmed } });
  }
  return user;
}

// ============================================================================
// SEARCH OPERATIONS
// ============================================================================

// Log a search performed by a user (stores what user is searching)
export async function logUserSearch(userId: string, query: string) {
  if (!userId) throw new Error('userId is required');
  if (!query || !query.trim()) throw new Error('query is required');

  return prisma.search.create({
    data: {
      query: query.trim(),
      workflowStatus: 'pending',
      user: {
        connect: { id: userId },
      },
    },
  });
}

// Update search with feasibility check results
export async function updateSearchFeasibility(
  searchId: string,
  isFeasible: boolean,
  reason?: string
) {
  return prisma.search.update({
    where: { id: searchId },
    data: {
      isFeasible,
      feasibilityReason: reason,
      feasibilityCheckedAt: new Date(),
      workflowStatus: isFeasible ? 'fetching_articles' : 'failed',
    },
  });
}

// Update search workflow status
export async function updateSearchStatus(
  searchId: string,
  status: string,
  articlesFound?: number
) {
  const updateData: Prisma.SearchUpdateInput = {
    workflowStatus: status,
  };

  if (articlesFound !== undefined) {
    updateData.articlesFound = articlesFound;
    updateData.articlesProcessedAt = new Date();
  }

  if (status === 'completed') {
    updateData.completedAt = new Date();
  }

  return prisma.search.update({
    where: { id: searchId },
    data: updateData,
  });
}

// Get pending searches (for feasibility check)
export async function getPendingSearches(limit: number = 10) {
  return prisma.search.findMany({
    where: { workflowStatus: 'pending' },
    take: limit,
    orderBy: { createdAt: 'asc' },
    include: { user: true },
  });
}

// Get search history for a user
export async function getUserSearchHistory(userId: string, limit: number = 20) {
  return prisma.search.findMany({
    where: { userId },
    take: limit,
    orderBy: { createdAt: 'desc' },
  });
}

// ============================================================================
// ARTICLE OPERATIONS (MongoDB stores ONLY references, metadata in Weaviate)
// ============================================================================

export type ArticleReference = {
  url?: string | null;
  weaviateId?: string | null;
  createdById?: string | null;
};

// Create article reference in MongoDB (actual metadata stored in Weaviate)
export async function createArticleReference(data: ArticleReference) {
  const payload: Prisma.ArticleCreateInput = {
    url: data.url ?? null,
    weaviateId: data.weaviateId ?? null,
    processingStatus: 'pending',
    isEmbedded: false,
  } as Prisma.ArticleCreateInput;

  if (data.createdById) {
    (payload as Prisma.ArticleCreateInput & { createdBy: { connect: { id: string } } }).createdBy = {
      connect: { id: data.createdById },
    };
  }

  // If URL exists, check for duplicates
  if (data.url) {
    const existing = await prisma.article.findUnique({
      where: { url: data.url },
    });
    if (existing) return existing;
  }

  return prisma.article.create({ data: payload });
}

// Update article with Weaviate ID after embedding
export async function updateArticleWeaviateId(
  articleId: string,
  weaviateId: string
) {
  return prisma.article.update({
    where: { id: articleId },
    data: {
      weaviateId,
      isEmbedded: true,
      embeddedAt: new Date(),
      processingStatus: 'completed',
    },
  });
}

// Update article processing status
export async function updateArticleStatus(articleId: string, status: string) {
  return prisma.article.update({
    where: { id: articleId },
    data: {
      processingStatus: status,
    },
  });
}

// Get articles that need embedding
export async function getArticlesForEmbedding(limit: number = 10) {
  return prisma.article.findMany({
    where: {
      processingStatus: 'pending',
      isEmbedded: false,
    },
    take: limit,
    orderBy: { createdAt: 'asc' },
  });
}

// Get article by Weaviate ID
export async function getArticleByWeaviateId(weaviateId: string) {
  return prisma.article.findFirst({
    where: { weaviateId },
    include: { createdBy: true },
  });
}

// ============================================================================
// UTILITY
// ============================================================================

// Optional: a helper to safely disconnect the Prisma client (useful in serverless environments)
export async function disconnectPrisma() {
  await prisma.$disconnect();
}
