import { Telegraf, Markup, Context } from 'telegraf';
import { getWebAppUrl } from '../utils/webApp';

// Helper to safely send a WebApp button reply
const sendProfileWebApp = async (ctx: Context, label: string) => {
  const url = getWebAppUrl();
  
  if (!url) {
    await ctx.reply('⚠️ Profile URL is not configured. Please contact support.');
    return;
  }

  await ctx.reply(label, {
    ...Markup.inlineKeyboard([
      [Markup.button.webApp('📊 Open Profile', url)]
    ])
  });
};

export function setupProfileCommand(bot: Telegraf) {
  // Handle /profile command
  bot.command('profile', async (ctx: Context) => {
    try {
      // Validate user context
      if (!ctx.from?.id) {
        console.warn('[ProfileCommand] Received command from anonymous source');
        return;
      }

      await sendProfileWebApp(ctx, '📊 View your full profile in the game:');
    } catch (error) {
      console.error('[ProfileCommand] Failed to send profile message:', {
        userId: ctx.from?.id,
        chatId: ctx.chat?.id,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Fallback error message with its own error handling
      try {
        await ctx.reply('❌ Error loading profile. Please try again later.');
      } catch {
        // Silent fail to avoid crashing the bot
      }
    }
  });

  // Handle 'profile' callback query (from inline keyboard buttons)
  bot.action('profile', async (ctx: Context) => {
    try {
      // Answer the callback query FIRST to prevent timeout
      await ctx.answerCbQuery();
      
      // Validate user context
      if (!ctx.from?.id) {
        console.warn('[ProfileCommand] Received callback from anonymous source');
        return;
      }

      await sendProfileWebApp(ctx, '📊 View your stats in the game:');
    } catch (error) {
      console.error('[ProfileCommand] Failed to handle profile callback:', {
        userId: ctx.from?.id,
        callbackId: ctx.callbackQuery?.id,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Try to answer the callback even if reply fails
      try {
        await ctx.answerCbQuery('❌ Error loading profile');
      } catch {
        // Silent fail
      }
    }
  });
}
