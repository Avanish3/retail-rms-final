import { AppDataSource } from "../config/data-source";
import { Inventory } from "../entities/Inventory";
import { Notification, NotificationSeverity } from "../entities/Notification";

export async function createNotification(
  title: string,
  message: string,
  severity: NotificationSeverity = NotificationSeverity.INFO
) {
  const repository = AppDataSource.getRepository(Notification);
  const notification = repository.create({ title, message, severity });
  return repository.save(notification);
}

export async function syncLowStockNotifications() {
  const inventoryRepository = AppDataSource.getRepository(Inventory);
  const notificationRepository = AppDataSource.getRepository(Notification);

  const inventoryItems = await inventoryRepository.find({
    relations: {
      product: true,
      store: true
    }
  });

  for (const item of inventoryItems) {
    if (item.stock > item.product.reorderLevel) {
      continue;
    }

    const title = `Low stock: ${item.product.name}`;
    const message = `${item.product.name} at ${item.store.name} is down to ${item.stock} units. Reorder level is ${item.product.reorderLevel}.`;
    const exists = await notificationRepository.findOne({
      where: {
        title,
        message
      }
    });

    if (!exists) {
      await createNotification(
        title,
        message,
        item.stock === 0 ? NotificationSeverity.CRITICAL : NotificationSeverity.WARNING
      );
    }
  }
}
