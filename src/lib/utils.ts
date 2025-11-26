import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fixProfilePhotoUrl = (photoUrl: string | null | undefined) => {
  const BACKEND_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://127.0.0.1:8000';
  if (photoUrl && photoUrl.startsWith('/media/')) {
    return `${BACKEND_URL}${photoUrl}`;
  }
  return photoUrl || '';
};
