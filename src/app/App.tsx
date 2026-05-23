import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { lazy, Suspense, useRef, type ComponentType } from "react";
import { AppErrorBoundary } from "../components/layout/AppErrorBoundary";
import { AppProviders } from "../providers/AppProviders";
import { LandingPage } from "../pages/LandingPage";
import { useGsapSwap } from "../hooks/useGsapSwap";

const chunkReloadKey = "oria:chunk-reload-at";

function isDynamicImportError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return (
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("Importing a module script failed") ||
    message.includes("error loading dynamically imported module") ||
    message.includes("ChunkLoadError")
  );
}

function lazyWithChunkReload<T extends ComponentType<unknown>>(
  loader: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      return await loader();
    } catch (error) {
      if (isDynamicImportError(error) && typeof window !== "undefined") {
        const lastReloadAt = Number(window.sessionStorage.getItem(chunkReloadKey) || 0);

        if (Date.now() - lastReloadAt > 10_000) {
          window.sessionStorage.setItem(chunkReloadKey, String(Date.now()));
          window.location.reload();
          return new Promise<{ default: T }>(() => undefined);
        }
      }

      throw error;
    }
  });
}

const CreateSpacePage = lazyWithChunkReload(() =>
  import("../pages/CreateSpacePage").then((module) => ({ default: module.CreateSpacePage }))
);
const SpacesPage = lazyWithChunkReload(() =>
  import("../pages/SpacesPage").then((module) => ({ default: module.SpacesPage }))
);
const SpaceDetailPage = lazyWithChunkReload(() =>
  import("../pages/SpaceDetailPage").then((module) => ({ default: module.SpaceDetailPage }))
);
const CreatorPage = lazyWithChunkReload(() =>
  import("../pages/CreatorPage").then((module) => ({ default: module.CreatorPage }))
);
const VaultPage = lazyWithChunkReload(() =>
  import("../pages/VaultPage").then((module) => ({ default: module.VaultPage }))
);
const PaymentHistoryPage = lazyWithChunkReload(() =>
  import("../pages/PaymentHistoryPage").then((module) => ({ default: module.PaymentHistoryPage }))
);
const SalesPage = lazyWithChunkReload(() =>
  import("../pages/SalesPage").then((module) => ({ default: module.SalesPage }))
);

function AppRoutes() {
  const location = useLocation();
  const routeRef = useRef<HTMLDivElement | null>(null);
  useGsapSwap(routeRef, location.pathname);

  return (
    <div ref={routeRef} className="route-shell">
      <Routes location={location}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/create" element={<CreateSpacePage />} />
        <Route path="/spaces" element={<SpacesPage />} />
        <Route path="/spaces/:spaceId" element={<SpaceDetailPage />} />
        <Route path="/u/:address" element={<CreatorPage />} />
        <Route path="/vault" element={<VaultPage />} />
        <Route path="/payments" element={<PaymentHistoryPage />} />
        <Route path="/sales" element={<SalesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export function App() {
  return (
    <AppProviders>
      <AppErrorBoundary>
        <Suspense
          fallback={
            <div className="route-loading">
              <span />
              <strong>Loading Oria</strong>
            </div>
          }
        >
          <AppRoutes />
        </Suspense>
      </AppErrorBoundary>
    </AppProviders>
  );
}
