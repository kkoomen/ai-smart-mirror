import HomePage from "./pages/home";
import ChangeLanguagePage from "./pages/change-lang";
import RegisterPage from "./pages/register";
import FadeTransition from "./components/fade-transition";
import VoiceActivityIndicator from "./components/voice-activity-indicator";
import { useMirrorController } from "./features/mirror/use-mirror-controller";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

function AppRoutes() {
  const location = useLocation();
  const routerNavigate = useNavigate();
  const [allowedMirrorRoute, setAllowedMirrorRoute] = useState<string | null>(null);

  const navigate = (path: string) => {
    if (path === "/register" || path === "/change-lang") {
      setAllowedMirrorRoute(path);
      routerNavigate(path);
      return;
    }

    setAllowedMirrorRoute(null);
    routerNavigate(path);
  };

  const controller = useMirrorController(navigate);
  const canEnterMirrorRoute = allowedMirrorRoute === location.pathname;
  const canEnterChangeLanguageRoute =
    canEnterMirrorRoute && controller.hasRegisteredUsers && !!controller.registeredUser;

  useEffect(() => {
    if (location.pathname === "/") {
      setAllowedMirrorRoute(null);
    }
  }, [location.pathname]);

  return (
    <>
      <FadeTransition transitionKey={location.pathname} className="min-h-screen">
        <Routes location={location}>
          <Route path="/" element={<HomePage controller={controller} />} />
          <Route
            path="/register"
            element={
              canEnterMirrorRoute ? (
                <RegisterPage controller={controller} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/change-lang"
            element={
              canEnterChangeLanguageRoute ? (
                <ChangeLanguagePage controller={controller} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </FadeTransition>
      <VoiceActivityIndicator visible={controller.phase !== "scan"} />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
