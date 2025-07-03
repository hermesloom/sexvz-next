export enum ProfileType {
  Male = "male",
  Female = "female",
  Couple = "couple",
}

export type OnlineUser = {
  id: string;
  username: string;
  location: string;
  profileUrl: string;
  imageUrl: string;
};

export type Profile = {
  id: string;
  username: string;
  type: ProfileType;
  age?: number;
  location: string;
  orientation?: string;
  alignment?: string;
  groupMemberships: {
    id: string;
    name: string;
  }[];
  imageUrl: string;
  writesToTypes: {
    // percentage values
    male: number;
    female: number;
    couple: number;
  };
  profileUrl: string;
};

export type MessageBoxItem = {
  id: string; // message id (from msg_read.php?msg=...)
  dialogId: string; // d=...
  subject: string;
  unread: boolean;
  deleted: boolean;
  date: Date; // parsed as Date object in the current German time zone
  user: {
    id: string;
    name: string;
    location: string;
    profileUrl: string;
    imageUrl: string;
  };
  messageUrl: string;
};

export type ThreadMessage = {
  senderId: string;
  senderName: string;
  senderProfileUrl: string;
  senderImageUrl: string;
  date: Date;
  message: string;
  images?: string[];
};

export type Thread = {
  dialogId: string;
  partner: Profile;
  messages: ThreadMessage[];
  subject: string;
  lastMessageDate: Date;
};
