"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDemandForecast = getDemandForecast;
exports.getSmartInventoryAlerts = getSmartInventoryAlerts;
exports.getRecommendations = getRecommendations;
exports.getFraudDetections = getFraudDetections;
exports.getDynamicPricing = getDynamicPricing;
const typeorm_1 = require("typeorm");
const data_source_1 = require("../config/data-source");
const Inventory_1 = require("../entities/Inventory");
const Notification_1 = require("../entities/Notification");
const Order_1 = require("../entities/Order");
const Product_1 = require("../entities/Product");
function getDaysBackDate(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
}
async function getDemandForecast(productId) {
    const repository = data_source_1.AppDataSource.getRepository(Order_1.Order);
    const since90 = getDaysBackDate(90);
    const last30 = getDaysBackDate(30);
    const orders = await repository.find({
        where: {
            type: Order_1.OrderType.SALE,
            createdAt: (0, typeorm_1.Between)(since90, new Date())
        },
        relations: {
            items: {
                product: true
            }
        }
    });
    const forecastMap = new Map();
    for (const order of orders) {
        const isRecent30 = new Date(order.createdAt) >= last30;
        for (const item of order.items) {
            if (productId && item.product.id !== productId) {
                continue;
            }
            const current = forecastMap.get(item.product.id) ?? {
                productId: item.product.productId,
                name: item.product.name,
                soldLast30Days: 0,
                soldLast90Days: 0
            };
            current.soldLast90Days += item.quantity;
            if (isRecent30) {
                current.soldLast30Days += item.quantity;
            }
            forecastMap.set(item.product.id, current);
        }
    }
    return [...forecastMap.values()].map((entry) => {
        const monthlyAverage = entry.soldLast90Days / 3;
        const trendBoost = entry.soldLast30Days > monthlyAverage ? 1.15 : 0.95;
        return {
            ...entry,
            predictedDemand: Math.max(1, Math.round(monthlyAverage * trendBoost))
        };
    });
}
async function getSmartInventoryAlerts() {
    const inventoryRepository = data_source_1.AppDataSource.getRepository(Inventory_1.Inventory);
    const inventoryItems = await inventoryRepository.find({
        relations: {
            product: true,
            store: true
        }
    });
    const forecasts = await getDemandForecast();
    return inventoryItems.map((item) => {
        const forecast = forecasts.find((entry) => entry.productId === item.product.productId);
        const monthlyDemand = forecast?.predictedDemand ?? 1;
        const dailyDemand = monthlyDemand / 30;
        const daysOfCover = dailyDemand ? Number((item.stock / dailyDemand).toFixed(1)) : 999;
        let risk = "BALANCED";
        let severity = Notification_1.NotificationSeverity.INFO;
        if (item.stock <= item.product.reorderLevel || daysOfCover < 7) {
            risk = "OUT_OF_STOCK";
            severity = item.stock === 0 ? Notification_1.NotificationSeverity.CRITICAL : Notification_1.NotificationSeverity.WARNING;
        }
        else if (daysOfCover > 90) {
            risk = "OVERSTOCK";
            severity = Notification_1.NotificationSeverity.WARNING;
        }
        return {
            inventoryId: item.id,
            productId: item.product.productId,
            productName: item.product.name,
            store: item.store.name,
            currentStock: item.stock,
            predictedMonthlyDemand: monthlyDemand,
            daysOfCover,
            risk,
            severity
        };
    });
}
async function getRecommendations(productId) {
    const orderRepository = data_source_1.AppDataSource.getRepository(Order_1.Order);
    const productRepository = data_source_1.AppDataSource.getRepository(Product_1.Product);
    const product = await productRepository.findOne({ where: { id: productId } });
    if (!product) {
        return [];
    }
    const orders = await orderRepository.find({
        where: {
            type: Order_1.OrderType.SALE
        },
        relations: {
            items: {
                product: true
            }
        }
    });
    const counts = new Map();
    for (const order of orders) {
        const containsPrimary = order.items.some((item) => item.product.id === productId);
        if (!containsPrimary) {
            continue;
        }
        for (const item of order.items) {
            if (item.product.id === productId) {
                continue;
            }
            const current = counts.get(item.product.id) ?? {
                productId: item.product.productId,
                name: item.product.name,
                score: 0
            };
            current.score += item.quantity;
            counts.set(item.product.id, current);
        }
    }
    return [...counts.values()].sort((a, b) => b.score - a.score).slice(0, 5);
}
async function getFraudDetections() {
    const orderRepository = data_source_1.AppDataSource.getRepository(Order_1.Order);
    const orders = await orderRepository.find({
        where: {
            type: Order_1.OrderType.SALE
        },
        relations: {
            createdBy: true,
            items: true,
            payments: true,
            customer: true
        }
    });
    const avgOrderValue = orders.length > 0
        ? orders.reduce((sum, order) => sum + Number(order.totalAmount), 0) / orders.length
        : 0;
    return orders
        .map((order) => {
        const flags = [];
        if (Number(order.totalAmount) > avgOrderValue * 2.5) {
            flags.push("High transaction value compared to average bill size");
        }
        if (Number(order.discountAmount) > Number(order.subTotal) * 0.25) {
            flags.push("Large discount applied");
        }
        if (order.items.length > 15) {
            flags.push("Unusually high number of line items");
        }
        if (order.payments.length > 2) {
            flags.push("Multiple fragmented payment methods");
        }
        return {
            orderId: order.id,
            orderNumber: order.orderNumber,
            cashier: order.createdBy?.fullName ?? "Unknown",
            customer: order.customer?.name ?? "Walk-in",
            totalAmount: Number(order.totalAmount),
            riskScore: flags.length * 25,
            flags
        };
    })
        .filter((entry) => entry.flags.length > 0)
        .sort((a, b) => b.riskScore - a.riskScore);
}
async function getDynamicPricing(productId) {
    const productRepository = data_source_1.AppDataSource.getRepository(Product_1.Product);
    const inventoryRepository = data_source_1.AppDataSource.getRepository(Inventory_1.Inventory);
    const product = await productRepository.findOne({ where: { id: productId } });
    if (!product) {
        return null;
    }
    const forecast = (await getDemandForecast(productId))[0];
    const inventory = await inventoryRepository.find({
        where: {
            product: { id: productId }
        }
    });
    const currentStock = inventory.reduce((sum, item) => sum + item.stock, 0);
    const predictedDemand = forecast?.predictedDemand ?? 1;
    const coverage = currentStock / predictedDemand;
    let multiplier = 1;
    let strategy = "Stable pricing";
    if (coverage < 0.8) {
        multiplier = 1.08;
        strategy = "Low stock + strong demand";
    }
    else if (coverage > 2.5) {
        multiplier = 0.94;
        strategy = "Overstock clearance";
    }
    return {
        productId: product.productId,
        productName: product.name,
        currentPrice: Number(product.price),
        currentStock,
        predictedDemand,
        strategy,
        recommendedPrice: Number((Number(product.price) * multiplier).toFixed(2))
    };
}
