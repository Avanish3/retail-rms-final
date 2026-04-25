"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = notFoundHandler;
function notFoundHandler(_req, res) {
    return res.status(404).json({
        success: false,
        message: "Route not found"
    });
}
