import { Outlet } from 'react-router-dom';
import { Toaster } from '~/components/ui/Toaster';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-surface-primary">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
      <Toaster />
    </div>
  );
}
