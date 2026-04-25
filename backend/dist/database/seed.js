"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const data_source_1 = require("../config/data-source");
const Customer_1 = require("../entities/Customer");
const Inventory_1 = require("../entities/Inventory");
const Product_1 = require("../entities/Product");
const Store_1 = require("../entities/Store");
const User_1 = require("../entities/User");
const password_1 = require("../utils/password");
async function seed() {
    await data_source_1.AppDataSource.initialize();
    const storeRepository = data_source_1.AppDataSource.getRepository(Store_1.Store);
    const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
    const productRepository = data_source_1.AppDataSource.getRepository(Product_1.Product);
    const inventoryRepository = data_source_1.AppDataSource.getRepository(Inventory_1.Inventory);
    const customerRepository = data_source_1.AppDataSource.getRepository(Customer_1.Customer);
    let store = await storeRepository.findOne({ where: { code: "BLR-001" } });
    if (!store) {
        store = await storeRepository.save(storeRepository.create({
            code: "BLR-001",
            name: "Bangalore Central",
            city: "Bangalore",
            isActive: true
        }));
    }
    const users = [
        { fullName: "Platform Admin", email: "admin@retailrms.com", role: User_1.UserRole.ADMIN },
        { fullName: "Store Manager", email: "manager@retailrms.com", role: User_1.UserRole.MANAGER },
        { fullName: "POS Cashier", email: "cashier@retailrms.com", role: User_1.UserRole.CASHIER }
    ];
    for (const userInput of users) {
        const existing = await userRepository.findOne({ where: { email: userInput.email } });
        const passwordHash = await (0, password_1.hashPassword)("Password@123");
        if (!existing) {
            await userRepository.save(userRepository.create({
                ...userInput,
                passwordHash,
                store
            }));
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
            await inventoryRepository.save(inventoryRepository.create({
                product,
                store,
                stock: item.productId === "PRD001" ? 20 : 80,
                reservedStock: 0,
                warehouseLocation: "Main Warehouse",
                lastRestockedAt: new Date()
            }));
        }
    }
    const customerExists = await customerRepository.findOne({ where: { phone: "9999999999" } });
    if (!customerExists) {
        await customerRepository.save(customerRepository.create({
            name: "Walk-in Premium",
            phone: "9999999999",
            email: "customer@example.com",
            address: "MG Road, Bangalore"
        }));
    }
    console.log("Seed completed.");
    await data_source_1.AppDataSource.destroy();
}
seed().catch(async (error) => {
    console.error("Seed failed", error);
    if (data_source_1.AppDataSource.isInitialized) {
        await data_source_1.AppDataSource.destroy();
    }
    process.exit(1);
});
