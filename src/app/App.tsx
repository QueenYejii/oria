import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { lazy, Suspense, useRef } from "react";
import { AppErrorBoundary } from "../components/layout/AppErrorBoundary";
import { AppProviders } from "../providers/AppProviders";
import { LandingPage } from "../pages/LandingPage";
import { useGsapSwap } from "../hooks/useGsapSwap";

const CreateSpacePage = lazy(() =>
  import("../pages/CreateSpacePage").then((module) => ({ default: module.CreateSpacePage }))
);
const SpacesPage = lazy(() =>
  import("../pages/SpacesPage").then((module) => ({ default: module.SpacesPage }))
);
const SpaceDetailPage = lazy(() =>
  import("../pages/SpaceDetailPage").then((module) => ({ default: module.SpaceDetailPage }))
);
const CreatorPage = lazy(() =>
  import("../pages/CreatorPage").then((module) => ({ default: module.CreatorPage }))
);
const VaultPage = lazy(() =>
  import("../pages/VaultPage").then((module) => ({ default: module.VaultPage }))
);
const PaymentHistoryPage = lazy(() =>
  import("../pages/PaymentHistoryPage").then((module) => ({ default: module.PaymentHistoryPage }))
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
