import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/auth";
import { useBootstrap } from "./lib/useBootstrap";
import Login from "./routes/Login";
import Dashboard from "./routes/Dashboard";
import Category from "./routes/Category";
import EbookReader from "./routes/EbookReader";
import Settings from "./routes/Settings";
import Admin from "./routes/Admin";
import AppLayout from "./components/AppLayout";

function Protected({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (user?.role !== "admin") return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  useBootstrap();
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <Protected>
            <AppLayout />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="category/:code" element={<Category />} />
        <Route path="read/:ebookId" element={<EbookReader />} />
        <Route path="settings" element={<Settings />} />
        <Route
          path="admin"
          element={
            <RequireAdmin>
              <Admin />
            </RequireAdmin>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}