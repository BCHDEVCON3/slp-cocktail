import React, { useMemo } from 'react';
import {Router, useLocation} from "woozie";
import MainPage from "./MainPage";

const ROUTE_MAP = Router.createMap([
  [
    "/",
    () => <MainPage />
  ]
]);

export default function PageRouter() {
  const { pathname } = useLocation();

  return useMemo(() => Router.resolve(ROUTE_MAP, pathname, {}), [pathname]);
}
