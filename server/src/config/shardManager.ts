import { PrismaClient } from '@prisma/client';

// 샤드 설정
export interface ShardConfig {
  id: string;
  name: string;
  databaseUrl: string;
  range: string; // 예: "A-H", "I-P", "Q-Z"
}

export const SHARD_CONFIGS: ShardConfig[] = [
  {
    id: 'shard1',
    name: 'Shard 1 (A-H)',
    databaseUrl: process.env.SHARD1_DATABASE_URL || 'postgresql://postgres:password@localhost:5435/slack_clone_shard1',
    range: 'A-H'
  },
  {
    id: 'shard2', 
    name: 'Shard 2 (I-P)',
    databaseUrl: process.env.SHARD2_DATABASE_URL || 'postgresql://postgres:password@localhost:5433/slack_clone_shard2',
    range: 'I-P'
  },
  {
    id: 'shard3',
    name: 'Shard 3 (Q-Z)',
    databaseUrl: process.env.SHARD3_DATABASE_URL || 'postgresql://postgres:password@localhost:5434/slack_clone_shard3',
    range: 'Q-Z'
  }
];

export class ShardManager {
  private prismaClients: Map<string, PrismaClient> = new Map();
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    // 생성자에서는 초기화하지 않음
  }

  // 명시적 초기화 메서드
  public async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.performInitialization();
    return this.initPromise;
  }

  private async performInitialization(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    console.log('🔧 Initializing database shards...');
    
    for (const config of SHARD_CONFIGS) {
      try {
        const prisma = new PrismaClient({
          datasources: {
            db: {
              url: config.databaseUrl
            }
          },
          log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
        });

        // 연결 테스트
        await prisma.$connect();
        this.prismaClients.set(config.id, prisma);
        console.log(`✅ ${config.name} connected successfully`);
      } catch (error) {
        console.error(`❌ Failed to connect to ${config.name}:`, error);
        throw error;
      }
    }
    
    this.isInitialized = true;
    console.log('🎉 All shards initialized successfully!');
  }

  // 초기화 확인
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  // 워크스페이스 slug 기반 샤드 선택
  public async getShardForWorkspace(workspaceSlug: string): Promise<PrismaClient> {
    await this.ensureInitialized();

    // 워크스페이스 slug의 첫 글자로 샤드 결정
    const firstChar = workspaceSlug.charAt(0).toUpperCase();
    
    let shardId: string;
    if (firstChar >= 'A' && firstChar <= 'H') {
      shardId = 'shard1';
    } else if (firstChar >= 'I' && firstChar <= 'P') {
      shardId = 'shard2';
    } else {
      shardId = 'shard3'; // Q-Z 및 기타
    }

    const prisma = this.prismaClients.get(shardId);
    if (!prisma) {
      throw new Error(`Shard ${shardId} not found`);
    }

    console.log(`🎯 Using ${shardId} for workspace: ${workspaceSlug}`);
    return prisma;
  }

  // 워크스페이스 ID 기반 샤드 선택 (UUID인 경우)
  public async getShardForWorkspaceId(workspaceId: string): Promise<PrismaClient> {
    await this.ensureInitialized();

    // UUID의 첫 번째 문자로 샤드 결정
    const firstChar = workspaceId.charAt(0).toUpperCase();
    
    let shardId: string;
    if (['0', '1', '2', '3', '4', '5', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].includes(firstChar)) {
      shardId = 'shard1';
    } else if (['6', '7', '8', '9', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'].includes(firstChar)) {
      shardId = 'shard2';
    } else {
      shardId = 'shard3';
    }

    const prisma = this.prismaClients.get(shardId);
    if (!prisma) {
      throw new Error(`Shard ${shardId} not found`);
    }

    console.log(`🎯 Using ${shardId} for workspace ID: ${workspaceId}`);
    return prisma;
  }

  // 모든 샤드에서 검색 (관리자 기능용)
  public async getAllShards(): Promise<PrismaClient[]> {
    await this.ensureInitialized();
    return Array.from(this.prismaClients.values());
  }

  // 특정 샤드 가져오기
  public async getShard(shardId: string): Promise<PrismaClient> {
    await this.ensureInitialized();
    
    const prisma = this.prismaClients.get(shardId);
    if (!prisma) {
      throw new Error(`Shard ${shardId} not found`);
    }
    return prisma;
  }

  // 샤드 정보 조회
  public getShardInfo(): Array<{id: string, name: string, range: string}> {
    return SHARD_CONFIGS.map(config => ({
      id: config.id,
      name: config.name,
      range: config.range
    }));
  }

  // 연결 해제
  public async disconnect() {
    console.log('🔌 Disconnecting all shards...');
    
    for (const [shardId, prisma] of this.prismaClients.entries()) {
      try {
        await prisma.$disconnect();
        console.log(`✅ ${shardId} disconnected`);
      } catch (error) {
        console.error(`❌ Error disconnecting ${shardId}:`, error);
      }
    }
    
    this.prismaClients.clear();
    this.isInitialized = false;
    this.initPromise = null;
  }
}

// 싱글톤 인스턴스
export const shardManager = new ShardManager(); 