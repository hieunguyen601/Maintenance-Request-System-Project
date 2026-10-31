import { isAxiosError } from "axios";
export function errorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
) {
  return isAxiosError(error)
    ? error.response?.data?.message ||
        (error.code === "ECONNABORTED"
          ? "The request timed out. Please try again."
          : fallback)
    : fallback;
}
export const label = (value: string) => value.replaceAll("_", " ");
export const dateTime = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
