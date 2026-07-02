import { KioskPortal } from "@/components/KioskPortal";
import { MobilePortal } from "@/components/MobilePortal";
import { ResultsGuard } from "@/components/ResultsGuard";
import { Analytics } from "@vercel/analytics/react";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  useParams,
} from "@tanstack/react-router";

function RootLayout() {
  return <Outlet />;
}

const rootRoute = createRootRoute({ component: RootLayout });

const mobileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: MobilePortal,
});

function KioskRoutePortal() {
  const { kioskId } = useParams({ strict: false }) as { kioskId?: string };

  return <KioskPortal kioskId={kioskId} />;
}

const kioskRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/kiosk/$kioskId",
  component: KioskRoutePortal,
});

const resultsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/results",
  component: ResultsGuard,
});

const routeTree = rootRoute.addChildren([
  mobileRoute,
  kioskRoute,
  resultsRoute,
]);

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Analytics />
    </>
  );
}

export default App;
