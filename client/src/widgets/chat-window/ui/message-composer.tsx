"use client";

import { Button, Input } from "@/shared/ui";
import { MESSAGE_MAX_LENGTH } from "@web-messager/shared";
import type { ChatComposer } from "../model/use-chat-composer";

export function MessageComposer({ composer }: { composer: ChatComposer }) {
  const {
    text,
    setText,
    image,
    preview,
    uploading,
    error,
    fileInputRef,
    pickImage,
    resetImage,
    handlePaste,
    handleSubmit,
  } = composer;

  return (
    <form onSubmit={handleSubmit} onPaste={handlePaste} className="border-t border-line bg-surface">
      {preview && (
        <div className="flex items-center gap-3 border-b border-line p-3">
          <img src={preview} alt="Превью" className="h-16 w-16 rounded-lg object-cover" />
          <span className="flex-1 truncate text-xs text-muted">{image?.name}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetImage}
            aria-label="Убрать изображение"
          >
            ×
          </Button>
        </div>
      )}

      {error && <p className="px-3 pt-2 text-xs text-danger">{error}</p>}

      {text.length > MESSAGE_MAX_LENGTH * 0.8 && (
        <span className="px-3 text-xs text-muted">
          {text.length}/{MESSAGE_MAX_LENGTH}
        </span>
      )}

      <div className="flex gap-2 p-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => pickImage(e.target.files?.[0])}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          Фото
        </Button>
        <Input
          placeholder="Сообщение"
          value={text}
          maxLength={MESSAGE_MAX_LENGTH}
          onChange={(e) => setText(e.target.value)}
          disabled={uploading}
        />

        <Button type="submit" disabled={uploading || (!text.trim() && !image)}>
          {uploading ? "…" : "Отправить"}
        </Button>
      </div>
    </form>
  );
}
