/**
 * Multi-tenancy migratsiya scripti
 *
 * Bu script:
 * 1. "Logista" kompaniyasini yaratadi
 * 2. Barcha mavjud datani shu kompaniyaga biriktiradi
 * 3. SUPER_ADMIN user yaratadi
 *
 * Ishga tushirish:
 *   npx ts-node -r tsconfig-paths/register src/scripts/migrate-to-multitenancy.ts
 */

import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as readline from 'readline';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/logista-crm';

// Collection nomlari
const COLLECTIONS = [
  'users',
  'clients',
  'requests',
  'invoices',
  'shipments',
  'rate_quotes',
  'issued_codes',
  'documents',
  'internaldocuments',
  'documentcategories',
  'personneldocuments',
  'personneldocumentcategories',
  'operational_payments',
  'notifications',
  'activity_logs',
  'chat_conversations',
  'chat_messages',
  'email_accounts',
  'email_messages',
];

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

async function run() {
  console.log('\n====================================');
  console.log(' LOGISTA CRM — Multi-tenancy Migration');
  console.log('====================================\n');

  // MongoDB ga ulaning
  console.log(`📡 MongoDB ga ulanmoqda: ${MONGODB_URI}`);
  await mongoose.connect(MONGODB_URI);
  console.log('✅ MongoDB ga ulandi\n');

  const db = mongoose.connection.db;
  if (!db) throw new Error('DB connection failed');

  // ─────────────────────────────────────────────
  // 1. Company yaratish
  // ─────────────────────────────────────────────
  const companiesCol = db.collection('companies');

  let company = await companiesCol.findOne({ slug: 'logista' });

  if (company) {
    console.log(`ℹ️  "Logista" kompaniyasi allaqachon mavjud. ID: ${company._id}`);
  } else {
    const result = await companiesCol.insertOne({
      name: 'Logista',
      slug: 'logista',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    company = await companiesCol.findOne({ _id: result.insertedId });
    console.log(`✅ "Logista" kompaniyasi yaratildi. ID: ${result.insertedId}`);
  }

  const companyId = company!._id;

  // ─────────────────────────────────────────────
  // 2. Barcha collectionslarni yangilash
  // ─────────────────────────────────────────────
  console.log('\n📦 Ma\'lumotlar yangilanmoqda...\n');

  for (const collectionName of COLLECTIONS) {
    try {
      const col = db.collection(collectionName);
      const total = await col.countDocuments({});
      if (total === 0) {
        console.log(`   ${collectionName}: 0 ta yozuv (o'tkazib yuborildi)`);
        continue;
      }

      const alreadyMigrated = await col.countDocuments({ companyId: { $exists: true } });
      const toMigrate = total - alreadyMigrated;

      if (toMigrate === 0) {
        console.log(`   ${collectionName}: ${total} ta yozuv allaqachon migratsiya qilingan`);
        continue;
      }

      const result = await col.updateMany(
        { companyId: { $exists: false } },
        { $set: { companyId } },
      );

      console.log(`   ✅ ${collectionName}: ${result.modifiedCount} ta yozuv yangilandi`);
    } catch (err) {
      console.log(`   ⚠️  ${collectionName}: xato — ${(err as Error).message}`);
    }
  }

  // ─────────────────────────────────────────────
  // 3. SUPER_ADMIN yaratish
  // ─────────────────────────────────────────────
  console.log('\n👤 SUPER_ADMIN user...\n');

  const usersCol = db.collection('users');
  const existingSuperAdmin = await usersCol.findOne({ role: 'super_admin' });

  if (existingSuperAdmin) {
    console.log(`ℹ️  SUPER_ADMIN allaqachon mavjud: ${existingSuperAdmin.email}`);
  } else {
    console.log('SUPER_ADMIN user ma\'lumotlarini kiriting:\n');

    const email = await ask('  Email: ');
    const fullName = await ask('  To\'liq ism: ');
    const password = await ask('  Parol: ');

    if (!email || !fullName || !password) {
      console.log('⚠️  Ma\'lumotlar to\'liq kiritilmadi. SUPER_ADMIN yaratilmadi.');
    } else {
      const existingEmail = await usersCol.findOne({ email: email.toLowerCase() });
      if (existingEmail) {
        console.log(`⚠️  Bu email allaqachon mavjud: ${email}`);
        // Rolini super_admin ga o'zgartirish
        await usersCol.updateOne(
          { email: email.toLowerCase() },
          { $set: { role: 'super_admin', companyId: null, updatedAt: new Date() } },
        );
        console.log(`✅ ${email} useri SUPER_ADMIN rolga o'zgartirildi`);
      } else {
        const hashedPassword = await bcrypt.hash(password, 10);
        await usersCol.insertOne({
          email: email.toLowerCase(),
          password: hashedPassword,
          fullName,
          role: 'super_admin',
          isActive: true,
          invitationStatus: 'accepted',
          mustChangePassword: false,
          companyId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log(`✅ SUPER_ADMIN yaratildi: ${email}`);
      }
    }
  }

  // ─────────────────────────────────────────────
  // 4. Natija
  // ─────────────────────────────────────────────
  console.log('\n====================================');
  console.log(' Migratsiya muvaffaqiyatli yakunlandi!');
  console.log('====================================\n');

  const counts: Record<string, number> = {};
  for (const col of COLLECTIONS) {
    try {
      const n = await db.collection(col).countDocuments({ companyId });
      if (n > 0) counts[col] = n;
    } catch { /* ignore */ }
  }

  console.log('📊 "Logista" kompaniyasiga biriktirilgan yozuvlar:');
  for (const [col, n] of Object.entries(counts)) {
    console.log(`   ${col}: ${n} ta`);
  }

  await mongoose.disconnect();
  console.log('\n✅ Tayyor!\n');
  process.exit(0);
}

run().catch(err => {
  console.error('\n❌ Xato:', err);
  mongoose.disconnect();
  process.exit(1);
});
