import Head from 'next/head';
import '../styles/globals.css';
import dynamic from 'next/dynamic';

// สร้าง ClientOnlyApp ที่จะทำงานเฉพาะฝั่ง client
const ClientOnlyApp = ({ Component, pageProps }) => {
  const { useEffect, useState } = require('react');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe;
    
    const initFirebase = async () => {
      try {
        const { auth } = await import('../lib/firebase');
        const { onAuthStateChanged } = await import('firebase/auth');
        
        unsubscribe = onAuthStateChanged(auth, (user) => {
          setUser(user);
          setLoading(false);
        });
      } catch (error) {
        console.error('Firebase error:', error);
        setLoading(false);
      }
    };

    initFirebase();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return <Component {...pageProps} user={user} loading={loading} />;
};

// ใช้ dynamic import เพื่อปิด SSR อย่างสมบูรณ์
const DynamicClientOnlyApp = dynamic(() => Promise.resolve(ClientOnlyApp), {
  ssr: false,
  loading: () => (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div>Loading...</div>
    </div>
  )
});

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <script src="https://cdn.tailwindcss.com"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              tailwind.config = {
                theme: {
                  extend: {
                    animation: {
                      'float': 'float 3s ease-in-out infinite',
                    },
                    keyframes: {
                      float: {
                        '0%, 100%': { transform: 'translateY(0px)' },
                        '50%': { transform: 'translateY(-20px)' },
                      }
                    }
                  }
                }
              }
            `,
          }}
        />
      </Head>
      <DynamicClientOnlyApp Component={Component} pageProps={pageProps} />
    </>
  );
}