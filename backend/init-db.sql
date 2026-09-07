-- 工单系统数据库初始化脚本
-- 此脚本在PostgreSQL容器首次启动时自动执行

-- 设置客户端编码
SET client_encoding = 'UTF8';

-- 创建必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- 用于全文搜索和模糊匹配

-- 输出初始化信息
DO $$
BEGIN
    RAISE NOTICE '================================';
    RAISE NOTICE '工单系统数据库初始化开始';
    RAISE NOTICE '数据库: %', current_database();
    RAISE NOTICE '用户: %', current_user;
    RAISE NOTICE '时间: %', now();
    RAISE NOTICE '================================';
END $$;

-- 创建自定义函数：更新时间戳
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 输出完成信息
DO $$
BEGIN
    RAISE NOTICE '================================';
    RAISE NOTICE '数据库初始化完成！';
    RAISE NOTICE '扩展已创建: uuid-ossp, pg_trgm';
    RAISE NOTICE '自定义函数已创建: update_updated_at_column()';
    RAISE NOTICE '等待Prisma迁移执行...';
    RAISE NOTICE '================================';
END $$;
