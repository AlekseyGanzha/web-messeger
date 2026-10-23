import type { Message } from "@web-messager/shared";
import { cn } from "@/shared/lib/cn";
import { apiConfig } from "@/shared/config";

export function MessageItem({ message, isMine }: { message: Message; isMine: boolean }) {
  return (
    <div className={cn("flex", isMine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[70%] overflow-hidden rounded-xl text-sm",
          isMine ? "bg-primary text-white" : "bg-surface text-fg",
        )}
      >
        {message.imageUrl && (
          <a href={`${apiConfig.MEDIA_URL}${message.imageUrl}`} target="_blank" rel="noreferrer">
            <img
              src={`${apiConfig.MEDIA_URL}${message.imageUrl}`}
              alt="Изображение"
              className="max-h-80 w-full object-cover"
            />
          </a>
        )}
        <div className="px-3 py-2">
          {message.text && <p className="whitespace-pre-wrap break-words">{message.text}</p>}
          <time className="mt-1 block text-right text-[10px] opacity-70">
            {new Date(message.createdAt).toLocaleTimeString("ru-RU", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </time>
        </div>
      </div>
    </div>
  );
}
