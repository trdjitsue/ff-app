import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { 
  collection, 
  getDocs, 
  getDoc,
  updateDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  increment 
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Dashboard({ user, loading }) {
  const router = useRouter();
  
  // Basic States
  const [userData, setUserData] = useState(null);
  const [activities, setActivities] = useState([]);
  const [showQR, setShowQR] = useState(false);
  
  // Camp Mentor States
  const [isCampMentor, setIsCampMentor] = useState(false);
  const [campData, setCampData] = useState(null);
  const [campKids, setCampKids] = useState([]);
  const [activeTab, setActiveTab] = useState('activities'); // For mentors: activities or camp

  // Fetch activities
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

  // Check if user is camp mentor and fetch camp data
  const checkCampMentorStatus = async () => {
    if (!userData || !userData.camp_mentor || !userData.camp_id) {
      setIsCampMentor(false);
      return;
    }

    try {
      // Fetch camp data
      const campDoc = await getDoc(doc(db, 'camps', userData.camp_id));
      if (campDoc.exists()) {
        setCampData({ id: campDoc.id, ...campDoc.data() });
        setIsCampMentor(true);
        await fetchCampKids(userData.camp_id);
      }
    } catch (error) {
      console.error('Error fetching camp data:', error);
    }
  };

  // Fetch camp kids for mentors
  const fetchCampKids = async (campId) => {
    try {
      const q = query(
        collection(db, 'camp_kids'), 
        where('campId', '==', campId),
        orderBy('points', 'desc')
      );
      const kidsSnapshot = await getDocs(q);
      const kidsList = kidsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCampKids(kidsList);
    } catch (error) {
      console.error('Error fetching camp kids:', error);
    }
  };

  // Update kid points (same as admin function)
  const updateKidPoints = async (kidId, pointsChange) => {
    try {
      const kidRef = doc(db, 'camp_kids', kidId);
      await updateDoc(kidRef, {
        points: increment(pointsChange)
      });

      setCampKids(prev => 
        prev.map(kid => 
          kid.id === kidId 
            ? { ...kid, points: kid.points + pointsChange }
            : kid
        ).sort((a, b) => b.points - a.points)
      );

      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-4 rounded-xl shadow-lg z-50 animate-bounce';
      notification.innerHTML = `✅ ${pointsChange > 0 ? 'เพิ่ม' : 'หัก'} ${Math.abs(pointsChange)} คะแนนเรียบร้อย!`;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 3000);
    } catch (error) {
      console.error('Error updating kid points:', error);
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    }
  };

  // Get group numbers
  const getGroupNumbers = () => {
    const groups = [...new Set(campKids.map(kid => kid.groupNumber))].sort((a, b) => a - b);
    return groups;
  };

  // Add points to entire group
  const addPointsToGroup = async (groupNumber, points) => {
    const groupKids = campKids.filter(kid => kid.groupNumber === parseInt(groupNumber));
    
    if (groupKids.length === 0) {
      alert('ไม่พบเด็กในกลุ่มนี้');
      return;
    }

    try {
      const updatePromises = groupKids.map(kid => 
        updateDoc(doc(db, 'camp_kids', kid.id), {
          points: increment(parseInt(points))
        })
      );

      await Promise.all(updatePromises);

      setCampKids(prev => 
        prev.map(kid => 
          kid.groupNumber === parseInt(groupNumber)
            ? { ...kid, points: kid.points + parseInt(points) }
            : kid
        ).sort((a, b) => b.points - a.points)
      );

      alert(`เพิ่ม ${points} คะแนนให้กลุ่ม ${groupNumber} (${groupKids.length} คน) เรียบร้อยแล้ว!`);
    } catch (error) {
      console.error('Error adding bulk points:', error);
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    }
  };

  // Fetch user data
  const fetchUserData = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setUserData(userDoc.data());
        
        if (userDoc.data().role === 'admin') {
          router.push('/admin');
          return;
        }
        
        // Check if user is camp mentor after setting userData
        setTimeout(() => checkCampMentorStatus(), 100);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  // Effects
  useEffect(() => {
    if (user && !loading) {
      fetchUserData();
      fetchActivities();
    }
  }, [user, loading]);

  useEffect(() => {
    if (userData) {
      checkCampMentorStatus();
    }
  }, [userData]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="text-white text-xl">กำลังโหลด...</div>
      </div>
    );
  }

  // No user
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="text-white text-xl">กรุณาเข้าสู่ระบบ</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      {/* Header Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                สวัสดี! {userData?.nickname || userData?.firstName || 'ผู้ใช้'}
              </h1>
              <p className="text-white/80">
                {isCampMentor ? `พี่เลี้ยงค่าย: ${campData?.name}` : 'พร้อมทำกิจกรรมแล้วไหม?'}
              </p>
            </div>

            <div className="flex items-center space-x-4">
              {/* Tab Navigation สำหรับ Camp Mentor */}
              {isCampMentor && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => setActiveTab('activities')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      activeTab === 'activities'
                        ? 'bg-cyan-500 text-white'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    กิจกรรม
                  </button>
                  <button
                    onClick={() => setActiveTab('camp')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      activeTab === 'camp'
                        ? 'bg-cyan-500 text-white'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    🏕️ จัดการค่าย
                  </button>
                </div>
              )}

              {/* QR Button */}
              <button
                onClick={() => setShowQR(true)}
                className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-medium py-3 px-6 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg"
              >
                📱 แสดง QR Code
              </button>

              {/* Logout Button */}
              <button
                onClick={() => {
                  // Add your logout function here
                  // Example: signOut(auth);
                  router.push('/');
                }}
                className="bg-red-500 hover:bg-red-600 text-white font-medium py-3 px-6 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg"
              >
                🚪 ออกจากระบบ
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* QR Modal */}
        {showQR && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center relative">
              <button
                onClick={() => setShowQR(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
              <h3 className="text-xl font-bold text-gray-800 mb-4">QR Code ของคุณ</h3>
              <div className="bg-gray-100 p-4 rounded-xl mb-4">
                <div className="w-48 h-48 mx-auto bg-white border-2 border-gray-300 rounded-lg flex items-center justify-center">
                  <span className="text-gray-500">QR Code จะแสดงที่นี่</span>
                </div>
              </div>
              <p className="text-gray-600 text-sm">
                แสดง QR Code นี้กับผู้ดูแลเพื่อรับคะแนน
              </p>
            </div>
          </div>
        )}

        {/* Points Display */}
        <div className="mb-10">
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8">
            <div className="text-center">
              <h2 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-2">
                {userData?.points || 0}
              </h2>
              <p className="text-white/80 text-xl">คะแนนของคุณ</p>
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        {(!isCampMentor || activeTab === 'activities') && (
          <div>
            <div className="flex items-center mb-8">
              <h3 className="text-3xl font-bold text-white">กิจกรรมที่เปิดให้ทำ</h3>
              <div className="ml-4 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full px-4 py-2">
                <span className="text-white font-bold">{activities.length} กิจกรรม</span>
              </div>
            </div>
            
            {activities.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-8xl mb-4">🎯</div>
                <h3 className="text-2xl font-bold text-white/80 mb-2">ยังไม่มีกิจกรรมที่เปิดให้ทำ</h3>
                <p className="text-white/60">กรุณารอการประกาศจากผู้ดูแล</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activities.map((activity) => (
                  <div key={activity.id} className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-6 hover:bg-white/15 transition-all duration-300">
                    <div className="flex items-start justify-between mb-4">
                      <h4 className="text-xl font-bold text-white">{activity.name}</h4>
                      <span className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-sm font-bold px-3 py-1 rounded-full">
                        {activity.points} คะแนน
                      </span>
                    </div>
                    <p className="text-white/80 mb-4">{activity.description}</p>
                    <div className="text-white/60 text-sm">
                      วันที่: {activity.date} | เวลา: {activity.time}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Camp Management Tab for Mentors */}
        {isCampMentor && activeTab === 'camp' && campData && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-3xl font-bold text-white">จัดการค่าย: {campData.name}</h3>
              <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4">
                <div className="flex items-center space-x-4 text-white">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{campKids.length}</div>
                    <div className="text-sm text-white/70">เด็กทั้งหมด</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{getGroupNumbers().length}</div>
                    <div className="text-sm text-white/70">กลุ่ม</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Group Actions */}
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-6">
              <h4 className="text-lg font-semibold text-white mb-4">เพิ่มคะแนนแบบกลุ่ม</h4>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {getGroupNumbers().map(group => {
                  const groupCount = campKids.filter(k => k.groupNumber === group).length;
                  return (
                    <div key={group} className="bg-white/5 rounded-xl p-4">
                      <h5 className="text-white font-medium mb-2">กลุ่ม {group} ({groupCount} คน)</h5>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => addPointsToGroup(group, 5)}
                          className="flex-1 bg-green-500 hover:bg-green-600 text-white py-1 px-2 rounded text-xs transition-colors"
                        >
                          +5
                        </button>
                        <button
                          onClick={() => addPointsToGroup(group, 10)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-1 px-2 rounded text-xs transition-colors"
                        >
                          +10
                        </button>
                        <button
                          onClick={() => addPointsToGroup(group, 20)}
                          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-1 px-2 rounded text-xs transition-colors"
                        >
                          +20
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Camp Leaderboard */}
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-6">
              <h4 className="text-lg font-semibold text-white mb-4">🏆 กระดานคะแนนค่าย</h4>
              
              {campKids.length === 0 ? (
                <div className="text-center py-8 text-white/50">
                  ยังไม่มีเด็กในค่าย
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-white/5">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-white/90">อันดับ</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-white/90">ชื่อเล่น</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-white/90">ชื่อจริง</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-white/90">กลุ่ม</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-white/90">คะแนน</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-white/90">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {campKids.map((kid, index) => (
                        <tr key={kid.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center">
                              {index < 3 ? (
                                <span className="text-2xl">
                                  {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                                </span>
                              ) : (
                                <span className="text-white/70 font-bold">#{index + 1}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full flex items-center justify-center mr-3">
                                <span className="text-white font-bold text-xs">
                                  {kid.nickname?.charAt(0)?.toUpperCase()}
                                </span>
                              </div>
                              <span className="text-white font-medium">{kid.nickname}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-white/70">
                            {kid.firstName} {kid.lastName}
                          </td>
                          <td className="px-4 py-3">
                            <span className="bg-blue-500/20 text-blue-200 px-2 py-1 rounded-full text-xs font-medium">
                              กลุ่ม {kid.groupNumber}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white font-bold px-3 py-1 rounded-full text-sm">
                              {kid.points} 🌟
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex space-x-1">
                              <button
                                onClick={() => updateKidPoints(kid.id, 5)}
                                className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs transition-colors"
                              >
                                +5
                              </button>
                              <button
                                onClick={() => updateKidPoints(kid.id, 10)}
                                className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs transition-colors"
                              >
                                +10
                              </button>
                              <button
                                onClick={() => updateKidPoints(kid.id, -5)}
                                className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs transition-colors"
                              >
                                -5
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Group Summary */}
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-6">
              <h4 className="text-lg font-semibold text-white mb-4">📊 สรุปคะแนนแต่ละกลุ่ม</h4>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {getGroupNumbers().map(group => {
                  const groupKids = campKids.filter(k => k.groupNumber === group);
                  const totalPoints = groupKids.reduce((sum, kid) => sum + kid.points, 0);
                  const avgPoints = groupKids.length > 0 ? Math.round(totalPoints / groupKids.length) : 0;
                  
                  return (
                    <div key={group} className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-4">
                      <h5 className="text-white font-bold text-lg mb-2">กลุ่ม {group}</h5>
                      <div className="space-y-1 text-sm">
                        <p className="text-white/80">จำนวน: {groupKids.length} คน</p>
                        <p className="text-white/80">คะแนนรวม: {totalPoints}</p>
                        <p className="text-white/80">เฉลี่ย: {avgPoints}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}