import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, doc, getDoc } from 'firebase/firestore';

// VOS CLÉS FIREBASE SECRÈTES
const firebaseConfig = {
  apiKey: "AIzaSyAQB5mhQJEoP_9Qdx5WfkObwjUxm6nczUo",
  authDomain: "pumpump-app.firebaseapp.com",
  projectId: "pumpump-app",
  storageBucket: "pumpump-app.firebasestorage.app",
  messagingSenderId: "150843577031",
  appId: "1:150843577031:web:c9b1d5f6dbeb7cce0de4e2",
  measurementId: "G-WE42ZVJJNV"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const translations = {
  en: {
    title: "🍼 PumPum", subtitle: "Relax, you got this! 💖", manualBtn: "✍️ Manual Entry",
    left: "Left", both: "Both", right: "Right", start: "START", stop: "STOP",
    chartTitle: "📊 Weekly Summary (mL)", victories: "🏆 Your victories", noSession: "No session yet. Your turn!",
    bravo: "Great job! 🎉", howMuch: "How much did you pump?", save: "Save", cancel: "Cancel",
    reminder: "🔔 Next pump reminder:", none: "None", manualDuration: "Manual",
    langBtn: "🇫🇷 FR", stopwatch: "⏱️ Stopwatch", timer: "⏳ Timer", min: "min", when: "🗓️ When was it?",
    loginTitle: "Welcome!", loginSub: "Enter your family code to access your diary", loginBtn: "Unlock",
    loginPlaceholder: "Ex: Baby2026", logout: "🔒",
    statusApproved: "Approved ✅", statusTemp: "Temporary ❗",
    statusModalTitle: "Code Status",
    statusModalAppr: "Your code is registered. Your data is securely backed up in the Cloud.",
    statusModalTemp: "This code is not in the approved database. Your data will only be saved locally on this phone.",
    stopMusic: "🔇 Stop music"
  },
  fr: {
    title: "🍼 PumPum", subtitle: "Détends-toi, tu gères ! 💖", manualBtn: "✍️ Saisie Manuelle",
    left: "Gauche", both: "Les deux", right: "Droite", start: "START", stop: "STOP",
    chartTitle: "📊 Résumé Hebdomadaire (mL)", victories: "🏆 Tes victoires", noSession: "Pas encore de session. À toi !",
    bravo: "Bravo ! 🎉", howMuch: "Combien as-tu récolté ?", save: "Sauvegarder", cancel: "Annuler",
    reminder: "🔔 Rappel prochain tirage :", none: "Non", manualDuration: "Manuel",
    langBtn: "🇬🇧 EN", stopwatch: "⏱️ Chrono", timer: "⏳ Timer", min: "min", when: "🗓️ Quand était-ce ?",
    loginTitle: "Bienvenue !", loginSub: "Entrez votre code familial pour accéder au carnet", loginBtn: "Déverrouiller",
    loginPlaceholder: "Ex: lu1", logout: "🔒",
    statusApproved: "Approuvé ✅", statusTemp: "Temporaire ❗",
    statusModalTitle: "Statut du Code",
    statusModalAppr: "Votre code est enregistré. Vos données sont sauvegardées de manière sécurisée dans le Cloud.",
    statusModalTemp: "Ce code n'est pas dans la base approuvée. Vos données ne seront sauvegardées que localement sur ce téléphone.",
    stopMusic: "🔇 Arrêter la musique"
  }
};

export default function App() {
  const [lang, setLang] = useState('en');
  const t = translations[lang];

  // SYSTÈME DE SÉCURITÉ & STATUT
  const [userCode, setUserCode] = useState(localStorage.getItem('pumpum_user') || '');
  const [isLogged, setIsLogged] = useState(!!localStorage.getItem('pumpum_user'));
  const [isApproved, setIsApproved] = useState(false);
  const [tempCode, setTempCode] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);

  // MOTEUR AUDIO
  const audioRef = useRef(null);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);

  const [isPumping, setIsPumping] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [side, setSide] = useState('both'); 
  const [mode, setMode] = useState('timer'); 
  const [timerTarget, setTimerTarget] = useState(20); 
  
  const [showModal, setShowModal] = useState(false);
  const [volume, setVolume] = useState(100);
  const [history, setHistory] = useState([]);
  const [reminderHours, setReminderHours] = useState(0);

  const [isManualEntry, setIsManualEntry] = useState(false);
  const [manualDate, setManualDate] = useState('');
  const [manualTime, setManualTime] = useState('');

  // Vérification Firebase au lancement ou login
  useEffect(() => {
    const savedLang = localStorage.getItem('pumpum_lang');
    if (savedLang) setLang(savedLang);

    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }

    const checkApprovalAndFetch = async () => {
      if (isLogged && userCode) {
        try {
          // 1. On vérifie si le code est dans la whitelist
          const docRef = doc(db, "approved_families", userCode);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            setIsApproved(true);
            // 2. Si approuvé, on télécharge l'historique Cloud
            const q = query(collection(db, "users", userCode, "sessions"), orderBy("timestamp", "desc"));
            const querySnapshot = await getDocs(q);
            const cloudSessions = [];
            querySnapshot.forEach((doc) => {
              cloudSessions.push({ firebaseId: doc.id, ...doc.data() });
            });
            setHistory(cloudSessions);
            localStorage.setItem('pumpum_history', JSON.stringify(cloudSessions));
          } else {
            // Non approuvé : on reste en local
            setIsApproved(false);
            const saved = localStorage.getItem('pumpum_history');
            if (saved) setHistory(JSON.parse(saved));
          }
        } catch (error) {
          console.error("Erreur Cloud", error);
          setIsApproved(false);
          const saved = localStorage.getItem('pumpum_history');
          if (saved) setHistory(JSON.parse(saved));
        }
      }
    };
    checkApprovalAndFetch();
  }, [isLogged, userCode]);

  const toggleLang = () => {
    const newLang = lang === 'en' ? 'fr' : 'en';
    setLang(newLang);
    localStorage.setItem('pumpum_lang', newLang);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (tempCode.trim().length >= 2) {
      const cleanCode = tempCode.trim().toLowerCase();
      setUserCode(cleanCode);
      setIsLogged(true);
      localStorage.setItem('pumpum_user', cleanCode);
    }
  };

  const handleLogout = () => {
    setIsLogged(false);
    setUserCode('');
    setIsApproved(false);
    setHistory([]);
    localStorage.removeItem('pumpum_user');
    // On garde l'historique local pour ne pas frustrer l'utilisateur non-approuvé
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlayingMusic(false);
    }
  };

  useEffect(() => {
    let interval;
    if (isPumping) {
      interval = setInterval(() => {
        setSeconds((prev) => {
          const next = prev + 1;
          if (mode === 'timer' && next >= timerTarget * 60) {
            setIsPumping(false);
            setIsManualEntry(false);
            setShowModal(true);
            // DÉCLENCHEMENT DE LA MUSIQUE
            if (audioRef.current) {
              audioRef.current.play().catch(e => console.log("Audio bloqué par le navigateur", e));
              setIsPlayingMusic(true);
            }
            return next;
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPumping, mode, timerTarget]);

  const togglePump = () => {
    if (isPumping) {
      setIsPumping(false);
      setIsManualEntry(false);
      setShowModal(true);
    } else {
      setIsPumping(true);
    }
  };

  const openManual = () => {
    setIsPumping(false);
    setSeconds(0);
    setIsManualEntry(true);
    const now = new Date();
    setManualDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
    setManualTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    setShowModal(true);
  };

  const adjustTimer = (amount) => {
    if (!isPumping) setTimerTarget((prev) => Math.max(1, prev + amount));
  };

  const saveSession = async () => {
    stopAudio(); // Coupe la musique quand on sauvegarde
    let sessionDate = (isManualEntry && manualDate && manualTime) ? new Date(`${manualDate}T${manualTime}`) : new Date();
    const durationSaved = seconds > 0 && !isManualEntry ? formatTime(seconds, true) : t.manualDuration;

    const newSession = {
      id: Date.now(),
      timestamp: sessionDate.getTime(),
      dateStr: sessionDate.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { day: '2-digit', month: '2-digit' }),
      timeStr: sessionDate.toLocaleTimeString(lang === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
      duration: durationSaved,
      side,
      volume
    };
    
    // Sauvegarde locale instantanée
    const newHistory = [newSession, ...history].sort((a, b) => b.timestamp - a.timestamp);
    setHistory(newHistory);
    localStorage.setItem('pumpum_history', JSON.stringify(newHistory));
    
    // Sauvegarde Cloud UNIQUEMENT si approuvé
    if (isApproved) {
      try {
        await addDoc(collection(db, "users", userCode, "sessions"), newSession);
      } catch (error) {
        console.error("Erreur de sauvegarde Firebase", error);
      }
    }
    
    if (reminderHours > 0 && "Notification" in window && Notification.permission === "granted") {
      setTimeout(() => {
        new Notification(t.title, { body: lang === 'en' ? "Time for your next pump!" : "C'est l'heure du prochain tirage !" });
      }, reminderHours * 3600 * 1000);
    }

    setShowModal(false);
    setSeconds(0);
    setVolume(100);
    setReminderHours(0);
    setIsManualEntry(false);
  };

  const formatTime = (currentSeconds, forceUp = false) => {
    let displaySeconds = currentSeconds;
    if (mode === 'timer' && !forceUp) displaySeconds = Math.max(0, (timerTarget * 60) - currentSeconds);
    return `${Math.floor(displaySeconds / 60).toString().padStart(2, '0')}:${(displaySeconds % 60).toString().padStart(2, '0')}`;
  };

  const chartData = useMemo(() => {
    const dailyTotals = {};
    history.forEach(session => {
      if(session.dateStr && session.volume) dailyTotals[session.dateStr] = (dailyTotals[session.dateStr] || 0) + session.volume;
    });
    const days = Object.keys(dailyTotals).sort((a, b) => {
      const pA = a.split('/'); const pB = b.split('/');
      return (pA.length === 2 && pB.length === 2) ? (pA[1] + pA[0]).localeCompare(pB[1] + pB[0]) : a.localeCompare(b);
    }).slice(-7);
    const maxVolume = Math.max(...Object.values(dailyTotals), 100);
    return days.map(day => ({ day, total: dailyTotals[day], height: Math.round((dailyTotals[day] / maxVolume) * 100) }));
  }, [history]);

  if (!isLogged) {
    return (
      <div className="min-h-screen bg-orange-50 flex flex-col items-center justify-center p-6 font-sans text-slate-700 relative">
        <button onClick={toggleLang} className="absolute top-6 right-6 font-bold text-slate-400 bg-white px-3 py-1 rounded-full shadow-sm text-sm">{t.langBtn}</button>
        <div className="bg-white p-8 rounded-3xl w-full max-w-sm text-center shadow-xl border border-rose-50">
          <h1 className="text-4xl font-extrabold text-teal-400 mb-2">🍼 PumPum</h1>
          <h2 className="text-xl font-bold text-slate-600 mb-2 mt-6">{t.loginTitle}</h2>
          <p className="text-sm font-medium text-slate-400 mb-8">{t.loginSub}</p>
          <form onSubmit={handleLogin}>
            <input type="password" value={tempCode} onChange={(e) => setTempCode(e.target.value)} placeholder={t.loginPlaceholder} className="w-full bg-orange-50 text-slate-700 font-bold p-4 rounded-2xl mb-6 text-center focus:outline-none focus:ring-2 focus:ring-rose-300"/>
            <button type="submit" className="w-full py-4 bg-rose-300 text-white rounded-2xl font-extrabold text-lg shadow-md active:scale-95 transition-all">{t.loginBtn}</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-50 flex flex-col items-center py-6 px-4 font-sans text-slate-700 relative overflow-x-hidden">
      
      {/* BALISE AUDIO CACHÉE (Doux carillon libre de droits) */}
      <audio ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" preload="auto" />

      {/* STATUT DU CODE FAMILLE (En haut à gauche) */}
      <div className="absolute top-6 left-4">
        <button 
          onClick={() => setShowStatusModal(true)}
          className={`flex items-center gap-1 font-bold px-3 py-1 rounded-full shadow-sm text-xs transition-all ${isApproved ? 'bg-teal-50 text-teal-600 border border-teal-200' : 'bg-orange-100 text-orange-600 border border-orange-200'}`}
        >
          <span className="uppercase opacity-70 mr-1">{userCode}</span>
          {isApproved ? t.statusApproved : t.statusTemp}
        </button>
      </div>

      <div className="absolute top-6 right-4 flex gap-2">
        <button onClick={handleLogout} className="font-bold text-slate-400 bg-white px-3 py-1 rounded-full shadow-sm text-sm">{t.logout}</button>
        <button onClick={toggleLang} className="font-bold text-slate-400 bg-white px-3 py-1 rounded-full shadow-sm text-sm">{t.langBtn}</button>
      </div>

      <div className="text-center mb-6 mt-8">
        <h1 className="text-5xl font-extrabold text-teal-400 mb-2 tracking-tight">{t.title}</h1>
        <p className="text-md font-medium text-slate-500">{t.subtitle}</p>
      </div>

      <div className="flex gap-2 mb-4 bg-white p-2 rounded-full shadow-sm w-full max-w-sm justify-between">
        {['left', 'both', 'right'].map((s) => (
          <button key={s} onClick={() => setSide(s)} className={`flex-1 py-3 rounded-full font-bold text-sm transition-all ${side === s ? 'bg-rose-300 text-white shadow-md' : 'text-slate-400 hover:bg-rose-50'}`}>{t[s]}</button>
        ))}
      </div>

      <button onClick={openManual} className="mb-8 w-full max-w-sm py-4 bg-white text-rose-400 rounded-2xl font-extrabold text-lg shadow-sm hover:bg-rose-50 transition-all active:scale-95 flex items-center justify-center gap-2 border-2 border-rose-100">{t.manualBtn}</button>

      <div className="w-full max-w-sm flex flex-col items-center bg-white p-6 rounded-3xl shadow-sm mb-8 border border-rose-50">
        <div className="flex bg-orange-50 rounded-full p-1 mb-6 w-full">
          <button onClick={() => { if(!isPumping) { setMode('stopwatch'); setSeconds(0); } }} className={`flex-1 py-2 rounded-full font-bold text-sm transition-all ${mode === 'stopwatch' ? 'bg-white text-teal-500 shadow-sm' : 'text-slate-400'}`}>{t.stopwatch}</button>
          <button onClick={() => { if(!isPumping) { setMode('timer'); setSeconds(0); } }} className={`flex-1 py-2 rounded-full font-bold text-sm transition-all ${mode === 'timer' ? 'bg-white text-teal-500 shadow-sm' : 'text-slate-400'}`}>{t.timer}</button>
        </div>

        {mode === 'timer' && (
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => adjustTimer(-1)} disabled={isPumping} className="w-12 h-12 rounded-full bg-rose-50 text-rose-400 font-black text-xl flex items-center justify-center active:bg-rose-100 disabled:opacity-50">-</button>
            <div className="text-xl font-bold text-slate-600 w-24 text-center">{timerTarget} {t.min}</div>
            <button onClick={() => adjustTimer(1)} disabled={isPumping} className="w-12 h-12 rounded-full bg-rose-50 text-rose-400 font-black text-xl flex items-center justify-center active:bg-rose-100 disabled:opacity-50">+</button>
          </div>
        )}

        <button onClick={togglePump} className={`w-64 h-64 rounded-full flex flex-col items-center justify-center shadow-xl transition-all duration-300 active:scale-95 border-8 mb-2 ${isPumping ? 'bg-rose-300 border-rose-200 text-white animate-pulse' : 'bg-orange-50 border-rose-100 text-rose-400 hover:border-rose-200'}`}>
          <span className="text-7xl font-mono font-black mb-2">{formatTime(seconds)}</span>
          <span className="text-xl font-bold opacity-80 uppercase tracking-widest">{isPumping ? t.stop : t.start}</span>
        </button>
      </div>

      {chartData.length > 0 && (
        <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-sm mb-6 border border-rose-50">
          <h2 className="text-lg font-bold text-teal-400 mb-6 flex items-center justify-center gap-2">{t.chartTitle}</h2>
          <div className="flex items-end justify-between h-32 gap-2">
            {chartData.map((data, index) => (
              <div key={index} className="flex flex-col items-center flex-1">
                <span className="text-xs font-bold text-slate-400 mb-1">{data.total}</span>
                <div className="w-full bg-orange-50 rounded-t-md relative flex items-end justify-center" style={{ height: '100px' }}><div className="w-full bg-teal-300 rounded-t-md transition-all duration-500" style={{ height: `${data.height}%` }}></div></div>
                <span className="text-[10px] font-bold text-slate-400 mt-2">{data.day}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-sm mb-10 border border-rose-50">
        <h2 className="text-lg font-bold text-teal-400 mb-4 flex items-center gap-2">{t.victories}</h2>
        {history.length === 0 ? ( <p className="text-slate-400 text-center text-sm font-medium">{t.noSession}</p> ) : (
          <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
            {history.map((session) => (
              <div key={session.id} className="flex justify-between items-center bg-orange-50 p-3 rounded-2xl">
                <div><p className="font-bold text-slate-700 text-lg">{session.volume} mL</p><p className="text-xs text-slate-400 font-medium">{session.dateStr} - {session.timeStr} • {t[session.side] || session.side}</p></div>
                <div className="font-mono text-rose-400 font-bold bg-white px-3 py-1 rounded-full shadow-sm text-sm">{session.duration}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* POP-UP EXPLICATIVE DU STATUT */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowStatusModal(false)}>
          <div className="bg-white p-6 rounded-3xl w-full max-w-xs text-center shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4 text-teal-500">{t.statusModalTitle}</h3>
            <div className={`p-4 rounded-2xl mb-6 ${isApproved ? 'bg-teal-50 text-teal-700' : 'bg-orange-50 text-orange-700'}`}>
              <span className="text-3xl block mb-2">{isApproved ? '✅' : '❗'}</span>
              <p className="font-medium text-sm">{isApproved ? t.statusModalAppr : t.statusModalTemp}</p>
            </div>
            <button onClick={() => setShowStatusModal(false)} className="w-full bg-slate-100 text-slate-600 py-3 rounded-xl font-bold">OK</button>
          </div>
        </div>
      )}

      {/* MODALE DE SAUVEGARDE DE FIN */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white p-6 sm:p-8 rounded-[2rem] w-full max-w-sm text-center shadow-2xl border-4 border-rose-100 my-8">
            <h2 className="text-3xl font-bold mb-2 text-teal-400">{t.bravo}</h2>
            
            {/* BOUTON D'ARRÊT DE LA MUSIQUE */}
            {isPlayingMusic && (
              <button onClick={stopAudio} className="mb-4 mx-auto flex items-center justify-center gap-2 bg-rose-100 text-rose-500 px-4 py-2 rounded-full text-sm font-bold animate-pulse hover:bg-rose-200">
                {t.stopMusic}
              </button>
            )}

            {isManualEntry && (
              <div className="mb-6 bg-orange-50 p-4 rounded-2xl">
                <p className="text-sm font-bold text-teal-400 mb-3">{t.when}</p>
                <div className="flex gap-2">
                  <input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} className="flex-1 bg-white text-teal-600 font-bold p-3 rounded-xl border border-rose-100 text-sm shadow-sm"/>
                  <input type="time" value={manualTime} onChange={(e) => setManualTime(e.target.value)} className="flex-1 bg-white text-teal-600 font-bold p-3 rounded-xl border border-rose-100 text-sm shadow-sm"/>
                </div>
              </div>
            )}
            <p className="mb-4 text-slate-500 font-medium">{t.howMuch}</p>
            <span className="text-6xl font-black text-slate-700 mb-2 block">{volume} <span className="text-2xl text-rose-300">mL</span></span>
            <input type="range" min="0" max="300" step="10" value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="w-full accent-rose-300 mb-6 h-3 bg-orange-50 rounded-lg appearance-none cursor-pointer"/>
            <div className="mb-8 bg-orange-50 p-4 rounded-2xl">
              <p className="text-sm font-bold text-teal-400 mb-3">{t.reminder}</p>
              <div className="flex gap-2 justify-center">
                {[0, 2, 3, 4].map(h => (
                  <button key={h} onClick={() => setReminderHours(h)} className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all ${reminderHours === h ? 'bg-rose-300 text-white shadow-md' : 'bg-white text-slate-400 shadow-sm'}`}>{h === 0 ? t.none : `+${h}h`}</button>
                ))}
              </div>
            </div>
            <button onClick={saveSession} className="w-full bg-rose-300 text-white py-4 rounded-2xl font-bold text-xl shadow-lg shadow-rose-200 mb-3 active:scale-95 transition-all">{t.save}</button>
            <button onClick={() => {stopAudio(); setShowModal(false); setSeconds(0); setReminderHours(0); setIsManualEntry(false);}} className="text-slate-400 font-bold py-2 px-6 rounded-full hover:bg-slate-50">{t.cancel}</button>
          </div>
        </div>
      )}
    </div>
  );
}
