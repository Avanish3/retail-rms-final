"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuditLog = createAuditLog;
const data_source_1 = require("../config/data-source");
const AuditLog_1 = require("../entities/AuditLog");
const User_1 = require("../entities/User");
async function createAuditLog(input) {
    const auditRepository = data_source_1.AppDataSource.getRepository(AuditLog_1.AuditLog);
    const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
    const auditLog = auditRepository.create({
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata ?? null,
        user: input.userId ? await userRepository.findOne({ where: { id: input.userId } }) : null
    });
    await auditRepository.save(auditLog);
    return auditLog;
}
