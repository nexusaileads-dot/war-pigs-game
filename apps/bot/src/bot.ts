import { Telegraf, Context } from 'telegraf';
import { setupStartCommand } from './commands/start';
import { setupPlayCommand } from './commands/play';
import { setupProfileCommand } from './commands/profile';
import { setupAdminCommand } from './commands/admin';

// Validate critical environment variables
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('❌ FATAL: TELEGRAM_BOT_TOKEN environment variable is required');
  process.exit(1);
}

// Create bot instance
const bot = new Telegraf(BOT_TOKEN);

// Register basic middleware
bot.use((ctx, next) => {
  // Log incoming updates for debugging (dev only)
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Bot] ${ctx.updateType} from user ${ctx.from?.id}`);
  }
  return next();
});

// Simple rate limiting: 10 messages per minute per user
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
bot.use((ctx, next) => {
  const userId = ctx.from?.id?.toString();
  if (!userId) return next();

  const now = Date.now();
  const record = rateLimitMap.get(userId);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 });
    return next();
  }

  if (record.count >= 10) {
    console.warn(`[Bot] Rate limit exceeded for user ${userId}`);
    return ctx.reply('⏳ Please slow down. Too many requests.').catch(() => {});
  }

  record.count += 1;
  return next();
});

// Initialize Commands
setupStartCommand(bot);
setupPlayCommand(bot);
setupProfileCommand(bot);
setupAdminCommand(bot);

// Enhanced error handling
bot.catch((err: Error, ctx: Context) => {
  const updateType = ctx.updateType;
  const userId = ctx.from?.id;
  const chatId = ctx.chat?.id;

  console.error(`[Bot] Error for ${updateType} (user: ${userId}, chat: ${chatId}):`, {
    name: err.name,
    message: err.message,
    stack: err.stack
  });

  // Only reply if the context is still valid
  if (ctx?.reply) {
    ctx.reply('❌ An unexpected error occurred. Please try again or contact support.').catch(() => {});
  }
});

// Launch function with mode detection
async function launchBot() {
  const webhookUrl = process.env.WEBHOOK_URL;

  if (webhookUrl) {
    // Webhook mode
    const port = Number(process.env.WEBHOOK_PORT) || 3000;
    
    await bot.telegram.setWebhook(webhookUrl);
    await bot.startWebhook('/webhook', undefined, port);
    
    console.log(`✅ WAR PIGS bot launched in WEBHOOK mode`);
    console.log(`   Webhook URL: ${webhookUrl}`);
    console.log(`   Listening on port ${port}`);
  } else {
    // Long polling mode (default for development)
    await bot.launch();
    
    console.log('✅ WAR PIGS bot launched in POLLING mode');
  }

  // Log bot info
  const botInfo = await bot.telegram.getMe();
  console.log(`   Bot: @${botInfo.username} (ID: ${botInfo.id})`);
}

// Graceful shutdown with logging
async function gracefulShutdown(signal: string) {
  console.log(`\n🛑 Received ${signal}. Shutting down WAR PIGS bot...`);
  
  try {
    // Stop webhook if active
    if (process.env.WEBHOOK_URL) {
      await bot.telegram.deleteWebhook();
      console.log('   Webhook deleted');
    }
    
    // Stop polling and flush pending updates
    await bot.stop(signal);
    console.log('   Bot stopped. Pending updates flushed.');
    
    console.log('✅ Shutdown complete');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during shutdown:', err);
    process.exit(1);
  }
}

// Register shutdown handlers
process.once('SIGINT', () => void gracefulShutdown('SIGINT'));
process.once('SIGTERM', () => void gracefulShutdown('SIGTERM'));

// Start the bot
console.log('🚀 Starting WAR PIGS bot...');
launchBot().catch((err) => {
  console.error('❌ Failed to launch bot:', err);
  process.exit(1);
});
