import * as React from "react";
import { PlusIcon } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { boardUsers } from "../store";

const users = boardUsers;

type User = (typeof users)[number];

export default function AddAssigne() {
  const [open, setOpen] = React.useState(false);
  const [selectedUsers, setSelectedUsers] = React.useState<User[]>([]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="border-background bg-muted hover:bg-accent size-8 shrink-0 rounded-full border-2">
          <span className="sr-only">Add assignee</span>
          <PlusIcon className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Users</DialogTitle>
        </DialogHeader>
        <Command className="p-0 **:data-[slot=command-input-wrapper]:p-0">
          <CommandInput placeholder="Search user..." />
          <CommandList>
            <CommandEmpty>No users found.</CommandEmpty>
            <CommandGroup className="px-0">
              {users.map((user) => (
                <CommandItem
                  key={user.name}
                  className="flex items-center"
                  data-checked={selectedUsers.includes(user)}
                  onSelect={() => {
                    if (selectedUsers.includes(user)) {
                      return setSelectedUsers(
                        selectedUsers.filter((selectedUser) => selectedUser !== user)
                      );
                    }

                    return setSelectedUsers(
                      [...users].filter((u) => [...selectedUsers, user].includes(u))
                    );
                  }}>
                  <Avatar>
                    <AvatarImage src={user.src} alt={user.name} />
                    <AvatarFallback>{user.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="ml-2">
                    <p className="text-sm leading-none font-medium">{user.name}</p>
                    <p className="text-muted-foreground text-sm">{user.email}</p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
        <DialogFooter className="items-center sm:justify-between">
          {selectedUsers.length > 0 ? (
            <div className="flex -space-x-2 overflow-hidden">
              {selectedUsers.map((user) => (
                <Avatar key={user.name} className="border-background inline-block border-2">
                  <AvatarImage src={user.src} />
                  <AvatarFallback>{user.name[0]}</AvatarFallback>
                </Avatar>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Select the users to add to this role.</p>
          )}
          <Button
            disabled={selectedUsers.length < 1}
            onClick={() => {
              setOpen(false);
            }}>
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
