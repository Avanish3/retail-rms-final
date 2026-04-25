"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBody = validateBody;
const errors_1 = require("../common/errors");
function validateBody(schema) {
    return (req, _res, next) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            return next(new errors_1.AppError(400, "Validation failed", result.error.flatten()));
        }
        req.body = result.data;
        next();
    };
}
