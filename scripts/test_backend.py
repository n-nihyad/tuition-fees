"""Run backend suites in separate processes so their `app` packages cannot collide."""

import argparse
import os
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SUITES = {
    "gateway": ROOT / "gateway",
    "user-service": ROOT / "services/user-service",
    "tuition-service": ROOT / "services/tuition-service",
    "payment-service": ROOT / "services/payment-service",
}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("suites", nargs="*", help="Suite names; defaults to all four.")
    parser.add_argument(
        "--with-postgres",
        action="store_true",
        help="Enable destructive payment integration tests against PAYMENT_TEST_DATABASE_URL.",
    )
    args = parser.parse_args()
    selected = args.suites or list(SUITES)
    unknown = set(selected) - SUITES.keys()
    if unknown:
        parser.error(f"Unknown suites: {', '.join(sorted(unknown))}")
    if args.with_postgres and not os.environ.get("PAYMENT_TEST_DATABASE_URL"):
        parser.error("--with-postgres requires an isolated PAYMENT_TEST_DATABASE_URL.")

    print(f"Python: {sys.executable}", flush=True)
    failures = []
    for name in selected:
        directory = SUITES[name]
        environment = os.environ.copy()
        # Replace inherited paths rather than importing a sibling service's `app`.
        environment["PYTHONPATH"] = str(directory)
        if not args.with_postgres:
            environment.pop("PAYMENT_TEST_DATABASE_URL", None)
        print(f"\nRunning {name}", flush=True)
        result = subprocess.run(
            [sys.executable, "-m", "pytest", "tests", "-q"],
            cwd=directory,
            env=environment,
            check=False,
        )
        if result.returncode:
            failures.append(name)
    if failures:
        print(f"\nFailed suites: {', '.join(failures)}", flush=True)
        return 1
    print("\nAll selected backend suites passed.", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
