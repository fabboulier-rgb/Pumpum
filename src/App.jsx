import React, { useState, useEffect, useMemo } from 'react';

// Dictionnaire Bilingue
const translations = {
  en: {
    title: "🍼 PumPum", subtitle: "Relax, you got this! 💖",
    manualBtn: "✍️ Manual Entry",
    left: "Left", both: "Both", right: "Right",
    start: "START", stop: "STOP",
    chartTitle: "📊 Weekly Summary (mL)",
    victories: "🏆 Your victories", noSession: "No session yet. Your turn!",
    bravo: "Great job! 🎉", howMuch: "How much did you pump?",
    save: "Save", cancel: "Cancel",
    reminder: "🔔 Next pump reminder:", none: "None",
    manualDuration: "Manual",
    langBtn: "🇫🇷 FR",
    stopwatch: "⏱️ Stopwatch", timer: "⏳ Timer", min: "min",
    when: "🗓️ When was it?"
  },
  fr: {
    title: "🍼 PumPum", subtitle: "Détends-toi, tu gères ! 💖",
    manualBtn: "✍️ Saisie Manuelle",
    left: "Gauche", both: "Les deux", right: "Droite",
    start: "START", stop: "STOP",
    chartTitle: "📊 Résumé Hebdomadaire (mL)",
    victories: "🏆 Tes victoires", noSession: "Pas encore de session. À toi !",
    bravo: "Bravo ! 🎉", howMuch: "Combien as-tu récolté ?",
    save: "Sauvegarder", cancel: "Annuler",
    reminder: "🔔 Rappel prochain tirage :", none: "Non",
    manualDuration: "Manuel",
    langBtn: "🇬🇧 EN",
    stopwatch: "⏱️ Chrono", timer: "⏳ Timer", min: "min",
    when: "🗓️ Quand était-ce ?"
  }
};

export default function App() {
  const [lang, setLang] = useState('en');
  const t = translations[lang];

  const [isPumping, setIsPumping] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [side, setSide] = useState('both'); 
  
  const [mode, setMode] = useState('timer'); 
  const [timerTarget, setTimerTarget] = useState(20); 
  
  const [showModal, setShowModal] = useState(false);
  const [volume, setVolume] = useState(100);
  const [history, setHistory] = useState([]);
  const [reminderHours, setReminderHours] = useState(0);

  // NOUVEAUX ÉTATS POUR LA DATE MANUELLE
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [manualDate, setManualDate] = useState('');
  const [manualTime, setManualTime] = useState('');

  // Initialisation
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://cdn.tailwindcss.com";
    document.head.appendChild(script);
    
    const saved = localStorage.getItem('pumpum_history');
    if (saved) setHistory(JSON.parse(saved));

    const savedLang = localStorage.getItem('pumpum_lang');
    if (savedLang) setLang(savedLang);

    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  }, []);

  const toggleLang = () => {
    const newLang = lang === 'en' ? 'fr' : 'en';
    setLang(newLang);
    localStorage.setItem('pumpum_lang', newLang);
  };

  // Moteur du Chrono & Timer
  useEffect(() => {
    let interval;
    if (isPumping) {
      interval = setInterval(() => {
        setSeconds((prev) => {
          const next = prev + 1;
          if (mode === 'timer' && next >= timerTarget * 60) {
            setIsPumping(false);
            setIsManualEntry(false); // Ce n'est pas une saisie manuelle
            setShowModal(true);
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
      setIsManualEntry(false); // Ce n'est pas une saisie manuelle
      setShowModal(true);
    } else {
      setIsPumping(true);
    }
  };

  const openManual = () => {
    setIsPumping(false);
    setSeconds(0);
    setIsManualEntry(true);
    
    // Générer la date et l'heure locale exacte
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    setManualDate(`${year}-${month}-${day}`);
    
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    setManualTime(`${hours}:${minutes}`);

    setShowModal(true);
  };

  const adjustTimer = (amount) => {
    if (!isPumping) {
      setTimerTarget((prev) => Math.max(1, prev + amount));
    }
  };

  const saveSession = () => {
    // Calcul de la date finale (Manuelle ou Instantanée)
    let sessionDate;
    if (isManualEntry && manualDate && manualTime) {
      sessionDate = new Date(`${manualDate}T${manualTime}`);
    } else {
      sessionDate = new Date();
    }

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
    
    // On trie l'historique par date pour que les saisies manuelles passées se rangent au bon endroit
    const newHistory = [newSession, ...history].sort((a, b) => b.timestamp - a.timestamp);
    
    setHistory(newHistory);
    localStorage.setItem('pumpum_history', JSON.stringify(newHistory));
    
    if (reminderHours > 0 && "Notification" in window) {
      if (Notification.permission === "granted") {
        setTimeout(() => {
          new Notification(t.title, { body: lang === 'en' ? "Time for your next pump!" : "C'est l'heure du prochain tirage !" });
        }, reminderHours * 3600 * 1000);
      }
    }

    setShowModal(false);
    setSeconds(0);
    setVolume(100);
    setReminderHours(0);
    setIsManualEntry(false);
  };

  const formatTime = (currentSeconds, forceUp = false) => {
    let displaySeconds = currentSeconds;
    if (mode === 'timer' && !forceUp) {
      displaySeconds = Math.max(0, (timerTarget * 60) - currentSeconds);
    }
    const m = Math.floor(displaySeconds / 60).toString().padStart(2, '0');
    const s = (displaySeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const chartData = useMemo(() => {
    const dailyTotals = {};
    history.forEach(session => {
      if(session.dateStr && session.volume) {
        dailyTotals[session.dateStr] = (dailyTotals[session.dateStr] || 0) + session.volume;
      }
    });
    // Trier les jours chronologiquement pour le graphique
    const days = Object.keys(dailyTotals).sort((a, b) => {
      // Comparaison basique pour s'assurer que l'ordre est bon
      const partsA = a.split('/');
      const partsB = b.split('/');
      if(partsA.length === 2 && partsB.length === 2) {
         return (partsA[1] + partsA[0]).localeCompare(partsB[1] + partsB[0]);
      }
      return a.localeCompare(b);
    }).slice(-7); // Garder les 7 derniers

    const maxVolume = Math.max(...Object.values(dailyTotals), 100);
    return days.map(day => ({
      day, total: dailyTotals[day], height: Math.round((dailyTotals[day] / maxVolume) * 100)
    }));
  }, [history]);

  return (
    <div className="min-h-screen bg-orange-50 flex flex-col items-center py-6 px-4 font-sans text-slate-700 relative overflow-x-hidden">
      
      <button onClick={toggleLang} className="absolute top-6 right-6 font-bold text-slate-400 bg-white px-3 py-1 rounded-full shadow-sm text-sm">
        {t.langBtn}
      </button>

      <div className="text-center mb-6 mt-4">
        <h1 className="text-5xl font-extrabold text-teal-400 mb-2 tracking-tight">
          {t.title}
        </h1>
        <p className="text-md font-medium text-slate-500">{t.subtitle}</p>
      </div>

      <div className="flex gap-2 mb-4 bg-white p-2 rounded-full shadow-sm w-full max-w-sm justify-between">
        {['left', 'both', 'right'].map((s) => (
          <button
            key={s}
            onClick={() => setSide(s)}
            className={`flex-1 py-3 rounded-full font-bold text-sm transition-all ${
              side === s ? 'bg-rose-300 text-white shadow-md' : 'text-slate-400 hover:bg-rose-50'
            }`}
          >
            {t[s]}
          </button>
        ))}
      </div>

      <button 
        onClick={openManual}
        className="mb-8 w-full max-w-sm py-4 bg-white text-rose-400 rounded-2xl font-extrabold text-lg shadow-sm hover:bg-rose-50 transition-all active:scale-95 flex items-center justify-center gap-2 border-2 border-rose-100"
      >
        {t.manualBtn}
      </button>

      <div className="w-full max-w-sm flex flex-col items-center bg-white p-6 rounded-3xl shadow-sm mb-8 border border-rose-50">
        
        <div className="flex bg-orange-50 rounded-full p-1 mb-6 w-full">
          <button 
            onClick={() => { if(!isPumping) { setMode('stopwatch'); setSeconds(0); } }}
            className={`flex-1 py-2 rounded-full font-bold text-sm transition-all ${mode === 'stopwatch' ? 'bg-white text-teal-500 shadow-sm' : 'text-slate-400'}`}
          >
            {t.stopwatch}
          </button>
          <button 
            onClick={() => { if(!isPumping) { setMode('timer'); setSeconds(0); } }}
            className={`flex-1 py-2 rounded-full font-bold text-sm transition-all ${mode === 'timer' ? 'bg-white text-teal-500 shadow-sm' : 'text-slate-400'}`}
          >
            {t.timer}
          </button>
        </div>

        {mode === 'timer' && (
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => adjustTimer(-1)} disabled={isPumping} className="w-12 h-12 rounded-full bg-rose-50 text-rose-400 font-black text-xl flex items-center justify-center active:bg-rose-100 disabled:opacity-50">-</button>
            <div className="text-xl font-bold text-slate-600 w-24 text-center">{timerTarget} {t.min}</div>
            <button onClick={() => adjustTimer(1)} disabled={isPumping} className="w-12 h-12 rounded-full bg-rose-50 text-rose-400 font-black text-xl flex items-center justify-center active:bg-rose-100 disabled:opacity-50">+</button>
          </div>
        )}

        <button 
          onClick={togglePump}
          className={`w-64 h-64 rounded-full flex flex-col items-center justify-center shadow-xl transition-all duration-300 active:scale-95 border-8 mb-2 ${
            isPumping 
              ? 'bg-rose-300 border-rose-200 text-white animate-pulse' 
              : 'bg-orange-50 border-rose-100 text-rose-400 hover:border-rose-200'
          }`}
        >
          <span className="text-7xl font-mono font-black mb-2">{formatTime(seconds)}</span>
          <span className="text-xl font-bold opacity-80 uppercase tracking-widest">
            {isPumping ? t.stop : t.start}
          </span>
        </button>
      </div>

      {chartData.length > 0 && (
        <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-sm mb-6 border border-rose-50">
          <h2 className="text-lg font-bold text-teal-400 mb-6 flex items-center justify-center gap-2">{t.chartTitle}</h2>
          <div className="flex items-end justify-between h-32 gap-2">
            {chartData.map((data, index) => (
              <div key={index} className="flex flex-col items-center flex-1">
                <span className="text-xs font-bold text-slate-400 mb-1">{data.total}</span>
                <div className="w-full bg-orange-50 rounded-t-md relative flex items-end justify-center" style={{ height: '100px' }}>
                  <div 
                    className="w-full bg-teal-300 rounded-t-md transition-all duration-500"
                    style={{ height: `${data.height}%` }}
                  ></div>
                </div>
                <span className="text-[10px] font-bold text-slate-400 mt-2">{data.day}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-sm mb-10 border border-rose-50">
        <h2 className="text-lg font-bold text-teal-400 mb-4 flex items-center gap-2">{t.victories}</h2>
        {history.length === 0 ? (
          <p className="text-slate-400 text-center text-sm font-medium">{t.noSession}</p>
        ) : (
          <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
            {history.map((session) => (
              <div key={session.id} className="flex justify-between items-center bg-orange-50 p-3 rounded-2xl">
                <div>
                  <p className="font-bold text-slate-700 text-lg">{session.volume} mL</p>
                  <p className="text-xs text-slate-400 font-medium">{session.dateStr} - {session.timeStr} • {t[session.side] || session.side}</p>
                </div>
                <div className="font-mono text-rose-400 font-bold bg-white px-3 py-1 rounded-full shadow-sm text-sm">
                  {session.duration}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white p-6 sm:p-8 rounded-[2rem] w-full max-w-sm text-center shadow-2xl border-4 border-rose-100 my-8">
            <h2 className="text-3xl font-bold mb-2 text-teal-400">{t.bravo}</h2>
            
            {/* BLOC DATE ET HEURE (Visible uniquement en saisie manuelle) */}
            {isManualEntry && (
              <div className="mb-6 bg-orange-50 p-4 rounded-2xl">
                <p className="text-sm font-bold text-teal-400 mb-3">{t.when}</p>
                <div className="flex gap-2">
                  <input 
                    type="date" 
                    value={manualDate} 
                    onChange={(e) => setManualDate(e.target.value)}
                    className="flex-1 bg-white text-teal-600 font-bold p-3 rounded-xl border border-rose-100 text-sm shadow-sm"
                  />
                  <input 
                    type="time" 
                    value={manualTime} 
                    onChange={(e) => setManualTime(e.target.value)}
                    className="flex-1 bg-white text-teal-600 font-bold p-3 rounded-xl border border-rose-100 text-sm shadow-sm"
                  />
                </div>
              </div>
            )}

            <p className="mb-4 text-slate-500 font-medium">{t.howMuch}</p>
            
            <span className="text-6xl font-black text-slate-700 mb-2 block">{volume} <span className="text-2xl text-rose-300">mL</span></span>
            
            <input 
              type="range" min="0" max="300" step="10" 
              value={volume} onChange={(e) => setVolume(Number(e.target.value))}
              className="w-full accent-rose-300 mb-6 h-3 bg-orange-50 rounded-lg appearance-none cursor-pointer"
            />

            <div className="mb-8 bg-orange-50 p-4 rounded-2xl">
              <p className="text-sm font-bold text-teal-400 mb-3">{t.reminder}</p>
              <div className="flex gap-2 justify-center">
                {[0, 2, 3, 4].map(h => (
                  <button
                    key={h}
                    onClick={() => setReminderHours(h)}
                    className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all ${
                      reminderHours === h 
                        ? 'bg-rose-300 text-white shadow-md' 
                        : 'bg-white text-slate-400 shadow-sm'
                    }`}
                  >
                    {h === 0 ? t.none : `+${h}h`}
                  </button>
                ))}
              </div>
            </div>
            
            <button onClick={saveSession} className="w-full bg-rose-300 text-white py-4 rounded-2xl font-bold text-xl shadow-lg shadow-rose-200 mb-3 active:scale-95 transition-all">
              {t.save}
            </button>
            <button onClick={() => {setShowModal(false); setSeconds(0); setReminderHours(0); setIsManualEntry(false);}} className="text-slate-400 font-bold py-2 px-6 rounded-full hover:bg-slate-50">
              {t.cancel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
