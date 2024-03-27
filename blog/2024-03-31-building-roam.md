---
slug: how-i-built-roam
title: Building the best iOS Roku Remote
authors: msdrigg
tags:
    - projects
    - ios
---

# Building Roam (A Roku Remote)

:::warning
Work in progress
:::

Last year I bought a simple Hisence Roku TV for my living room. It comes with a physical remote and Roku distributes a iOS application that can be used to control it over HTTP as well. I often sit on my couch working on my mac and want to control the TV without having to find my phone or a physical remote, so I went looking for a good Roku remote for macOS. There are many 3rd party apps for iOS with limited compatiblity for macOS, and Roku themselves actually publish a remote for macOS [here](https://devtools.web.roku.com/RokuRemote/electron.html), but it's built primarily for large-scale device testing/scripting and it doesn't have a power-on/off button which is very limiting.

After using the scripting tool as my daily remote for a few months I decided to build my own as a macOS application to solve my problem and learn SwiftUI along the way.

## Step 1 - API Research

The first step I took was to find information on the Roku API. Thankfully, Roku publishes a guide to their ECP (External Control Protocol) API [here](https://developer.roku.com/docs/developer-program/dev-tools/external-control-api.md). The API is simple and well documented, I also referenced a few open source projects that interact with the API in my early development

-   https://github.com/RoseSecurity/Abusing-Roku-APIs
-   https://github.com/ctalkington/python-rokuecp

Key functions that can be accessed via the API

-   Query Device Info
-   Press Remote buttons
-   Type Characters (keyboard entry)
-   Launch Apps
-   Query App Info
-   _Power On/Off_

These API's checked all my boxes, so I moved onto implementing the initial version of my app in SwiftUI.

## Step 2 - Development

I started with a blank macOS SwiftUI app in XCode and followed the best practices to the best of my ability to build the app. This means

-   Using the `Network` framework for (almost) all networking
-   Using SwiftUI components for the UI
-   Using SwiftData for data storage (saved devices)
-   Async/Await for async operations

Given that I restricted the development to the latest macOS, the development really was a breeze. I don't remember how long it took to get a working version up and running but it couldn't have been more than a weekend.

The biggest takeaway for me here is that SwiftUI makes everything extremely easy. SwiftUI provides easy-to-understand layout components based on horizontal and vertical stacks with a simple `Spacer` component to keep everything aligned. For this version 1, the only annoying difficulty was having to fiddle with the button sizing and padding to make them look like remote control buttons instead of application buttons.

## Step 3 - Core Improvements

-   WOL + WWOL (Wake on LAN + Wake on Wireless LAN) for power on/off
-   Scanning for devices on the network with netmask + local IP
-   Device discovery with SSDP
-   ECP Websockets Session
-   Checking network + warning when not on local network

## Step 4 - Extending to iOS, iPadOS, watchOS, and tvOS

-   TVOS Focus
-   VisionOS resizing
-   VisionOS + tvOS keyboard entry
-   macOS + iOS maintaining focus / first responder
-   Swift data performance
-   iOS -> WatchOS data transfer
-   WatchOS networking
-   WatchOS + TVOS WebP support
-   Simulator vs real device networking
-   Horizontal + vertical scaling

## Step 5 - Hooking into the Apple Ecosystem

-   Shortcuts
-   Intents + Widgets
-   Siri + Spotlight Integration
-   Requesting Ratings
-

## Step 5 - Private Listening

-   RTP (Real-time Transport Protocol) for audio streaming
-   RTCP for control
-   UDP Binding + Port Control
-   OPUS codec + Noise Suppression Packets
-   Background Modes
-   Jitter Buffer + Latency Syncing

-   Talk about the goal, the outcome and the lessons learned
-   SwiftUI makes cross platform development incredibly easy
-   Modern (iOS 17) apple development makes it fun to rely on platform integrations (shortcuts, intents, widgets)
-   Things are easier when you don't need to manage the stack
-   Swift data seems simple but has a lot of gotchas
-   Networking can mostly be done with the Network framework, except in a few cases
-   Eskimo (quinn) holds all knowledge in their head
