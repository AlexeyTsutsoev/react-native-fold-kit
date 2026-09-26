#!/usr/bin/env bash
# Runs the Swift core tests (FoldKitCore, see Package.swift) on an iOS simulator.
#
# Simulator choice, newest iOS runtime first:
#   1. $IOS_TEST_DEVICE — a simulator name or UDID,
#   2. "iPhone Duo" (needs the iOS 27.1 runtime; the UIKit hinge contract
#      test is only compiled with the iOS 27.1 SDK),
#   3. any available iPhone — enough for CI runners without the Duo.
set -euo pipefail
cd "$(dirname "$0")/.."

udid=$(xcrun simctl list devices available --json | node -e '
  const wanted = process.argv[1];
  const { devices } = JSON.parse(require("fs").readFileSync(0, "utf8"));
  const version = (runtime) =>
    (runtime.match(/iOS-(\d+)-(\d+)/) || []).slice(1).map(Number);
  const byNewest = (a, b) => {
    const [x, y] = [version(a), version(b)];
    return (y[0] - x[0]) || (y[1] - x[1]);
  };
  const candidates = Object.keys(devices)
    .filter((runtime) => /SimRuntime\.iOS-/.test(runtime))
    .sort(byNewest)
    .flatMap((runtime) => devices[runtime].map((d) => ({ ...d, runtime })));
  const pick =
    (wanted && candidates.find((d) => d.name === wanted || d.udid === wanted)) ||
    (!wanted && candidates.find((d) => d.name === "iPhone Duo")) ||
    (!wanted && candidates.find((d) => d.name.startsWith("iPhone")));
  if (!pick) {
    console.error(wanted ? `No available simulator "${wanted}".` : "No available iPhone simulator.");
    process.exit(1);
  }
  console.error(`Using ${pick.name} (${pick.runtime.split(".").pop()}) ${pick.udid}`);
  console.log(pick.udid);
' "${IOS_TEST_DEVICE:-}")

xcodebuild test -scheme FoldKitCore -destination "id=$udid" -quiet
