import { notificationRepo } from '../repository/notification.repo.js';
import { createLogger } from '../../../../shared/logger.js';

const log = createLogger('NOTIFICATION-SERVICE');

export const notificationUsecase = {
  send: async (userId: string, title: string, message: string) => {
    log.info('Sending notification', { userId, title });
    const notif = await notificationRepo.create(userId, title, message);
    log.info('Notification sent', { notifId: notif.id, userId });
    return notif;
  },
  getAll: async (userId: string) => {
    log.debug('Getting all notifications', { userId });
    return notificationRepo.findByUserId(userId);
  },
  markRead: async (id: string) => {
    log.info('Marking notification as read', { id });
    return notificationRepo.markAsRead(id);
  },
};
