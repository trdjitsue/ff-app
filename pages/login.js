import { useState } from 'react';
import { useRouter } from 'next/router';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import Link from 'next/link';

export default function Login({ user }) {
  const [isLogin, setIsLogin] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  if (user) {
    router.push('/dashboard');
    return null;
  }

  // สร้าง fake email จากชื่อ
  const generateEmailFromName = (firstName, lastName) => {
    const cleanFirst = firstName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanLast = lastName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const randomNum = Math.floor(Math.random() * 10000);
    return `${cleanFirst}${cleanLast}${randomNum}@ff-app.local`;
  };

  // หาผู้ใช้จากชื่อ-นามสกุล
  const findUserByName = async (firstName, lastName) => {
    const q = query(
      collection(db, 'users'),
      where('firstName', '==', firstName.trim()),
      where('lastName', '==', lastName.trim())
    );
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      return { id: userDoc.id, ...userDoc.data() };
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        // Login Logic
        if (!firstName.trim() || !lastName.trim()) {
          setError('กรุณากรอกชื่อและนามสกุล');
          return;
        }

        // หาผู้ใช้จากชื่อ-นามสกุล
        const existingUser = await findUserByName(firstName, lastName);
        
        if (!existingUser) {
          setError('ไม่พบผู้ใช้ในระบบ');
          return;
        }

        // ใช้ email ที่เก็บไว้ใน Firestore
        const userCredential = await signInWithEmailAndPassword(auth, existingUser.email, password);
        
        router.push('/dashboard');
        
      } else {
        // Register Logic
        if (!firstName.trim() || !lastName.trim() || !nickname.trim()) {
          setError('กรุณากรอกข้อมูลให้ครบถ้วน');
          return;
        }

        if (password.length < 6) {
          setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
          return;
        }

        // ตรวจสอบว่ามีผู้ใช้ชื่อนี้แล้วหรือยัง
        const existingUser = await findUserByName(firstName, lastName);
        
        if (existingUser) {
          setError('มีผู้ใช้ชื่อนี้ในระบบแล้ว');
          return;
        }

        // สร้าง fake email
        const fakeEmail = generateEmailFromName(firstName, lastName);
        
        // สร้างบัญชีด้วย Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, fakeEmail, password);
        
        // เก็บข้อมูลใน Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email: fakeEmail, // เก็บไว้สำหรับ login
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          nickname: nickname.trim(),
          name: `${firstName.trim()} ${lastName.trim()}`, // backward compatibility
          points: 0,
          role: 'student',
          createdAt: new Date()
        });
        
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Auth error:', error);
      if (error.code === 'auth/user-not-found') {
        setError('ไม่พบผู้ใช้นี้ในระบบ');
      } else if (error.code === 'auth/wrong-password') {
        setError('รหัสผ่านไม่ถูกต้อง');
      } else if (error.code === 'auth/email-already-in-use') {
        setError('ชื่อนี้ถูกใช้งานแล้ว');
      } else if (error.code === 'auth/weak-password') {
        setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      } else {
        setError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-20 left-1/2 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-10">
            <Link href="/" className="inline-block mb-6">
              <div className="relative">
                <div className="absolute -inset-2 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full blur opacity-75 animate-pulse"></div>
                <div className="relative bg-gradient-to-r from-cyan-400 to-purple-400 w-16 h-16 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">FF</span>
                </div>
              </div>
            </Link>
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-2">
              ยินดีต้อนรับ ไอหล่อ
            </h1>
          </div>

          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl p-8">
            <div className="flex mb-8 bg-white/5 rounded-2xl p-1">
              <button
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-3 px-4 text-center font-medium rounded-xl transition-all duration-300 ${
                  isLogin 
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg' 
                    : 'text-white/70 hover:text-white'
                }`}
              >
                เข้าสู่ระบบ
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-3 px-4 text-center font-medium rounded-xl transition-all duration-300 ${
                  !isLogin 
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg' 
                    : 'text-white/70 hover:text-white'
                }`}
              >
                สมัครสมาชิก
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="group">
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    ชื่อจริง ✨
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
                    placeholder="ชื่อ"
                    required
                  />
                </div>

                <div className="group">
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    นามสกุล ✨
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
                    placeholder="นามสกุล"
                    required
                  />
                </div>
              </div>

              {!isLogin && (
                <div className="group">
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    ชื่อเล่น 🎭
                  </label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
                    placeholder="ชื่อเล่นของคุณ"
                    required={!isLogin}
                  />
                </div>
              )}

              <div className="group">
                <label className="block text-sm font-medium text-white/90 mb-2">
                  รหัสผ่าน 🔒
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
                  placeholder="กรอกรหัสผ่านของคุณ"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl backdrop-blur-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/25 disabled:hover:scale-100"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                    กำลังดำเนินการ...
                  </div>
                ) : (
                  isLogin ? '🚀 เข้าสู่ระบบ' : '✨ สมัครสมาชิก'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}