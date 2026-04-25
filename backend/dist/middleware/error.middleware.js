"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const errors_1 = require("../common/errors");
function errorHandler(error, _req, res, _next) {
    if (error instanceof errors_1.AppError) {
        return res.status(error.statusCode).json({
            success: false,
            message: error.message,
            details: error.details ?? null
        });
    }
    console.error(error);
    return res.status(500).json({
        success: false,
        message: "Internal server error"
    });
}
