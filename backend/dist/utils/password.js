"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.comparePassword = comparePassword;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
async function hashPassword(value) {
    return bcryptjs_1.default.hash(value, 10);
}
async function comparePassword(value, hashed) {
    return bcryptjs_1.default.compare(value, hashed);
}
