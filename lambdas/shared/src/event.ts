import { z } from "zod";

export interface InputEvent {
  searchQuery: string;
  notifications: Notification[];
}

export type Notification = {
  type: "email";
  targets: string[];
};

export const NotificationSchema = z.object({
  type: z.enum(["email"]),
  targets: z.array(z.string()).nonempty(),
});

export const InputEventSchema = z.object({
  searchQuery: z.string().nonempty(),
  notifications: z.array(NotificationSchema),
});

export function validateInputEvent(input: any) {
  const result = InputEventSchema.safeParse(input);
  if (!result.success) {
    const error = new Error("Invalid InputEvent");

    error.cause = result.error.cause;
    error.stack = result.error.stack;
    error.name = result.error.name;

    throw error;
  } else {
    return result.data;
  }
}
