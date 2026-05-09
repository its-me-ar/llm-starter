import { promises as fs } from "fs";
import path from "path";

interface Item {
  id: number;
  text: string;
  embedding: number[];
}

export class FileService {
  private filePath: string;

  constructor() {
    this.filePath = path.join(process.cwd(), "embedding.json");
  }

  async saveEmbeddings(items: Item[]): Promise<void> {
    try {
      const data = JSON.stringify(items, null, 2);
      await fs.writeFile(this.filePath, data, "utf-8");
    } catch (error) {
      console.error("Error saving embeddings:", error);
      throw new Error("Failed to save embeddings");
    }
  }

  async loadEmbeddings(): Promise<Item[]> {
    try {
      const data = await fs.readFile(this.filePath, "utf-8");
      const items = JSON.parse(data) as Item[];
      return items;
    } catch (error) {
      // If file doesn't exist, return empty array
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      console.error("Error loading embeddings:", error);
      throw new Error("Failed to load embeddings");
    }
  }
}