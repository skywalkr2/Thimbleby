"""A message to someone else says dates as the date format writes them, with no zero before the day and never as
year-month-day, in the to-do's own words too."""

from datetime import date

from engine.written_dates import day_words, plain_dates

FORMAT = "%a, %b %d"


def test_a_day_has_no_zero_before_the_day_of_the_month():
    assert day_words(date(2026, 11, 7), FORMAT) == "Sat, Nov 7"
    assert day_words(date(2026, 11, 17), FORMAT) == "Tue, Nov 17"
    assert day_words(date(2026, 11, 3), "%d/%m/%Y") == "3/11/2026"
    assert day_words(date(2026, 11, 3), "100%% on %b %d") == "100% on Nov 3"


def test_every_year_month_day_in_a_text_is_written_in_the_format():
    text = "Lend us the trailer on 2026-11-07 and send the list by 2026-11-02."
    assert plain_dates(text, FORMAT) == "Lend us the trailer on Sat, Nov 7 and send the list by Mon, Nov 2."


def test_what_is_not_a_date_is_left_as_written():
    assert (
        plain_dates("Version 12026-11-072 and 2026-13-45 and 2026-11", FORMAT)
        == "Version 12026-11-072 and 2026-13-45 and 2026-11"
    )


def test_a_message_built_from_followups_names_dates_in_words():
    from engine import followups

    class Words:
        greeting = "Hi {first_name},"
        actions_heading = "To-dos with you:"
        closing = "Thanks!"
        date_format = FORMAT

    class Cfg:
        class language:
            messages = Words()

    class People:
        @staticmethod
        def first_name(_person):
            return "Sam"

    section = followups.Section(
        person="p",
        name="Sam",
        is_pm=False,
        actions=[
            {"to_send": True, "text": "Lend us the trailer on 2026-11-07.", "project_name": None, "due": "2026-11-07"}
        ],
    )
    message = followups.compose(section, Cfg(), People())
    assert "- Lend us the trailer on Sat, Nov 7. (due Sat, Nov 7)" in message
    assert "2026-" not in message and "Action items" not in message
