"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotification = createNotification;
exports.syncLowStockNotifications = syncLowStockNotifications;
const data_source_1 = require("../config/data-source");
const Inventory_1 = require("../entities/Inventory");
const Notification_1 = require("../entities/Notification");
async function createNotification(title, message, severity = Notification_1.NotificationSeverity.INFO) {
    const repository = data_source_1.AppDataSource.getRepository(Notification_1.Notification);
    const notification = repository.create({ title, message, severity });
    return repository.save(notification);
}
async function syncLowStockNotifications() {
    const inventoryRepository = data_source_1.AppDataSource.getRepository(Inventory_1.Inventory);
    const notificationRepository = data_source_1.AppDataSource.getRepository(Notification_1.Notification);
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
            await createNotification(title, message, item.stock === 0 ? Notification_1.NotificationSeverity.CRITICAL : Notification_1.NotificationSeverity.WARNING);
        }
    }
}
