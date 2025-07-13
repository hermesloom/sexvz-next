import Image from "next/image";
import { OnlineUser } from "./types";

interface OnlineUsersGridProps {
  onlineUsers: OnlineUser[];
  loading: boolean;
}

export function OnlineUsersGrid({
  onlineUsers,
  loading,
}: OnlineUsersGridProps) {
  if (loading)
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-10 h-10 border-4 border-zinc-300 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6">
      {onlineUsers.map((u) => (
        <a
          key={u.id}
          href={u.profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center bg-zinc-50 dark:bg-zinc-800 rounded-lg shadow hover:bg-zinc-100 dark:hover:bg-zinc-700 transition cursor-pointer p-0 overflow-hidden group focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <div className="w-full aspect-square relative">
            <Image
              src={u.imageUrl}
              alt={u.username}
              fill
              className="object-cover w-full h-full"
              sizes="(min-width: 1024px) 16vw, (min-width: 768px) 25vw, 50vw"
              priority={false}
            />
          </div>
          <div className="flex flex-col items-center w-full px-2 py-3">
            <div
              className="font-medium text-base text-center truncate w-full"
              title={u.username}
            >
              {u.username}
            </div>
            <div
              className="text-xs text-zinc-500 text-center truncate w-full"
              title={u.location}
            >
              {u.location}
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
