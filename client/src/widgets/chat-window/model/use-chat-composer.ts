import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type FormEvent,
} from "react";
import { ApiError } from "@/shared/api";
import { sendMessage, sendImageMessage, uploadImage } from "@/features/send-message";

export function useChatComposer(activeChatId: string | null) {
  const [text, setText] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  function pickImage(file: File | undefined | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Можно прикреплять только изображения");
      return;
    }
    setError(null);
    setImage(file);
    setPreview(URL.createObjectURL(file));
  }

  function resetImage() {
    setImage(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handlePaste(e: ClipboardEvent<HTMLFormElement>) {
    const file = Array.from(e.clipboardData.files).find((f) => f.type.startsWith("image/"));
    if (!file) return;
    e.preventDefault();
    pickImage(file);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    pickImage(e.dataTransfer.files?.[0]);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed && !image) return;

    if (image) {
      setUploading(true);
      setError(null);
      try {
        const uploaded = await uploadImage(image);
        sendImageMessage(activeChatId!, uploaded, trimmed);
        setText("");
        resetImage();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Не удалось загрузить изображение");
      } finally {
        setUploading(false);
      }
      return;
    }

    sendMessage(activeChatId!, trimmed);
    setText("");
  }

  return {
    text,
    setText,
    image,
    preview,
    uploading,
    error,
    dragOver,
    fileInputRef,
    pickImage,
    resetImage,
    handlePaste,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleSubmit,
  };
}

export type ChatComposer = ReturnType<typeof useChatComposer>;
