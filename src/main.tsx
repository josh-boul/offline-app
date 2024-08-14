import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ApolloProvider } from "@apollo/client";
import { client } from "./utils/apolloClient.ts";
import OnlineStatusProvider from "./utils/OnlineStatusProvider.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ApolloProvider client={client}>
      <OnlineStatusProvider>
        <App />
      </OnlineStatusProvider>
    </ApolloProvider>
  </StrictMode>
);
