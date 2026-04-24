import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Order } from "./Order";

export enum PaymentMethod {
  CASH = "CASH",
  CARD = "CARD",
  UPI = "UPI",
  BANK_TRANSFER = "BANK_TRANSFER"
}

@Entity("payments")
export class Payment {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Order, (order) => order.payments, { onDelete: "CASCADE" })
  order!: Order;

  @Column({ type: "simple-enum", enum: PaymentMethod })
  method!: PaymentMethod;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  amount!: number;

  @Column({ type: "varchar", nullable: true })
  reference!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
