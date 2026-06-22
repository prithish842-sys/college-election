export interface Position {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface Candidate {
  id: string;
  positionId: string;
  name: string;
  description: string;
  imageUrl: string;
}

export type Vote = Record<string, string>;
