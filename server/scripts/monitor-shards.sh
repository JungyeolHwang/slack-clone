#!/bin/bash

# PostgreSQL 샤드 모니터링 스크립트
# 파일: server/scripts/monitor-shards.sh

set -e

echo "📊 PostgreSQL 샤드 모니터링 시작..."

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 샤드 정보 배열
declare -A SHARDS=(
    ["shard1"]="5435"
    ["shard2"]="5433"
    ["shard3"]="5434"
)

# 현재 시간 표시
echo -e "${BLUE}🕐 모니터링 시작 시간: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo ""

# 각 샤드 모니터링
for shard_name in "${!SHARDS[@]}"; do
    port=${SHARDS[$shard_name]}
    
    echo -e "${CYAN}==================== $shard_name (포트: $port) ====================${NC}"
    
    # 연결 상태 확인
    if ! pg_isready -h localhost -p $port -U postgres >/dev/null 2>&1; then
        echo -e "${RED}❌ $shard_name 연결 실패${NC}"
        echo ""
        continue
    fi
    
    echo -e "${GREEN}✅ $shard_name 연결 상태: 정상${NC}"
    
    # 1. 연결 통계
    echo -e "${YELLOW}📡 연결 통계:${NC}"
    psql -h localhost -p $port -U postgres -d slack_clone -c "
        SELECT 
            state,
            COUNT(*) as connection_count
        FROM pg_stat_activity 
        WHERE datname = 'slack_clone' AND state IS NOT NULL
        GROUP BY state
        ORDER BY connection_count DESC;
    " 2>/dev/null || echo "  연결 통계 조회 실패"
    
    # 2. 테이블 통계
    echo -e "${YELLOW}📋 테이블 통계 (상위 5개):${NC}"
    psql -h localhost -p $port -U postgres -d slack_clone -c "
        SELECT 
            tablename,
            n_live_tup as live_rows,
            n_dead_tup as dead_rows,
            last_vacuum,
            last_analyze
        FROM pg_stat_user_tables 
        WHERE schemaname = 'public' 
        ORDER BY n_live_tup DESC 
        LIMIT 5;
    " 2>/dev/null || echo "  테이블 통계 조회 실패"
    
    # 3. 워크스페이스 분포
    echo -e "${YELLOW}�� 워크스페이스 분포:${NC}"
    psql -h localhost -p $port -U postgres -d slack_clone -c "
        SELECT 
            LEFT(slug, 1) as first_letter,
            COUNT(*) as workspace_count
        FROM workspaces
        GROUP BY LEFT(slug, 1)
        ORDER BY first_letter;
    " 2>/dev/null || echo "  워크스페이스 분포 조회 실패"
    
    # 4. 최근 활동 (메시지 수)
    echo -e "${YELLOW}📨 최근 24시간 메시지 수:${NC}"
    psql -h localhost -p $port -U postgres -d slack_clone -c "
        SELECT 
            COUNT(*) as message_count_24h
        FROM messages
        WHERE \"createdAt\" > NOW() - INTERVAL '24 hours';
    " 2>/dev/null || echo "  메시지 통계 조회 실패"
    
    echo ""
done

echo -e "${GREEN}🎉 모니터링 완료!${NC}"
