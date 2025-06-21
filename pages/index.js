import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Home({ user, loading }) {
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
      <div className="relative">
        <div className="animate-spin rounded-full h-32 w-32 border-4 border-transparent border-t-cyan-400 border-r-purple-400"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="animate-pulse bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full h-16 w-16"></div>
        </div>
      </div>
    </div>
  );
}