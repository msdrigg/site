---
slug: how-i-built-roam
title: Building Roam (A Roku Remote)
authors: msdrigg
tags:
    - projects
    - ios
draft: true
---

Last year I bought a simple Hisence Roku TV for my living room. It comes with a physical remote and Roku distributes an iOS application that can control it over the local LAN as well. I often sit on my couch working on my mac and want to control the TV without having to find my phone or a physical remote, but Roku does not distribute a quality remote application for macOS. I tried a few 3rd party apps "Designed for iPad, not verified for macOS" but all I tried lacked features or required in-app purchases.

Interestingly enough, Roku themselves publish a developer remote app for macOS [here](https://devtools.web.roku.com/RokuRemote/), but it's built primarily for large-scale device testing/scripting and it doesn't have a power-on/off button which got really annoying over time After using this tool as my daily remote for a few months I decided to build my own as a macOS application to solve my problem and learn SwiftUI along the way.

In this post I'll go over the process of building the app, some interesting challenges I faced and some of the cool things I learned.

## Learning the Roku API

The first step I took was to find information on the Roku API. Thankfully, Roku publishes a guide to their ECP (External Control Protocol) API [here](https://developer.roku.com/docs/developer-program/dev-tools/external-control-api.md). The ECP API provides a way to control the TV to perform commands like `VolumeUp`, `Select` or `Left`. Besides the documentation, there are quite a few open source projects that interact with the API and provide a good starting point for understanding how to use it in practice.

-   https://github.com/RoseSecurity/Abusing-Roku-APIs
-   https://github.com/ctalkington/python-rokuecp

Reading the documentation gives a list of available functions that can be called via the API. The ones that I have a user for are these

-   Query Device Info
-   Query App Info (name, id and icon)
-   Press any buttons in the Remote
-   Type Characters (keyboard entry)
-   Launch Apps
-   Power On/Off

Here's how the API works (using curl) for some of the basic functions

```bash
# Query Device Info
curl -X GET http://$ROKU_IP:8060/query/device-info
curl -X GET http://$ROKU_IP:8060

# Query App Info
curl -X GET http://$ROKU_IP:8060/query/apps
curl -X GET http://$ROKU_IP:8060/query/icon/$APP_ID

# Press any buttons in the Remote
curl -X POST http://$ROKU_IP:8060/keypress/VolumeUp
curl -X POST http://$ROKU_IP:8060/keypress/Home

# Type Characters (keyboard entry)
curl -X POST http://$ROKU_IP:8060/keypress/Lit_r
curl -X POST http://$ROKU_IP:8060/keypress/Lit_s

# Launch Apps
curl -X POST http://$ROKU_IP:8060/launch/$APP_ID

# Power On/Off
curl -X POST http://$ROKU_IP:8060/keypress/PowerOff
curl -X POST http://$ROKU_IP:8060/keypress/PowerOn
```

Additionally, from reading the documentation and looking through the open source projects, I learned about some other features that Roku TV's support outside of the ECP API

-   Device discovery

    Roku TV's support [Simple Service Discovery Protocol](https://en.wikipedia.org/wiki/Simple_Service_Discovery_Protocol) (SSDP) which allows devices to discover other devices on the local network. This is how the Roku iOS app discovers Roku devices on the local network without having to do a full network scan. The SSDP request is sent to the multicast address `239.255.255.250` on port `1900` with the following content

    ```bash
    nc -u 239.255.255.250 1900 <<EOF
    M-SEARCH * HTTP/1.1
    Host: 239.255.255.250:1900
    Man: "ssdp:discover"
    ST: roku:ecp
    EOF
    ```

    Roku TV's respond to the SSDP request with a response like this. The `Location` header contains the IP address and port of TV.

    ```bash
    HTTP/1.1 200 OK
    Cache-Control: max-age=3600
    ST: roku:ecp
    Location: http://$RokuIP:8060/
    USN: uuid:roku:ecp:$RokuUID
    ```

-   Waking up the device from full power down

    After the Roku is powered off, it stays in a standby state for a few minutes and can be powered back on with a PowerOn command. But after that time has passed, the Roku goes into a full power down state and no longer responds to the ECP `PowerOn` command. Thankfully most Roku TV's support [Wake on LAN](https://en.wikipedia.org/wiki/Wake-on-LAN) (WOL) and/or Wake on Wireless LAN (WoWLAN) for waking up from full power down.

    This protocol works by creating a magic UDP packet containing the device's MAC address and then sending this packet to the local network's broadcast address. The Roku TV's network card listens for these packets and powers on the device when it receives one.

    Here's the spot in my code where I handle this feature https://github.com/msdrigg/Roam/blob/80303d2e10eff70a83ea560de8ccf313e29c8ce7/Shared/Backend/StatelessDeviceAPI.swift#L11

-   Headphones Mode/Private listening (requires RTP and RTCP)

    Roku TV's support a private listening mode where the audio from the TV is streamed to the Roku remote application so that the user can listen to the TV audio through headphones connected to the phone. This is done using RTP (Real-time Transport Protocol) for audio streaming and RTCP for control.

    I'll go over how this protocol works in a later section.

## Overall Architecture

I started with a blank macOS SwiftUI app in XCode and followed the apple recommendations to get a simple version working

-   Swift Package Manager for dependencies
-   Using the `Network` framework for (almost) all networking
-   Using SwiftUI components for the UI
-   Using SwiftData for data storage (saved devices)
-   Async/Await for async operations

Given that I restricted the development to the latest macOS, the development really was a breeze. It didn't take more than a weekend to get the basic functionality working.

The biggest takeaway for me here is that SwiftUI makes everything extremely easy. SwiftUI provides easy-to-understand layout components based on horizontal and vertical stacks with a simple `Spacer` component to keep everything aligned. For this version 1, the only annoying difficulty was having to fiddle with the button sizing and padding to make them look like remote control buttons instead of application buttons.

## Data Modeling (Swift Data)

I stored the list of devices in a SwiftData model that gets queried from SwiftUI directly and updated using the `ModelContext` API. Apps are stored in their own SwiftData model and have a reference to the SwiftData model for devices.

```swift
@Model
public final class Device {
    @Attribute(.unique) public var udn: String

    // User-configurable parameters
    public var name: String
    public var location: String

    // Various status information
    public var lastSelectedAt: Date?
    public var lastOnlineAt: Date?
    public var lastScannedAt: Date?
    public var lastSentToWatch: Date?
    public var deletedAt: Date?
    public var powerMode: String?
    public var networkType: String?

    // Device networking information (queried from the device)
    // Roam needs ethernet MAC AND WiFi MAC because the
    // WOL packets depend on the MAC addressed used by the device
    public var wifiMAC: String?
    public var ethernetMAC: String?

    public var rtcpPort: UInt16?
    public var supportsDatagram: Bool?
}
```

```swift
@Model
public final class AppLink {
    public let id: String
    // Either `channel` or `app`
    public let type: String
    public let name: String
    public var lastSelected: Date? = nil

    // Reference to the device so only device-apps get queried from disk
    public var deviceUid: String? = nil

    // Store icon as raw data outside of the model (for performance)
    @Attribute(.externalStorage) public var icon: Data?
}
```

A few things to note here

-   The device sends either png or webp icons, but the native `Image` components in SwiftUI handles decoding from each format transparently, so we don't need to store the type of the image.
-   We need to store both the WiFi and Ethernet MAC addresses because the WOL packets depend on the MAC address used by the device. When try to wake the device with WOL, we send both WiFi and Ethernet packets to the broadcast address to ensure the device wakes up.

There were also a few gotchas with `SwiftData` that needed to be worked around

-   I had to mark devices as `isDeleted` instead of being deleted directly because `SwiftData` caused some crashes when deleting objects from a background thread while the UI is still using them
-   This model really should be stored in [VersionedSchema](https://developer.apple.com/documentation/swiftdata/versionedschema) because if the model changes in a backwards-incompatible, migration is not possible unless the initial schema reference is versioned (I learned this the hard way and had wipe all users' existing data when I made this update).
-   SwiftData supports storing `AppLink`'s as a sub-model of `Device`, but I chose to store them separately when I tried storing them as a sub-model, the performance was very choppy when a large number of `AppLink`'s needed to be loaded to query a list of available devices.
-   Roam offers widgets and shortcuts and I want these extensions to share the same data, so I setup an [app group](https://developer.apple.com/documentation/xcode/configuring-app-groups) to store all data in a shared location.
-   SwiftData supports transparently syncing data between devices using iCloud, but I chose not to implement this feature because device discovery works so well and the underlying data shouldn't change that much

## Networking

I used the `Network` framework for almost all networking operations. The `Network` framework makes it super easy to make simple HTTP requests. For example to request the device info from the Roku TV, I used the following code

```swift
func fetchDeviceInfo(location: String) async -> DeviceInfo? {
    let deviceInfoURL = "\(location)query/device-info"
    guard let url = URL(string: deviceInfoURL) else {
        return nil
    }
    var request = URLRequest(url: url)
    request.timeoutInterval = 1.5

    do {
        let (data, _) = try await URLSession.shared.data(for: request)
        if let xmlString = String(data: data, encoding: .utf8) {
            let decoder = XMLDecoder()
            decoder.keyDecodingStrategy = .convertFromKebabCase
            return try? decoder.decode(DeviceInfo.self, from: Data(xmlString.utf8))
        }
    } catch {
        logger.error("Error getting device info: \(error)")
    }
    return nil
}
```

For UDP operations, the `Network` framework provides a `NWConnection` class that can be used to accomplish anything I need (binding to a particular endpoint, send to a multicast address, etc). For example, here's how we setup the connection group for SSDP

```swift
let params = NWParameters.udp
params.allowLocalEndpointReuse = true

let connectionGroup = NWConnectionGroup(with: multicastGroup, using: params)
connectionGroup.setReceiveHandler(maximumMessageSize: 16384, rejectOversizedMessages: true) { (_, data, _) in
    if let data = data, let message = String(data: data, encoding: .utf8) {
        // Handle the response...
    }
}
```

### ECP over Websockets

Besides the direct http ECP API, the Roku supports an ECP API over Websockets. This API provides several benefits to us

-   More efficient communication because there is no need to open a new connection for each command.
-   Ordered delivery of messages because websockets is built on top of TCP which is a reliable ordered protocol.

    This is useful to us because when the user types on the computer keyboard, many commands will get sent to the Roku in quick succession and we want to ensure that keys are pressed in the order they are typed.

-   Receiving updates from the device when it changes state (for example, when the volume changes)

    Currently we don't use this feature, but it is on the roadmap to use this feature to provide a more accurate representation of the device state in the app.

This connection is an authenticated websocket connection, so we need to respond to an auth challenge after connecting before the device will accept any commands. Here's how we setup the connection

1. Connect to the websocket endpoint with the `ecp-2` protocol specifier
2. Wait for the first message from the device which will be the auth challenge
3. Encode the auth response using the secret key `95E610D0-7C29-44EF-FB0F-97F1FCE4C297`.

    The process for encoding the auth response can be seen [here](https://github.com/msdrigg/Roam/blob/80303d2e10eff70a83ea560de8ccf313e29c8ce7/Shared/Backend/ECPSession.swift#L346)

    I wouldn't have been able to do this without referencing the [RPListening](https://github.com/runz0rd/RPListening) or the [roku-audio-receiver](https://github.com/alin23/roku-audio-receiver) projects. These projects include implementations of the ECP Auth API in Python and Java. I used these implementations to understand how the auth challenge works and how to respond to it.

4. Send any future commands over the websocket connection. These commands are sent as JSON encoding of the ECP command including URL, body and any headers. It's honestly pretty messy, but we don't have to worry about it because all our ECP commands only include the method and the PATH with no body.

This protocol is a direct replacement for the ECP API over HTTP including things like device queries, so we could use it exclusively. But there are several places that we continue to use the HTTP API for querying device information and downloading icons. The HTTP API is better in these cases because we can make these one-off requests more quickly without establishing the full ECP Websocket session.

### Other networking challenges

While SSDP for device discovery is quite effective, I also implemented a direct local network scan to detect devices on the network that don't have SSDP discovery enabled. This scan works by trying to open a TCP connection to each IP address in the local network's DHCP range on port 8060 (the ECP port). If the connection is successful, we then query for the device's information and if it succeeds we store the device in our data model. This scan is quite slow and expensive but we limit it to only run very infrequently or when the user explicitly requests a device refresh scan. Additionally, we limit the number of scanned devices to 1024 total and 37 concurrently to prevent the scan from overwhelming the network. Our scans usually finish pretty quickly because the TCP connections are set to time out after 1.2 seconds.

Besides the `Network` framework, apple devices also have support for BSD sockets which can be used for more complex operations that the `Network` framework doesn't support. For my application, the only place I needed to use BSD sockets was to determine the device's local IP address and netmask. Roam uses the devices local IP address and netmask to determine the local network's DHCP range so that we know which IP's to scan. The `Network` framework doesn't provide a way to get this information, so we need to use the `getifaddrs` function from the BSD sockets API.

When I first added support for SSDP and WOL, these features worked correctly on macOS and even in the iOS simulator, but failed to work on real iOS devices. After some digging, I found that sending multicast packets requires a [specific capability](https://forums.developer.apple.com/forums/thread/663271), and I would need to request this capability from Apple support to get it enabled for my account. The macOS networking stack doesn't have the same restrictions, so it worked fine there even without the capability.

Additionally, on WatchOS complex networking isn't supported at all. This means that only basic HTTP requests are allowed at all outside of certain restrictive contexts. This means that we can't use the ECP API over Websockets on WatchOS and need to fall back to the plain HTTP API. It also means we can't support WOL or SSDP on WatchOS.

## TODO - Private Listening

-   RTP (Real-time Transport Protocol) for audio streaming
-   RTCP for control
-   UDP Binding + Port Control
-   OPUS codec + Noise Suppression Packets
-   Background Modes
-   Jitter Buffer + Latency Syncing

## Cross Platform Support

After getting the macOS app working, I decided to expand the app to iOS, WatchOS and TVOS. I was able to reuse almost all of the code from the macOS app with only a few changes. I'll list some of the more interesting challenges here.

-   There are a few UI API's that aren't available on all platforms. For example the `.accessoryBar` button style is only available on macOS, but those can be worked around with `#if/#else` conditional compilation.
-   VisionOS didn't support restricting the minimum size of the window to match the content size, so I had to add an explicit window min size.
-   The keyboard entry for VisionOS and TVOS is different from iOS. Instead of extending into the window, it replaces the entire window the a keyboard entry view. This required special handling to avoid dismissing the keyboard before the user was done typing.
-   WatchOS and TVOS don't support webp images, so I had to transcode the webp images into png before storing them in the model on these devices. I used `libwebp` via [libwebp-Xcode](https://github.com/SDWebImage/libwebp-Xcode) to accomplish this.
-   The simulator doesn't support binding to a local network port for UDP operations, so private listening fails in the simulator. This is a bug and I'm tracking it [here](https://openradar.appspot.com/radar?id=5580336264118272)
-   MacOS doesn't really put any restrictions to applications using the network. iOS and WatchOS require users to grant permissions to connect to devices on the local network, and require an additional capability to send multicast packets. This doesn't mean much for the running application but it does mean that there are additional steps to get the app approved for the app store.
-   The WatchOS app doesn't support [low level networking](https://developer.apple.com/documentation/technotes/tn3135-low-level-networking-on-watchos), so we can't support WOL or SSDP on WatchOS. In theory we could still support headphones mode, but I haven't implemented it yet.
-   My application was built for MacOS to support scale well with changing screen sizes, so adding support for portrait orientation wasn't difficult
-   There were a lot of challenges getting keyboard support working on iOS and macOS. Both of these ecosystems have slightly different UI API's (AppKit and UIKit), and they require that the component handling keyboard input be the first responder. This is particularly painful on macOS because the first responder status can be changed when the window loses and regains focus.
-   The iOS -> watchOS data transfer (to send device metadata) is a bit unreliable. The API's are straightforward, but the transfer always seems to take uncomfortably long when the user is sitting there staring at the apple watch waiting for their device to show up.
-   The TVOS screen interaction requires a lot of focus management. To click a button, the user needs to navigate to that button via the remote. This is only possibly by strategically using [focusSection](<https://developer.apple.com/documentation/musickit/artworkimage/focussection()>) in the SwiftUI layout.

## TODO - Hooking into the Apple Ecosystem

-   Shortcuts
-   Intents + Widgets
-   Siri + Spotlight Integration
-   Requesting Ratings

## Device Publishing

I published the app on the Mac App store and I ran into a few issues. First of all I wanted to name my app "Roam: A better Roku remote", but it got rejected in app review due to it violating the Roku trademark. I tried to point out that there are 20 apps on the iOS app store with very similar names (for example "RoByte: Roku Remote TV App"), but received several rejections. Finally a app reviewer suggested I use "For Roku" in the name to make it clear that it's a 3rd party application and the app was approved.

Since the initial publish, updates have been smooth. I was even able to add a VisionOS application with only a screen recording demonstrating that the app worked on the simulator (I don't have $3500 to spend on this app).

## Gimmicks

I got the idea for this section from the excellent article by [Mihhail Lapushkin](https://papereditor.app/dev#Gimmicks) on his work building the Paper Editor. I'll list some of the things I've added to Roam that are more gimmicky than required.

-   Horizontal scrolling for the app list

    I got a request from a bluetooth mouse user asking for the standard scroll wheel to scroll horizontally on the app list. There is no native SwiftUI way to implement this, so I built a hook that hooked into the AppKit scrolling API to override the scroll behavior. I then re-implemented the scrolling + inertia behavior that the standard scroll view provides. This was a lot of work for a simple gimmicky feature, but I got an explicit request from a loving user so I couldn't say no.

-   Gift Roam to a friend

    I added a feature to "gift" this app to a friend. This feature shares a link to the app store listing for Roam. Not sure if anyone

    Credit where credit is due: I also copied this feature from the Paper Editor.

## Conclusions

-   SwiftUI makes cross platform development incredibly easy
-   Modern (iOS 17) apple development makes it fun to rely on platform integrations (shortcuts, intents, widgets)
-   Things are easier when you don't need to manage the stack
-   Swift data seems simple but has a lot of gotchas
-   Networking can mostly be done with the Network framework, except in a few cases
-   Eskimo (quinn) holds all knowledge in their head

## Ongoing challenges

-   Private listening
    -   Getting reports that some devices don't work. I have tested it thoroughly on my own devices and it works fine, but I can't test on every device.
-   Will ECP get shut down
    -   https://community.roku.com/t5/Roku-Developer-Program/Roku-keypress-ECP-command-returning-HTTP-status-code-401/td-p/958113
    -   https://developer.roku.com/docs/developer-program/dev-tools/external-control-api.md#example-programs
-   Network connectivity user experience

## TODO: Add a lot of screenshots and pictures
