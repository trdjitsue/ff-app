// Add these states to dashboard.js (after existing states)

const [isCampMentor, setIsCampMentor] = useState(false);
const [campData, setCampData] = useState(null);
const [campKids, setCampKids] = useState([]);
const [activeTab, setActiveTab] = useState('activities'); // For mentors: activities or camp

// Add these functions to dashboard.js

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

// Update the fetchUserData function to include camp mentor check
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

// JSX for tab navigation (insert after QR button in header)
// Replace the existing JSX with proper syntax:

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

{/* Main content area - replace the activities section with this: */}
<div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
  {/* QR Modal stays the same */}
  {showQR && (
    <div>
      {/* Your existing QR modal code */}
    </div>
  )}

  {/* Points section stays the same */}
  <div className="mb-10">
    {/* Your existing points section */}
  </div>

  {/* Conditional content based on active tab */}
  {(!isCampMentor || activeTab === 'activities') && (
    <div>
      <div className="flex items-center mb-8">
        <h3 className="text-3xl font-bold text-white">กิจกรรมที่เปิดให้ทำ</h3>
        <div className="ml-4 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full px-4 py-2">
          <span className="text-white font-bold">{activities.length} กิจกรรม</span>
        </div>
      </div>
      
      {/* Existing activities code stays the same */}
      {activities.length === 0 ? (
        <div>
          {/* Your existing empty state */}
        </div>
      ) : (
        <div>
          {/* Your existing activities grid */}
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