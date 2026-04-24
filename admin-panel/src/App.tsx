import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from '~/components/layout/Layout';
import { useAuth } from '~/hooks/useAuth';
import { getActiveTenant, isMultiTenant } from '~/lib/tenant';
import { Login } from '~/pages/Login';
import { Dashboard } from '~/pages/Dashboard';
import { Users } from '~/pages/Users';
import { Organizations } from '~/pages/Organizations';
import { Credits } from '~/pages/Credits';
import { Billing } from '~/pages/Billing';
import { Agents } from '~/pages/Agents';
import { Plans } from '~/pages/Plans';
import { ModelAccess } from '~/pages/ModelAccess';
import { Access } from '~/pages/Access';
import { Grants } from '~/pages/Grants';
import { Configuration } from '~/pages/Configuration';
import { Settings } from '~/pages/Settings';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { authenticated } = useAuth();
  if (!authenticated) return <Navigate to="/login" replace />;
  if (isMultiTenant() && !getActiveTenant()) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="organizations" element={<Organizations />} />
        <Route path="credits" element={<Credits />} />
        <Route path="billing" element={<Billing />} />
        <Route path="agents" element={<Agents />} />
        <Route path="plans" element={<Plans />} />
        <Route path="model-access" element={<ModelAccess />} />
        <Route path="access" element={<Access />} />
        <Route path="grants" element={<Grants />} />
        <Route path="configuration" element={<Configuration />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
