/**
 * SUPER_ADMIN user yaratish scripti
 *
 * Ishga tushirish:
 *   npx ts-node -r tsconfig-paths/register src/scripts/create-super-admin.ts
 */

import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/logista-crm';

const SUPER_ADMIN = {
  email: 'superadmin@logista.uz',
  fullName: 'Super Admin',
  password: 'SuperAdmin123!',
};

async function run() {
  console.log('\n🔧 SUPER_ADMIN user yaratilmoqda...\n');

  const conn = await mongoose.connect(MONGODB_URI);
  const db = conn.connection.db!;
  const usersCol = db.collection('users');

  // Tekshirish — allaqachon bormi?
  const existing = await usersCol.findOne({ email: SUPER_ADMIN.email });

  if (existing) {
    // Borsa — rolini super_admin ga o'zgartir
    await usersCol.updateOne(
      { email: SUPER_ADMIN.email },
      {
        $set: {
          role: 'super_admin',
          companyId: null,
          isActive: true,
          updatedAt: new Date(),
        },
      },
    );
    console.log(`✅ Mavjud user SUPER_ADMIN ga yangilandi: ${SUPER_ADMIN.email}`);
  } else {
    // Yangi user yaratish
    const hashedPassword = await bcrypt.hash(SUPER_ADMIN.password, 10);

    await usersCol.insertOne({
      email: SUPER_ADMIN.email,
      password: hashedPassword,
      fullName: SUPER_ADMIN.fullName,
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
  console.log(`  Email   : ${SUPER_ADMIN.email}`);
  console.log(`  Parol   : ${SUPER_ADMIN.password}`);
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
