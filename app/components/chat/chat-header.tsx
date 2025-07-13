import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ViewType, ViewTypeValue } from "./types";
import Image from "next/image";

interface ChatHeaderProps {
  view: ViewTypeValue;
  setView: (v: ViewTypeValue) => void;
  onLogout: () => void;
}

export function ChatHeader({ view, setView, onLogout }: ChatHeaderProps) {
  return (
    <div className="flex items-center gap-4 p-2 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 w-full">
      <Image
        src="/logo.svg"
        alt="Logo"
        width={32}
        height={32}
        className="mr-2"
        priority
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="min-w-[10rem] justify-between"
          >
            {view === ViewType.CHAT ? "Chat" : "Online Users"}
            <svg className="ml-2 size-4" viewBox="0 0 20 20" fill="none">
              <path
                d="M6 8l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem
            onSelect={() => setView(ViewType.CHAT)}
            className={
              view === ViewType.CHAT ? "font-semibold bg-accent/30" : ""
            }
          >
            Chat
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => setView(ViewType.ONLINE_GRID)}
            className={
              view === ViewType.ONLINE_GRID ? "font-semibold bg-accent/30" : ""
            }
          >
            Online Users
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="flex-1" />
      <Button
        variant="outline"
        size="sm"
        onClick={onLogout}
        className="ml-auto"
      >
        Logout
      </Button>
    </div>
  );
}
