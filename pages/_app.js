import Head from 'next/head';
import '../styles/globals.css';
// ... existing code

export default function App({ Component, pageProps }) {
  // ... existing code
  
  return (
    <>
      <Head>
        <script src="https://cdn.tailwindcss.com"></script>
      </Head>
      <Component {...pageProps} user={user} loading={loading} />
    </>
  );
}