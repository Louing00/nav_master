import { Navigate, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import AdminLayout from './pages/AdminLayout';
import AdminApps from './pages/AdminApps';
import AdminCategories from './pages/AdminCategories';
import AdminSettings from './pages/AdminSettings';
import ImportExport from './pages/ImportExport';
import SystemDetail from './pages/SystemDetail';
import AdminSecurity from './pages/AdminSecurity';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/systems/:id" element={<SystemDetail />} />
      <Route path="/admin/login" element={<Login />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/apps" replace />} />
        <Route path="apps" element={<AdminApps />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="import-export" element={<ImportExport />} />
        <Route path="security" element={<AdminSecurity />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
