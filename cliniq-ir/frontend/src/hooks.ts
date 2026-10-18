import { useEffect, useState } from "react";
import { api } from "./api";

export function useResource<T>(path: string) {
  const [state, setState] = useState<{
    path: string;
    data?: T;
    error?: string;
  }>({ path: "" });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    api<T>(path, { signal: controller.signal }).then(
      (data) => setState({ path, data }),
      (error) => {
        if (!controller.signal.aborted)
          setState({
            path,
            error:
              error instanceof Error
                ? error.message
                : "Unable to connect to the API.",
          });
      },
    );
    return () => controller.abort();
  }, [path, retry]);
  // Never render the previous patient's data while a different route loads.
  const current = state.path === path ? state : { path };
  return {
    ...current,
    loading: !current.data && !current.error,
    retry: () => {
      setState({ path: "" });
      setRetry((n) => n + 1);
    },
  };
}
