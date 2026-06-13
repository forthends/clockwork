import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import TaskBoard from './pages/TaskBoard';
import TaskDetail from './pages/TaskDetail';
import TaskReview from './pages/TaskReview';
import KnowledgeBrowser from './pages/KnowledgeBrowser';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/tasks" replace />} />
        <Route path="/tasks" element={<TaskBoard />} />
        <Route path="/tasks/:taskId" element={<TaskDetail />} />
        <Route path="/tasks/:taskId/review" element={<TaskReview />} />
        <Route path="/knowledge" element={<KnowledgeBrowser />} />
      </Routes>
    </Layout>
  );
}
