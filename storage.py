import json
import os
import uuid

import psycopg2
import psycopg2.extras

LESSON_NUMBERS = list(range(1, 19))
GRAMMAR_SLOTS = [1, 2]

BOOKS = {
    "beginner1": "한국어와 한국문화 초급1",
    "beginner2": "한국어와 한국문화 초급2",
}


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
                    book TEXT NOT NULL DEFAULT 'beginner1',
                    lesson INTEGER NOT NULL,
                    ko TEXT NOT NULL,
                    translations JSONB NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )
                """
            )
            cur.execute(
                "ALTER TABLE vocab ADD COLUMN IF NOT EXISTS book TEXT NOT NULL DEFAULT 'beginner1'"
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS grammar_content (
                    id TEXT PRIMARY KEY,
                    book TEXT NOT NULL,
                    lesson INTEGER NOT NULL,
                    grammar_no INTEGER NOT NULL DEFAULT 1,
                    title TEXT NOT NULL,
                    meaning TEXT NOT NULL,
                    rule_groups JSONB NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )
                """
            )
            cur.execute(
                "ALTER TABLE grammar_content ADD COLUMN IF NOT EXISTS grammar_no INTEGER NOT NULL DEFAULT 1"
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS grammar_questions (
                    id TEXT PRIMARY KEY,
                    book TEXT NOT NULL,
                    lesson INTEGER NOT NULL,
                    grammar_no INTEGER NOT NULL DEFAULT 1,
                    question TEXT NOT NULL,
                    answer TEXT NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )
                """
            )
            cur.execute(
                "ALTER TABLE grammar_questions ADD COLUMN IF NOT EXISTS grammar_no INTEGER NOT NULL DEFAULT 1"
            )
        conn.commit()


def get_lesson_words(book_id, lesson_num):
    with _connect() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT id, ko, translations FROM vocab WHERE book = %s AND lesson = %s ORDER BY created_at",
                (book_id, lesson_num),
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


def add_word(book_id, lesson_num, ko_text, translations):
    entry_id = uuid.uuid4().hex
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO vocab (id, book, lesson, ko, translations) VALUES (%s, %s, %s, %s, %s)",
                (entry_id, book_id, lesson_num, ko_text, psycopg2.extras.Json(translations)),
            )
        conn.commit()
    return {"id": entry_id, "ko": ko_text, "translations": translations}


def delete_word(book_id, lesson_num, word_id):
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM vocab WHERE id = %s AND book = %s AND lesson = %s",
                (word_id, book_id, lesson_num),
            )
            removed = cur.rowcount > 0
        conn.commit()
    return removed


def lesson_summary(book_id):
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT lesson, COUNT(*) FROM vocab WHERE book = %s GROUP BY lesson",
                (book_id,),
            )
            counts = dict(cur.fetchall())
    return [
        {"lesson": n, "count": counts.get(n, 0)}
        for n in LESSON_NUMBERS
    ]


def _load_json(value):
    return value if isinstance(value, (dict, list)) else json.loads(value)


def get_grammar_content(book_id, lesson_num, grammar_no):
    with _connect() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, title, meaning, rule_groups FROM grammar_content
                WHERE book = %s AND lesson = %s AND grammar_no = %s ORDER BY created_at
                """,
                (book_id, lesson_num, grammar_no),
            )
            rows = cur.fetchall()
            return [
                {
                    "id": r["id"],
                    "title": r["title"],
                    "meaning": r["meaning"],
                    "rule_groups": _load_json(r["rule_groups"]),
                }
                for r in rows
            ]


def add_grammar_content(book_id, lesson_num, grammar_no, title, meaning, rule_groups):
    entry_id = uuid.uuid4().hex
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO grammar_content (id, book, lesson, grammar_no, title, meaning, rule_groups)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (entry_id, book_id, lesson_num, grammar_no, title, meaning, psycopg2.extras.Json(rule_groups)),
            )
        conn.commit()
    return {"id": entry_id, "title": title, "meaning": meaning, "rule_groups": rule_groups}


def delete_grammar_content(book_id, lesson_num, entry_id):
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM grammar_content WHERE id = %s AND book = %s AND lesson = %s",
                (entry_id, book_id, lesson_num),
            )
            removed = cur.rowcount > 0
        conn.commit()
    return removed


def get_grammar_questions(book_id, lesson_num, grammar_no):
    with _connect() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, question, answer FROM grammar_questions
                WHERE book = %s AND lesson = %s AND grammar_no = %s ORDER BY created_at
                """,
                (book_id, lesson_num, grammar_no),
            )
            return [dict(r) for r in cur.fetchall()]


def add_grammar_question(book_id, lesson_num, grammar_no, question, answer):
    entry_id = uuid.uuid4().hex
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO grammar_questions (id, book, lesson, grammar_no, question, answer)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (entry_id, book_id, lesson_num, grammar_no, question, answer),
            )
        conn.commit()
    return {"id": entry_id, "question": question, "answer": answer}


def delete_grammar_question(book_id, lesson_num, entry_id):
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM grammar_questions WHERE id = %s AND book = %s AND lesson = %s",
                (entry_id, book_id, lesson_num),
            )
            removed = cur.rowcount > 0
        conn.commit()
    return removed
