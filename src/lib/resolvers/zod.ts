import { type FieldError, type FieldErrors, type FieldValues, type Resolver } from "react-hook-form";
import { type ZodTypeAny } from "zod";

function setNested(target: Record<string, any>, path: (string | number)[], value: FieldError) {
  if (path.length === 0) {
    return;
  }

  const [head, ...rest] = path;
  const key = typeof head === "number" ? String(head) : head;

  if (rest.length === 0) {
    if (!target[key]) {
      target[key] = value;
    }
    return;
  }

  if (!target[key]) {
    target[key] = {};
  }

  setNested(target[key], rest, value);
}

export function zodResolver<TFieldValues extends FieldValues>(schema: ZodTypeAny): Resolver<TFieldValues> {
  return async (values) => {
    const result = schema.safeParse(values);

    if (result.success) {
      return {
        values: result.data as TFieldValues,
        errors: {} as FieldErrors<TFieldValues>,
      };
    }

    const fieldErrors = {} as FieldErrors<TFieldValues>;

    for (const issue of result.error.issues) {
      if (!issue.path.length) {
        continue;
      }

      setNested(fieldErrors as unknown as Record<string, any>, issue.path, {
        type: issue.code,
        message: issue.message,
      });
    }

    return {
      values: {} as TFieldValues,
      errors: fieldErrors,
    };
  };
}
