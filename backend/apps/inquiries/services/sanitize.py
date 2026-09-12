FORMULA_TRIGGER_PREFIXES = ("=", "+", "-", "@", "\t", "\r", "\n")


def neutralize_formula_prefix(value: str) -> str:
    """Defuses spreadsheet/CSV formula injection: a cell value beginning
    with =, +, -, @, or a leading tab/CR/LF can be interpreted as a
    formula by Google Sheets, Excel, or another downstream CSV consumer.
    Prefixing with a literal apostrophe forces it to always be read back
    as plain text. Used by both the Sheets sync and the admin CSV export
    so the same guarantee holds regardless of which path a value takes."""
    if value and value[0] in FORMULA_TRIGGER_PREFIXES:
        return f"'{value}"
    return value
