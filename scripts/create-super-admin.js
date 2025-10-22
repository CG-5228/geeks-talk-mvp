const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createSuperAdmin() {
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'g15222152017@gmail.com';
  
  try {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: superAdminEmail }
    });
    
    if (!existingUser) {
      console.log(`User with email ${superAdminEmail} not found. Please create the user first.`);
      process.exit(1);
    }
    
    // Check if admin permission already exists
    const existingPermission = await prisma.adminPermission.findUnique({
      where: { userId: existingUser.id }
    });
    
    if (existingPermission) {
      console.log(`Admin permission already exists for ${superAdminEmail}`);
      console.log(`Admin Hash: ${existingPermission.adminHash}`);
      process.exit(0);
    }
    
    // Create admin permission
    const crypto = require('crypto');
    const secret = process.env.ADMIN_HASH_SECRET || 'fallback-secret';
    const timestamp = Date.now();
    const hash = crypto
      .createHash('sha256')
      .update(`${existingUser.id}-${timestamp}-${secret}`)
      .digest('hex')
      .substring(0, 32);
    
    const adminPermission = await prisma.adminPermission.create({
      data: {
        userId: existingUser.id,
        adminHash: hash,
        grantedBy: null // Super admin is self-granted
      }
    });
    
    console.log(`Super admin permission created successfully!`);
    console.log(`Email: ${superAdminEmail}`);
    console.log(`Admin Hash: ${adminPermission.adminHash}`);
    console.log(`Admin URL: /admin/${adminPermission.adminHash}`);
    
  } catch (error) {
    console.error('Error creating super admin:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createSuperAdmin();
