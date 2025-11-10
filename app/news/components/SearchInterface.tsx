'use client';

import { useState } from 'react';
import { MagnifyingGlassIcon, SparklesIcon } from '@heroicons/react/24/outline';

interface SearchResult {
  id: string;
  title: string;
  description: string;
  content: string;
  source: string;
  url: string;
  author?: string;
  category?: string;
  publishedAt?: string;
  score: number;
}

interface SearchInterfaceProps {
  userName: string;
}

export default function SearchInterface({ userName }: SearchInterfaceProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) {
      setError('Please enter a search query');
      return;
    }

    setIsLoading(true);
    setError('');
    setHasSearched(true);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          userName,
          limit: 10,
        }),
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      setError('Failed to search. Please try again.');
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SparklesIcon className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">NovaNews</h1>
          </div>
          <div className="text-sm text-gray-600">
            Welcome, <span className="font-semibold">{userName}</span>
          </div>
        </div>
      </header>

      {/* Search Section */}
      <div className={`transition-all duration-500 ${hasSearched ? 'py-8' : 'py-32'}`}>
        <div className="max-w-3xl mx-auto px-4">
          {!hasSearched && (
            <div className="text-center mb-12 animate-fade-in">
              <h2 className="text-5xl font-bold text-gray-900 mb-4">
                Discover Tech News
              </h2>
              <p className="text-xl text-gray-600">
                AI-powered semantic search for technology articles
              </p>
            </div>
          )}

          <form onSubmit={handleSearch} className="relative">
            <div className="relative flex items-center">
              <MagnifyingGlassIcon className="absolute left-4 w-6 h-6 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setError('');
                }}
                placeholder="Search for technology news..."
                className="w-full pl-14 pr-4 py-4 text-lg border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-lg hover:shadow-xl transition-all"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="absolute right-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-6 rounded-full transition-colors duration-200"
              >
                {isLoading ? 'Searching...' : 'Search'}
              </button>
            </div>
            {error && (
              <p className="text-red-500 text-sm mt-2 ml-4">{error}</p>
            )}
          </form>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Results Section */}
      {!isLoading && hasSearched && (
        <div className="max-w-4xl mx-auto px-4 pb-12">
          {results.length > 0 ? (
            <>
              <div className="mb-6 text-gray-600">
                Found {results.length} result{results.length !== 1 ? 's' : ''}
              </div>
              <div className="space-y-6">
                {results.map((result) => (
                  <div
                    key={result.id}
                    className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-200 p-6 border border-gray-200"
                  >
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group"
                    >
                      <h3 className="text-xl font-semibold text-blue-600 group-hover:text-blue-800 mb-2 line-clamp-2">
                        {result.title}
                      </h3>
                    </a>
                    
                    <div className="flex items-center gap-3 text-sm text-gray-600 mb-3">
                      {result.source && (
                        <span className="font-medium">{result.source}</span>
                      )}
                      {result.author && (
                        <>
                          <span>•</span>
                          <span>by {result.author}</span>
                        </>
                      )}
                      {result.publishedAt && (
                        <>
                          <span>•</span>
                          <span>{formatDate(result.publishedAt)}</span>
                        </>
                      )}
                      {result.category && (
                        <>
                          <span>•</span>
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                            {result.category}
                          </span>
                        </>
                      )}
                    </div>

                    <p className="text-gray-700 mb-3 line-clamp-3">
                      {result.description || result.content}
                    </p>

                    <div className="flex items-center justify-between text-sm">
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        Read full article →
                      </a>
                      <span className="text-gray-500">
                        Relevance: {Math.round(result.score * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">
                No results found. Try a different search query.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
