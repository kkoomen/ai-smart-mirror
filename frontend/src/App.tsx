import HomePage from "./pages/home";
import RegisterPage from "./pages/register";
import FadeTransition from "./components/fade-transition";
import { useMirrorController } from "./hooks/use-mirror-controller";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate
} from "react-router-dom";

const isReloadNavigation = () =>
  window.performance.getEntriesByType("navigation")[0]?.type === "reload";

function AppRoutes() {
  const location = useLocation();
  const routerNavigate = useNavigate();

  const navigate = (path: string) => {
    if (path === "/register") {
      routerNavigate(path, { state: { source: "mirror" } });
      return;
    }

    routerNavigate(path);
  };

  const controller = useMirrorController(navigate);
  const canEnterRegister = location.state?.source === "mirror" && !isReloadNavigation();

  return (
    <FadeTransition transitionKey={location.pathname} className="min-h-screen">
      <Routes location={location}>
        <Route path="/" element={<HomePage controller={controller} />} />
        <Route
          path="/register"
          element={canEnterRegister ? <RegisterPage controller={controller} /> : <Navigate to="/" replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </FadeTransition>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
