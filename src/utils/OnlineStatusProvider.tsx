import React, { createContext, useContext, useEffect, useState } from "react";
import { pollSyncData, syncMutations } from "./offlineHandlers.ts";

// Create a context for the online status
const OnlineStatusContext = createContext<boolean | undefined>(undefined);

// Custom hook to use the online status
export const useOnlineStatus = () => {
  return useContext(OnlineStatusContext);
};

const OnlineStatusProvider = ({ children }: React.PropsWithChildren) => {
  const [isOnline, setIsOnline] = useState<boolean | undefined>();

  useEffect(() => {
    // Event listeners for online and offline events
    const handleOnline = async () => {
      console.log("BACK ONLINE");
      setIsOnline(true);
      await syncMutations();
      await pollSyncData();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    window.dispatchEvent(new Event(navigator.onLine ? "online" : "offline"));

    // Cleanup event listeners on component unmount
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <OnlineStatusContext.Provider value={isOnline}>
      {children}
    </OnlineStatusContext.Provider>
  );
};

export default OnlineStatusProvider;
