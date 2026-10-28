"""A date without a year (`engine/dates.py`): the one rule that gives a month and day its year from the day the message
came. Pure functions, so no workspace is needed."""

from datetime import date

import pytest
from pydantic import BaseModel

from engine.dates import (
    DayOrMonthDay,
    MonthDay,
    is_month_day,
    latest_on_or_before,
    next_on_or_after,
    parse_month_day,
    resolve_range,
    with_year,
)
from engine.document_dates import yearless_days

CAME = date(2026, 10, 28)


def test_a_month_and_day_is_read_from_the_iso_form_and_nothing_else():
    assert parse_month_day("--10-30") == MonthDay(10, 30)
    assert parse_month_day(" --02-29 ") == MonthDay(2, 29)
    assert parse_month_day("2026-10-30") is None
    assert parse_month_day("Oct 30") is None
    assert is_month_day("--10-30") and not is_month_day("--02-30") and not is_month_day("2026-10-30")
    with pytest.raises(ValueError):
        parse_month_day("--13-01")


def test_the_day_the_message_came_is_the_day_itself():
    assert with_year(MonthDay(10, 28), CAME) == CAME


def test_a_day_still_to_come_this_year_takes_this_year():
    assert with_year(MonthDay(10, 30), CAME) == date(2026, 10, 30)


def test_a_day_already_gone_this_year_takes_the_next_year():
    assert with_year(MonthDay(1, 3), CAME) == date(2027, 1, 3)
    assert with_year(MonthDay(10, 27), CAME) == date(2027, 10, 27)


def test_a_day_the_input_says_already_happened_takes_the_latest_one_on_or_before():
    assert with_year(MonthDay(10, 25), CAME, past=True) == date(2026, 10, 25)
    assert with_year(MonthDay(10, 28), CAME, past=True) == CAME
    assert with_year(MonthDay(12, 30), CAME, past=True) == date(2025, 12, 30)


def test_a_day_that_has_a_year_is_left_alone_whatever_past_says():
    assert with_year(date(2024, 5, 1), CAME) == date(2024, 5, 1)
    assert with_year(date(2024, 5, 1), CAME, past=True) == date(2024, 5, 1)


def test_the_29th_of_february_waits_for_a_leap_year_in_both_directions():
    assert next_on_or_after(MonthDay(2, 29), date(2026, 3, 1)) == date(2028, 2, 29)
    assert next_on_or_after(MonthDay(2, 29), date(2028, 2, 29)) == date(2028, 2, 29)
    assert latest_on_or_before(MonthDay(2, 29), date(2026, 10, 28)) == date(2024, 2, 29)
    assert with_year(MonthDay(2, 29), date(2096, 3, 1)) == date(2104, 2, 29)  # 2100 is no leap year


def test_a_range_inside_the_year_gets_one_year():
    assert resolve_range("--10-30", "--11-05", CAME) == ("2026-10-30", "2026-11-05")


def test_a_range_across_the_new_year_ends_in_the_next_year():
    assert resolve_range("--12-28", "--01-03", CAME) == ("2026-12-28", "2027-01-03")


def test_a_range_in_january_seen_in_october_is_next_years():
    assert resolve_range("--01-02", "--01-04", CAME) == ("2027-01-02", "2027-01-04")


def test_a_past_range_ends_no_earlier_than_it_starts():
    assert resolve_range("--10-20", "--10-25", CAME, past=True) == ("2026-10-20", "2026-10-25")
    assert resolve_range("--12-30", "--01-02", CAME, past=True) == ("2025-12-30", "2026-01-02")


def test_one_month_and_day_beside_a_full_one_is_read_from_the_full_one():
    assert resolve_range("2026-12-28", "--01-03", CAME) == ("2026-12-28", "2027-01-03")
    assert resolve_range("--12-28", "2027-01-03", CAME) == ("2026-12-28", "2027-01-03")


def test_a_range_written_with_years_is_returned_as_written():
    assert resolve_range("2026-10-30", "2026-11-05", CAME) == ("2026-10-30", "2026-11-05")
    assert resolve_range("2026-10-30T09:00:00+00:00", None, CAME) == ("2026-10-30T09:00:00+00:00", None)
    assert resolve_range(None, None, CAME) == (None, None)


class _Holder(BaseModel):
    day: DayOrMonthDay | None = None


def test_a_field_reads_a_day_or_a_month_and_day_and_writes_both_back_as_text():
    assert _Holder.model_validate({"day": "2026-10-30"}).day == date(2026, 10, 30)
    held = _Holder.model_validate({"day": "--10-30"})
    assert held.day == MonthDay(10, 30)
    assert held.model_dump(mode="json") == {"day": "--10-30"}
    assert _Holder.model_validate({"day": "2026-10-30"}).model_dump(mode="json") == {"day": "2026-10-30"}
    assert _Holder().day is None


def test_a_field_refuses_a_month_and_day_that_is_not_one():
    with pytest.raises(ValueError):
        _Holder.model_validate({"day": "--02-30"})
    with pytest.raises(ValueError):
        _Holder.model_validate({"day": "Oct 30"})


def test_a_text_states_a_day_with_no_year_only_by_a_months_name():
    assert yearless_days("Pay by Dec 1 and again on 3rd January.") == [(12, 1), (1, 3)]
    assert yearless_days("Delivery: Oct 30-Nov 5") == [(10, 30), (11, 5)]
    assert yearless_days("Due Dec 1, 2026 or on 1 December 2026") == []
    assert yearless_days("Feb 30 and 12/01") == []
