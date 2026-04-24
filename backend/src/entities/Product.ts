import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Inventory } from "./Inventory";
import { OrderItem } from "./OrderItem";

@Entity("products")
export class Product {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  productId!: string;

  @Column()
  name!: string;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  price!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  costPrice!: number;

  @Column()
  category!: string;

  @Column({ type: "varchar", nullable: true })
  barcode!: string | null;

  @Column({ default: 10 })
  reorderLevel!: number;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ default: true })
  isActive!: boolean;

  @OneToMany(() => Inventory, (inventory) => inventory.product)
  inventoryItems!: Inventory[];

  @OneToMany(() => OrderItem, (orderItem) => orderItem.product)
  orderItems!: OrderItem[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
