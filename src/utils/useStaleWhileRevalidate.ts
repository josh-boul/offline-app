import { useCallback, useEffect, useState } from "react";
// import { DBSingleton } from "./database.ts";

const fetchWithStaleWhileRevalidate = async (url: string) => {
  const cache = await caches.match(url);
  const networkResponsePromise = fetch(url);

  const networkResponseHandler = networkResponsePromise.then(
    async (networkResponse) => {
      const data = await networkResponse.json();
      //   const cache = await caches.open("app-cache");
      //   cache.put(url, networkResponse.clone());

      console.log(networkResponse);

      //   const db = await DBSingleton.storeQueries();
      //   await db.put("keyval", data, url);

      return data;
    }
  );

  if (cache) {
    const cachedData = await cache.json();
    const freshData = await networkResponseHandler;
    return { cachedData, freshData };
  } else {
    const freshData = await networkResponseHandler;
    return { cachedData: null, freshData };
  }
};

export const useStaleWhileRevalidate = (url: string) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStale, setIsStale] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const { cachedData, freshData } = await fetchWithStaleWhileRevalidate(url);

    if (cachedData) {
      setData(cachedData);
      setIsStale(true);
    }

    if (
      !cachedData ||
      JSON.stringify(cachedData) !== JSON.stringify(freshData)
    ) {
      setData(freshData);
      setIsStale(false);
    }

    setIsLoading(false);
  }, [url]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, isStale };
};
