import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useSettingsStore } from './store/settingsStore';
import { useToastStore } from './store/toastStore';
import AppShell from './components/ui/AppShell';
import ErrorBoundary from './components/ui/ErrorBoundary';
import Toast from './components/ui/Toast';
import DeckBrowser from './components/deck/DeckBrowser';
import ImportModal from './components/deck/ImportModal';
import StudyView from './components/study/StudyView';
import SettingsPage from './components/settings/SettingsPage';
import StatsScreen from './components/stats/StatsScreen';
import SuccessScreen from './components/success/SuccessScreen';

export default function App() {
  const fetchSettings = useSettingsStore((s) => s.fetchSettings);
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);
  const [importModalOpen, setImportModalOpen] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<DeckBrowser onOpenImport={() => setImportModalOpen(true)} />} />
            <Route path="/stats" element={<StatsScreen />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="/study/:deckId" element={<StudyView />} />
          <Route path="/success/:deckId" element={<SuccessScreen />} />
        </Routes>
        {importModalOpen && <ImportModal onClose={() => setImportModalOpen(false)} />}
        <Toast toasts={toasts} onRemove={removeToast} />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
