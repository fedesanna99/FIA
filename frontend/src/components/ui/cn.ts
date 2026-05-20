/**
 * Utility per concatenare className condizionali.
 * Wrapper su clsx — wrapper diretto per evitare di importare ovunque.
 */
import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
