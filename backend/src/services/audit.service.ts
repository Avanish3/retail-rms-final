import { AppDataSource } from "../config/data-source";
import { AuditLog } from "../entities/AuditLog";
import { User } from "../entities/User";

type AuditInput = {
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  userId?: string;
};

export async function createAuditLog(input: AuditInput) {
  const auditRepository = AppDataSource.getRepository(AuditLog);
  const userRepository = AppDataSource.getRepository(User);

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
