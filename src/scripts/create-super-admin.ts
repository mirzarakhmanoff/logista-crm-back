/**
 * SUPER_ADMIN user yaratish scripti
 *
 * .env faylida quyidagilar bo'lishi kerak:
 *   SUPER_ADMIN_EMAIL=...
 *   SUPER_ADMIN_FULL_NAME=...
 *   SUPER_ADMIN_PASSWORD=...
 *
 * Ishga tushirish:
 *   npx ts-node -r tsconfig-paths/register src/scripts/create-super-admin.ts
 */

import * as dotenv from 'dotenv';
import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/logista-crm';

const email = process.env.SUPER_ADMIN_EMAIL;
const fullName = process.env.SUPER_ADMIN_FULL_NAME;
const password = process.env.SUPER_ADMIN_PASSWORD;

if (!email || !fullName || !password) {
  console.error('❌ .env faylida SUPER_ADMIN_EMAIL, SUPER_ADMIN_FULL_NAME va SUPER_ADMIN_PASSWORD bo\'lishi shart');
  process.exit(1);
}

async function run() {
  console.log('\n🔧 SUPER_ADMIN user yaratilmoqda...\n');

  const conn = await mongoose.connect(MONGODB_URI);
  const db = conn.connection.db!;
  const usersCol = db.collection('users');

  const existing = await usersCol.findOne({ email: email!.toLowerCase() });

  if (existing) {
    await usersCol.updateOne(
      { email: email!.toLowerCase() },
      {
        $set: {
          role: 'super_admin',
          companyId: null,
          isActive: true,
          updatedAt: new Date(),
        },
      },
    );
    console.log(`✅ Mavjud user SUPER_ADMIN ga yangilandi: ${email}`);
  } else {
    const hashedPassword = await bcrypt.hash(password!, 10);

    await usersCol.insertOne({
      email: email!.toLowerCase(),
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

    console.log(`✅ SUPER_ADMIN yaratildi!`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Email   : ${email}`);
  console.log(`  Rol     : super_admin`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Xato:', err.message);
  mongoose.disconnect();
  process.exit(1);
});
