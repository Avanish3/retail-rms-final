import { Between } from "typeorm";
import { cacheGet, cacheSet } from "../config/cache";
import { AppDataSource } from "../config/data-source";
import { Inventory } from "../entities/Inventory";
import { Order, OrderType } from "../entities/Order";
import { Product } from "../entities/Product";

function getRange(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);
  return { start, end };
}

export async function getSalesReport(days = 30) {
  const key = `reports:sales:${days}`;
  const cached = await cacheGet<{
    days: number;
    revenue: number;
    taxCollected: number;
    billsCount: number;
    averageBillValue: number;
    topProducts: Array<{ productId: string; name: string; quantity: number; revenue: number }>;
  }>(key);
  if (cached) {
    return cached;
  }

  const repository = AppDataSource.getRepository(Order);
  const { start, end } = getRange(days);
  const orders = await repository.find({
    where: {
      type: OrderType.SALE,
      createdAt: Between(start, end)
    },
    relations: {
      items: {
        product: true
      }
    }
  });

  const revenue = orders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
  const taxCollected = orders.reduce((sum, order) => sum + Number(order.taxAmount), 0);
  const billsCount = orders.length;
  const averageBillValue = billsCount ? revenue / billsCount : 0;

  const topProductsMap = new Map<string, { productId: string; name: string; quantity: number; revenue: number }>();
  for (const order of orders) {
    for (const item of order.items) {
      const keyId = item.product.id;
      const current = topProductsMap.get(keyId) ?? {
        productId: item.product.productId,
        name: item.product.name,
        quantity: 0,
        revenue: 0
      };
      current.quantity += item.quantity;
      current.revenue += Number(item.lineTotal);
      topProductsMap.set(keyId, current);
    }
  }

  const result = {
    days,
    revenue: Number(revenue.toFixed(2)),
    taxCollected: Number(taxCollected.toFixed(2)),
    billsCount,
    averageBillValue: Number(averageBillValue.toFixed(2)),
    topProducts: [...topProductsMap.values()]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)
  };

  await cacheSet(key, result);
  return result;
}

export async function getInventoryReport() {
  const key = "reports:inventory";
  const cached = await cacheGet<{
    totalSkus: number;
    totalUnits: number;
    lowStockItems: Array<{
      inventoryId: string;
      productId: string;
      productName: string;
      store: string;
      stock: number;
      reorderLevel: number;
    }>;
  }>(key);
  if (cached) {
    return cached;
  }

  const repository = AppDataSource.getRepository(Inventory);
  const inventoryItems = await repository.find({
    relations: {
      product: true,
      store: true
    }
  });

  const totalUnits = inventoryItems.reduce((sum, item) => sum + item.stock, 0);
  const lowStock = inventoryItems.filter((item) => item.stock <= item.product.reorderLevel);

  const result = {
    totalSkus: inventoryItems.length,
    totalUnits,
    lowStockItems: lowStock.map((item) => ({
      inventoryId: item.id,
      productId: item.product.productId,
      productName: item.product.name,
      store: item.store.name,
      stock: item.stock,
      reorderLevel: item.product.reorderLevel
    }))
  };

  await cacheSet(key, result);
  return result;
}

export async function getProfitReport(days = 30) {
  const key = `reports:profit:${days}`;
  const cached = await cacheGet<{
    days: number;
    revenue: number;
    estimatedCost: number;
    grossProfit: number;
    marginPercent: number;
  }>(key);
  if (cached) {
    return cached;
  }

  const repository = AppDataSource.getRepository(Order);
  const { start, end } = getRange(days);
  const orders = await repository.find({
    where: {
      type: OrderType.SALE,
      createdAt: Between(start, end)
    },
    relations: {
      items: {
        product: true
      }
    }
  });

  let revenue = 0;
  let cost = 0;
  for (const order of orders) {
    revenue += Number(order.totalAmount);
    for (const item of order.items) {
      cost += Number(item.product.costPrice) * item.quantity;
    }
  }

  const grossProfit = revenue - cost;
  const result = {
    days,
    revenue: Number(revenue.toFixed(2)),
    estimatedCost: Number(cost.toFixed(2)),
    grossProfit: Number(grossProfit.toFixed(2)),
    marginPercent: revenue ? Number(((grossProfit / revenue) * 100).toFixed(2)) : 0
  };

  await cacheSet(key, result);
  return result;
}

export async function getDashboardReport() {
  const [sales, inventory, profit, productCount] = await Promise.all([
    getSalesReport(30),
    getInventoryReport(),
    getProfitReport(30),
    AppDataSource.getRepository(Product).count()
  ]);

  return {
    sales,
    inventory,
    profit,
    productCount
  };
}
