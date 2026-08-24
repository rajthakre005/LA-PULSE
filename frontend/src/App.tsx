import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getToken } from './api';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import StateDashboard from './pages/StateDashboard';
import ProjectWarRoom from './pages/ProjectWarRoom';
import AlertCenter from './pages/AlertCenter';
import ModelMetrics from './pages/ModelMetrics';
import Analytics from './pages/Analytics';
import DocumentIntelligence from './pages/DocumentIntelligence';
import './index.css';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return getToken() ? <>{children}</> : <Navigate to="/login" />;
}

export default function App() {
  const [, setRefresh] = useState(0);
  useEffect(() => { setRefresh(1); }, []);
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/state/:state" element={<StateDashboard />} />
                <Route path="/project/:id" element={<ProjectWarRoom />} />
                <Route path="/alerts" element={<AlertCenter />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/documents" element={<DocumentIntelligence />} />
                <Route path="/model" element={<ModelMetrics />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}
