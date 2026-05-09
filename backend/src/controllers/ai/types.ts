export interface Chunk {
  chunk_index: number;
  text: string;
  char_start: number;
  char_end: number;
}

export interface EmbeddedChunk {
  chunk_index: number;
  text: string;
  word_start: number;
  word_end: number;
  embedding: number[];
}

export interface RetrievedChunk {
  content: string;
}
