
import { AppError } from "../utils/AppError.js";

export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query
    });

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message
      }));

      return next(
        new AppError(
          "Please check the submitted information.",
          400,
          "VALIDATION_ERROR"
        )
      );
    }

    req.validated = result.data;

    next();
  };
}