import { Telegraf, Markup, Context } from 'telegraf';
import { getWebAppUrl } from '../utils/webApp';

export function setupPlayCommand(bot: Telegraf) {
  bot.command('play', async (ctx: Context) => {
    const webAppUrl = getWebAppUrl();

    // Validate URL before sending
    if (!webAppUrl) {
      try {
        await ctx.reply('⚠️ Game deployment URL is not configured. Please contact support.');
      } catch (error) {
        console.error('[PlayCommand] Failed to send error message:', error);
      }
      return;
    }

    try {
      await ctx.reply('🎮 Launch WAR PIGS:', {
        ...Markup.inlineKeyboard([
          [Markup.button.webApp('▶️ START GAME', webAppUrl)]
        ])
      });
    } catch (error) {
      // Handle delivery failures gracefully
      console.error('[PlayCommand] Failed to send play message:', {
        userId: ctx.from?.id,
        chatId: ctx.chat?.id,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Fallback: send plain text link if inline keyboard fails
      try {
        await ctx.reply(`Game not loading? Open directly: ${webAppUrl}`);
      } catch {
        // Silent fail to avoid crashing the bot
      }
    }
  });
}
