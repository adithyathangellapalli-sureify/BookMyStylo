import { Navigate, Route, Routes } from "react-router-dom";
import { Spinner } from "@bookmystylo/ui";
import { AuthProvider, useAuth } from "./auth";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ChairsPage } from "./pages/ChairsPage";
import { SchedulePage } from "./pages/SchedulePage";
import { EarningsPage } from "./pages/EarningsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { AdminPage } from "./pages/AdminPage";

function Gate({ children }: { children: JSX.Element }) {
  const { user, ready, hasShop } = useAuth();
  if (!ready) return <div className="center-screen" style={{ minHeight: "100vh" }}><Spinner /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "PARTNER" && !hasShop) return <Navigate to="/register" replace />;
  return children;
}
function Home() {
  const { user, me } = useAuth();
  if (user?.role === "SUPER_ADMIN") return <Navigate to="/admin" replace />;
  if (me && !me.staff.isAdmin) return <Navigate to="/dashboard" replace />;
  return <Navigate to="/dashboard" replace />;
}
function AdminOnly({ children }: { children: JSX.Element }) {
  const { me } = useAuth();
  return me?.staff.isAdmin ? children : <Navigate to="/dashboard" replace />;
}
function SuperOnly({ children }: { children: JSX.Element }) {
  const { user } = useAuth();
  return user?.role === "SUPER_ADMIN" ? children : <Navigate to="/" replace />;
}

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<Gate><Layout /></Gate>}>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/chairs" element={<AdminOnly><ChairsPage /></AdminOnly>} />
          <Route path="/schedule" element={<AdminOnly><SchedulePage /></AdminOnly>} />
          <Route path="/earnings" element={<EarningsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/admin" element={<SuperOnly><AdminPage /></SuperOnly>} />
          <Route path="/admin/:tab" element={<SuperOnly><AdminPage /></SuperOnly>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
