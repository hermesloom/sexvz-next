export interface OnlineUser {
  id: string;
  username: string;
  location: string;
  profileUrl: string;
  imageUrl: string;
}

export interface ThreadSummary {
  id: string;
  dialogId: string;
  subject: string;
  user: {
    id: string;
    name: string;
    imageUrl: string;
    location: string;
    profileUrl: string;
  };
  date: string;
  unread: boolean;
}

export interface ThreadMessage {
  senderId: string;
  senderName: string;
  senderProfileUrl: string;
  senderImageUrl: string;
  date: string;
  message: string;
  images?: string[];
}

export interface Profile {
  id: string;
  username: string;
  type: string;
  age?: number;
  location: string;
  orientation?: string;
  alignment?: string;
  groupMemberships: { id: string; name: string }[];
  imageUrl: string;
  writesToTypes: { male: number; female: number; couple: number };
  profileUrl: string;
}

export const ViewType = {
  CHAT: "chat",
  ONLINE_GRID: "online-grid",
} as const;

export type ViewTypeKey = keyof typeof ViewType;
export type ViewTypeValue = (typeof ViewType)[ViewTypeKey];
