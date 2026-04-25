"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrder = createOrder;
exports.listOrders = listOrders;
const data_source_1 = require("../config/data-source");
const errors_1 = require("../common/errors");
const Customer_1 = require("../entities/Customer");
const Inventory_1 = require("../entities/Inventory");
const Order_1 = require("../entities/Order");
const OrderItem_1 = require("../entities/OrderItem");
const Payment_1 = require("../entities/Payment");
const Product_1 = require("../entities/Product");
const Store_1 = require("../entities/Store");
const User_1 = require("../entities/User");
const audit_service_1 = require("./audit.service");
const notification_service_1 = require("./notification.service");
function generateOrderNumber(type) {
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `${type === Order_1.OrderType.SALE ? "SAL" : "SUP"}-${Date.now()}-${suffix}`;
}
async function createOrder(input) {
    const storeRepository = data_source_1.AppDataSource.getRepository(Store_1.Store);
    const productRepository = data_source_1.AppDataSource.getRepository(Product_1.Product);
    const inventoryRepository = data_source_1.AppDataSource.getRepository(Inventory_1.Inventory);
    const customerRepository = data_source_1.AppDataSource.getRepository(Customer_1.Customer);
    const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
    const orderRepository = data_source_1.AppDataSource.getRepository(Order_1.Order);
    const paymentRepository = data_source_1.AppDataSource.getRepository(Payment_1.Payment);
    const store = input.storeId
        ? await storeRepository.findOne({ where: { id: input.storeId } })
        : null;
    const customer = input.customerId
        ? await customerRepository.findOne({ where: { id: input.customerId } })
        : null;
    const createdBy = input.createdById
        ? await userRepository.findOne({ where: { id: input.createdById } })
        : null;
    if (input.storeId && !store) {
        throw new errors_1.AppError(404, "Store not found");
    }
    if (input.customerId && !customer) {
        throw new errors_1.AppError(404, "Customer not found");
    }
    if (!input.items.length) {
        throw new errors_1.AppError(400, "At least one item is required");
    }
    const orderItems = [];
    let subTotal = 0;
    let taxAmount = 0;
    for (const item of input.items) {
        const product = await productRepository.findOne({ where: { id: item.productId } });
        if (!product) {
            throw new errors_1.AppError(404, `Product not found: ${item.productId}`);
        }
        const effectiveUnitPrice = item.unitPrice ?? Number(product.price);
        const effectiveTaxRate = item.taxRate ?? input.taxRate ?? 18;
        const lineSubTotal = effectiveUnitPrice * item.quantity;
        const lineTax = (lineSubTotal * effectiveTaxRate) / 100;
        if (!store) {
            throw new errors_1.AppError(400, "Store is required");
        }
        let inventory = await inventoryRepository.findOne({
            where: {
                product: { id: product.id },
                store: { id: store.id }
            },
            relations: {
                product: true,
                store: true
            }
        });
        if (input.type === Order_1.OrderType.SALE) {
            if (!inventory || inventory.stock < item.quantity) {
                throw new errors_1.AppError(400, `Insufficient stock for ${product.name}`);
            }
            inventory.stock -= item.quantity;
            await inventoryRepository.save(inventory);
        }
        if (input.type === Order_1.OrderType.SUPPLY) {
            if (!inventory) {
                inventory = inventoryRepository.create({
                    product,
                    store,
                    stock: 0,
                    reservedStock: 0,
                    warehouseLocation: "Main Warehouse",
                    lastRestockedAt: new Date()
                });
            }
            inventory.stock += item.quantity;
            inventory.lastRestockedAt = new Date();
            await inventoryRepository.save(inventory);
        }
        const orderItem = new OrderItem_1.OrderItem();
        orderItem.product = product;
        orderItem.quantity = item.quantity;
        orderItem.unitPrice = effectiveUnitPrice;
        orderItem.taxRate = effectiveTaxRate;
        orderItem.lineTotal = Number((lineSubTotal + lineTax).toFixed(2));
        orderItems.push(orderItem);
        subTotal += lineSubTotal;
        taxAmount += lineTax;
    }
    const discountAmount = input.discountAmount ?? 0;
    const totalAmount = Number((subTotal + taxAmount - discountAmount).toFixed(2));
    const order = orderRepository.create({
        orderNumber: generateOrderNumber(input.type),
        type: input.type,
        status: input.status ?? Order_1.OrderStatus.COMPLETED,
        store,
        customer,
        createdBy,
        supplierName: input.supplierName ?? null,
        subTotal: Number(subTotal.toFixed(2)),
        taxAmount: Number(taxAmount.toFixed(2)),
        totalAmount,
        discountAmount,
        notes: input.notes ?? null,
        items: orderItems
    });
    const savedOrder = await orderRepository.save(order);
    if (input.payments?.length) {
        const payments = input.payments.map((payment) => paymentRepository.create({
            order: savedOrder,
            method: payment.method,
            amount: payment.amount,
            reference: payment.reference ?? null
        }));
        await paymentRepository.save(payments);
    }
    if (customer && input.type === Order_1.OrderType.SALE) {
        customer.totalSpent = Number((Number(customer.totalSpent) + totalAmount).toFixed(2));
        await customerRepository.save(customer);
    }
    await (0, audit_service_1.createAuditLog)({
        action: input.type === Order_1.OrderType.SALE ? "CREATE_BILL" : "CREATE_SUPPLY_ORDER",
        entityType: "Order",
        entityId: savedOrder.id,
        metadata: {
            orderNumber: savedOrder.orderNumber,
            totalAmount,
            itemCount: input.items.length
        },
        userId: input.createdById
    });
    await (0, notification_service_1.syncLowStockNotifications)();
    return orderRepository.findOneOrFail({
        where: { id: savedOrder.id },
        relations: {
            customer: true,
            createdBy: true,
            items: {
                product: true
            },
            payments: true,
            store: true
        }
    });
}
async function listOrders() {
    const repository = data_source_1.AppDataSource.getRepository(Order_1.Order);
    return repository.find({
        order: { createdAt: "DESC" },
        relations: {
            customer: true,
            createdBy: true,
            items: {
                product: true
            },
            payments: true,
            store: true
        }
    });
}
