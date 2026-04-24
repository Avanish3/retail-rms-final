import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

export enum NotificationSeverity {
  INFO = "INFO",
  WARNING = "WARNING",
  CRITICAL = "CRITICAL"
}

@Entity("notifications")
export class Notification {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  title!: string;

  @Column({ type: "text" })
  message!: string;

  @Column({ type: "simple-enum", enum: NotificationSeverity, default: NotificationSeverity.INFO })
  severity!: NotificationSeverity;

  @Column({ default: false })
  isRead!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}
