import { useEffect, useState } from "react";
import { useMutation, gql, useQuery } from "@apollo/client";
import "./App.css";
import {
  ADD_TODO,
  COMPLETE_TODO,
  DELETE_TODO,
  GET_ALL_TODOS,
} from "./utils/graphql.ts";
import { DBSingleton } from "./utils/database.ts";
import { useOnlineStatus } from "./utils/OnlineStatusProvider.tsx";

type Todo = {
  id: string;
  description: string;
  completed: boolean;
  updatedAt?: string;
};

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [text, setText] = useState<string>("");
  const [filter, setFilter] = useState<string>("all");

  const isOnline = useOnlineStatus();

  useQuery(gql(GET_ALL_TODOS), {
    onCompleted: (data) => {
      console.log(data);
      setTodos(data.todos);
      setLoaded(true);
    },
  });
  const [addTodo] = useMutation(gql(ADD_TODO));
  const [completeTodo] = useMutation(gql(COMPLETE_TODO), {
    errorPolicy: "all",
  });
  const [deleteTodo] = useMutation(gql(DELETE_TODO));

  const completeTask = async (todo: Todo) => {
    const { data } = await completeTodo({
      variables: { completeTodoId: todo.id },
    });
    setTodos((prev) =>
      prev.map((t) => {
        if (isOnline) {
          return t.id === todo.id ? data.completeTodo : t;
        }
        return t.id === todo.id ? { ...t, completed: !t.completed } : t;
      })
    );
  };

  // Update cache with rendered change
  useEffect(() => {
    if ((loaded || !isOnline) && todos) {
      console.log("updating cache", todos);
      DBSingleton.updateCacheValue("query", "GetAllTodos", todos);
    }
  }, [todos]);

  const deleteTask = async (todo: Todo) => {
    await deleteTodo({ variables: { deleteTodoId: todo.id } });
    setTodos(todos.filter((t) => t.id !== todo.id));
  };

  const addTask = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (text !== "") {
      const { data } = await addTodo({ variables: { description: text } });
      setTodos((prev) => [...prev, data.addTodo]);
      setText("");
    }
  };

  const filteredTodos = todos.filter((todo) => {
    if (filter === "completed") return todo.completed;
    if (filter === "notCompleted") return !todo.completed;
    return true;
  });

  const initDB = async () => {
    await DBSingleton.getInstance();
  };

  useEffect(() => {
    initDB();
  }, []);

  return (
    <>
      {!isOnline && (
        <div className="offline-banner">
          <strong>You are currently offline</strong>
        </div>
      )}
      <h1>Arrival Kiosk App</h1>
      <form onSubmit={addTask} className="add-form">
        <input
          type="text"
          name="task"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What do you want to do?"
          className="add-task-input"
        />
        <button type="submit">Add</button>
      </form>
      <div className="filters">
        <button onClick={() => setFilter("all")}>All</button>
        <button onClick={() => setFilter("completed")}>Completed</button>
        <button onClick={() => setFilter("notCompleted")}>Not Completed</button>
      </div>
      <div>
        {filteredTodos.map((task) => (
          <div key={task.id} className="todo-item">
            <span className={task.completed ? "completed" : ""}>
              {task.description}
            </span>
            <button type="button" onClick={() => completeTask(task)}>
              {task.completed ? "⎌" : "✅"}
            </button>
            <button type="button" onClick={() => deleteTask(task)}>
              🗑️
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

export default App;
