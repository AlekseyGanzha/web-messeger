import { api } from "@/shared/api";
import { useUserStore } from "@/entities/user";
import type { UpdateProfileDto, User } from "@web-messager/shared";

export async function updateProfile(dto: UpdateProfileDto): Promise<User> {
  const user = await api<User>("/users/me", {
    method: "PATCH",
    body: JSON.stringify(dto),
  });
  useUserStore.getState().setMe(user);
  return user;
}
