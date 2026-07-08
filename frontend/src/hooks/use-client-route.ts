import { useEffect, useState } from "react";

export const useClientRoute = () => {
  const [pathname, setPathname] = useState(() => window.location.pathname);

  useEffect(() => {
    const navigationEntry = window.performance.getEntriesByType("navigation")[0];
    const legacyNavigation = (window.performance as Performance & {
      navigation?: { type: number };
    }).navigation;
    const navigationType =
      navigationEntry?.type ?? (legacyNavigation?.type === 1 ? "reload" : "navigate");

    if (
      window.location.pathname === "/register" &&
      (navigationType === "reload" || window.history.state?.source !== "mirror")
    ) {
      window.history.replaceState({ source: "mirror" }, "", "/");
      setPathname("/");
      return;
    }

    const handlePopState = () => {
      if (
        window.location.pathname === "/register" &&
        window.history.state?.source !== "mirror"
      ) {
        window.history.replaceState({ source: "mirror" }, "", "/");
        setPathname("/");
        return;
      }

      setPathname(window.location.pathname);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = (nextPath: string) => {
    if (window.location.pathname === nextPath) {
      return;
    }

    window.history.pushState({ source: "mirror" }, "", nextPath);
    setPathname(nextPath);
  };

  return { pathname, navigate };
};
