import HomePage from "./pages/home";
import RegisterPage from "./pages/register";
import FadeTransition from "./components/fade-transition";
import { useClientRoute } from "./hooks/use-client-route";
import { useMirrorController } from "./hooks/use-mirror-controller";

export default function App() {
  const { pathname, navigate } = useClientRoute();
  const controller = useMirrorController(navigate);

  return (
    <FadeTransition transitionKey={pathname} className="min-h-screen">
      {pathname === "/register" ? (
        <RegisterPage controller={controller} />
      ) : (
        <HomePage controller={controller} />
      )}
    </FadeTransition>
  );
}
