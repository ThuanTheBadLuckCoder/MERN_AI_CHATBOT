export interface Reference {
  id: string;
  type: 'component' | 'link' | 'document';
  title: string;
  description: string;
  originalCode?: string;
  source?: string;
  relevanceScore?: number;
  usedAt?: string;
}

export type Message = {
  role: "user" | "assistant";
  content: string;
  id?: string;
  references?: Reference[];
};