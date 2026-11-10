import { BellIcon } from "lucide-react";
import { Badge } from "../ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
export default function Notification({
  content,
}: {
  content: AppNotification[];
}) {
  const count = content.length;
  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger className="relative">
          <BellIcon size={22} />
          {count > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 text-xs rounded-full"
            >
              {count}
            </Badge>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <div className="min-w-md min-h-50">
            <DropdownMenuLabel className="font-bold text-lg">
              Thông báo
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {content.length === 0 && (
              <DropdownMenuItem>Không có thông báo mới</DropdownMenuItem>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
