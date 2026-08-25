import React, { useState } from 'react';
import type { View } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './views/Dashboard';
import MyLearning from './views/MyLearning';
import LearningPath from './views/LearningPath';
import CoursePlayer from './views/CoursePlayer';
import Quiz from './views/Quiz';
import Progress from './views/Progress';
import CalendarView from './views/CalendarView';
import Certificates from './views/Certificates';
import AITutor from './views/AITutor';
import Notifications from './views/Notifications';
import Assessments from './views/Assessments';
import Discussions from './views/Discussions';
import Assignments from './views/Assignments';
import Login from './views/Login';
import { useAuth } from './context/AuthContext';

const viewTitles: Record<View, string> = {
  dashboard: 'Dashboard',
  'my-learning': 'My Learning',
  'learning-path': 'Learning Paths',
  assessments: 'Assessments',
  assignments: 'Assignments',
  calendar: 'Calendar',
  discussions: 'Discussions',
  certificates: 'Certificates',
  'ai-tutor': 'AI Tutor',
  progress: 'My Progress',
  notifications: 'Notifications',
  'course-player': 'Course Player',
  quiz: 'Assessment',
};

const SIDEBAR_WIDTH = 240;

export default function AppContent() {
  const [view, setView] = useState<View>('dashboard');

  const navigate = (v: View) => {
    setView(v);
    window.scrollTo(0, 0);
  };

  const noHeaderViews: View[] = ['course-player'];
  const fullHeightViews: View[] = ['course-player', 'ai-tutor'];

  const { user } = useAuth();

  if (!user) {
    return <Login />;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F8FAFC' }}>
      {/* Desktop Sidebar */}
      <Sidebar activeView={view} onNavigate={navigate} />

      {/* Main content area */}
      <div
        style={{
          flex: 1,
          marginLeft: SIDEBAR_WIDTH,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
        }}
      >
        {!noHeaderViews.includes(view) && (
          <Header onNavigate={navigate} title={viewTitles[view]} />
        )}

        <main
          style={{
            flex: 1,
            background: '#F8FAFC',
            overflow: fullHeightViews.includes(view) ? 'hidden' : 'auto',
          }}
        >
          {view === 'dashboard' && <Dashboard onNavigate={navigate} />}
          {view === 'my-learning' && <MyLearning onNavigate={navigate} />}
          {view === 'learning-path' && <LearningPath onNavigate={navigate} />}
          {view === 'course-player' && <CoursePlayer onNavigate={navigate} />}
          {view === 'quiz' && <Quiz onNavigate={navigate} />}
          {view === 'progress' && <Progress />}
          {view === 'calendar' && <CalendarView />}
          {view === 'certificates' && <Certificates />}
          {view === 'ai-tutor' && <AITutor />}
          {view === 'notifications' && <Notifications />}
          {view === 'assessments' && <Assessments onNavigate={navigate} />}
          {view === 'discussions' && <Discussions />}
          {view === 'assignments' && <Assignments onNavigate={navigate} />}
        </main>

        {/* Mobile bottom navigation */}
        <nav
          className="mobile-nav"
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: '#FFFFFF',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            padding: '8px 0 max(8px, env(safe-area-inset-bottom))',
            zIndex: 50,
          }}
        >
          {/* Nav items omitted for brevity */}
        </nav>
      </div>
    </div>
  );
}
