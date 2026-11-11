-- Base de dades D1 separada per a subscripcions Web Push PBSV.
CREATE TABLE IF NOT EXISTS push_subscriptions (
 id TEXT PRIMARY KEY,
 endpoint TEXT NOT NULL UNIQUE,
 p256dh TEXT NOT NULL,
 auth TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 disabled_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(disabled_at);
CREATE TABLE IF NOT EXISTS push_notifications (
 id TEXT PRIMARY KEY,
 category TEXT NOT NULL CHECK(category IN ('match','news','event','urgent')),
 title TEXT NOT NULL,
 body TEXT NOT NULL,
 target TEXT NOT NULL,
 audience TEXT NOT NULL DEFAULT 'all',
 scheduled_at TEXT,
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','scheduled','sending','sent','failed')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 sent_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_push_notifications_schedule ON push_notifications(status,scheduled_at);
