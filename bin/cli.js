#!/usr/bin/env node

import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { AuthManager } from '../src/auth.js';
import { SerpClient } from '../src/api-client.js';
import { runServer } from '../src/index.js';

const args = process.argv.slice(2);
const command = args[0];

if (command === 'login') {
  interactiveLogin();
} else if (command === 'status') {
  checkStatus();
} else {
  runServer().catch((error) => {
    console.error('Fatal error starting Dastyar SERP MCP server:', error);
    process.exit(1);
  });
}

async function interactiveLogin() {
  const rl = readline.createInterface({ input, output });
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║       سامانه ورود Dastyar SERP MCP Server            ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');
  console.log('روش ورود را انتخاب کنید:\n');
  console.log('  1) 🔑 ورود با ایمیل و رمز عبور (Keystone Admin)');
  console.log('  2) 🍪 ثبت دستی توکن سشن (keystonejs-session cookie)');
  console.log('  3) ❌ انصراف\n');

  try {
    const choice = (await rl.question('گزینه مورد نظر (1-3) [پیش‌فرض: 1]: ')).trim() || '1';

    if (choice === '1') {
      const email = (await rl.question('ایمیل مدیر [admin@dastyar.io]: ')).trim() || 'admin@dastyar.io';
      const password = await rl.question('رمز عبور: ');
      rl.close();

      console.log('\nدر حال احراز هویت با سرور SERP...');
      const result = await AuthManager.login(email, password);
      console.log('✅ ورود با موفقیت انجام شد!');
      console.log(`👤 کاربر: ${result.user?.name || 'Admin'} (${result.user?.email})`);
      process.exit(0);
    } else if (choice === '2') {
      const token = await rl.question('توکن سشن keystonejs-session: ');
      rl.close();
      if (!token.trim()) {
        console.log('❌ مقداری وارد نشد.');
        process.exit(1);
      }
      AuthManager.setToken(token.trim());
      console.log('✅ توکن سشن با موفقیت ذخیره شد.');
      process.exit(0);
    } else {
      rl.close();
      console.log('عملیات لغو شد.');
      process.exit(0);
    }
  } catch (err) {
    rl.close();
    console.error('\n❌ خطا در ورود:', err.message);
    process.exit(1);
  }
}

async function checkStatus() {
  console.log('بررسی وضعیت احراز هویت در پنل Dastyar SERP...\n');
  const token = AuthManager.getToken();
  const hasCreds = AuthManager.hasCredentials();

  console.log(`• وضعیت سشن محلی: ${token ? '✅ فعال (' + token.slice(0, 12) + '...' + token.slice(-8) + ')' : '❌ غیرفعال'}`);
  console.log(`• ورود خودکار (SERP_ADMIN_EMAIL/PASSWORD): ${hasCreds ? '✅ تنظیم شده' : '⚪ تنظیم نشده'}\n`);

  if (!token && !hasCreds) {
    console.log('❌ دسترسی فعال نیست. برای ورود، دستور زیر را اجرا کنید:');
    console.log('   npm run login');
    process.exit(1);
  }

  try {
    const profile = await AuthManager.getProfile();
    console.log('✅ اتصال فعال و هویت تایید شد:');
    console.log('  نام:', profile.name);
    console.log('  ایمیل:', profile.email);
    console.log('  شناسه:', profile.id);
    console.log('  ادمین:', profile.isAdmin ? 'بله' : 'خیر');

    const stats = await SerpClient.getOverviewStats();
    console.log('\n📊 خلاصه سیستم SERP:');
    console.log('  تعداد پروموشن‌ها:', stats.promotionsCount, `(فعال: ${stats.activePromotionsCount})`);
    console.log('  تبلیغات هوشنگ:', stats.chatbotAdsCount);
    console.log('  صف داوری تبلیغات (Pending Review):', stats.pendingAdReviewCount);
    console.log('  پیشنهادات ادغام اینتنت:', stats.pendingIntentMergeCount);
    console.log('  جستجوهای ثبت‌شده کاربران:', stats.recentQueriesCount);
    console.log('  ترندهای جستجو:', stats.searchTrendsCount);
  } catch (err) {
    console.error('❌ خطا در اتصال به سرور:', err.message);
    process.exit(1);
  }
}
