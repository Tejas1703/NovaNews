'use client';

import { useState, useEffect, useTransition } from 'react';
import UserNameModal from './components/UserNameModal';
import SearchInterface from './components/SearchInterface';

export default function NewsPage() {
  const [userName, setUserName] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [, startTransition] = useTransition();

  // Handle client-side hydration
  useEffect(() => {
    startTransition(() => {
      setMounted(true);
      const storedName = localStorage.getItem('userName');
      if (storedName) {
        setUserName(storedName);
        setIsModalOpen(false);
      }
    });
  }, []);

  // Don't render until mounted to prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  const handleNameSubmit = async (name: string) => {
    try {
      // Store user in MongoDB
      const response = await fetch('/api/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('userName', name);
        localStorage.setItem('userId', data.userId);
        setUserName(name);
        setIsModalOpen(false);
      } else {
        console.error('Failed to create user');
      }
    } catch (error) {
      console.error('Error creating user:', error);
    }
  };

  return (
    <main>
      <UserNameModal isOpen={isModalOpen} onSubmit={handleNameSubmit} />
      {userName && <SearchInterface userName={userName} />}
    </main>
  );
}
