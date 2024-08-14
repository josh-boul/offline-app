import { openDB, DBSchema, IDBPDatabase } from "idb";

// Define the types for request and response objects
type RequestResponseObject = {
  operationName?: string;
  query: string;
  variables: any;
  response: any;
  timestamp?: number;
};

// Define the structure of your database
interface MyDB extends DBSchema {
  variable: {
    key: string;
    value: string | number;
  };
  query: {
    key: string;
    value: any;
  };
  mutation: {
    key: number;
    value: any;
  };
}

// Singleton class for managing the database
export class DBSingleton {
  private static instance: IDBPDatabase<MyDB> | null = null;
  private static dbPromise: Promise<IDBPDatabase<MyDB>>;

  // Private constructor to prevent direct instantiation
  private constructor() {}

  // Method to get the singleton instance
  public static async getInstance(): Promise<IDBPDatabase<MyDB>> {
    if (!DBSingleton.instance) {
      DBSingleton.dbPromise = openDB<MyDB>("offline-db", 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains("variable")) {
            db.createObjectStore("variable");
          }
          if (!db.objectStoreNames.contains("query")) {
            db.createObjectStore("query");
          }
          if (!db.objectStoreNames.contains("mutation")) {
            db.createObjectStore("mutation", {
              autoIncrement: true,
            });
          }
        },
      });

      DBSingleton.instance = await DBSingleton.dbPromise;
    }

    return DBSingleton.instance;
  }

  // Method to set time of last data sync
  public static async updateTimeOfLastSync() {
    await DBSingleton.storeVariable("timeOfLastSync", Date.now());
  }

  // Method to get time of last data sync
  public static async getTimeOfLastSync() {
    return await DBSingleton.getStoredVariable("timeOfLastSync");
  }

  // Method to store a variable
  public static async storeVariable(key: string, value: string | number) {
    const db = await DBSingleton.getInstance();
    await db.put("variable", value, key);
  }

  // Method to retrieve a stored variable
  public static async getStoredVariable(key: string) {
    const db = await DBSingleton.getInstance();
    return await db.get("variable", key);
  }

  // Method to update local cache with mutation
  public static async updateCacheValue(
    collection: "mutation" | "query" | "variable",
    key: string,
    value: any
  ) {
    const db = await DBSingleton.getInstance();
    await db.put(collection, value, key);
  }

  // Method to queue a mutation
  public static async queueMutation(mutation: RequestResponseObject) {
    const db = await DBSingleton.getInstance();
    await db.add("mutation", { ...mutation, timestamp: Date.now() });
  }

  // Method to queue a mutation
  public static async deleteMutation(mutationIndex: number) {
    const db = await DBSingleton.getInstance();
    await db.delete("mutation", mutationIndex);
  }

  // Method to retrieve all queued mutations
  public static async getAllQueuedMutations() {
    const db = await DBSingleton.getInstance();
    const keys = await db.getAllKeys("mutation");
    const values = await db.getAll("mutation");
    return keys.map((key, index) => ({ key, value: values[index] }));
  }

  // Method to store multiple queries
  public static async storeQuery(key: string, value: RequestResponseObject) {
    const db = await DBSingleton.getInstance();
    await db.put("query", value, key);
  }

  // Method to retrieve a stored query
  public static async getStoredQuery(query: string) {
    const db = await DBSingleton.getInstance();
    return await db.get("query", query);
  }
}
