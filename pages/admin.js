import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { signOut } from 'firebase/auth';
import dynamic from 'next/dynamic';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  addDoc, 
  deleteDoc, 
  increment,
  query,
  orderBy,
  where 
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

// Dynamic import for QR Scanner to avoid SSR issues
const QRScanner = dynamic(() => import('../components/QRScanner'), {
  ssr: false,
  loading: () => (
    <div className="bg-black/20 rounded-xl p-4 min-h-[300px] flex items-center justify-center">
      <div className="text-center text-white/50">
        <div className="text-6xl mb-4">📷</div>
        <p>กำลังโหลดกล้อง...</p>
      </div>
    </div>
  )
});

export default function Admin({ user, loading }) {
  const [userData, setUserData] = useState(null);
  const [students, setStudents] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState('students');
  const [newActivity, setNewActivity] = useState({ name: '', description: '', points: '' });
  
  // QR Scanner states
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [studentInfo, setStudentInfo] = useState(null);
  const [pointsToAdd, setPointsToAdd] = useState(5);
  const [scanMessage, setScanMessage] = useState('');
  const [scanner, setScanner] = useState(null);
  
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      checkAdminAndFetchData();
    }
  }, [user, loading, router]);

  const checkAdminAndFetchData = async () => {
    try {
      const userDoc = await getDocs(collection(db, 'users'));
      const currentUser = userDoc.docs.find(doc => doc.id === user.uid);
      
      if (!currentUser || currentUser.data().role !== 'admin') {
        router.push('/dashboard');
        return;
      }

      setUserData(currentUser.data());
      await Promise.all([fetchStudents(), fetchActivities()]);
    } catch (error) {
      console.error('Error checking admin status:', error);
      router.push('/dashboard');
    } finally {
      setLoadingData(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const usersSnapshot = await getDocs(q);
      const studentsList = usersSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(user => user.role === 'student');
      setStudents(studentsList);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchActivities = async () => {
    try {
      const q = query(collection(db, 'activities'), orderBy('createdAt', 'desc'));
      const activitiesSnapshot = await getDocs(q);
      const activitiesList = activitiesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setActivities(activitiesList);
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  // QR Scanner Functions
  const handleScanSuccess = async (scannedData) => {
    try {
      setScanResult(scannedData);
      
      // Parse the QR code data from dashboard format: "uid-name"
      let studentId = scannedData;
      
      // If QR code contains the dashboard format "uid-name"
      if (scannedData.includes('-')) {
        studentId = scannedData.split('-')[0]; // Get the user ID part
      }
      
      // If QR code contains JSON data
      try {
        const qrData = JSON.parse(scannedData);
        studentId = qrData.studentId || qrData.id || qrData.email || qrData.uid;
      } catch (e) {
        // If not JSON, use the processed studentId
      }

      // Find student by ID (uid from Firebase)
      const student = students.find(s => 
        s.id === studentId || 
        s.email === studentId ||
        s.studentId === studentId
      );

      if (student) {
        setStudentInfo(student);
        setScanMessage(`พบนักเรียน: ${student.name} (${student.email})`);
        setIsScanning(false); // Stop scanning when student found
      } else {
        setScanMessage(`ไม่พบข้อมูลนักเรียนในระบบ\nQR Code: ${scannedData}\nStudent ID ที่ค้นหา: ${studentId}`);
        // Continue scanning after 3 seconds
        setTimeout(() => {
          setScanMessage('กรุณาลองสแกน QR Code ใหม่อีกครั้ง');
        }, 3000);
      }
    } catch (error) {
      console.error('Error processing scan result:', error);
      setScanMessage('เกิดข้อผิดพลาดในการอ่าน QR Code');
    }
  };

  const handleScanError = (error) => {
    console.error('Scan error:', error);
    setScanMessage('เกิดข้อผิดพลาดในการใช้กล้อง กรุณาตรวจสอบการอนุญาต');
  };

  const startScanning = () => {
    setIsScanning(true);
    setStudentInfo(null);
    setScanResult(null);
    setScanMessage('กำลังเปิดกล้อง... กรุณาให้นักเรียนแสดง QR Code');
  };

  const stopScanning = () => {
    setIsScanning(false);
    setScanResult(null);
    setStudentInfo(null);
    setScanMessage('');
  };

  const addPointsFromScan = async () => {
    if (!studentInfo || !pointsToAdd) return;

    try {
      await updateStudentPoints(studentInfo.id, pointsToAdd);
      
      // Log the point addition
      await addDoc(collection(db, 'pointLogs'), {
        studentId: studentInfo.id,
        studentName: studentInfo.name,
        points: pointsToAdd,
        method: 'qr_scan',
        adminId: user.uid,
        adminName: userData?.name,
        timestamp: new Date()
      });

      setScanMessage(`✅ เพิ่ม ${pointsToAdd} คะแนนให้ ${studentInfo.name} เรียบร้อย!`);
      
      // Reset for next scan
      setTimeout(() => {
        setStudentInfo(null);
        setScanResult(null);
        setScanMessage('พร้อมสแกน QR Code ใหม่');
        setIsScanning(true); // Resume scanning
      }, 3000);
      
    } catch (error) {
      console.error('Error adding points:', error);
      setScanMessage('เกิดข้อผิดพลาดในการเพิ่มคะแนน');
    }
  };

  const updateStudentPoints = async (studentId, pointsChange) => {
    try {
      const studentRef = doc(db, 'users', studentId);
      await updateDoc(studentRef, {
        points: increment(pointsChange)
      });
      
      setStudents(prev => 
        prev.map(student => 
          student.id === studentId 
            ? { ...student, points: student.points + pointsChange }
            : student
        )
      );
      
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-4 rounded-xl shadow-lg z-50 animate-bounce';
      notification.innerHTML = `✅ ${pointsChange > 0 ? 'เพิ่ม' : 'หัก'} ${Math.abs(pointsChange)} คะแนนเรียบร้อย!`;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 3000);
    } catch (error) {
      console.error('Error updating points:', error);
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    }
  };

  const addPointsDirectly = (studentId, studentName) => {
    const points = prompt(`จะให้คะแนนกับ ${studentName} เท่าไหร่?\n\nใส่เลขบวก = เพิ่มคะแนน\nใส่เลขลบ = หักคะแนน`);
    if (points && !isNaN(points)) {
      const pointsNum = parseInt(points);
      if (pointsNum !== 0) {
        updateStudentPoints(studentId, pointsNum);
      }
    }
  };

  const quickAddPoints = (studentId, points) => {
    updateStudentPoints(studentId, points);
  };

  const addActivity = async (e) => {
    e.preventDefault();
    
    if (!newActivity.name || !newActivity.points) {
      alert('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
      return;
    }

    try {
      const docRef = await addDoc(collection(db, 'activities'), {
        name: newActivity.name,
        description: newActivity.description || '',
        points: parseInt(newActivity.points),
        createdAt: new Date()
      });

      setActivities(prev => [{
        id: docRef.id,
        ...newActivity,
        points: parseInt(newActivity.points),
        createdAt: new Date()
      }, ...prev]);

      setNewActivity({ name: '', description: '', points: '' });
      alert('เพิ่มกิจกรรมเรียบร้อยแล้ว!');
    } catch (error) {
      console.error('Error adding activity:', error);
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    }
  };

  const deleteActivity = async (activityId) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบกิจกรรมนี้?')) return;

    try {
      await deleteDoc(doc(db, 'activities', activityId));
      setActivities(prev => prev.filter(activity => activity.id !== activityId));
      alert('ลบกิจกรรมเรียบร้อยแล้ว!');
    } catch (error) {
      console.error('Error deleting activity:', error);
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    }
  };

  const handleLogout = async () => {
    try {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-10 left-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse"></div>
        <div className="absolute -bottom-20 left-1/2 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse"></div>
      </div>

      <header className="relative z-10 bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-cyan-400 to-purple-400 w-12 h-12 rounded-full flex items-center justify-center">
                <span className="text-xl font-bold text-white">FF</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">หน้าควบคุมผู้ดูแล</h1>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="text-right">
                <p className="text-white/70 text-sm">ผู้ดูแลระบบ</p>
                <p className="font-bold text-white text-lg">{userData?.name}</p>
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
        <div className="flex space-x-1 mb-8">
          <button
            onClick={() => setActiveTab('students')}
            className={`px-6 py-3 font-medium rounded-lg transition-colors ${
              activeTab === 'students'
                ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            จัดการนักเรียน ({students.length})
          </button>
          <button
            onClick={() => setActiveTab('activities')}
            className={`px-6 py-3 font-medium rounded-lg transition-colors ${
              activeTab === 'activities'
                ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            จัดการกิจกรรม ({activities.length})
          </button>
          <button
            onClick={() => setActiveTab('scanner')}
            className={`px-6 py-3 font-medium rounded-lg transition-colors ${
              activeTab === 'scanner'
                ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            📱 สแกน QR Code
          </button>
        </div>

        {activeTab === 'scanner' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">สแกน QR Code เพื่อให้คะแนน</h2>
            </div>
            
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-6 mb-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">การตั้งค่า</h3>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      คะแนนที่จะให้
                    </label>
                    <div className="flex space-x-2 mb-2">
                      {[1, 5, 10, 20].map(points => (
                        <button
                          key={points}
                          onClick={() => setPointsToAdd(points)}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            pointsToAdd === points
                              ? 'bg-gradient-to-r from-green-400 to-emerald-400 text-white'
                              : 'bg-white/10 text-white/70 hover:bg-white/20'
                          }`}
                        >
                          {points} คะแนน
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      value={pointsToAdd}
                      onChange={(e) => setPointsToAdd(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                      placeholder="หรือกรอกเอง"
                      min="1"
                    />
                  </div>

                  <div className="space-y-4">
                    {!isScanning ? (
                      <button
                        onClick={startScanning}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 hover:scale-105 flex items-center justify-center space-x-2"
                      >
                        <span>📷</span>
                        <span>เริ่มสแกน QR Code</span>
                      </button>
                    ) : (
                      <button
                        onClick={stopScanning}
                        className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 hover:scale-105 flex items-center justify-center space-x-2"
                      >
                        <span>⏹️</span>
                        <span>หยุดสแกน</span>
                      </button>
                    )}

                    {studentInfo && (
                      <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-4">
                        <h4 className="text-white font-semibold mb-2">พบนักเรียน:</h4>
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="w-10 h-10 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-sm">
                              {studentInfo.name?.charAt(0)?.toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-white font-medium">{studentInfo.name}</p>
                            <p className="text-white/70 text-sm">{studentInfo.email}</p>
                            <p className="text-white/70 text-sm">คะแนนปัจจุบัน: {studentInfo.points}</p>
                          </div>
                        </div>
                        <button
                          onClick={addPointsFromScan}
                          className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300"
                        >
                          ✅ เพิ่ม {pointsToAdd} คะแนน
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">กล้องสแกน</h3>
                  <div className="bg-black/20 rounded-xl p-4 min-h-[300px] flex items-center justify-center">
                    {!isScanning ? (
                      <div className="text-center text-white/50">
                        <div className="text-6xl mb-4">📷</div>
                        <p>กดปุ่ม &quot;เริ่มสแกน&quot; เพื่อเปิดกล้อง</p>
                      </div>
                    ) : (
                      <QRScanner
                        onScan={handleScanSuccess}
                        onError={handleScanError}
                        isActive={isScanning}
                      />
                    )}
                  </div>
                  
                  {scanMessage && (
                    <div className="mt-4 p-3 bg-blue-500/20 border border-blue-500/50 rounded-lg">
                      <p className="text-white text-sm">{scanMessage}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">วิธีใช้งาน</h3>
              <div className="grid md:grid-cols-3 gap-4 text-sm text-white/70">
                <div className="flex items-start space-x-3">
                  <span className="text-cyan-400 text-xl">1️⃣</span>
                  <div>
                    <p className="font-medium text-white">เลือกคะแนน</p>
                    <p>กำหนดจำนวนคะแนนที่จะให้นักเรียน</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-cyan-400 text-xl">2️⃣</span>
                  <div>
                    <p className="font-medium text-white">เริ่มสแกน</p>
                    <p>กดปุ่มเพื่อเปิดกล้องและสแกน QR Code</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-cyan-400 text-xl">3️⃣</span>
                  <div>
                    <p className="font-medium text-white">ให้คะแนน</p>
                    <p>เมื่อพบนักเรียน กดปุ่มเพื่อเพิ่มคะแนน</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'students' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">การจัดการนักเรียน</h2>
              <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4">
                <div className="flex items-center space-x-4 text-white">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{students.length}</div>
                    <div className="text-sm text-white/70">นักเรียนทั้งหมด</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{students.reduce((sum, s) => sum + s.points, 0)}</div>
                    <div className="text-sm text-white/70">คะแนนรวมที่ให้</div>
                  </div>
                </div>
              </div>
            </div>
            
            {students.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-12">
                  <div className="text-white/40 mb-6">
                    <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-4">ยังไม่มีนักเรียน</h3>
                  <p className="text-white/70">นักเรียนจะปรากฏที่นี่เมื่อสมัครสมาชิก</p>
                </div>
              </div>
            ) : (
              <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-white/5">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-medium text-white/90 uppercase tracking-wider">
                          นักเรียน
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-white/90 uppercase tracking-wider">
                          อีเมล
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-white/90 uppercase tracking-wider">
                          คะแนน
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-white/90 uppercase tracking-wider">
                          การจัดการคะแนน
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {students.map((student) => (
                        <tr key={student.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full flex items-center justify-center mr-4">
                                <span className="text-white font-bold text-sm">
                                  {student.name?.charAt(0)?.toUpperCase() || 'N'}
                                </span>
                              </div>
                              <div className="text-sm font-medium text-white">{student.name}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-white/70">{student.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-bold bg-gradient-to-r from-cyan-400 to-purple-400 text-white">
                              🏆 {student.points} คะแนน
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <div className="flex flex-wrap gap-2 mb-2">
                              <button
                                onClick={() => quickAddPoints(student.id, 5)}
                                className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs transition-colors"
                              >
                                +5
                              </button>
                              <button
                                onClick={() => quickAddPoints(student.id, 10)}
                                className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs transition-colors"
                              >
                                +10
                              </button>
                              <button
                                onClick={() => quickAddPoints(student.id, 20)}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs transition-colors"
                              >
                                +20
                              </button>
                              <button
                                onClick={() => quickAddPoints(student.id, -5)}
                                className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs transition-colors"
                              >
                                -5
                              </button>
                            </div>
                            
                            <button
                              onClick={() => addPointsDirectly(student.id, student.name)}
                              className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg font-medium transition-colors w-full"
                            >
                              🎯 กำหนดเอง
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'activities' && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">การจัดการกิจกรรม</h2>
            
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-6 mb-8">
              <h3 className="text-lg font-semibold text-white mb-4">เพิ่มกิจกรรมใหม่</h3>
              <form onSubmit={addActivity} className="grid md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    ชื่อกิจกรรม *
                  </label>
                  <input
                    type="text"
                    value={newActivity.name}
                    onChange={(e) => setNewActivity(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    placeholder="เช่น แบบฝึกหัดคณิตศาสตร์"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    คะแนน *
                  </label>
                  <input
                    type="number"
                    value={newActivity.points}
                    onChange={(e) => setNewActivity(prev => ({ ...prev, points: e.target.value }))}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    placeholder="20"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    รายละเอียด
                  </label>
                  <input
                    type="text"
                    value={newActivity.description}
                    onChange={(e) => setNewActivity(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    placeholder="รายละเอียดเพิ่มเติม"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-medium py-2 px-4 rounded-lg transition-all duration-300 hover:scale-105"
                  >
                    เพิ่มกิจกรรม
                  </button>
                </div>
              </form>
            </div>

            {activities.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-12">
                  <div className="text-white/40 mb-6">
                    <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-4">ยังไม่มีกิจกรรม</h3>
                  <p className="text-white/70">เพิ่มกิจกรรมแรกของคุณด้านบน!</p>
                </div>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activities.map((activity) => (
                  <div key={activity.id} className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-6 shadow-xl hover:bg-white/15 transition-all duration-300">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="text-xl font-semibold text-white">{activity.name}</h4>
                      <span className="bg-gradient-to-r from-green-400 to-emerald-400 text-white text-sm font-bold px-3 py-1 rounded-full">
                        +{activity.points} คะแนน
                      </span>
                    </div>
                    
                    {activity.description && (
                      <p className="text-white/70 mb-4">{activity.description}</p>
                    )}
                    
                    <button
                      onClick={() => deleteActivity(activity.id)}
                      className="w-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-200 py-2 px-4 rounded-lg font-medium transition-all duration-300 hover:scale-105"
                    >
                      ลบกิจกรรม
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}