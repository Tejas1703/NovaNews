/**
 * Weaviate Vector Database Operations
 * 
 * This module handles all interactions with Weaviate for semantic search.
 * Weaviate is an open-source vector database that can be self-hosted on AWS.
 * 
 * Architecture:
 * - MongoDB: Stores user data, search logs, and article references (id, url, weaviateId)
 * - Weaviate: Stores article embeddings + full metadata (title, content, source, etc.)
 */

import weaviate, { WeaviateClient, ApiKey } from 'weaviate-ts-client';

// Article metadata structure stored in Weaviate
export type ArticleMetadata = {
  articleId: string;
  title: string;
  description: string;
  content: string;
  source: string;
  url: string;
  author?: string;
  category?: string;
  tags?: string[];
  publishedAt?: string;
  userId?: string;
  searchQuery?: string;
  createdAt: string;
};

// Weaviate client singleton
let client: WeaviateClient | null = null;

/**
 * Initialize Weaviate client
 */
function getWeaviateClient(): WeaviateClient {
  if (client) {
    return client;
  }

  const scheme = process.env.WEAVIATE_SCHEME || 'http';
  const host = process.env.WEAVIATE_HOST || 'localhost:8080';
  const apiKey = process.env.WEAVIATE_API_KEY;

  if (apiKey) {
    client = weaviate.client({
      scheme: scheme as 'http' | 'https',
      host: host,
      apiKey: new ApiKey(apiKey),
    });
  } else {
    // For local development without API key
    client = weaviate.client({
      scheme: scheme as 'http' | 'https',
      host: host,
    });
  }

  return client;
}

/**
 * Initialize Weaviate schema (class definition)
 * Call this once during setup to create the Article class
 */
export async function initializeWeaviateSchema() {
  const client = getWeaviateClient();

  try {
    // Check if Article class already exists
    const schema = await client.schema.getter().do();
    const articleClass = schema.classes?.find((c) => c.class === 'Article');

    if (articleClass) {
      console.log('Article class already exists in Weaviate');
      return;
    }

    // Create Article class
    const classObj = {
      class: 'Article',
      description: 'News articles with semantic search capabilities',
      vectorizer: 'none', // We'll provide our own vectors from OpenAI
      moduleConfig: {
        'generative-openai': {
          model: 'gpt-3.5-turbo',
        },
      },
      properties: [
        {
          name: 'articleId',
          dataType: ['text'],
          description: 'MongoDB article ID',
        },
        {
          name: 'title',
          dataType: ['text'],
          description: 'Article title',
        },
        {
          name: 'description',
          dataType: ['text'],
          description: 'Article summary or description',
        },
        {
          name: 'content',
          dataType: ['text'],
          description: 'Full article content',
        },
        {
          name: 'source',
          dataType: ['text'],
          description: 'Article source (e.g., TechCrunch)',
        },
        {
          name: 'url',
          dataType: ['text'],
          description: 'Article URL',
        },
        {
          name: 'author',
          dataType: ['text'],
          description: 'Article author',
        },
        {
          name: 'category',
          dataType: ['text'],
          description: 'Article category',
        },
        {
          name: 'tags',
          dataType: ['text[]'],
          description: 'Article tags',
        },
        {
          name: 'publishedAt',
          dataType: ['text'],
          description: 'Publication date (ISO string)',
        },
        {
          name: 'userId',
          dataType: ['text'],
          description: 'User who added this article',
        },
        {
          name: 'searchQuery',
          dataType: ['text'],
          description: 'Search query that found this article',
        },
        {
          name: 'createdAt',
          dataType: ['text'],
          description: 'Timestamp when added to Weaviate',
        },
      ],
    };

    await client.schema.classCreator().withClass(classObj).do();
    console.log('Article class created in Weaviate successfully');
  } catch (error) {
    console.error('Error initializing Weaviate schema:', error);
    throw error;
  }
}

/**
 * Generate embedding using OpenAI
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
      encoding_format: 'float',
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Store article with embedding in Weaviate
 */
export async function storeArticleEmbedding(
  articleId: string,
  metadata: ArticleMetadata
): Promise<string> {
  const client = getWeaviateClient();

  try {
    // Generate embedding from title + description + content
    const textToEmbed = `${metadata.title} ${metadata.description} ${metadata.content}`;
    const vector = await generateEmbedding(textToEmbed);

    // Store in Weaviate
    const result = await client.data
      .creator()
      .withClassName('Article')
      .withProperties({
        articleId: metadata.articleId,
        title: metadata.title,
        description: metadata.description,
        content: metadata.content,
        source: metadata.source,
        url: metadata.url,
        author: metadata.author || '',
        category: metadata.category || '',
        tags: metadata.tags || [],
        publishedAt: metadata.publishedAt || '',
        userId: metadata.userId || '',
        searchQuery: metadata.searchQuery || '',
        createdAt: metadata.createdAt,
      })
      .withVector(vector)
      .do();

    return result.id || ''; // Return empty string if id is undefined
  } catch (error) {
    console.error('Error storing article in Weaviate:', error);
    throw error;
  }
}

/**
 * Query similar articles using semantic search
 */
export async function querySimilarArticles(
  query: string,
  limit: number = 10,
  namespace?: string,
  filter?: Record<string, unknown>
): Promise<
  Array<{
    articleId: string;
    title: string;
    source: string;
    url: string;
    score: number;
    metadata?: ArticleMetadata;
  }>
> {
  const client = getWeaviateClient();

  try {
    // Generate embedding for query
    const vector = await generateEmbedding(query);

    // Build Weaviate query
    let queryBuilder = client.graphql
      .get()
      .withClassName('Article')
      .withFields(
        'articleId title description content source url author category tags publishedAt userId searchQuery createdAt _additional { distance }'
      )
      .withNearVector({
        vector: vector,
      })
      .withLimit(limit);

    // Add filters if provided
    if (filter) {
      const operands: {
        path: string[];
        operator: string;
        valueText: string;
      }[] = [];

      for (const [key, value] of Object.entries(filter)) {
        if (value && typeof value === 'object' && '$eq' in value) {
          operands.push({
            path: [key],
            operator: 'Equal',
            valueText: (value as { $eq: string }).$eq,
          });
        }
      }

      if (operands.length > 0) {
        queryBuilder = queryBuilder.withWhere({
          operator: 'And',
          operands: operands as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        });
      }
    }

    const result = await queryBuilder.do();

    if (!result.data?.Get?.Article) {
      return [];
    }

    // Format results
    return result.data.Get.Article.map((item: { 
      articleId: string;
      title: string;
      description: string;
      content: string;
      source: string;
      url: string;
      author?: string;
      category?: string;
      tags?: string[];
      publishedAt?: string;
      userId?: string;
      searchQuery?: string;
      createdAt: string;
      _additional: { distance: number };
    }) => ({
      articleId: item.articleId,
      title: item.title,
      source: item.source,
      url: item.url,
      score: 1 - item._additional.distance, // Convert distance to similarity score
      metadata: {
        articleId: item.articleId,
        title: item.title,
        description: item.description,
        content: item.content,
        source: item.source,
        url: item.url,
        author: item.author,
        category: item.category,
        tags: item.tags,
        publishedAt: item.publishedAt,
        userId: item.userId,
        searchQuery: item.searchQuery,
        createdAt: item.createdAt,
      },
    }));
  } catch (error) {
    console.error('Error querying Weaviate:', error);
    throw error;
  }
}

/**
 * Get article metadata by MongoDB article ID
 */
export async function getArticleMetadata(articleId: string): Promise<ArticleMetadata | null> {
  const client = getWeaviateClient();

  try {
    const result = await client.graphql
      .get()
      .withClassName('Article')
      .withFields(
        'articleId title description content source url author category tags publishedAt userId searchQuery createdAt'
      )
      .withWhere({
        path: ['articleId'],
        operator: 'Equal',
        valueText: articleId,
      })
      .withLimit(1)
      .do();

    if (!result.data?.Get?.Article || result.data.Get.Article.length === 0) {
      return null;
    }

    const item = result.data.Get.Article[0];
    return {
      articleId: item.articleId,
      title: item.title,
      description: item.description,
      content: item.content,
      source: item.source,
      url: item.url,
      author: item.author,
      category: item.category,
      tags: item.tags,
      publishedAt: item.publishedAt,
      userId: item.userId,
      searchQuery: item.searchQuery,
      createdAt: item.createdAt,
    };
  } catch (error) {
    console.error('Error getting article metadata from Weaviate:', error);
    throw error;
  }
}

/**
 * Update article metadata in Weaviate
 */
export async function updateArticleMetadata(
  articleId: string,
  updates: Partial<ArticleMetadata>
): Promise<void> {
  const client = getWeaviateClient();

  try {
    // First, find the Weaviate UUID for this article
    const result = await client.graphql
      .get()
      .withClassName('Article')
      .withFields('_additional { id }')
      .withWhere({
        path: ['articleId'],
        operator: 'Equal',
        valueText: articleId,
      })
      .withLimit(1)
      .do();

    if (!result.data?.Get?.Article || result.data.Get.Article.length === 0) {
      throw new Error(`Article ${articleId} not found in Weaviate`);
    }

    const weaviateId = result.data.Get.Article[0]._additional.id;

    // Update the object
    const updateObj: Record<string, unknown> = {};
    if (updates.title) updateObj.title = updates.title;
    if (updates.description) updateObj.description = updates.description;
    if (updates.content) updateObj.content = updates.content;
    if (updates.source) updateObj.source = updates.source;
    if (updates.url) updateObj.url = updates.url;
    if (updates.author) updateObj.author = updates.author;
    if (updates.category) updateObj.category = updates.category;
    if (updates.tags) updateObj.tags = updates.tags;
    if (updates.publishedAt) updateObj.publishedAt = updates.publishedAt;

    await client.data
      .updater()
      .withClassName('Article')
      .withId(weaviateId)
      .withProperties(updateObj)
      .do();

    // If content changed, regenerate vector
    if (updates.title || updates.description || updates.content) {
      const currentMetadata = await getArticleMetadata(articleId);
      if (currentMetadata) {
        const textToEmbed = `${currentMetadata.title} ${currentMetadata.description} ${currentMetadata.content}`;
        const vector = await generateEmbedding(textToEmbed);

        await client.data
          .updater()
          .withClassName('Article')
          .withId(weaviateId)
          .withVector(vector)
          .do();
      }
    }
  } catch (error) {
    console.error('Error updating article in Weaviate:', error);
    throw error;
  }
}

/**
 * Delete article from Weaviate
 */
export async function deleteArticleEmbedding(articleId: string): Promise<void> {
  const client = getWeaviateClient();

  try {
    // Find the Weaviate UUID
    const result = await client.graphql
      .get()
      .withClassName('Article')
      .withFields('_additional { id }')
      .withWhere({
        path: ['articleId'],
        operator: 'Equal',
        valueText: articleId,
      })
      .withLimit(1)
      .do();

    if (!result.data?.Get?.Article || result.data.Get.Article.length === 0) {
      console.log(`Article ${articleId} not found in Weaviate`);
      return;
    }

    const weaviateId = result.data.Get.Article[0]._additional.id;

    await client.data.deleter().withClassName('Article').withId(weaviateId).do();
  } catch (error) {
    console.error('Error deleting article from Weaviate:', error);
    throw error;
  }
}

/**
 * Get Weaviate cluster statistics
 */
export async function getClusterStats() {
  const client = getWeaviateClient();

  try {
    const result = await client.graphql
      .aggregate()
      .withClassName('Article')
      .withFields('meta { count }')
      .do();

    return {
      totalArticles: result.data?.Aggregate?.Article?.[0]?.meta?.count || 0,
    };
  } catch (error) {
    console.error('Error getting Weaviate stats:', error);
    throw error;
  }
}

/**
 * Batch delete articles by filter
 */
export async function batchDeleteArticles(filter: {
  userId?: string;
  source?: string;
  category?: string;
}): Promise<number> {
  const client = getWeaviateClient();

  try {
    const operands: {
      path: string[];
      operator: string;
      valueText: string;
    }[] = [];

    if (filter.userId) {
      operands.push({
        path: ['userId'],
        operator: 'Equal',
        valueText: filter.userId,
      });
    }
    if (filter.source) {
      operands.push({
        path: ['source'],
        operator: 'Equal',
        valueText: filter.source,
      });
    }
    if (filter.category) {
      operands.push({
        path: ['category'],
        operator: 'Equal',
        valueText: filter.category,
      });
    }

    if (operands.length === 0) {
      throw new Error('At least one filter must be provided for batch delete');
    }

    const result = await client.batch
      .objectsBatchDeleter()
      .withClassName('Article')
      .withWhere({
        operator: 'And',
        operands: operands as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      })
      .do();

    return result.results?.successful || 0;
  } catch (error) {
    console.error('Error batch deleting from Weaviate:', error);
    throw error;
  }
}
