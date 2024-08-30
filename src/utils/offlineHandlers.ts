import { DBSingleton } from "./database.ts";
import { GET_ALL_TODOS, sendGraphQLRequest } from "./graphql.ts";

/**
 * Gets all queued mutations from IndexedDB and sends when off (presumably when back online).
 */
export async function syncMutations() {
  const mutations = await DBSingleton.getAllQueuedMutations();
  if (mutations.length > 0) console.log("sending off queued mutations");

  for (const mutation of mutations) {
    try {
      const response = await sendGraphQLRequest(
        mutation.value.query,
        mutation.value.variables
      );
      if (!response.errors) {
        // remove mutation
        DBSingleton.deleteMutation(mutation.key);
      }
    } catch (error) {
      console.error("Failed to sync mutation:", mutation, error);
    }
  }
}

/**
 * Custom handling of fetch requests for handling network errors.
 * @param {Request} request The fetch request being intercepted.
 * @return {Promise<Response>} Returns the response, be it the actual response or an error.
 */
export async function handleFetch(request: Request): Promise<Response> {
  try {
    const response = await fetch(request);

    // handle network error
    if (!response.ok) {
      throw new Response("Network response was not ok", { status: 200 });
    }

    return response;
  } catch (error: any) {
    console.error("Fetch Error:", error.message);
    return new Response("Error:", { status: 200 });
  }
}

/**
 * Custom handling of GraphQL requests for handling network errors.
 * @param {Request} request The fetch request being intercepted.
 * @return {Promise<Response>} Returns the response, be it the actual response or an error.
 */
export async function handleGraphQLRequest(
  request: Request
): Promise<Response> {
  // Clone the request to read the body
  const clonedRequest = request.clone();

  // Read the request body
  const requestBody = await clonedRequest.json();
  const graphqlRequestType = requestBody.query.split(" ")[0];
  const operationName = requestBody.query.split("(")[0].split(" ")[1];
  console.log(
    "Intercepted outgoing graphql request:",
    graphqlRequestType,
    operationName
  );

  if (!navigator.onLine) {
    const response = await handleNetworkErrorGraphQL(
      graphqlRequestType,
      operationName,
      requestBody
    );
    if (response) return response;
  }

  try {
    // Proceed with fetching the request or use a custom response
    const response = await fetch(request);

    if (!response.ok) {
      // Handle network error
      return new Response(
        JSON.stringify({
          errors: [{ message: "Network response was not ok" }],
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parse the response to check for GraphQL errors
    const responseData = await response.json();

    if (responseData.errors) {
      // Handle GraphQL errors
      console.error("GraphQL Errors:", responseData.errors);
    }

    console.log("RESPONSE:", response.status, response);

    // Return the successful response
    return new Response(JSON.stringify(responseData), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    if (error.name === "TypeError" || error.message.includes("Network")) {
      // Handle network error
      const response = await handleNetworkErrorGraphQL(
        graphqlRequestType,
        operationName,
        requestBody
      );
      if (response) return response;
      else
        return new Response(
          JSON.stringify({
            errors: [{ message: "Unhandled graphQL error occured" }],
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
    } else if (error.message.includes("GraphQL")) {
      // Handle GraphQL error
      return new Response(
        JSON.stringify({ errors: [{ message: "GraphQL error occured" }] }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    } else {
      // Handle other errors
      return new Response(
        JSON.stringify({ errors: [{ message: "Internal Server Error" }] }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
}

/**
 * Handle a network error
 */
async function handleNetworkErrorGraphQL(
  graphqlRequestType: string,
  operationName: string,
  requestBody: any
) {
  if (graphqlRequestType === "mutation") {
    // Queue mutation in db
    console.log("queueing mutation");
    await DBSingleton.queueMutation(requestBody);
    return new Response(
      JSON.stringify({
        errors: [{ message: "Network Error. Queueing Mutation" }],
      }),
      {
        status: 200, // Use 200 for successful response with errors
        headers: { "Content-Type": "application/json" },
      }
    );
  } else if (graphqlRequestType === "query") {
    // Return cached data if any exists
    const cachedData = await DBSingleton.getStoredQuery(operationName);
    if (cachedData) {
      return new Response(JSON.stringify({ data: cachedData }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      return new Response(
        JSON.stringify({
          errors: [{ message: "Network Error. No cached values" }],
        }),
        {
          status: 200, // Use 200 for successful response with errors
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }
}

/**
 * GraphQL request for data caching
 */
async function refreshCachedData() {
  const response = await sendGraphQLRequest(
    stripGraphQLFromString(GET_ALL_TODOS)
  );
  if (!response.errors) {
    console.log("refreshing cache because online");
    await DBSingleton.storeQuery("GetAllTodos", response.data);
    DBSingleton.updateTimeOfLastSync();
  }
}

/**
 * Strip #graphql from string
 */
function stripGraphQLFromString(string: string) {
  return string.replace("#graphql ", "");
}

/**
 * Requests all data from GraphQL server required to be stored in IndexedDB to populate the page,
 * checking that it has been 15 minutes since the last sync
 */
export async function pollSyncData(): Promise<void> {
  const lastSyncTime: number =
    (await DBSingleton.getTimeOfLastSync()) as number;

  if (lastSyncTime && typeof lastSyncTime === "number") {
    const timeDiff = Math.round((Date.now() - lastSyncTime) / 1000 / 60);
    if (timeDiff > 2) {
      console.log("polling new data for cache");
      await refreshCachedData();
    }
  } else if (!lastSyncTime) {
    await immediateSyncData();
  }
}

/**
 * Immediately requests all data from GraphQL server required to be stored in IndexedDB to populate the page.
 */
export async function immediateSyncData(): Promise<void> {
  await refreshCachedData();
}
