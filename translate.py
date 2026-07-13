from deep_translator import GoogleTranslator
from deep_translator.exceptions import BaseError

# 학생 모국어 목록: 코드 -> 화면에 보여줄 이름
LANGUAGES = {
    "zh-CN": "중국어 (中文)",
    "ja": "일본어 (日本語)",
    "th": "태국어 (ภาษาไทย)",
    "bn": "벵골어 (বাংলা)",
    "vi": "베트남어 (Tiếng Việt)",
    "en": "영어 (English)",
}


class TranslationError(Exception):
    pass


def translate_word(ko_text):
    translations = {}
    for lang_code in LANGUAGES:
        try:
            translations[lang_code] = GoogleTranslator(
                source="ko", target=lang_code
            ).translate(ko_text)
        except BaseError as e:
            raise TranslationError(f"번역 실패 ({lang_code}): {e}") from e
        except Exception as e:
            raise TranslationError(
                f"번역 중 오류가 발생했습니다 ({lang_code}). 인터넷 연결을 확인하세요: {e}"
            ) from e

    return translations
