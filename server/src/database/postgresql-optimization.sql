-- PostgreSQL 전용 최적화 스크립트
-- 파일: server/src/database/postgresql-optimization.sql

-- ==================================================
-- 1. 인덱스 최적화
-- ==================================================

-- 메시지 테이블 고성능 인덱스
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_channel_created 
ON messages(channelId, createdAt DESC);

-- 부분 인덱스 (최근 30일 메시지만)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_recent 
ON messages(channelId, createdAt DESC)
WHERE createdAt > NOW() - INTERVAL '30 days';

-- 복합 인덱스 (covering index)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_channel_user_content 
ON messages(channelId, userId) INCLUDE (content, createdAt);

-- 전문검색 인덱스
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_search 
ON messages USING GIN (to_tsvector('english', content));

-- 사용자 검색 최적화
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_username_email 
ON users(username, email);

-- 워크스페이스 해시 인덱스
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspace_slug_hash 
ON workspaces USING HASH(slug);

-- ==================================================
-- 2. 테이블 파티셔닝 (시간 기반)
-- ==================================================

-- 메시지 테이블 파티셔닝 준비
CREATE TABLE IF NOT EXISTS messages_partitioned (
    LIKE messages INCLUDING ALL
) PARTITION BY RANGE (createdAt);

-- 월별 파티션 생성 함수
CREATE OR REPLACE FUNCTION create_monthly_partition(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TEXT AS $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
    sql_statement TEXT;
BEGIN
    start_date := DATE_TRUNC('month', target_date);
    end_date := start_date + INTERVAL '1 month';
    partition_name := 'messages_' || TO_CHAR(start_date, 'YYYY_MM');
    
    sql_statement := FORMAT('
        CREATE TABLE IF NOT EXISTS %I PARTITION OF messages_partitioned
        FOR VALUES FROM (%L) TO (%L)
    ', partition_name, start_date, end_date);
    
    EXECUTE sql_statement;
    
    RETURN partition_name || ' partition created successfully';
END;
$$ LANGUAGE plpgsql;

-- 현재 월과 다음 월 파티션 생성
SELECT create_monthly_partition();
SELECT create_monthly_partition(CURRENT_DATE + INTERVAL '1 month');

-- ==================================================
-- 3. 구체화된 뷰 (Materialized Views)
-- ==================================================

-- 워크스페이스 통계 뷰
CREATE MATERIALIZED VIEW IF NOT EXISTS workspace_stats AS
SELECT 
    w.id,
    w.name,
    w.slug,
    COUNT(DISTINCT wm.userId) as member_count,
    COUNT(DISTINCT c.id) as channel_count,
    COUNT(DISTINCT m.id) as message_count,
    MAX(m.createdAt) as last_activity,
    NOW() as updated_at
FROM workspaces w
LEFT JOIN workspace_members wm ON w.id = wm.workspaceId
LEFT JOIN channels c ON w.id = c.workspaceId
LEFT JOIN messages m ON c.id = m.channelId
GROUP BY w.id, w.name, w.slug;

-- 워크스페이스 통계 인덱스
CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_stats_id 
ON workspace_stats(id);

CREATE INDEX IF NOT EXISTS idx_workspace_stats_activity 
ON workspace_stats(last_activity DESC);

-- 채널 통계 뷰
CREATE MATERIALIZED VIEW IF NOT EXISTS channel_stats AS
SELECT 
    c.id,
    c.name,
    c.workspaceId,
    COUNT(DISTINCT cm.userId) as member_count,
    COUNT(DISTINCT m.id) as message_count,
    MAX(m.createdAt) as last_activity,
    NOW() as updated_at
FROM channels c
LEFT JOIN channel_members cm ON c.id = cm.channelId
LEFT JOIN messages m ON c.id = m.channelId
GROUP BY c.id, c.name, c.workspaceId;

-- 채널 통계 인덱스
CREATE UNIQUE INDEX IF NOT EXISTS idx_channel_stats_id 
ON channel_stats(id);

CREATE INDEX IF NOT EXISTS idx_channel_stats_workspace 
ON channel_stats(workspaceId, last_activity DESC);

-- ==================================================
-- 4. 배치 처리 함수
-- ==================================================

-- 배치 메시지 삽입 함수
CREATE OR REPLACE FUNCTION batch_insert_messages(
    message_data JSONB[]
) RETURNS INTEGER AS $$
DECLARE
    inserted_count INTEGER;
BEGIN
    INSERT INTO messages (content, channelId, userId, createdAt)
    SELECT 
        (msg->>'content')::TEXT,
        (msg->>'channelId')::UUID,
        (msg->>'userId')::UUID,
        COALESCE((msg->>'createdAt')::TIMESTAMP WITH TIME ZONE, NOW())
    FROM UNNEST(message_data) AS msg;
    
    GET DIAGNOSTICS inserted_count = ROW_COUNT;
    RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

-- 배치 사용자 추가 함수
CREATE OR REPLACE FUNCTION batch_add_channel_members(
    channel_id UUID,
    user_ids UUID[]
) RETURNS INTEGER AS $$
DECLARE
    inserted_count INTEGER;
BEGIN
    INSERT INTO channel_members (channelId, userId, createdAt)
    SELECT channel_id, user_id, NOW()
    FROM UNNEST(user_ids) AS user_id
    ON CONFLICT (channelId, userId) DO NOTHING;
    
    GET DIAGNOSTICS inserted_count = ROW_COUNT;
    RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

-- ==================================================
-- 5. 실시간 알림 시스템 (LISTEN/NOTIFY)
-- ==================================================

-- 새 메시지 알림 함수
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('new_message', 
        json_build_object(
            'id', NEW.id,
            'channelId', NEW.channelId,
            'userId', NEW.userId,
            'content', NEW.content,
            'createdAt', NEW.createdAt
        )::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 메시지 알림 트리거
DROP TRIGGER IF EXISTS trigger_notify_new_message ON messages;
CREATE TRIGGER trigger_notify_new_message
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION notify_new_message();

-- 사용자 상태 변경 알림 함수
CREATE OR REPLACE FUNCTION notify_user_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        PERFORM pg_notify('user_status_change', 
            json_build_object(
                'userId', NEW.id,
                'status', NEW.status,
                'updatedAt', NOW()
            )::text
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==================================================
-- 6. 자동 유지보수 함수
-- ==================================================

-- 구체화된 뷰 자동 갱신 함수
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY workspace_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY channel_stats;
    
    -- 갱신 로그
    INSERT INTO system_logs (level, message, createdAt)
    VALUES ('INFO', 'Materialized views refreshed', NOW());
    
EXCEPTION WHEN OTHERS THEN
    INSERT INTO system_logs (level, message, createdAt)
    VALUES ('ERROR', 'Failed to refresh materialized views: ' || SQLERRM, NOW());
END;
$$ LANGUAGE plpgsql;

-- 오래된 메시지 아카이빙 함수
CREATE OR REPLACE FUNCTION archive_old_messages(days_old INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- 오래된 메시지를 아카이브 테이블로 이동
    WITH moved_messages AS (
        DELETE FROM messages 
        WHERE createdAt < NOW() - INTERVAL '1 day' * days_old
        RETURNING *
    )
    INSERT INTO messages_archive 
    SELECT * FROM moved_messages;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    
    INSERT INTO system_logs (level, message, createdAt)
    VALUES ('INFO', 'Archived ' || archived_count || ' old messages', NOW());
    
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- ==================================================
-- 7. 성능 모니터링 함수
-- ==================================================

-- 연결 상태 모니터링 뷰
CREATE OR REPLACE VIEW connection_stats AS
SELECT 
    state,
    COUNT(*) as connection_count,
    AVG(EXTRACT(EPOCH FROM (NOW() - query_start))) as avg_query_duration
FROM pg_stat_activity 
WHERE datname = current_database() AND state IS NOT NULL
GROUP BY state;

-- 테이블 통계 뷰
CREATE OR REPLACE VIEW table_stats AS
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_tuples,
    n_dead_tup as dead_tuples,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;

-- 인덱스 사용률 뷰
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    CASE 
        WHEN idx_tup_read + idx_tup_fetch > 0 
        THEN ROUND(100.0 * idx_tup_fetch / (idx_tup_read + idx_tup_fetch), 2)
        ELSE 0 
    END as usage_ratio
FROM pg_stat_user_indexes
ORDER BY usage_ratio DESC;

-- ==================================================
-- 8. 자동 실행 설정
-- ==================================================

-- 매일 자정에 구체화된 뷰 갱신 (cron 또는 pg_cron 사용)
-- SELECT cron.schedule('refresh-views', '0 0 * * *', 'SELECT refresh_materialized_views();');

-- 매주 일요일에 오래된 메시지 아카이빙
-- SELECT cron.schedule('archive-messages', '0 2 * * 0', 'SELECT archive_old_messages(365);');

-- 매월 1일에 파티션 생성
-- SELECT cron.schedule('create-partition', '0 1 1 * *', 'SELECT create_monthly_partition(CURRENT_DATE + INTERVAL ''1 month'');');

-- ==================================================
-- 최적화 스크립트 실행 완료
-- ==================================================

-- 실행 로그 기록
INSERT INTO system_logs (level, message, createdAt)
VALUES ('INFO', 'PostgreSQL optimization script executed successfully', NOW())
ON CONFLICT DO NOTHING; 