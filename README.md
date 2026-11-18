# Worklets pauses and resumes its display link on every animation frame

Minimal iOS reproduction using Expo SDK 58 and react-native-worklets 0.13.1. The example is in `App.tsx`.

The screen runs one looping Reanimated animation (a spinner) and a panel that shows, for the last second:

- how many times `-[CADisplayLink setPaused:]` was called on the main thread, and how much main-thread time those calls took,
- how many times it was called from any thread,
- how many UI-thread frames ran and the longest frame.

The counter is a local Expo module in `modules/display-link-stats` that swaps `-[CADisplayLink setPaused:]` for a measuring wrapper. It is only there to make the cost visible and is not part of the fix.

## Run

```sh
npm ci
APPLE_TEAM_ID=<your team id> npm run ios:release -- --device
```

Run it on a physical iPhone with a 120 Hz display. The iOS simulator does not show the cost: there, `setPaused:` was 1 of 260 main-thread samples in a 5 s Time Profiler recording.

To build the fixed version, apply the patch and rebuild:

```sh
npm run apply-fix
EXPO_PUBLIC_VARIANT_LABEL="react-native-worklets 0.13.1 + fix" APPLE_TEAM_ID=<your team id> npm run ios:release -- --device
```

## Reproduce

1. Launch the app and wait two seconds.

**Expected:** a running animation does not pause and resume the display link on every frame.

**Actual:** on an iPhone 13 Pro with iOS 27.0, the panel shows about 242 `setPaused:` calls per second on the main thread, which take about 25 ms of main-thread time per second. With the patch, the panel shows 0 calls and 0 ms on the main thread. The frame rate is 120 in both builds.

About 120 calls per second come from other threads in both builds; the patch does not change them.

## Cause

`-[AnimationFrameQueue executeQueue:]` in `packages/react-native-worklets/apple/worklets/apple/AnimationFrameQueue.mm` pauses the display link before it runs the frame callbacks. A running animation requests the next frame from its callback, and `requestAnimationFrame:` resumes the display link right away. Every frame of an animation therefore calls `setPaused:TRUE` and `setPaused:FALSE`.

On iOS, each of these calls registers or unregisters the display link's frame rate range with the render server. A Time Profiler stack from the device:

```
-[AnimationFrameQueue requestAnimationFrame:]
-[AnimationFrameQueue scheduleQueueExecution]
CA::Display::DisplayLinkItem::set_paused(bool)
CA::Display::DisplayLinkItem::set_preferred_fps_range_locked(CAFrameRateRange, bool)
CA::Display::DisplayTimingsControl::update_frame_interval_request()
CA::Display::DisplayTimingsControl::register_frame_interval_range(CAFrameIntervalRange)
mach_msg
```

`evidence/` has the recordings before and after the fix, side by side in `before-after.mp4`.

The fix in `patches/react-native-worklets+0.13.1.patch` keeps the display link running while callbacks keep coming. It pauses the display link only after a frame that ran without any new callback, and it calls `setPaused:` only when the state changes.

## Environment

Reproduced on an iPhone 13 Pro, iOS 27.0, Release build:

- Expo 58.0.26 / React Native 0.88.1
- react-native-reanimated 4.7.2
- react-native-worklets 0.13.1 (the code is the same on `main` and in `0.14.0-nightly-20261118-8a666116d`)

## Checks

```sh
npm run typecheck
npm run lint
npx prettier --check .
```
