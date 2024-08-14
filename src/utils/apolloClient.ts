import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  ApolloLink,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";

const authLink = setContext((_, { headers }) => {
  // get the authentication token from local storage if it exists
  // const token = localStorage.getItem('token');
  // return the headers to the context so httpLink can read them
  return {
    headers: {
      ...headers,
      // authorization: token ? `Bearer ${token}` : "",
    },
  };
});

const httpLink = new HttpLink({
  uri: import.meta.env.VITE_APP_GRAPHQL_API_URL,
  // fetchOptions: {
  //   mode: 'no-cors',
  // }
});

// Create an error link
const errorLink = onError(({ graphQLErrors, networkError }) => {
  console.log("onError called");
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.log(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      );
    });
  }
  if (networkError) {
    console.log(`[Network error]: ${networkError}`);
    if (
      networkError.message === "Failed to fetch" ||
      networkError.message.includes("ERR_INTERNET_DISCONNECTED")
    ) {
      alert("You are offline. Please check your internet connection.");
      // Handle network error here
    }
  }
});

export const client = new ApolloClient({
  link: ApolloLink.from([authLink, httpLink, errorLink]),
  cache: new InMemoryCache(),
});

// Utility type to exclude the __typename property from any given type
export type OmitTypename<T> = {
  [K in keyof T as K extends "__typename" ? never : K]: T[K];
};
