// Add these states to admin.js (after existing states)

// Camp Management states
const [camps, setCamps] = useState([]);
const [selectedCamp, setSelectedCamp] = useState(null);
const [campKids, setCampKids] = useState([]);
const [newCamp, setNewCamp] = useState({ name: '', mentors: [] });
const [newKid, setNewKid] = useState({ 
  nickname: '', 
  firstName: '', 
  lastName: '', 
  groupNumber: 1 
});
const [bulkPoints, setBulkPoints] = useState({ points: 0, groupNumber: '' });

// Add these functions to admin.js

// Fetch camps
const fetchCamps = async () => {
  try {
    const campsSnapshot = await getDocs(collection(db, 'camps'));
    const campsList = campsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setCamps(campsList);
  } catch (error) {
    console.error('Error fetching camps:', error);
  }
};

// Fetch camp kids
const fetchCampKids = async (campId) => {
  if (!campId) return;
  
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

// Create new camp
const createCamp = async (e) => {
  e.preventDefault();
  
  if (!newCamp.name.trim()) {
    alert('กรุณาใส่ชื่อค่าย');
    return;
  }

  try {
    const docRef = await addDoc(collection(db, 'camps'), {
      name: newCamp.name.trim(),
      mentors: newCamp.mentors,
      createdBy: user.uid,
      createdAt: new Date()
    });

    // Update mentors to have camp_mentor role
    for (const mentorId of newCamp.mentors) {
      await updateDoc(doc(db, 'users', mentorId), {
        camp_mentor: true,
        camp_id: docRef.id
      });
    }

    setCamps(prev => [...prev, {
      id: docRef.id,
      name: newCamp.name.trim(),
      mentors: newCamp.mentors,
      createdBy: user.uid,
      createdAt: new Date()
    }]);

    setNewCamp({ name: '', mentors: [] });
    alert('สร้างค่ายเรียบร้อยแล้ว!');
  } catch (error) {
    console.error('Error creating camp:', error);
    alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
  }
};

// Add kid to camp
const addKidToCamp = async (e) => {
  e.preventDefault();
  
  if (!selectedCamp || !newKid.nickname.trim() || !newKid.firstName.trim() || !newKid.lastName.trim()) {
    alert('กรุณากรอกข้อมูลให้ครบถ้วน');
    return;
  }

  try {
    const docRef = await addDoc(collection(db, 'camp_kids'), {
      campId: selectedCamp.id,
      nickname: newKid.nickname.trim(),
      firstName: newKid.firstName.trim(),
      lastName: newKid.lastName.trim(),
      groupNumber: parseInt(newKid.groupNumber),
      points: 0,
      createdAt: new Date()
    });

    const newKidData = {
      id: docRef.id,
      campId: selectedCamp.id,
      nickname: newKid.nickname.trim(),
      firstName: newKid.firstName.trim(),
      lastName: newKid.lastName.trim(),
      groupNumber: parseInt(newKid.groupNumber),
      points: 0,
      createdAt: new Date()
    };

    setCampKids(prev => [...prev, newKidData].sort((a, b) => b.points - a.points));
    setNewKid({ nickname: '', firstName: '', lastName: '', groupNumber: 1 });
    alert('เพิ่มเด็กเรียบร้อยแล้ว!');
  } catch (error) {
    console.error('Error adding kid:', error);
    alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
  }
};

// Update kid points
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

// Add points to entire group
const addPointsToGroup = async () => {
  if (!bulkPoints.groupNumber || !bulkPoints.points) {
    alert('กรุณาเลือกกลุ่มและใส่คะแนน');
    return;
  }

  const groupKids = campKids.filter(kid => kid.groupNumber === parseInt(bulkPoints.groupNumber));
  
  if (groupKids.length === 0) {
    alert('ไม่พบเด็กในกลุ่มนี้');
    return;
  }

  try {
    const updatePromises = groupKids.map(kid => 
      updateDoc(doc(db, 'camp_kids', kid.id), {
        points: increment(parseInt(bulkPoints.points))
      })
    );

    await Promise.all(updatePromises);

    setCampKids(prev => 
      prev.map(kid => 
        kid.groupNumber === parseInt(bulkPoints.groupNumber)
          ? { ...kid, points: kid.points + parseInt(bulkPoints.points) }
          : kid
      ).sort((a, b) => b.points - a.points)
    );

    alert(`เพิ่ม ${bulkPoints.points} คะแนนให้กลุ่ม ${bulkPoints.groupNumber} (${groupKids.length} คน) เรียบร้อยแล้ว!`);
    setBulkPoints({ points: 0, groupNumber: '' });
  } catch (error) {
    console.error('Error adding bulk points:', error);
    alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
  }
};

// Toggle mentor selection
const toggleMentor = (studentId) => {
  setNewCamp(prev => ({
    ...prev,
    mentors: prev.mentors.includes(studentId)
      ? prev.mentors.filter(id => id !== studentId)
      : [...prev.mentors, studentId]
  }));
};

// Get group numbers from current camp kids
const getGroupNumbers = () => {
  const groups = [...new Set(campKids.map(kid => kid.groupNumber))].sort((a, b) => a - b);
  return groups;
};

// Add this to the useEffect that calls checkAdminAndFetchData
useEffect(() => {
  if (user) {
    checkAdminAndFetchData();
    fetchCamps(); // Add this line
  }
}, [user, loading, router]);

// Add this to the useEffect when selectedCamp changes
useEffect(() => {
  if (selectedCamp) {
    fetchCampKids(selectedCamp.id);
  }
}, [selectedCamp]);

// Add new tab button (insert after existing tab buttons)
<button
  onClick={() => setActiveTab('camps')}
  className={`px-6 py-3 font-medium rounded-lg transition-colors ${
    activeTab === 'camps'
      ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
      : 'bg-white/10 text-white/70 hover:bg-white/20'
  }`}
>
  🏕️ จัดการค่าย ({camps.length})
</button>

// Add camp management tab content (insert after other tab contents)
{activeTab === 'camps' && (
  <div className="space-y-8">
    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-bold text-white">การจัดการค่าย</h2>
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4">
        <div className="flex items-center space-x-4 text-white">
          <div className="text-center">
            <div className="text-2xl font-bold">{camps.length}</div>
            <div className="text-sm text-white/70">ค่ายทั้งหมด</div>
          </div>
          {selectedCamp && (
            <div className="text-center">
              <div className="text-2xl font-bold">{campKids.length}</div>
              <div className="text-sm text-white/70">เด็กในค่าย</div>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Create New Camp */}
    <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">สร้างค่ายใหม่</h3>
      <form onSubmit={createCamp} className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white/90 mb-2">
              ชื่อค่าย *
            </label>
            <input
              type="text"
              value={newCamp.name}
              onChange={(e) => setNewCamp(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              placeholder="เช่น ค่ายฤดูร้อน 2025"
              required
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-medium py-2 px-4 rounded-lg transition-all duration-300 hover:scale-105"
            >
              สร้างค่าย
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-white/90 mb-2">
            เลือกพี่เลี้ยงค่าย
          </label>
          <div className="grid md:grid-cols-3 gap-2 max-h-40 overflow-y-auto border border-white/20 rounded-lg p-3">
            {students.map(student => (
              <label key={student.id} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newCamp.mentors.includes(student.id)}
                  onChange={() => toggleMentor(student.id)}
                  className="w-4 h-4 text-cyan-400 rounded"
                />
                <span className="text-white text-sm">
                  {student.nickname || `${student.firstName} ${student.lastName}`}
                </span>
              </label>
            ))}
          </div>
          <p className="text-white/50 text-xs mt-1">
            เลือกแล้ว: {newCamp.mentors.length} คน
          </p>
        </div>
      </form>
    </div>

    {/* Camp Selection */}
    <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">เลือกค่ายที่ต้องการจัดการ</h3>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {camps.map(camp => (
          <button
            key={camp.id}
            onClick={() => setSelectedCamp(camp)}
            className={`p-4 rounded-xl border-2 transition-all duration-300 text-left ${
              selectedCamp?.id === camp.id
                ? 'border-cyan-400 bg-cyan-400/20'
                : 'border-white/20 bg-white/5 hover:bg-white/10'
            }`}
          >
            <h4 className="text-white font-semibold">{camp.name}</h4>
            <p className="text-white/70 text-sm">
              พี่เลี้ยง: {camp.mentors?.length || 0} คน
            </p>
            <p className="text-white/50 text-xs">
              สร้างเมื่อ: {camp.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
            </p>
          </button>
        ))}
        {camps.length === 0 && (
          <div className="col-span-full text-center py-8 text-white/50">
            ยังไม่มีค่าย กรุณาสร้างค่ายใหม่
          </div>
        )}
      </div>
    </div>

    {/* Camp Management */}
    {selectedCamp && (
      <div className="space-y-6">
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            จัดการค่าย: {selectedCamp.name}
          </h3>

          {/* Add Kid Form */}
          <form onSubmit={addKidToCamp} className="grid md:grid-cols-5 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">ชื่อเล่น *</label>
              <input
                type="text"
                value={newKid.nickname}
                onChange={(e) => setNewKid(prev => ({ ...prev, nickname: e.target.value }))}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                placeholder="น้องปลา"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">ชื่อจริง *</label>
              <input
                type="text"
                value={newKid.firstName}
                onChange={(e) => setNewKid(prev => ({ ...prev, firstName: e.target.value }))}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                placeholder="สมศรี"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">นามสกุล *</label>
              <input
                type="text"
                value={newKid.lastName}
                onChange={(e) => setNewKid(prev => ({ ...prev, lastName: e.target.value }))}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                placeholder="ใจดี"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">กลุ่ม *</label>
              <input
                type="number"
                value={newKid.groupNumber}
                onChange={(e) => setNewKid(prev => ({ ...prev, groupNumber: e.target.value }))}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                min="1"
                required
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-medium py-2 px-4 rounded-lg transition-all duration-300 hover:scale-105"
              >
                เพิ่มเด็ก
              </button>
            </div>
          </form>

          {/* Bulk Points */}
          <div className="bg-white/5 rounded-xl p-4">
            <h4 className="text-white font-medium mb-3">เพิ่มคะแนนทั้งกลุ่ม</h4>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <select
                  value={bulkPoints.groupNumber}
                  onChange={(e) => setBulkPoints(prev => ({ ...prev, groupNumber: e.target.value }))}
                  className="w-full bg-white/10 border border-white/20 rounded-lg text-white p-2"
                >
                  <option value="">เลือกกลุ่ม</option>
                  {getGroupNumbers().map(group => (
                    <option key={group} value={group}>
                      กลุ่ม {group} ({campKids.filter(k => k.groupNumber === group).length} คน)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <input
                  type="number"
                  value={bulkPoints.points}
                  onChange={(e) => setBulkPoints(prev => ({ ...prev, points: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  placeholder="คะแนน"
                />
              </div>
              <button
                onClick={addPointsToGroup}
                className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-white font-medium py-2 px-4 rounded-lg transition-all duration-300"
              >
                เพิ่มคะแนนกลุ่ม
              </button>
            </div>
          </div>
        </div>

        {/* Kids Leaderboard */}
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            🏆 กระดานคะแนน - {selectedCamp.name}
          </h3>
          
          {campKids.length === 0 ? (
            <div className="text-center py-8 text-white/50">
              ยังไม่มีเด็กในค่าย กรุณาเพิ่มเด็กก่อน
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
      </div>
    )}
  </div>
)}