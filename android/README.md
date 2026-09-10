# CricketHub Cast for Android

This is the native Android companion for CricketHub's external iframe players.

## What it does

- The **same APK** can run on an Android phone and an Android TV / Google TV device.
- TV mode advertises itself on the local Wi-Fi as `CricketHub TV` using Android NSD/mDNS.
- Phone mode opens the CricketHub site in a WebView and handles `crickethub://cast?...` links.
- When a channel is cast, the phone sends the channel's external iframe URL directly to the discovered TV over the local network.
- The TV opens that URL in its WebView.
- No QR code, six-digit code, browser page on the TV, paid Cast receiver registration, or cloud relay is required.

## Requirements

- Android phone and Android TV / Google TV on the same Wi-Fi.
- Install the APK on both devices.
- The TV must allow installation of Android APKs.

## User flow

1. Launch CricketHub Cast on the TV once and leave it running.
2. Open CricketHub on Android or launch CricketHub Cast on the phone.
3. Open a channel and tap **Cast to TV**.
4. Choose the discovered CricketHub TV if more than one is present.
5. The external iframe player opens automatically on the TV.

## Build

Open the `android` folder in Android Studio and let it sync, then run `app` on either an Android phone or Android TV emulator/device.

A GitHub Actions workflow also builds a debug APK whenever `android/**` changes. The APK is uploaded as the workflow artifact `CricketHub-Android-debug`.

## Important compatibility note

This is intentionally a local-network receiver rather than Google Cast. It is designed for CricketHub's current external iframe URLs. It does not bypass iframe restrictions, DRM, authentication, or provider access controls; the TV WebView must be able to load the supplied URL normally.
