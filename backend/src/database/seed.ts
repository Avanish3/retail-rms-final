import type { DataSource } from "typeorm";
import { AppDataSource } from "../config/data-source";
import { Customer } from "../entities/Customer";
import { Inventory } from "../entities/Inventory";
import { Product } from "../entities/Product";
import { Store } from "../entities/Store";
import { User, UserRole } from "../entities/User";
import { hashPassword } from "../utils/password";

export async function seedDatabase(dataSource: DataSource) {
  const storeRepository = dataSource.getRepository(Store);
  const userRepository = dataSource.getRepository(User);
  const productRepository = dataSource.getRepository(Product);
  const inventoryRepository = dataSource.getRepository(Inventory);
  const customerRepository = dataSource.getRepository(Customer);

  let store = await storeRepository.findOne({ where: { code: "BLR-001" } });
  if (!store) {
    store = await storeRepository.save(
      storeRepository.create({
        code: "BLR-001",
        name: "Bangalore Central",
        city: "Bangalore",
        isActive: true
      })
    );
  }

  const users = [
    { fullName: "Platform Admin", email: "admin@retailrms.com", role: UserRole.ADMIN },
    { fullName: "Store Manager", email: "manager@retailrms.com", role: UserRole.MANAGER },
    { fullName: "POS Cashier", email: "cashier@retailrms.com", role: UserRole.CASHIER }
  ];

  for (const userInput of users) {
    const existing = await userRepository.findOne({ where: { email: userInput.email } });
    const passwordHash = await hashPassword("Password@123");

    if (!existing) {
      await userRepository.save(
        userRepository.create({
          ...userInput,
          passwordHash,
          store
        })
      );
      continue;
    }

    existing.fullName = userInput.fullName;
    existing.role = userInput.role;
    existing.passwordHash = passwordHash;
    existing.store = store;
    await userRepository.save(existing);
  }

  const catalog = [
    {
      productId: "PRD001",
      name: "Laptop",
      price: 50000,
      costPrice: 42000,
      category: "Electronics",
      barcode: "890000001",
      reorderLevel: 10,
      description: "Business laptop"
    },
    {
      productId: "PRD002",
      name: "Barcode Scanner",
      price: 3500,
      costPrice: 2500,
      category: "Peripherals",
      barcode: "890000002",
      reorderLevel: 15,
      description: "USB handheld barcode scanner"
    },
    {
      productId: "PRD003",
      name: "Printer Paper Box",
      price: 650,
      costPrice: 410,
      category: "Office Supplies",
      barcode: "890000003",
      reorderLevel: 25,
      description: "A4 copier paper box"
    }
  ];

  for (const item of catalog) {
    let product = await productRepository.findOne({ where: { productId: item.productId } });
    if (!product) {
      product = await productRepository.save(productRepository.create(item));
    }

    const inventory = await inventoryRepository.findOne({
      where: {
        product: { id: product.id },
        store: { id: store.id }
      },
      relations: {
        product: true,
        store: true
      }
    });

    if (!inventory) {
      await inventoryRepository.save(
        inventoryRepository.create({
          product,
          store,
          stock: item.productId === "PRD001" ? 20 : 80,
          reservedStock: 0,
          warehouseLocation: "Main Warehouse",
          lastRestockedAt: new Date()
        })
      );
    }
  }

  const customerExists = await customerRepository.findOne({ where: { phone: "9999999999" } });
  if (!customerExists) {
    await customerRepository.save(
      customerRepository.create({
        name: "Walk-in Premium",
        phone: "9999999999",
        email: "customer@example.com",
        address: "MG Road, Bangalore"
      })
    );
  }
}

async function seed() {
  await AppDataSource.initialize();

  try {
    await seedDatabase(AppDataSource);
    console.log("Seed completed.");
  } finally {
    await AppDataSource.destroy();
  }
}

if (require.main === module) {
  seed().catch(async (error) => {
    console.error("Seed failed", error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  });
}
