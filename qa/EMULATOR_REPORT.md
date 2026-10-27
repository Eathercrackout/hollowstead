# Android emulator test: Hollowstead v0.4.0 (2026-10-26)
**Setup:** Android 34 google_apis x86_64 image on an emulated Pixel 6 (1080×2400), using the APK downloaded with `gh release download v0.4.0`.

**Emulator:**
- **KVM:** `/dev/kvm` exists and `emulator -accel-check` reports it usable. With KVM on, the guest never started: qemu sat at about 0.3% CPU for more than 4 minutes with no kernel output, on 3 attempts. Nested virtualization looks broken on this box.
- **Software emulation (`-accel off`):** boot finished in about 13 min. The system was very slow, with repeated "System UI / Process system isn't responding" dialogs and the Bluetooth service crashing over and over.

**Result:** the APK **installed** ("Success", 32 s) and the activity **launched**: Capacitor's "Loading app at https://localhost" and "App started" appear in logcat. It then **crashed before it rendered**, on all 3 launches, including one with `--js-flags=--jitless`. The WebView renderer (`CrRendererMain`) died with SIGTRAP, and Capacitor's `MainActivity` has no `onRenderProcessGone` handler, so the app aborted with: `Render process ... crash wasn't handled by all associated webviews, triggering application crash`.

**Control test:** the **Chrome app's renderer also crashed with SIGTRAP**, both on an offline example.com page and when loading the v0.4.0 web build over `adb reverse`. So the crash comes from Chromium under this emulation, not from Hollowstead's code. On-device controls (taps, swipes, pinch), `dumpsys gfxinfo` and a win run could not be tested here.

**One real hardening gap (not fixed, by request):** the app has no WebView render-process-gone handling. On a real phone, if the WebView renderer is killed (for example under memory pressure), the whole app aborts instead of reloading.

Screenshots: `qa/emulator/`. They show the system "not responding" dialog, the blank WebView before the crash, the Chrome control and the home screen after the crash.
