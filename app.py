import random

from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request

import storage
from translate import LANGUAGES, TranslationError, translate_word

load_dotenv()

app = Flask(__name__)
storage.init_db()

NUM_CHOICES = 4


def _check_book(book_id):
    if book_id not in storage.BOOKS:
        return jsonify({"error": "유효하지 않은 교재입니다."}), 400
    return None


@app.route("/admin")
def admin_page():
    return render_template(
        "admin.html", books=storage.BOOKS, lessons=storage.LESSON_NUMBERS
    )


@app.route("/")
@app.route("/student")
def student_page():
    return render_template(
        "student.html",
        books=storage.BOOKS,
        lessons=storage.LESSON_NUMBERS,
        languages=LANGUAGES,
    )


@app.route("/api/books/<book_id>/lessons")
def api_lessons(book_id):
    err = _check_book(book_id)
    if err:
        return err
    return jsonify(storage.lesson_summary(book_id))


@app.route("/api/books/<book_id>/lessons/<int:lesson_num>/words", methods=["GET"])
def api_get_words(book_id, lesson_num):
    err = _check_book(book_id)
    if err:
        return err
    return jsonify(storage.get_lesson_words(book_id, lesson_num))


@app.route("/api/books/<book_id>/lessons/<int:lesson_num>/words", methods=["POST"])
def api_add_word(book_id, lesson_num):
    err = _check_book(book_id)
    if err:
        return err

    body = request.get_json(silent=True) or {}
    ko_text = (body.get("ko") or "").strip()
    if not ko_text:
        return jsonify({"error": "한국어 단어를 입력하세요."}), 400

    try:
        translations = translate_word(ko_text)
    except TranslationError as e:
        return jsonify({"error": str(e)}), 502

    entry = storage.add_word(book_id, lesson_num, ko_text, translations)
    return jsonify(entry), 201


@app.route(
    "/api/books/<book_id>/lessons/<int:lesson_num>/words/<word_id>",
    methods=["DELETE"],
)
def api_delete_word(book_id, lesson_num, word_id):
    err = _check_book(book_id)
    if err:
        return err
    removed = storage.delete_word(book_id, lesson_num, word_id)
    if not removed:
        return jsonify({"error": "해당 단어를 찾을 수 없습니다."}), 404
    return jsonify({"ok": True})


@app.route("/api/quiz")
def api_quiz():
    book_id = request.args.get("book", default="")
    lesson_num = request.args.get("lesson", type=int)
    lang = request.args.get("lang", default="en")

    if book_id not in storage.BOOKS:
        return jsonify({"error": "유효하지 않은 교재입니다."}), 400
    if lesson_num is None or lesson_num not in storage.LESSON_NUMBERS:
        return jsonify({"error": "유효한 과(1~18)를 선택하세요."}), 400
    if lang not in LANGUAGES:
        return jsonify({"error": "지원하지 않는 언어입니다."}), 400

    words = storage.get_lesson_words(book_id, lesson_num)
    if len(words) < NUM_CHOICES:
        return (
            jsonify({"error": "이 과는 아직 어휘가 4개 미만이라 테스트를 만들 수 없습니다."}),
            400,
        )

    all_ko = [w["ko"] for w in words]
    questions = []
    for w in words:
        distractor_pool = [ko for ko in all_ko if ko != w["ko"]]
        distractors = random.sample(distractor_pool, NUM_CHOICES - 1)
        choices = distractors + [w["ko"]]
        random.shuffle(choices)
        questions.append(
            {
                "id": w["id"],
                "prompt": w["translations"].get(lang, ""),
                "choices": choices,
                "answer": w["ko"],
            }
        )
    random.shuffle(questions)
    return jsonify(questions)


if __name__ == "__main__":
    app.run(debug=True, port=5000)
