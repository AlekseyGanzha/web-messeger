import type { PresenceUpdate } from "@web-messager/shared";
import { getSocket } from "@/shared/api";
import { usePresenceStore } from "@/entities/user";

export function subscribeToPresence(): () => void {
  const socket = getSocket();

  const onUpdate = (presence: PresenceUpdate) => {
    usePresenceStore.getState().setPresence(presence);
  };

  const onSnapshot = (list: PresenceUpdate[]) => {
    usePresenceStore.getState().setMany(list);
  };

  socket.on("presence:update", onUpdate);
  socket.on("presence:snapshot", onSnapshot);

  return () => {
    socket.off("presence:update", onUpdate);
    socket.off("presence:snapshot", onSnapshot);
  };
}
