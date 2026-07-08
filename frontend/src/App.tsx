import HomePage from "./pages/home";
import RegisterPage from "./pages/register";
import { useClientRoute } from "./hooks/use-client-route";
import { useMirrorController } from "./hooks/use-mirror-controller";

export default function App() {
  const { pathname, navigate } = useClientRoute();
  const controller = useMirrorController(navigate);

  if (pathname === "/register") {
    return <RegisterPage controller={controller} />;
  }

  return <HomePage controller={controller} />;
}
