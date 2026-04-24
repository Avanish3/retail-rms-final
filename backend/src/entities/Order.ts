import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from "typeorm";
import { Customer } from "./Customer";
import { OrderItem } from "./OrderItem";
import { Payment } from "./Payment";
import { Store } from "./Store";
import { User } from "./User";

export enum OrderType {
  SALE = "SALE",
  SUPPLY = "SUPPLY"
}

export enum OrderStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED"
}

@Entity("orders")
export class Order {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  orderNumber!: string;

  @Column({ type: "simple-enum", enum: OrderType })
  type!: OrderType;

  @Column({ type: "simple-enum", enum: OrderStatus, default: OrderStatus.PENDING })
  status!: OrderStatus;

  @ManyToOne(() => Store, (store) => store.orders, { onDelete: "SET NULL", nullable: true })
  store!: Store | null;

  @ManyToOne(() => Customer, (customer) => customer.orders, { onDelete: "SET NULL", nullable: true })
  customer!: Customer | null;

  @ManyToOne(() => User, (user) => user.createdOrders, { onDelete: "SET NULL", nullable: true })
  createdBy!: User | null;

  @Column({ type: "varchar", nullable: true })
  supplierName!: string | null;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  subTotal!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  taxAmount!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  totalAmount!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  discountAmount!: number;

  @Column({ type: "text", nullable: true })
  notes!: string | null;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items!: OrderItem[];

  @OneToMany(() => Payment, (payment) => payment.order, { cascade: true })
  payments!: Payment[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
