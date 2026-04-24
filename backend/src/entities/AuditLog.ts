import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./User";

@Entity("audit_logs")
export class AuditLog {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  action!: string;

  @Column()
  entityType!: string;

  @Column()
  entityId!: string;

  @Column({ type: "simple-json", nullable: true })
  metadata!: Record<string, unknown> | null;

  @ManyToOne(() => User, (user) => user.auditLogs, { onDelete: "SET NULL", nullable: true })
  user!: User | null;

  @CreateDateColumn()
  createdAt!: Date;
}
