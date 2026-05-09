import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseDB = {
  // Generic query helper
  async query(table: string, operation: string = "select", data?: any) {
    const query = supabase.from(table);

    switch (operation) {
      case "select":
        return (query as any).select("*");
      case "insert":
        return (query as any).insert([data]);
      case "update":
        return (query as any).update(data);
      case "delete":
        return (query as any).delete();
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  },
};
