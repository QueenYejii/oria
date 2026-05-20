import { Navigate, Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AppProviders } from "../providers/AppProviders";
import { LandingPage } from "../pages/LandingPage";

const CreateSpacePage = lazy(() =>
  import("../pages/CreateSpacePage").then((module) => ({ default: module.CreateSpacePage }))
);
const SpacesPage = lazy(() =>
  import("../pages/SpacesPage").then((module) => ({ default: module.SpacesPage }))
);
const SpaceDetailPage = lazy(() =>
  import("../pages/SpaceDetailPage").then((module) => ({ default: module.SpaceDetailPage }))
);
const VaultPage = lazy(() =>
  import("../pages/VaultPage").then((module) => ({ default: module.VaultPage }))
);

export function App() {
  return (
    <AppProviders>
      <Suspense fallback={<div className="route-loading">Loading Oria...</div>}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/create" element={<CreateSpacePage />} />
          <Route path="/spaces" element={<SpacesPage />} />
          <Route path="/spaces/:spaceId" element={<SpaceDetailPage />} />
          <Route path="/vault" element={<VaultPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppProviders>
  );
}
