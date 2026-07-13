import json
import os
import uuid

import psycopg2
import psycopg2.extras

LESSON_NUMBERS = list(range(1, 19))


def _connect():
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError(
            "DATABASE_URL 환경변수가 설정되어 있지 않습니다. Supabase 연결 문자열을 설정하세요."
        )
    return psycopg2.connect(database_url)


def init_db():
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS vocab (
                    id TEXT PRIMARY KEY,
                    lesson INTEGER NOT NULL,
                    ko TEXT NOT NULL,
                    translations JSONB NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )
                """
            )
        conn.commit()


def get_lesson_words(lesson_num):
    with _connect() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT id, ko, translations FROM vocab WHERE lesson = %s ORDER BY created_at",
                (lesson_num,),
            )
            rows = cur.fetchall()
            return [
                {
                    "id": r["id"],
                    "ko": r["ko"],
                    "translations": r["translations"]
                    if isinstance(r["translations"], dict)
                    else json.loads(r["translations"]),
                }
                for r in rows
            ]


def add_word(lesson_num, ko_text, translations):
    entry_id = uuid.uuid4().hex
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO vocab (id, lesson, ko, translations) VALUES (%s, %s, %s, %s)",
                (entry_id, lesson_num, ko_text, psycopg2.extras.Json(translations)),
            )
        conn.commit()
    return {"id": entry_id, "ko": ko_text, "translations": translations}


def delete_word(lesson_num, word_id):
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM vocab WHERE id = %s AND lesson = %s", (word_id, lesson_num)
            )
            removed = cur.rowcount > 0
        conn.commit()
    return removed


def lesson_summary():
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT lesson, COUNT(*) FROM vocab GROUP BY lesson")
            counts = dict(cur.fetchall())
    return [
        {"lesson": n, "count": counts.get(n, 0)}
        for n in LESSON_NUMBERS
    ]
