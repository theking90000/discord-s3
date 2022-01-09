import { FC, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { createStore } from "../lib/store";
import { useQuery } from "react-query";
import { useFetchQuery } from "../lib/data-fetch";

export const useGuardStore = createStore<{
  isConnected: boolean;
  setConnected: (isConnected: boolean) => void;
}>((set) => ({
  isConnected: false,
  setConnected: (isConnected: boolean) => {
    set(() => ({
      isConnected,
    }));
  },
}));

const RouteGuard: FC = ({ children }) => {
  const router = useRouter();

  const [allowed, setAllowed] = useState(false);
  const isConnected = useGuardStore((state) => state.isConnected);
  const setConnected = useGuardStore((state) => state.setConnected);

  const user = useFetchQuery("users/me", { retry: false });

  useEffect(() => {
    if (user.data) setConnected(true);
    authCheck(router.asPath);
  }, [user]);

  const authCheck = (url: string) => {
    if (user.isLoading) return;
    const publicPaths = ["/login"];
    const path = url.split("?")[0];

    if (!(isConnected || user.data) && !publicPaths.includes(path)) {
      setAllowed(false);
      router.push({
        pathname: "/login",
        query: {
          returnUrl: router.asPath,
        },
      });
    } else {
      setAllowed(true);
    }
  };

  useEffect(() => {
    authCheck(router.asPath);

    router.events.on("routeChangeComplete", authCheck);

    return () => {
      router.events.off("routeChangeComplete", authCheck);
    };
  }, []);

  return (allowed ? children : <>Loading</>) as any;
};

export default RouteGuard;
