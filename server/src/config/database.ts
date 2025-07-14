import { PrismaClient } from '@prisma/client';

// PostgreSQL 최적화 설정
const createOptimizedPrismaClient = (databaseUrl: string) => {
  return new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: ['query', 'info', 'warn', 'error'],
    // Prisma 클라이언트 최적화
    errorFormat: 'pretty',
    transactionOptions: {
      maxWait: 5000, // 트랜잭션 대기 시간
      timeout: 10000, // 트랜잭션 타임아웃
    },
  });
};

// 기본 데이터베이스 클라이언트
const prisma = createOptimizedPrismaClient(
  process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/slack_clone'
);

// PostgreSQL 성능 최적화 함수
export const optimizeDatabase = async (client: PrismaClient) => {
  try {
    // 연결 테스트
    await client.$connect();
    console.log('✅ Database connected successfully');

    // 성능 설정 최적화 (세션 레벨)
    await client.$executeRaw`SET max_connections = 200`;
    await client.$executeRaw`SET shared_buffers = '256MB'`;
    await client.$executeRaw`SET effective_cache_size = '1GB'`;
    await client.$executeRaw`SET maintenance_work_mem = '128MB'`;
    await client.$executeRaw`SET checkpoint_completion_target = 0.9`;
    await client.$executeRaw`SET wal_buffers = '16MB'`;
    await client.$executeRaw`SET default_statistics_target = 100`;
    await client.$executeRaw`SET random_page_cost = 1.1`;
    await client.$executeRaw`SET effective_io_concurrency = 200`;
    
    // 병렬 처리 최적화
    await client.$executeRaw`SET max_parallel_workers_per_gather = 4`;
    await client.$executeRaw`SET max_parallel_workers = 8`;
    await client.$executeRaw`SET parallel_tuple_cost = 0.1`;
    await client.$executeRaw`SET parallel_setup_cost = 1000`;
    
    console.log('🚀 Database optimization settings applied');
  } catch (error) {
    console.error('❌ Database optimization failed:', error);
  }
};

// 데이터베이스 연결 상태 모니터링
export const monitorConnections = async (client: PrismaClient) => {
  try {
    const result = await client.$queryRaw`
      SELECT 
        state,
        COUNT(*) as connection_count
      FROM pg_stat_activity 
      WHERE datname = current_database()
      GROUP BY state
    `;
    
    console.log('📊 Database connections:', result);
    return result;
  } catch (error) {
    console.error('❌ Connection monitoring failed:', error);
    return [];
  }
};

// 배치 처리를 위한 트랜잭션 래퍼
export const batchTransaction = async <T>(
  client: PrismaClient,
  operations: ((tx: any) => Promise<T>)[]
): Promise<T[]> => {
  return client.$transaction(async (tx) => {
    const results = [];
    for (const operation of operations) {
      const result = await operation(tx);
      results.push(result);
    }
    return results;
  });
};

// 메시지 배치 삽입 함수
export const batchInsertMessages = async (
  client: PrismaClient,
  messages: Array<{
    content: string;
    channelId: string;
    userId: string;
    createdAt?: Date;
  }>
) => {
  const batchSize = 100;
  const batches = [];
  
  for (let i = 0; i < messages.length; i += batchSize) {
    batches.push(messages.slice(i, i + batchSize));
  }
  
  const results = [];
  for (const batch of batches) {
    const result = await client.message.createMany({
      data: batch.map(msg => ({
        content: msg.content,
        channelId: msg.channelId,
        userId: msg.userId,
        createdAt: msg.createdAt || new Date(),
      })),
      skipDuplicates: true,
    });
    results.push(result);
  }
  
  return results;
};

// 정리 함수
export const cleanup = async () => {
  await prisma.$disconnect();
  console.log('🔌 Database disconnected');
};

// 프로세스 종료 시 정리
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

export default prisma; 