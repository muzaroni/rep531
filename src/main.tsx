import React from "react";
import ReactDOM from "react-dom/client";
import { useRegisterSW } from "virtual:pwa-register/react";
import App from "./App";
import "./styles.css";
function Root() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  React.useEffect(() => {
    if (!offlineReady || needRefresh) return;
    const timeout = window.setTimeout(() => setOfflineReady(false), 5000);
    return () => window.clearTimeout(timeout);
  }, [offlineReady, needRefresh, setOfflineReady]);
  return (
    <>
      <App />
      {(offlineReady || needRefresh) && (
        <div className="pwa-notice" role="status">
          {needRefresh
            ? "An app update is ready."
            : "Ready offline. See you at the gym."}
          <button
            onClick={() =>
              needRefresh
                ? void updateServiceWorker(true)
                : setOfflineReady(false)
            }
          >
            {needRefresh ? "Update" : "Got it"}
          </button>
        </div>
      )}
    </>
  );
}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
