import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // 기본 사용자 생성
  const hashedPassword = await bcrypt.hash('123456', 10);
  
  const user = await prisma.user.upsert({
    where: { username: 'current_user' },
    update: {},
    create: {
      email: 'current_user@example.com',
      username: 'current_user',
      password: hashedPassword,
      status: 'ONLINE',
    },
  });

  console.log('✅ Created user:', user.username);

  // 기본 워크스페이스 생성
  const workspace = await prisma.workspace.upsert({
    where: { slug: 'default-workspace' },
    update: {},
    create: {
      name: 'Default Workspace',
      slug: 'default-workspace',
      description: '기본 워크스페이스입니다.',
      ownerId: user.id,
    },
  });

  console.log('✅ Created workspace:', workspace.name);

  // 워크스페이스 멤버 등록
  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: user.id,
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      userId: user.id,
      role: 'OWNER',
    },
  });

  console.log('✅ Added user to workspace as OWNER');

  // 기본 채널 생성
  const existingGeneralChannel = await prisma.channel.findFirst({
    where: { 
      workspaceId: workspace.id,
      name: 'general'
    }
  });

  if (!existingGeneralChannel) {
    await prisma.channel.create({
      data: {
        name: 'general',
        description: '일반 채널입니다.',
        isPrivate: false,
        workspaceId: workspace.id,
        creatorId: user.id,
      },
    });
    console.log('✅ Created channel: general');
  }

  const existingRandomChannel = await prisma.channel.findFirst({
    where: { 
      workspaceId: workspace.id,
      name: 'random'
    }
  });

  if (!existingRandomChannel) {
    await prisma.channel.create({
      data: {
        name: 'random',
        description: '자유 채널입니다.',
        isPrivate: false,
        workspaceId: workspace.id,
        creatorId: user.id,
      },
    });
    console.log('✅ Created channel: random');
  }

  // 추가 테스트 사용자들 생성
  const testUsers = [
    { username: 'admin', email: 'admin@example.com' },
    { username: 'john_doe', email: 'john@example.com' },
    { username: 'jane_smith', email: 'jane@example.com' },
    { username: 'mike_johnson', email: 'mike@example.com' },
  ];

  for (const userData of testUsers) {
    const testUser = await prisma.user.upsert({
      where: { username: userData.username },
      update: {},
      create: {
        email: userData.email,
        username: userData.username,
        password: hashedPassword,
        status: 'OFFLINE',
      },
    });

    // 워크스페이스 멤버로 추가
    await prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: testUser.id,
        },
      },
      update: {},
      create: {
        workspaceId: workspace.id,
        userId: testUser.id,
        role: 'MEMBER',
      },
    });

    console.log('✅ Created test user:', testUser.username);
  }

  console.log('🌱 Seed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 