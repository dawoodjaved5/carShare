import { Client, Databases, Storage, Account } from "appwrite";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

export const databases = new Databases(client);
export const storage = new Storage(client);
export const account = new Account(client);

// Use these constants throughout your app
export const CARS_COLLECTION_ID = "683f0ae40007ef135182";
export const CARS_BUCKET_ID = "683f17410024cac04c95";
