import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Example: Export specific database operations
export const supabaseDB = {
  async insertChunk(data: {
    source_file: string;
    chunk_index: number;
    content: string;
    embedding: number[];
  }) {
    return supabase.from("document_chunks").insert([data]);
  },
  async getChunks() {
    return supabase.from("document_chunks").select("*");
  },

  async createSession() {
    return supabase
      .from("conversations")
      .insert([{}])
      .select()
      .single();
  },

  async validateSession(id: string) {
    return supabase.from("conversations").select("*").eq("id", id).single();
  },
  async saveMessage(data: {
    session_id: string;
    role: "user" | "assistant";
    message: string;
  }) {

    return supabase
      .from("messages")
      .insert([data]);
  },
  async getRecentMessages(
    session_id: string,
    limit: number = 5
  ) {

    return supabase
      .from("messages")
      .select("*")
      .eq("session_id", session_id)
      .order("created_at", {
        ascending: false,
      })
      .limit(limit);
  },
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
