import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Order } from "./Order";
import { Product } from "./Product";

@Entity("order_items")
export class OrderItem {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: "CASCADE" })
  order!: Order;

  @ManyToOne(() => Product, (product) => product.orderItems, { onDelete: "RESTRICT" })
  product!: Product;

  @Column({ type: "int" })
  quantity!: number;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  unitPrice!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  taxRate!: number;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  lineTotal!: number;
}
