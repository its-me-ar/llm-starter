import { supabase } from "../services/supabase";

export const aiRepository = {
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
    return supabase.from("messages").insert([data]);
  },

  async getRecentMessages(session_id: string, limit: number = 5) {
    return supabase
      .from("messages")
      .select("*")
      .eq("session_id", session_id)
      .order("created_at", { ascending: false })
      .limit(limit);
  },

  async matchDocuments(queryEmbedding: number[], matchCount: number) {
    return supabase.rpc("match_documents", {
      query_embedding: queryEmbedding,
      match_count: matchCount,
    });
  },

  async getSessions() {
    return supabase
      .from("conversations")
      .select("*")
      .order("created_at", { ascending: false });
  },

  async getSessionMessages(session_id: string) {
    return supabase
      .from("messages")
      .select("*")
      .eq("session_id", session_id)
      .order("created_at", { ascending: true });
  }
};
