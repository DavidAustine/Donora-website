import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import AppLayout from "./components/layout/AppLayout";
import Login     from "./pages/Login";
import DashBoard from "./pages/DashBoard";
import Messages  from "./pages/Messages";
import Matches   from "./pages/Matches";
import Profile   from "./pages/Profile";
import Inventory from "./pages/Inventory";
import Request   from "./pages/Request";

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
  return (
    <div className="App">
      <Routes>
        {/* Public */}
        <Route path="/login" element={
          <PublicRoute><Login /></PublicRoute>
        } />

        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Protected — wrapped in AppLayout */}
        <Route element={
          <ProtectedRoute><AppLayout /></ProtectedRoute>
        }>
          <Route path="/dashboard" element={<DashBoard />} />
          <Route path="/request"   element={<Request />} />
          <Route path="/matches"   element={<Matches />} />
          <Route path="/messages"  element={<Messages />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/profile"   element={<Profile />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  );
}
