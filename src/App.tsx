import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './lib/auth';
import Login from './components/Login';
import Layout from './components/Layout';
import ParticipantHome from './pages/ParticipantHome';
import Quiz from './pages/Quiz';
import MyReport from './pages/MyReport';
import ResumeTools from './pages/ResumeTools';
import DrillsArena from './pages/DrillsArena';
import AudioStudio from './pages/AudioStudio';
import Profile from './pages/Profile';
import Analytics from './pages/Analytics';
import FeedbackPage from './pages/FeedbackPage';
import SessionControl from './pages/SessionControl';
import Enrollment from './pages/Enrollment';
import CertificatePage from './pages/CertificatePage';
import CertAdmin from './pages/CertAdmin';
import NbaReport from './pages/NbaReport';
import AdminActivity from './pages/AdminActivity';
import AdminParticipantView from './pages/AdminParticipantView';
import TrainerDashboard from './pages/TrainerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Participants from './pages/Participants';
import Reports from './pages/Reports';

function Shell() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">Loading…</div>;
  if (!user) return <Login />;

  const home = user.role === 'admin' ? '/admin' : user.role === 'trainer' ? '/trainer' : '/';
  const isParticipant = user.role === 'participant';
  const isStaff = user.role === 'trainer' || user.role === 'admin';

  return (
    <Layout>
      <BoundaryByRoute>
      <Routes>
        <Route path="/" element={isParticipant ? <ParticipantHome /> : <Navigate to={home} />} />
        <Route path="/report" element={isParticipant ? <MyReport /> : <Navigate to={home} />} />
        <Route path="/resume" element={isParticipant ? <ResumeTools /> : <Navigate to={home} />} />
        <Route path="/audio" element={isParticipant ? <AudioStudio /> : <Navigate to={home} />} />
        <Route path="/profile" element={isParticipant ? <Profile /> : <Navigate to={home} />} />
        <Route path="/feedback" element={isParticipant ? <FeedbackPage /> : <Navigate to={home} />} />
        <Route path="/certificate" element={isParticipant ? <CertificatePage /> : <Navigate to={home} />} />

        <Route path="/quiz" element={<Quiz />} />
        <Route path="/drills" element={<DrillsArena />} />

        <Route path="/trainer" element={isStaff ? <TrainerDashboard /> : <Navigate to={home} />} />
        <Route path="/analytics" element={isStaff ? <Analytics /> : <Navigate to={home} />} />
        <Route path="/reports" element={isStaff ? <Reports /> : <Navigate to={home} />} />
        <Route path="/sessions" element={isStaff ? <SessionControl /> : <Navigate to={home} />} />
        <Route path="/enrollment" element={isStaff ? <Enrollment /> : <Navigate to={home} />} />
        <Route path="/participants" element={isStaff ? <Participants /> : <Navigate to={home} />} />

        <Route path="/admin" element={user.role === 'admin' ? <AdminDashboard /> : <Navigate to={home} />} />
        <Route path="/certadmin" element={user.role === 'admin' ? <CertAdmin /> : <Navigate to={home} />} />
        <Route path="/nba" element={isStaff ? <NbaReport /> : <Navigate to={home} />} />
        <Route path="/activity" element={user.role === 'admin' ? <AdminActivity /> : <Navigate to={home} />} />
        <Route path="/admin/participant/:userId/report" element={isStaff ? <AdminParticipantView /> : <Navigate to={home} />} />
        <Route path="/admin/participant/:userId/certificate" element={isStaff ? <AdminParticipantView /> : <Navigate to={home} />} />

        <Route path="*" element={<Navigate to={home} />} />
      </Routes>
      </BoundaryByRoute>
    </Layout>
  );
}

function BoundaryByRoute({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  return <ErrorBoundary resetKey={loc.pathname}>{children}</ErrorBoundary>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </AuthProvider>
  );
}
