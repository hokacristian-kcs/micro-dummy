import { walletRepo } from '../repository/wallet.repo.js';
import { SERVICES, callService } from '../../../../shared/service-client.js';
import { createLogger } from '../../../../shared/logger.js';

const log = createLogger('WALLET-SERVICE');

export const walletUsecase = {
  create: async (userId: string) => {
    log.info('Creating wallet', { userId });
    const wallet = await walletRepo.create(userId);
    log.info('Wallet created', { walletId: wallet.id, userId });
    return wallet;
  },
  getBalance: async (userId: string) => {
    log.debug('Getting balance', { userId });
    return walletRepo.findByUserId(userId);
  },
  topup: async (userId: string, amount: number) => {
    log.info('Processing topup', { userId, amount });
    const wallet = await walletRepo.updateBalance(userId, amount);
    log.info('Topup success', { userId, amount, newBalance: wallet.balance });
    
    await callService(`${SERVICES.NOTIFICATION}/notifications`, {
      method: 'POST',
      body: JSON.stringify({ userId, title: 'Top Up Berhasil', message: `Saldo bertambah Rp${amount}` }),
    });
    log.debug('Notification sent', { userId });
    return wallet;
  },
  deduct: async (userId: string, amount: number) => {
    log.info('Processing deduction', { userId, amount });
    const wallet = await walletRepo.findByUserId(userId);
    if (!wallet || Number(wallet.balance) < amount) {
      log.warn('Insufficient balance', { userId, amount, currentBalance: wallet?.balance });
      throw new Error('Insufficient balance');
    }
    const updated = await walletRepo.updateBalance(userId, -amount);
    log.info('Deduction success', { userId, amount, newBalance: updated.balance });
    return updated;
  },
};
