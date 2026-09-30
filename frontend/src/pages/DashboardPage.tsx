import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import ScheduledEmails from '../components/ScheduledEmails';
import SentEmails from '../components/SentEmails';
import ComposeModal from '../components/ComposeModal';

export type TabType = 'scheduled' | 'sent';

export default function DashboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('scheduled');
  const [composeOpen, setComposeOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleScheduleComplete = () => {
    setComposeOpen(false);
    setActiveTab('scheduled');
    setRefreshKey((k) => k + 1);
  };

  if (!user) return null;

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onCompose={() => setComposeOpen(true)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="animate-fade-in">
            {activeTab === 'scheduled' && (
              <ScheduledEmails key={`scheduled-${refreshKey}`} />
            )}
            {activeTab === 'sent' && (
              <SentEmails key={`sent-${refreshKey}`} />
            )}
          </div>
        </main>
      </div>

      {/* Compose Modal */}
      {composeOpen && (
        <ComposeModal
          onClose={() => setComposeOpen(false)}
          onScheduleComplete={handleScheduleComplete}
        />
      )}
    </div>
  );
}
