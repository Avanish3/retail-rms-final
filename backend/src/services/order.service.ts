import { AppDataSource } from "../config/data-source";
import { AppError } from "../common/errors";
import { Customer } from "../entities/Customer";
import { Inventory } from "../entities/Inventory";
import { Order, OrderStatus, OrderType } from "../entities/Order";
import { OrderItem } from "../entities/OrderItem";
import { Payment, PaymentMethod } from "../entities/Payment";
import { Product } from "../entities/Product";
import { Store } from "../entities/Store";
import { User } from "../entities/User";
import { createAuditLog } from "./audit.service";
import { syncLowStockNotifications } from "./notification.service";

export type OrderItemInput = {
  productId: string;
  quantity: number;
  unitPrice?: number;
  taxRate?: number;
};

export type PaymentInput = {
  method: PaymentMethod;
  amount: number;
  reference?: string;
};

type CreateOrderInput = {
  type: OrderType;
  status?: OrderStatus;
  storeId?: string;
  customerId?: string;
  supplierName?: string;
  discountAmount?: number;
  notes?: string;
  taxRate?: number;
  items: OrderItemInput[];
  payments?: PaymentInput[];
  createdById?: string;
};

function generateOrderNumber(type: OrderType) {
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${type === OrderType.SALE ? "SAL" : "SUP"}-${Date.now()}-${suffix}`;
}

export async function createOrder(input: CreateOrderInput) {
  const storeRepository = AppDataSource.getRepository(Store);
  const productRepository = AppDataSource.getRepository(Product);
  const inventoryRepository = AppDataSource.getRepository(Inventory);
  const customerRepository = AppDataSource.getRepository(Customer);
  const userRepository = AppDataSource.getRepository(User);
  const orderRepository = AppDataSource.getRepository(Order);
  const paymentRepository = AppDataSource.getRepository(Payment);

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
    throw new AppError(404, "Store not found");
  }

  if (input.customerId && !customer) {
    throw new AppError(404, "Customer not found");
  }

  if (!input.items.length) {
    throw new AppError(400, "At least one item is required");
  }

  const orderItems: OrderItem[] = [];
  let subTotal = 0;
  let taxAmount = 0;

  for (const item of input.items) {
    const product = await productRepository.findOne({ where: { id: item.productId } });
    if (!product) {
      throw new AppError(404, `Product not found: ${item.productId}`);
    }

    const effectiveUnitPrice = item.unitPrice ?? Number(product.price);
    const effectiveTaxRate = item.taxRate ?? input.taxRate ?? 18;
    const lineSubTotal = effectiveUnitPrice * item.quantity;
    const lineTax = (lineSubTotal * effectiveTaxRate) / 100;

    if (!store) {
      throw new AppError(400, "Store is required");
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

    if (input.type === OrderType.SALE) {
      if (!inventory || inventory.stock < item.quantity) {
        throw new AppError(400, `Insufficient stock for ${product.name}`);
      }

      inventory.stock -= item.quantity;
      await inventoryRepository.save(inventory);
    }

    if (input.type === OrderType.SUPPLY) {
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

    const orderItem = new OrderItem();
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
    status: input.status ?? OrderStatus.COMPLETED,
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
    const payments = input.payments.map((payment) =>
      paymentRepository.create({
        order: savedOrder,
        method: payment.method,
        amount: payment.amount,
        reference: payment.reference ?? null
      })
    );
    await paymentRepository.save(payments);
  }

  if (customer && input.type === OrderType.SALE) {
    customer.totalSpent = Number((Number(customer.totalSpent) + totalAmount).toFixed(2));
    await customerRepository.save(customer);
  }

  await createAuditLog({
    action: input.type === OrderType.SALE ? "CREATE_BILL" : "CREATE_SUPPLY_ORDER",
    entityType: "Order",
    entityId: savedOrder.id,
    metadata: {
      orderNumber: savedOrder.orderNumber,
      totalAmount,
      itemCount: input.items.length
    },
    userId: input.createdById
  });

  await syncLowStockNotifications();

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

export async function listOrders() {
  const repository = AppDataSource.getRepository(Order);
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
