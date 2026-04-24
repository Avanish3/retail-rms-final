import { Between } from "typeorm";
import { AppDataSource } from "../config/data-source";
import { Inventory } from "../entities/Inventory";
import { NotificationSeverity } from "../entities/Notification";
import { Order, OrderType } from "../entities/Order";
import { Product } from "../entities/Product";

function getDaysBackDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

export async function getDemandForecast(productId?: string) {
  const repository = AppDataSource.getRepository(Order);
  const since90 = getDaysBackDate(90);
  const last30 = getDaysBackDate(30);
  const orders = await repository.find({
    where: {
      type: OrderType.SALE,
      createdAt: Between(since90, new Date())
    },
    relations: {
      items: {
        product: true
      }
    }
  });

  const forecastMap = new Map<
    string,
    { productId: string; name: string; soldLast30Days: number; soldLast90Days: number }
  >();

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

export async function getSmartInventoryAlerts() {
  const inventoryRepository = AppDataSource.getRepository(Inventory);
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

    let risk: "OUT_OF_STOCK" | "OVERSTOCK" | "BALANCED" = "BALANCED";
    let severity = NotificationSeverity.INFO;

    if (item.stock <= item.product.reorderLevel || daysOfCover < 7) {
      risk = "OUT_OF_STOCK";
      severity = item.stock === 0 ? NotificationSeverity.CRITICAL : NotificationSeverity.WARNING;
    } else if (daysOfCover > 90) {
      risk = "OVERSTOCK";
      severity = NotificationSeverity.WARNING;
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

export async function getRecommendations(productId: string) {
  const orderRepository = AppDataSource.getRepository(Order);
  const productRepository = AppDataSource.getRepository(Product);
  const product = await productRepository.findOne({ where: { id: productId } });

  if (!product) {
    return [];
  }

  const orders = await orderRepository.find({
    where: {
      type: OrderType.SALE
    },
    relations: {
      items: {
        product: true
      }
    }
  });

  const counts = new Map<string, { productId: string; name: string; score: number }>();
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

export async function getFraudDetections() {
  const orderRepository = AppDataSource.getRepository(Order);
  const orders = await orderRepository.find({
    where: {
      type: OrderType.SALE
    },
    relations: {
      createdBy: true,
      items: true,
      payments: true,
      customer: true
    }
  });

  const avgOrderValue =
    orders.length > 0
      ? orders.reduce((sum, order) => sum + Number(order.totalAmount), 0) / orders.length
      : 0;

  return orders
    .map((order) => {
      const flags: string[] = [];
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

export async function getDynamicPricing(productId: string) {
  const productRepository = AppDataSource.getRepository(Product);
  const inventoryRepository = AppDataSource.getRepository(Inventory);
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
  } else if (coverage > 2.5) {
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
