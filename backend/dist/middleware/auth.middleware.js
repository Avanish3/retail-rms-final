"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.allowRoles = allowRoles;
const errors_1 = require("../common/errors");
const jwt_1 = require("../utils/jwt");
function requireAuth(req, _res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
        return next(new errors_1.AppError(401, "Missing or invalid authorization header"));
    }
    try {
        req.user = (0, jwt_1.verifyToken)(header.slice(7));
        next();
    }
    catch {
        next(new errors_1.AppError(401, "Invalid or expired token"));
    }
}
function allowRoles(...roles) {
    return (req, _res, next) => {
        if (!req.user) {
            return next(new errors_1.AppError(401, "Unauthorized"));
        }
        if (!roles.includes(req.user.role)) {
            return next(new errors_1.AppError(403, "Forbidden for this role"));
        }
        next();
    };
}
