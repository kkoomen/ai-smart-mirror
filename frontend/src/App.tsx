import HomePage from "./pages/home";
import ChangeLanguagePage from "./pages/change-lang";
import RegisterPage from "./pages/register";
import FadeTransition from "./components/fade-transition";
import VoiceActivityIndicator from "./components/voice-activity-indicator";
import { CHANGE_LANGUAGE_ROUTE, HOME_ROUTE, REGISTER_ROUTE } from "./constants";
import { useMirrorController } from "./controllers/use-mirror-controller";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

function AppRoutes() {
  const location = useLocation();
  const routerNavigate = useNavigate();
  const [allowedMirrorRoute, setAllowedMirrorRoute] = useState<string | null>(null);

  const navigate = (path: string) => {
    if (path === REGISTER_ROUTE || path === CHANGE_LANGUAGE_ROUTE) {
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
    if (location.pathname === HOME_ROUTE) {
      setAllowedMirrorRoute(null);
    }
  }, [location.pathname]);

  return (
    <>
      <FadeTransition transitionKey={location.pathname} className="app-full-screen">
        <Routes location={location}>
          <Route path={HOME_ROUTE} element={<HomePage controller={controller} />} />
          <Route
            path={REGISTER_ROUTE}
            element={
              canEnterMirrorRoute ? (
                <RegisterPage controller={controller} />
              ) : (
                <Navigate to={HOME_ROUTE} replace />
              )
            }
          />
          <Route
            path={CHANGE_LANGUAGE_ROUTE}
            element={
              canEnterChangeLanguageRoute ? (
                <ChangeLanguagePage controller={controller} />
              ) : (
                <Navigate to={HOME_ROUTE} replace />
              )
            }
          />
          <Route path="*" element={<Navigate to={HOME_ROUTE} replace />} />
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
