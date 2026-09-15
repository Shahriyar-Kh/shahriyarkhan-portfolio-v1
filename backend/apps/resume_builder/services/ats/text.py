import re

from .rules import ALIASES, STOP_WORDS


def normalize(text):
    value = (text or "").casefold()
    for alias, canonical in ALIASES.items():
        value = value.replace(alias, canonical)
    return value


def tokens(text):
    return {token for token in re.findall(r"[a-z][a-z0-9+#.-]{1,40}", normalize(text)) if token not in STOP_WORDS}


def phrases(text, candidates):
    normalized = normalize(text)
    return [candidate for candidate in candidates if candidate in normalized]
