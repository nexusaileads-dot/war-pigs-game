import { Telegraf, Markup, Context } from 'telegraf';
import { getWebAppUrl } from '../utils/webApp';

// Helper to parse admin IDs safely per-request
const getAdminIds = (): string[] => {
  return (process.env.ADMIN_TELEGRAM_IDS || '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean);
};

export function setupAdminCommand(bot: Telegraf) {
  bot.command('admin', async (ctx: Context) => {
    try {
      const userId = ctx.from?.id?.toString();
      if (!userId) {
        console.warn('[AdminCommand] Command received from anonymous/unknown source');
        return;
      }

      const adminIds = getAdminIds();
      if (!adminIds.includes(userId)) {
        await ctx.reply('⛔ Unauthorized access. This command is restricted to administrators.');
        return;
      }

      // Use dedicated admin URL or fallback to main WebApp with query param
      const dashboardUrl = process.env.ADMIN_DASHBOARD_URL || `${getWebAppUrl()}?mode=admin`;

      await ctx.reply('👑 *Admin Panel*\n\nAccess the web dashboard to manage the game economy, view system metrics, and configure missions.', {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.webApp('🛡️ Open Dashboard', dashboardUrl)]
        ])
      });
    } catch (error) {
      console.error('[AdminCommand] Failed to process /admin command:', {
        userId: ctx.from?.id,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Graceful fallback
      try {
        await ctx.reply('❌ Failed to load admin panel. Please try again later.');
      } catch {
        // Silent fail to prevent bot crash
      }
    }
  });
}
