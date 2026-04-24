import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from "typeorm";
import { AuditLog } from "./AuditLog";
import { Order } from "./Order";
import { Store } from "./Store";

export enum UserRole {
  ADMIN = "ADMIN",
  MANAGER = "MANAGER",
  CASHIER = "CASHIER"
}

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  fullName!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  passwordHash!: string;

  @Column({ type: "simple-enum", enum: UserRole })
  role!: UserRole;

  @ManyToOne(() => Store, (store) => store.users, { nullable: true, onDelete: "SET NULL" })
  store!: Store | null;

  @OneToMany(() => Order, (order) => order.createdBy)
  createdOrders!: Order[];

  @OneToMany(() => AuditLog, (auditLog) => auditLog.user)
  auditLogs!: AuditLog[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
