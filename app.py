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


def _check_grammar_no(grammar_no):
    if grammar_no not in storage.GRAMMAR_SLOTS:
        return jsonify({"error": "유효하지 않은 문법 번호입니다."}), 400
    return None


@app.route("/admin")
def admin_page():
    return render_template(
        "admin.html", books=storage.BOOKS, lessons=storage.LESSON_NUMBERS
    )


@app.route("/admin/grammar")
def admin_grammar_page():
    return render_template(
        "admin_grammar.html",
        books=storage.BOOKS,
        lessons=storage.LESSON_NUMBERS,
        grammar_slots=storage.GRAMMAR_SLOTS,
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


@app.route("/grammar")
def grammar_page():
    return render_template(
        "grammar.html",
        books=storage.BOOKS,
        lessons=storage.LESSON_NUMBERS,
        grammar_slots=storage.GRAMMAR_SLOTS,
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


@app.route(
    "/api/books/<book_id>/lessons/<int:lesson_num>/grammar/<int:grammar_no>/content",
    methods=["GET"],
)
def api_get_grammar_content(book_id, lesson_num, grammar_no):
    err = _check_book(book_id) or _check_grammar_no(grammar_no)
    if err:
        return err
    return jsonify(storage.get_grammar_content(book_id, lesson_num, grammar_no))


@app.route(
    "/api/books/<book_id>/lessons/<int:lesson_num>/grammar/<int:grammar_no>/content",
    methods=["POST"],
)
def api_add_grammar_content(book_id, lesson_num, grammar_no):
    err = _check_book(book_id) or _check_grammar_no(grammar_no)
    if err:
        return err

    body = request.get_json(silent=True) or {}
    title = (body.get("title") or "").strip()
    meaning = (body.get("meaning") or "").strip()
    rule_groups = body.get("rule_groups") or []

    if not title or not meaning:
        return jsonify({"error": "문법과 의미를 입력하세요."}), 400

    entry = storage.add_grammar_content(book_id, lesson_num, grammar_no, title, meaning, rule_groups)
    return jsonify(entry), 201


@app.route(
    "/api/books/<book_id>/lessons/<int:lesson_num>/grammar/<int:grammar_no>/content/<entry_id>",
    methods=["DELETE"],
)
def api_delete_grammar_content(book_id, lesson_num, grammar_no, entry_id):
    err = _check_book(book_id) or _check_grammar_no(grammar_no)
    if err:
        return err
    removed = storage.delete_grammar_content(book_id, lesson_num, entry_id)
    if not removed:
        return jsonify({"error": "해당 문법을 찾을 수 없습니다."}), 404
    return jsonify({"ok": True})


@app.route(
    "/api/books/<book_id>/lessons/<int:lesson_num>/grammar/<int:grammar_no>/questions",
    methods=["GET"],
)
def api_get_grammar_questions(book_id, lesson_num, grammar_no):
    err = _check_book(book_id) or _check_grammar_no(grammar_no)
    if err:
        return err
    return jsonify(storage.get_grammar_questions(book_id, lesson_num, grammar_no))


@app.route(
    "/api/books/<book_id>/lessons/<int:lesson_num>/grammar/<int:grammar_no>/questions",
    methods=["POST"],
)
def api_add_grammar_question(book_id, lesson_num, grammar_no):
    err = _check_book(book_id) or _check_grammar_no(grammar_no)
    if err:
        return err

    body = request.get_json(silent=True) or {}
    question = (body.get("question") or "").strip()
    answer = (body.get("answer") or "").strip()

    if not question or not answer:
        return jsonify({"error": "문제와 정답을 입력하세요."}), 400

    entry = storage.add_grammar_question(book_id, lesson_num, grammar_no, question, answer)
    return jsonify(entry), 201


@app.route(
    "/api/books/<book_id>/lessons/<int:lesson_num>/grammar/<int:grammar_no>/questions/<entry_id>",
    methods=["DELETE"],
)
def api_delete_grammar_question(book_id, lesson_num, grammar_no, entry_id):
    err = _check_book(book_id) or _check_grammar_no(grammar_no)
    if err:
        return err
    removed = storage.delete_grammar_question(book_id, lesson_num, entry_id)
    if not removed:
        return jsonify({"error": "해당 문제를 찾을 수 없습니다."}), 404
    return jsonify({"ok": True})


@app.route("/api/grammar-quiz")
def api_grammar_quiz():
    book_id = request.args.get("book", default="")
    lesson_num = request.args.get("lesson", type=int)
    grammar_no = request.args.get("grammar_no", type=int)

    if book_id not in storage.BOOKS:
        return jsonify({"error": "유효하지 않은 교재입니다."}), 400
    if lesson_num is None or lesson_num not in storage.LESSON_NUMBERS:
        return jsonify({"error": "유효한 과(1~18)를 선택하세요."}), 400
    if grammar_no not in storage.GRAMMAR_SLOTS:
        return jsonify({"error": "유효하지 않은 문법 번호입니다."}), 400

    questions = storage.get_grammar_questions(book_id, lesson_num, grammar_no)
    if not questions:
        return jsonify({"error": "이 과는 아직 등록된 문법 문제가 없습니다."}), 400

    random.shuffle(questions)
    return jsonify(questions)


if __name__ == "__main__":
    app.run(debug=True, port=5000)
