import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useSettingsStore } from './store/settingsStore';
import { useToastStore } from './store/toastStore';
import Toast from './components/ui/Toast';

// Placeholder components — frontend-1 will replace these
const DeckBrowser = () => <div className="page"><h2>Deck Browser</h2></div>;
const StudyView = () => <div className="page"><h2>Study</h2></div>;
const StatsScreen = () => <div className="page"><h2>Stats</h2></div>;
const SettingsPage = () => <div className="page"><h2>Settings</h2></div>;
const SuccessScreen = () => <div className="page"><h2>Session Complete!</h2></div>;

export default function App() {
  const fetchSettings = useSettingsStore((s) => s.fetchSettings);
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DeckBrowser />} />
        <Route path="/study/:deckId" element={<StudyView />} />
        <Route path="/stats" element={<StatsScreen />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/success/:deckId" element={<SuccessScreen />} />
      </Routes>
      <Toast toasts={toasts} onRemove={removeToast} />
    </BrowserRouter>
  );
}
