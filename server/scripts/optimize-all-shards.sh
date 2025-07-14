#!/bin/bash

# PostgreSQL 샤드 최적화 자동화 스크립트
# 파일: server/scripts/optimize-all-shards.sh

set -e  # 에러 시 스크립트 중단

echo "🚀 PostgreSQL 샤드 최적화 시작..."

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 샤드 정보 배열
declare -A SHARDS=(
    ["shard1"]="5435"
    ["shard2"]="5433" 
    ["shard3"]="5434"
)

# 최적화 스크립트 경로
OPTIMIZATION_SCRIPT="src/database/postgresql-optimization.sql"

# 스크립트 존재 확인
if [ ! -f "$OPTIMIZATION_SCRIPT" ]; then
    echo -e "${RED}❌ 최적화 스크립트를 찾을 수 없습니다: $OPTIMIZATION_SCRIPT${NC}"
    exit 1
fi

echo -e "${BLUE}📋 최적화 스크립트: $OPTIMIZATION_SCRIPT${NC}"
echo -e "${BLUE}🎯 대상 샤드: ${!SHARDS[@]}${NC}"
echo ""

# 각 샤드에 최적화 적용
for shard_name in "${!SHARDS[@]}"; do
    port=${SHARDS[$shard_name]}
    
    echo -e "${YELLOW}🔧 $shard_name (포트: $port) 최적화 시작...${NC}"
    
    # 연결 테스트
    if ! pg_isready -h localhost -p $port -U postgres >/dev/null 2>&1; then
        echo -e "${RED}❌ $shard_name 연결 실패 (포트: $port)${NC}"
        continue
    fi
    
    # 최적화 스크립트 실행
    if psql -h localhost -p $port -U postgres -d slack_clone -f "$OPTIMIZATION_SCRIPT" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ $shard_name 최적화 완료${NC}"
    else
        echo -e "${RED}❌ $shard_name 최적화 실패${NC}"
    fi
    
    echo ""
done

echo -e "${GREEN}🎉 모든 샤드 최적화 완료!${NC}"
echo ""

# 최적화 결과 확인
echo -e "${BLUE}📊 최적화 결과 확인 중...${NC}"
echo ""

for shard_name in "${!SHARDS[@]}"; do
    port=${SHARDS[$shard_name]}
    
    echo -e "${YELLOW}📈 $shard_name (포트: $port) 통계:${NC}"
    
    # 연결 상태 확인
    if pg_isready -h localhost -p $port -U postgres >/dev/null 2>&1; then
        # 테이블 통계 확인
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
        
        # 인덱스 개수 확인
        index_count=$(psql -h localhost -p $port -U postgres -d slack_clone -t -c "
            SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';
        " 2>/dev/null || echo "0")
        
        echo -e "  인덱스 개수: ${GREEN}$index_count${NC}개"
        
        # 구체화된 뷰 확인
        materialized_views=$(psql -h localhost -p $port -U postgres -d slack_clone -t -c "
            SELECT COUNT(*) FROM pg_matviews WHERE schemaname = 'public';
        " 2>/dev/null || echo "0")
        
        echo -e "  구체화된 뷰: ${GREEN}$materialized_views${NC}개"
    else
        echo -e "  ${RED}연결 실패${NC}"
    fi
    
    echo ""
done

echo -e "${GREEN}🚀 PostgreSQL 샤드 최적화 완료!${NC}"
echo ""
echo -e "${BLUE}💡 다음 단계:${NC}"
echo -e "  1. 애플리케이션 서버 재시작: ${YELLOW}npm run dev${NC}"
echo -e "  2. 성능 모니터링: ${YELLOW}./scripts/monitor-shards.sh${NC}"
echo -e "  3. 부하 테스트 실행 권장" 