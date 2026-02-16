
export type Gender = 'male' | 'female' | 'other';

export interface FamilyMember {
  id: string;
  firstName: string;
  lastName: string;
  birthDate?: string;
  deathDate?: string;
  gender: Gender;
  bio?: string;
  avatar?: string;
  fatherId?: string;
  motherId?: string;
  spouseId?: string;
}

export interface TreeData {
  members: FamilyMember[];
}

export enum ViewMode {
  Tree = 'tree',
  List = 'list',
  Timeline = 'timeline'
}
