import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn
} from "typeorm";
import { env } from "../config/env";
import { Product } from "./Product";
import { Store } from "./Store";

@Entity("inventory")
@Unique(["product", "store"])
export class Inventory {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Product, (product) => product.inventoryItems, { onDelete: "CASCADE" })
  product!: Product;

  @ManyToOne(() => Store, (store) => store.inventoryItems, { onDelete: "CASCADE" })
  store!: Store;

  @Column({ type: "int", default: 0 })
  stock!: number;

  @Column({ type: "varchar", nullable: true })
  warehouseLocation!: string | null;

  @Column({ type: "int", default: 0 })
  reservedStock!: number;

  @Column({ type: env.dbType === "sqljs" ? "datetime" : "timestamp", nullable: true })
  lastRestockedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
