import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, addDoc, updateDoc, increment } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import QRCodeGenerator from '../components/QRCodeGenerator';

export default function Dashboard({ user, loading }) {
  const [userData, setUserData] = useState(null);
  const [activities, setActivities] = useState([]);
  const [completedActivities, setCompletedActivities] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchUserData();
      fetchActivities();
      fetchCompletedActivities();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, router]);

  const fetchUserData = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setUserData(userDoc.data());
        
        if (userDoc.data().role === 'admin') {
          router.push('/admin');
          return;
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const fetchActivities = async () => {
    try {
      const activitiesSnapshot = await getDocs(collection(db, 'activities'));
      const activitiesList = activitiesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setActivities(activitiesList);
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  const fetchCompletedActivities = async () => {
    try {
      const q = query(
        collection(db, 'completedActivities'),
        where('userId', '==', user.uid)
      );
      const completedSnapshot = await getDocs(q);
      const completedList = completedSnapshot.docs.map(doc => doc.data().activityId);
      setCompletedActivities(completedList);
    } catch (error) {
      console.error('Error fetching completed activities:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const completeActivity = async (activity) => {
    try {
      await addDoc(collection(db, 'completedActivities'), {
        userId: user.uid,
        activityId: activity.id,
        pointsEarned: activity.points,
        completedAt: new Date()
      });

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        points: increment(activity.points)
      });

      setCompletedActivities([...completedActivities, activity.id]);
      setUserData(prev => ({ ...prev, points: prev.points + activity.points }));
      
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-4 rounded-xl shadow-lg z-50 animate-bounce';
      notification.innerHTML = `🎉 ได้รับ ${activity.points} คะแนนแล้ว!`;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 3000);
    } catch (error) {
      console.error('Error completing activity:', error);
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    }
  };

  const handleLogout = async () => {
    try {
      // Clear localStorage session
      localStorage.removeItem('currentUser');
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading || loadingData) {
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

  if (!user || !userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-center">
          <p>กำลังโหลดข้อมูลผู้ใช้...</p>
        </div>
      </div>
    );
  }

  // QR Code value - use username if available, fallback to name
  const qrValue = user && userData ? 
    `${user.uid}-${userData.username || (userData.firstName + userData.lastName) || userData.name}` : '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-10 left-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse animation-delay-2000"></div>
        <div className="absolute -bottom-20 left-1/2 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse animation-delay-4000"></div>
      </div>

      <header className="relative z-10 bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-cyan-400 to-purple-400 w-12 h-12 rounded-full flex items-center justify-center">
                <span className="text-xl font-bold text-white">FF</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">แดชบอร์ดนักเรียน</h1>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <button
                onClick={() => setShowQR(!showQR)}
                className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white px-4 py-2 rounded-xl transition-all duration-300 hover:scale-105 flex items-center space-x-2"
              >
                <span>📱</span>
                <span>QR Code ของฉัน</span>
              </button>
              <div className="text-right">
                <p className="text-white/70 text-sm">ยินดีต้อนรับ</p>
                <p className="font-bold text-white text-lg">
                  {userData.nickname || userData.firstName || userData.name}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-200 px-6 py-2 rounded-xl transition-all duration-300 hover:scale-105 backdrop-blur-sm"
              >
                ออกจากระบบ
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {showQR && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8 max-w-md w-full">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">QR Code ของฉัน</h3>
                <button
                  onClick={() => setShowQR(false)}
                  className="text-white/70 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="text-center">
                <QRCodeGenerator value={qrValue} size={200} />
                <div className="mt-6 p-4 bg-white/5 rounded-xl">
                  <p className="text-white font-semibold">
                    {userData.nickname && userData.firstName ? 
                      `${userData.nickname} (${userData.firstName} ${userData.lastName})` :
                      userData.name || `${userData.firstName} ${userData.lastName}`
                    }
                  </p>
                  <p className="text-white/70 text-sm">
                    แสดง QR Code นี้ให้ผู้ดูแลเพื่อรับคะแนนทันที!
                  </p>
                  <div className="mt-4 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-lg p-3">
                    <p className="text-white font-bold">คะแนนปัจจุบัน: {userData.points}</p>
                  </div>
                  {userData.username && (
                    <div className="mt-2 text-white/50 text-xs">
                      Username: {userData.username}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mb-10">
          <div className="bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <h2 className="text-4xl font-black mb-2">คะแนนของคุณ</h2>
                <p className="text-white/80 text-lg">เก็บคะแนน เพื่อนำไปแลกของพิเศษ! 🎯</p>
              </div>
              <div className="text-right">
                <div className="text-6xl font-black bg-white/20 rounded-2xl px-6 py-4 backdrop-blur-sm">
                  {userData.points || 0}
                </div>
                <p className="text-white/80 mt-2 text-lg">คะแนนรวม</p>
              </div>
            </div>
            
            <div className="mt-6 flex space-x-4 flex-wrap">
              {(userData.points || 0) >= 100 && (
                <div className="bg-yellow-400/20 border border-yellow-400/50 rounded-full px-4 py-2 text-yellow-200 text-sm font-medium">
                  🏆 นักเรียนดีเด่น
                </div>
              )}
              {(userData.points || 0) >= 50 && (
                <div className="bg-blue-400/20 border border-blue-400/50 rounded-full px-4 py-2 text-blue-200 text-sm font-medium">
                  🌟 ดาวรุ่ง
                </div>
              )}
              {(userData.points || 0) >= 10 && (
                <div className="bg-green-400/20 border border-green-400/50 rounded-full px-4 py-2 text-green-200 text-sm font-medium">
                  🚀 เริ่มต้นได้ดี
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center mb-8">
            <h3 className="text-3xl font-bold text-white">กิจกรรมที่เปิดให้ทำ</h3>
            <div className="ml-4 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full px-4 py-2">
              <span className="text-white font-bold">{activities.length} กิจกรรม</span>
            </div>
          </div>
          
          {activities.length === 0 ? (
            <div className="text-center py-20">
              <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-12 max-w-md mx-auto">
                <div className="text-white/40 mb-6">
                  <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h4 className="text-xl font-bold text-white mb-4">ยังไม่มีกิจกรรม</h4>
                <p className="text-white/70">กิจกรรมการเรียนรู้ใหม่ๆ กำลังจะมาเร็วๆ นี้! 🚀</p>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activities.map((activity) => {
                const isCompleted = completedActivities.includes(activity.id);
                
                return (
                  <div key={activity.id} className={`group bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-6 shadow-xl transition-all duration-300 hover:scale-105 hover:bg-white/15 ${isCompleted ? 'opacity-75' : ''}`}>
                    <div className="flex justify-between items-start mb-6">
                      <h4 className="text-xl font-bold text-white group-hover:text-cyan-300 transition-colors">
                        {activity.name}
                      </h4>
                      <div className="bg-gradient-to-r from-green-400 to-emerald-400 text-white text-sm font-bold px-3 py-1 rounded-full">
                        +{activity.points} คะแนน
                      </div>
                    </div>
                    
                    <p className="text-white/70 mb-6 leading-relaxed">{activity.description || 'ทำกิจกรรมนี้เพื่อรับคะแนน!'}</p>
                    
                    <button
                      onClick={() => completeActivity(activity)}
                      disabled={isCompleted}
                      className={`w-full py-4 px-6 rounded-xl font-bold transition-all duration-300 ${
                        isCompleted
                          ? 'bg-gray-500/20 text-gray-400 cursor-not-allowed border border-gray-500/30'
                          : 'bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white hover:scale-105 hover:shadow-xl hover:shadow-purple-500/25'
                      }`}
                    >
                      {isCompleted ? '✅ ทำเสร็จแล้ว' : '🚀 เริ่มทำกิจกรรม'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}