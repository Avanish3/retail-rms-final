import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Inventory } from "./Inventory";
import { Order } from "./Order";
import { User } from "./User";

@Entity("stores")
export class Store {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  code!: string;

  @Column()
  name!: string;

  @Column()
  city!: string;

  @Column({ default: true })
  isActive!: boolean;

  @OneToMany(() => User, (user) => user.store)
  users!: User[];

  @OneToMany(() => Inventory, (inventory) => inventory.store)
  inventoryItems!: Inventory[];

  @OneToMany(() => Order, (order) => order.store)
  orders!: Order[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
