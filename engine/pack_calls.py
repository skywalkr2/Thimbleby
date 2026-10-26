"""A time limit on what a pack runs for the core (design 3.5, 6.13): its event handlers, its validators and its Today
lines. A pack that never returns is as fatal as one that crashes, so each call runs on the pack's own thread and the
caller waits at most the configured limit (`steward.pack_call_limit_seconds`). A call that is still running then is
abandoned and counts as a failure of that place, like an exception does: the existing containment takes it from there
(noted on the pack, turned off after the configured number in a row; a validator turns the pack off at once).

Python cannot stop a thread, so an abandoned call may run on. The pack's thread is then busy, and a later call to the
same pack fails at once ("an earlier call has not finished") rather than waiting behind it; other packs and the core
are unaffected. A call made from inside a pack's own thread runs where it is, so a pack that calls back into itself
doesn't wait on itself. An exit raised by a pack (`SystemExit`) comes back to the caller as an ordinary error.
"""

from __future__ import annotations

import contextvars
import queue
import threading
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any


class PackTimeout(Exception):
    """A pack's call did not return in time."""


class PackExit(Exception):
    """A pack's call tried to end the program (an exit or an interrupt)."""


@dataclass
class _Job:
    run: Callable[[], Any]
    done: threading.Event = field(default_factory=threading.Event)
    result: Any = None
    error: BaseException | None = None
    abandoned: bool = False


class _Runner:
    def __init__(self, name: str) -> None:
        self.jobs: queue.SimpleQueue[_Job | None] = queue.SimpleQueue()
        self.busy: _Job | None = None
        self.thread = threading.Thread(target=self._work, name=f"cockpit-pack-{name}", daemon=True)
        self.thread.start()

    def _work(self) -> None:
        while (job := self.jobs.get()) is not None:
            self.busy = job
            try:
                job.result = job.run()
            except BaseException as err:  # an exit too: it must reach the caller, not end this thread
                job.error = err
            finally:
                job.done.set()
                self.busy = None


class PackCalls:
    """One thread per pack, started when the pack is first called; `limit` gives the seconds a call may take."""

    def __init__(self, limit: Callable[[], float]) -> None:
        self._limit = limit
        self._runners: dict[str, _Runner] = {}
        self._lock = threading.Lock()

    def _runner(self, pack: str) -> _Runner:
        with self._lock:
            runner = self._runners.get(pack)
            if runner is None:
                runner = self._runners[pack] = _Runner(pack)
            return runner

    def run(self, pack: str, fn: Callable[..., Any], *args: Any, **kwargs: Any) -> Any:
        """The result of `fn(*args, **kwargs)` run for `pack`. Raises what it raised (`PackExit` for an exit) or
        `PackTimeout` when it was still running after the limit."""
        runner = self._runner(pack)
        if threading.current_thread() is runner.thread:
            return fn(*args, **kwargs)
        earlier = runner.busy
        if earlier is not None and earlier.abandoned and not earlier.done.is_set():
            raise PackTimeout("an earlier call has not finished")
        context = contextvars.copy_context()
        job = _Job(lambda: context.run(fn, *args, **kwargs))
        runner.jobs.put(job)
        limit = self._limit()
        if not job.done.wait(limit):
            job.abandoned = True
            raise PackTimeout(f"took longer than {limit:g} seconds")
        if job.error is None:
            return job.result
        if isinstance(job.error, Exception):
            raise job.error
        raise PackExit(f"{type(job.error).__name__} was raised") from job.error

    def close(self) -> None:
        """Let the packs' threads end once they are idle."""
        with self._lock:
            for runner in self._runners.values():
                runner.jobs.put(None)
            self._runners.clear()
