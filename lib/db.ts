import mongoose from "mongoose";

import { getEnv, getOptionalEnv } from "@/lib/env";

declare global {
  var __mongooseConnectionPromise:
    | Promise<typeof mongoose>
    | undefined;
}

export async function connectToDatabase() {
  if (!global.__mongooseConnectionPromise) {
    global.__mongooseConnectionPromise = mongoose.connect(getEnv("MONGODB_URI"), {
      dbName: getOptionalEnv("MONGODB_DB_NAME") || undefined,
    });
  }

  return global.__mongooseConnectionPromise;
}
