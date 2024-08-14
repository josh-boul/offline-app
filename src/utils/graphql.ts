export const ADD_TODO = `#graphql
mutation AddTodo($description: String!) {
    addTodo(description: $description) {
        id
        description
        completed
        updatedAt
    }
}
`;

export const COMPLETE_TODO = `#graphql
mutation CompleteTodo($completeTodoId: ID!) {
    completeTodo(id: $completeTodoId) {
        id
        description
        completed
        updatedAt
    }
}
`;

export const DELETE_TODO = `#graphql
mutation DeleteTodo($deleteTodoId: ID!) {
    deleteTodo(id: $deleteTodoId)
}
`;

export const UPDATE_TODO = `#graphql
mutation UpdateTodos($todos: [TodoInput!]!) {
    updateTodos(todos: $todos)
}
`;

export const GET_ALL_TODOS = `#graphql
query GetAllTodos($since: String) {
    todos(since: $since) {
        id
        description
        completed
        updatedAt
    }
}
`;

export async function sendGraphQLRequest(
  query: string,
  variables?: any
): Promise<any> {
  const response = await fetch(import.meta.env.VITE_APP_GRAPHQL_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Add any other headers you need here, such as authorization headers
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed with status: ${response.status}`);
  }

  return response.json();
}
