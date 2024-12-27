---
slug: how-i-built-roam
title: Building Roam (A Roku Remote)
authors: msdrigg
tags:
    - projects
    - ios
---

Last year I bought a simple Hisence Roku TV for my living room. The TV comes with a physical remote control and Roku distributes an iOS app that can control it over the local network. But Roku does not offer a MacOS version of this app. I often sit on my couch working on my computer and want to control the TV (for example to mute an ad break) without having to find my phone or a physical remote. I first tried installing a few 3rd party apps "Designed for iPad, not verified for macOS" on my computer, but every one I tried either lacked features or wanted me to pay an absurd $25 yearly subscription to use the remote.

<!-- truncate -->

Interestingly enough, Roku themselves publish a developer remote app for macOS [here](https://devtools.web.roku.com/RokuRemote/), but it's built for large-scale device testing/scripting and it doesn't even have a power-on/off button. I did use this dev tool as my go-to remote for a few months, but eventually I got fed up and decided to build the remote app I wanted to use.

I wanted to share a few things I learned about modern cross-platform apple development from building a complete app with little previous swift experience.

![Screenshot](./assets/screenshot-macos.png)

## Learning the Roku API

Okay so first things first, I need to figure out what API the TV offers to control it. Thankfully, Roku publishes a guide to their ECP (External Control Protocol) API [here](https://developer.roku.com/docs/developer-program/dev-tools/external-control-api.md). This ECP API provides a set of commands to control the TV, and several queries that get information about the device's capabilities, installed applications and current state.

The parts of the API Roam uses are simple enough to be demonstrated in a few lines of curl.

```bash
# Query Device Info
curl http://$ROKU_IP:8060/query/device-info


curl http://$ROKU_IP:8060

# Query App Info
curl http://$ROKU_IP:8060/query/apps
curl http://$ROKU_IP:8060/query/icon/$APP_ID

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

Okay so lets take a look at the device-info query to see what kind of information I can get from the device

```xml
scottdriggers@Scotts-MBP ~ % curl http://$ROKU_IP:8060/query/device-info
<?xml version="1.0" encoding="UTF-8" ?>
<device-info>
    // highlight-next-line
	<udn>28001240-0000-1000-8000-80cbbc98790a</udn>
	<serial-number>X01900SGN8UY</serial-number>
	<device-id>S0A3619GN8UY</device-id>
	<advertising-id>7087357d-ec2a-59d4-a821-81fe98fbbd31</advertising-id>
	<vendor-name>Hisense</vendor-name>
	<model-name>6Series-50</model-name>
	<model-number>G218X</model-number>
	<model-region>US</model-region>
	<is-tv>true</is-tv>
	<is-stick>false</is-stick>
	<screen-size>50</screen-size>
	<panel-id>7</panel-id>
	<mobile-has-live-tv>true</mobile-has-live-tv>
	<ui-resolution>1080p</ui-resolution>
	<tuner-type>ATSC</tuner-type>
	<supports-ethernet>true</supports-ethernet>
    // highlight-next-line
	<wifi-mac>80:cb:bc:98:79:0a</wifi-mac>
	<wifi-driver>realtek</wifi-driver>
	<has-wifi-5G-support>true</has-wifi-5G-support>
    // highlight-next-line
	<ethernet-mac>a0:62:fb:78:29:ee</ethernet-mac>
	<network-type>wifi</network-type>
	<network-name>Myfi-GL</network-name>
    // highlight-next-line
	<friendly-device-name>Hisense•Roku TV - X01900SGN8UY</friendly-device-name>
	<friendly-model-name>Hisense•Roku TV</friendly-model-name>
	<default-device-name>Hisense•Roku TV - X01900SGN8UY</default-device-name>
	<user-device-name />
	<user-device-location />
	<build-number>CHD.55E04174A</build-number>
	<software-version>12.5.5</software-version>
	<software-build>4174</software-build>
	<lightning-base-build-number>xxD.50E04182A</lightning-base-build-number>
	<ui-build-number>CHD.55E04174A</ui-build-number>
	<ui-software-version>12.5.5</ui-software-version>
	<ui-software-build>4174</ui-software-build>
	<secure-device>true</secure-device>
	<language>en</language>
	<country>US</country>
	<locale>en_US</locale>
	<time-zone-auto>true</time-zone-auto>
	<time-zone>US/Eastern</time-zone>
	<time-zone-name>United States/Eastern</time-zone-name>
	<time-zone-tz>America/New_York</time-zone-tz>
	<time-zone-offset>-240</time-zone-offset>
	<clock-format>12-hour</clock-format>
	<uptime>624847</uptime>
    // highlight-next-line
	<power-mode>PowerOn</power-mode>
	<supports-suspend>true</supports-suspend>
	<supports-find-remote>false</supports-find-remote>
	<supports-audio-guide>true</supports-audio-guide>
	<supports-rva>true</supports-rva>
	<has-hands-free-voice-remote>false</has-hands-free-voice-remote>
	<developer-enabled>false</developer-enabled>
	<keyed-developer-id />
	<search-enabled>true</search-enabled>
	<search-channels-enabled>true</search-channels-enabled>
	<voice-search-enabled>true</voice-search-enabled>
    // highlight-next-line
	<supports-private-listening>true</supports-private-listening>
	<supports-private-listening-dtv>true</supports-private-listening-dtv>
	<supports-warm-standby>true</supports-warm-standby>
	<headphones-connected>false</headphones-connected>
	<supports-audio-settings>false</supports-audio-settings>
	<expert-pq-enabled>1.0</expert-pq-enabled>
	<supports-ecs-textedit>true</supports-ecs-textedit>
	<supports-ecs-microphone>true</supports-ecs-microphone>
    // highlight-next-line
	<supports-wake-on-wlan>true</supports-wake-on-wlan>
	<supports-airplay>true</supports-airplay>
	<has-play-on-roku>true</has-play-on-roku>
	<has-mobile-screensaver>false</has-mobile-screensaver>
	<support-url>hisense-usa.com/support</support-url>
	<grandcentral-version>11.3.24</grandcentral-version>
	<supports-trc>true</supports-trc>
	<trc-version>3.0</trc-version>
	<trc-channel-version>9.3.10</trc-channel-version>
	<av-sync-calibration-enabled>3.0</av-sync-calibration-enabled>
</device-info>
```

Okay so there's a lot here, but I highlighted the key lines here that Roam can use when it connects to the TV. The `udn` is a unique identifier for the device that is stable over time and across device API's. We can see some network information including wifi and ethernet mac addresses. We can see a friendly device name, that's nice for when we discover the device. We can see the current power state in `power-mode` and we can see if the device supports private listening (headphones mode) and wake on LAN.

Okay this is really all Roam can use currently. There's some other data that I could use in the future like `supports-airplay`, but for now I only use a small subset.

### Device Discovery with SSDP

Besides direct control, Roku devices support device discovery over [Simple Service Discovery Protocol](https://en.wikipedia.org/wiki/Simple_Service_Discovery_Protocol) (SSDP). This protocol uses UDP multicast on port 1900 with a HTTP-like format to provide the IP address of the device.

Here's an example of what Roam sends to discover the device's IP address

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

### Power-On with Wake on LAN

After the device is powered off by the remote, or if it sits idle for long enough it will enter a state of deep sleep where it no longer responds to the ECP API. This means that the standard `/keypress/PowerOn` command will not work to wake the device up. To wake the device up from this state, Roam uses [Wake on LAN](https://en.wikipedia.org/wiki/Wake-on-LAN) (WOL). WOL is a well-standardized protocol supported by many devices that allows a device to be woken up by a magic UDP multicast packet matching the device's MAC address. Roku TV's typically support WOL on both the WiFi and Ethernet interfaces.

Here's how my code looks to send a WOL packet to the device

```swift
func getWOLPacket(macAddress: String) -> Data? {
    var packet = Data()
    // Create the header with 6 bytes of FF
    for _ in 0..<6 {
        packet.append(0xFF)
    }

    // Parse MAC address and append it 16 times to the packet
    let macBytes = macAddress.split(separator: ":").compactMap { UInt8($0, radix: 16) }
    guard macBytes.count == 6 else {
        logger.error("Invalid MAC address")
        return nil
    }

    for _ in 0..<16 {
        packet.append(contentsOf: macBytes)
    }
    return packet
}

func wakeOnLAN(macAddress: String) async {
    let host = NWEndpoint.Host("255.255.255.255")
    let port = NWEndpoint.Port(rawValue: 9)!
    let parameters = NWParameters.udp
    let connection = NWConnection(host: host, port: port, using: parameters)

    guard let packet = getWOLPacket(macAddress: macAddress) else {
        logger.error("Invalid MAC address")
        return
    }

    let timeout = DispatchTime.now() + .seconds(5) // Set a 5-second timeout for sending the WOL packet
    let statusStream = AsyncStream { continuation in
        // Start a timer to handle timeout
        DispatchQueue.global().asyncAfter(deadline: timeout) {
            continuation.yield(false)
            connection.cancel()
        }

        connection.stateUpdateHandler = { state in
            if state == .ready {
                connection.send(content: packet, completion: NWConnection.SendCompletion.contentProcessed({ error in
                    if let error = error {
                        logger.error("Error sending WOL packet for MAC \(macAddress): \(error)")
                    } else {
                        logger.info("Sent WOL packet")
                    }
                    connection.cancel()
                    continuation.yield(true)
                }))
            } else {
                switch state {
                case .failed:
                    continuation.yield(false)
                case .cancelled:
                    continuation.yield(false)
                default:
                    return
                }
            }
        }
        connection.start(queue: .global())
    }

    var iterator = statusStream.makeAsyncIterator()
    let canSendPacket = await iterator.next() ?? false

    if !canSendPacket {
        logger.error("Unable to send WOL packet within 5 sec")
    }
}
```

Even in this code you can see the tension of working with UDP in swift's async/await model. Apple currently recommends the `Network` framework for handling all low-level networking operations, but the `Network` framework is built on a callback model. So to use the `Network` framework with async/await, I typically wrapped these callbacks with an `AsyncStream` and then use the `AsyncStream` to yield the result of the operation. This setup is always super verbose, but it means I can avoid get warnings in XCode about shared mutable state.

Ideally this function could be implemented trivially with something like `NWConnection.send(content: Data) async throws -> Bool` but that's not available in the current API.

### Headphones Mode (Private listening)

Roku TV's support a headphones mode where the audio is streamed to the Roku remote application so that the user can listen to the TV audio through headphones connected to the phone. This is done using RTP (Real-time Transport Protocol) for audio streaming and RTCP for control. This protocol relies on RTP and RTCP but I will go over the details in a later section.

## Overall Architecture

I started with a blank SwiftUI app in XCode and followed the apple recommendations to get a simple version working

-   Swift Package Manager for dependencies
-   The `Network` framework for (almost) all networking
-   SwiftUI components for the UI
-   SwiftData for data storage (saved devices)
-   Async/Await wherever possible

Roam doesn't need a backend server or even much in-app data management because the TV manages it's own state, so all Roam needs to do is track a simple connection state and periodically refresh the device's list of capabilities.

Because Roam don't have very much state management, it was easiest for me to do everything from with SwiftUI views. I used SwiftData to track stored state, but I was able to avoid any kind of view-model or controller layers. The View components themselves are responsible for querying the data model and updating the data model when things change. For example here's my view that shows the app list for a device

```swift
struct AppLinksView: View {
    @Query private var appLinks: [AppLink]

    var handleOpenApp: (AppLinkAppEntity) -> Void
    let rows: Int

    init(deviceId: String?, rows: Int, handleOpenApp: @escaping (AppLinkAppEntity) -> Void) {
        self.handleOpenApp = handleOpenApp
        self.rows = rows

        _appLinks = Query(
            filter: #Predicate {
                $0.deviceUid == deviceId
            },
            sort: \.lastSelected,
            order: .reverse
        )
    }

    var body: some View {
            ScrollView(.horizontal, showsIndicators: false) {
                Spacer()
                LazyHGrid(rows: Array(repeating: GridItem(.fixed(60)), count: rows), spacing: 10) {
                    ForEach(Array(appLinks.enumerated()), id: \.element.id) { index, app in
                        AppLinkButton(app: app, action: handleOpenApp)
                    }
                }
                    .scrollTargetLayout()
                Spacer()
            }
            .scrollTargetBehavior(.viewAligned)
            .safeAreaPadding(.horizontal, 4)
            .frame(height: 80 * CGFloat(rows))
    }
}
```

There are a couple of instructive details in this example.

First of all we can see at the top of the view that there is an `@Query var appLinks`. This is a SwiftData native property wrapper to automatically query a list of objects from the stored data model and refresh the view when the stored data changes.

Unfortunately `AppLinks` needs to filter these icons based off the selected device ID, so I need to supply a runtime-dynamic `#Predicate` to the query. This can't be done using the `@Query` itself because property wrappers can't take runtime arguments, so I need to use the underscored `_appLinks` property to modify the query with the dynamic predicate.

This behavior isn't featured very prominently, but it is documented in the [Query guides](https://developer.apple.com/documentation/swiftdata/filtering-and-sorting-persistent-data#Update-a-query-dynamically).

Foot-guns like this are still relatively common with SwiftData, but Roam doesn't have a complex-enough data model to justify dropping down to CoreData or something home-grown.

### Data Modeling (Swift Data)

So I stored two different types of objects in the data model: `Device` and `AppLink`. Each device tracks a Roku TV's capabilities, state and connection information. Each `AppLink` tracks an installed application on the Roku TV and the last time it was selected.

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

Each TV and App also has an associated icon which means that querying devices with a lot of apps comes with a tangible performance drop. To handle this in practice, I store the `AppLink`'s in a separate table that isn't queried unless the app is explicitly displayed as a button on the screen.

Depending on the app, Roku can use either png or webp images for app icons, and provides the mime type in the response headers. Roam don't actually save these mime types because the native `Image` components in SwiftUI handles decoding from each format transparently.

You may also note here that the model stores both the ethernet and WiFi MAC addresses. Roam keeps both because when it needs to wake the device with WOL, it attempts WOL with both WiFi and ethernet interfaces.

There were also a few gotchas with `SwiftData` that needed to be worked around

-   I had to mark devices as `isDeleted` instead of directly deleting the devices because my `@Query` properties caused crashes after deleting models. I tried several methods to avoid this crash but soft deletes were the only reliable fix
-   SwiftData models really need to be stored in [VersionedSchema](https://developer.apple.com/documentation/swiftdata/versionedschema) because if the model changes in a backwards-incompatible way, the pre-migration schema must be a `VersionedSchema` or the data will fail to load. I learned this the hard way and had wipe all users' existing data when I made my first data migration.
-   SwiftData supports storing `AppLink`'s as a sub-model of `Device`, but I chose to store them separately when I tried storing them as a sub-model, the performance was very choppy when a large number of `AppLink`'s needed to be loaded to query a list of available devices.
-   Roam offers widgets and shortcuts that need to use the same data as the main app, so I needed to setup my data within an [app group](https://developer.apple.com/documentation/xcode/configuring-app-groups) so all components could share.

## ECP API

So I lied a little bit earlier when I said that the protocol was as simple as using curl. That API I showed earlier is the _documented_ ECP API, but it is not the one that the official iOS Roku app uses when it connects. Let's use `tcpdump` to capture the data going between the Roku TV and the official Roku iOS app.

```bash
tcpdump -i br-lan -s 0 -w roku.pcap host $ROKU_IP or host $IOS_APP_IP
```

The home router I use is a gl-inet router which comes with firmware built on top of OpenWRT. So executing this command is as easy as ssh'ing onto the router and running the command.

The `br-lan` interface is the interface that connects my main local network devices together. If I was using the guest network, I would need to capture on `br-guest`.

I then opened the Roku app on my phone and started interacting with the TV. After a few minutes of interaction, I stopped the capture and downloaded the file to my computer.

Looking at the capture in Wireshark I can see that there is only one main TCP stream between the Roku TV and the iOS app. Here's what it looks like

![Wireshark Capture](./assets/wireshark-main.png)

Okay so we see it's a websocket connection that uses the `ecp-2` protocol. Oh okay, so this is a websocket version of the same ecp API we saw earlier. Let's see what the messages look like.

Here's are the first few websocket messages sent over the websocket connection from the official Roku iOS app. `<` messages come from the TV and `>` messages are sent by the app.

```json
// Authentication Challenge
< {
<   "notify":"authenticate",
<   "param-challenge":"3KwH7h3HTmxFziLtrzVg5w==",
<   "timestamp":"608921.943"
< }

// Authentication Verification Request
> {
>   "param-microphone-sample-rates":"1600",
>   "param-response":"6yYiyDKcbca3qwig1hylU0dHqUQ=",
>   "request-id":"1",
>   "param-client-friendly-name":"roku2@msd3.io",
>   "request":"authenticate",
>   "param-has-microphone":"true"
> }

// Authentication Success Response
< {
<   "response":"authenticate",
<   "response-id":"1",
<   "status":"200",
<   "status-msg":"OK"
< }

// Query Device Info Request
> {
>   "request":"query-device-info",
>   "request-id":"2"
> }

// Query Media Player Request
> {
>   "request":"query-media-player",
>   "request-id":"3"
> }

// Query Device Info Response
< {
<   "content-data":"PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiID8+CjxkZXZpY2UtaW5mbz4KCTx1ZG4+MjgwMDEyNDAtMDAwMC0xMDAwLTgwMDAtODBjYmJjOTg3OTBhPC91ZG4+Cgk8dmlydHVhbC1kZXZpY2UtaWQ+UzBBMzYxOUdOOFVZPC92aXJ0dWFsLWRldmljZS1pZD4KCTxzZXJpYWwtbnVtYmVyPlgwMTkwMFNHTjhVWTwvc2VyaWFsLW51bWJlcj4KCTxkZXZpY2UtaWQ+UzBBMzYxOUdOOFVZPC9kZXZpY2UtaWQ+Cgk8YWR2ZXJ0aXNpbmctaWQ+OWVlYmYxNTEtZTUxOS01NzRiLThkZTItOWUwODUzOTBjNDFkPC9hZHZlcnRpc2luZy1pZD4KCTx2ZW5kb3ItbmFtZT5IaXNlbnNlPC92ZW5kb3ItbmFtZT4KCTxtb2RlbC1uYW1lPjZTZXJpZXMtNTA8L21vZGVsLW5hbWU+Cgk8bW9kZWwtbnVtYmVyPkcyMThYPC9tb2RlbC1udW1iZXI+Cgk8bW9kZWwtcmVnaW9uPlVTPC9tb2RlbC1yZWdpb24+Cgk8aXMtdHY+dHJ1ZTwvaXMtdHY+Cgk8aXMtc3RpY2s+ZmFsc2U8L2lzLXN0aWNrPgoJPHNjcmVlbi1zaXplPjUwPC9zY3JlZW4tc2l6ZT4KCTxwYW5lbC1pZD43PC9wYW5lbC1pZD4KCTxtb2JpbGUtaGFzLWxpdmUtdHY+dHJ1ZTwvbW9iaWxlLWhhcy1saXZlLXR2PgoJPHVpLXJlc29sdXRpb24+MTA4MHA8L3VpLXJlc29sdXRpb24+Cgk8dHVuZXItdHlwZT5BVFNDPC90dW5lci10eXBlPgoJPHN1cHBvcnRzLWV0aGVybmV0PnRydWU8L3N1cHBvcnRzLWV0aGVybmV0PgoJPHdpZmktbWFjPjgwOmNiOmJjOjk4Ojc5OjBhPC93aWZpLW1hYz4KCTx3aWZpLWRyaXZlcj5yZWFsdGVrPC93aWZpLWRyaXZlcj4KCTxoYXMtd2lmaS01Ry1zdXBwb3J0PnRydWU8L2hhcy13aWZpLTVHLXN1cHBvcnQ+Cgk8ZXRoZXJuZXQtbWFjPmEwOjYyOmZiOjc4OjI5OmVlPC9ldGhlcm5ldC1tYWM+Cgk8bmV0d29yay10eXBlPmV0aGVybmV0PC9uZXR3b3JrLXR5cGU+Cgk8ZnJpZW5kbHktZGV2aWNlLW5hbWU+SGlzZW5zZeKAolJva3UgVFYgLSBYMDE5MDBTR044VVk8L2ZyaWVuZGx5LWRldmljZS1uYW1lPgoJPGZyaWVuZGx5LW1vZGVsLW5hbWU+SGlzZW5zZeKAolJva3UgVFY8L2ZyaWVuZGx5LW1vZGVsLW5hbWU+Cgk8ZGVmYXVsdC1kZXZpY2UtbmFtZT5IaXNlbnNl4oCiUm9rdSBUViAtIFgwMTkwMFNHTjhVWTwvZGVmYXVsdC1kZXZpY2UtbmFtZT4KCTx1c2VyLWRldmljZS1uYW1lIC8+Cgk8dXNlci1kZXZpY2UtbG9jYXRpb24gLz4KCTxidWlsZC1udW1iZXI+Q0hELjUwRTA0MTc2QTwvYnVpbGQtbnVtYmVyPgoJPHNvZnR3YXJlLXZlcnNpb24+MTIuNS4wPC9zb2Z0d2FyZS12ZXJzaW9uPgoJPHNvZnR3YXJlLWJ1aWxkPjQxNzY8L3NvZnR3YXJlLWJ1aWxkPgoJPGxpZ2h0bmluZy1iYXNlLWJ1aWxkLW51bWJlciAvPgoJPHVpLWJ1aWxkLW51bWJlcj5DSEQuNTBFMDQxNzZBPC91aS1idWlsZC1udW1iZXI+Cgk8dWktc29mdHdhcmUtdmVyc2lvbj4xMi41LjA8L3VpLXNvZnR3YXJlLXZlcnNpb24+Cgk8dWktc29mdHdhcmUtYnVpbGQ+NDE3NjwvdWktc29mdHdhcmUtYnVpbGQ+Cgk8c2VjdXJlLWRldmljZT50cnVlPC9zZWN1cmUtZGV2aWNlPgoJPGxhbmd1YWdlPmVuPC9sYW5ndWFnZT4KCTxjb3VudHJ5PlVTPC9jb3VudHJ5PgoJPGxvY2FsZT5lbl9VUzwvbG9jYWxlPgoJPHRpbWUtem9uZS1hdXRvPnRydWU8L3RpbWUtem9uZS1hdXRvPgoJPHRpbWUtem9uZT5VUy9FYXN0ZXJuPC90aW1lLXpvbmU+Cgk8dGltZS16b25lLW5hbWU+VW5pdGVkIFN0YXRlcy9FYXN0ZXJuPC90aW1lLXpvbmUtbmFtZT4KCTx0aW1lLXpvbmUtdHo+QW1lcmljYS9OZXdfWW9yazwvdGltZS16b25lLXR6PgoJPHRpbWUtem9uZS1vZmZzZXQ+LTMwMDwvdGltZS16b25lLW9mZnNldD4KCTxjbG9jay1mb3JtYXQ+MTItaG91cjwvY2xvY2stZm9ybWF0PgoJPHVwdGltZT4yOTM0OTg1PC91cHRpbWU+Cgk8cG93ZXItbW9kZT5Qb3dlck9uPC9wb3dlci1tb2RlPgoJPHN1cHBvcnRzLXN1c3BlbmQ+dHJ1ZTwvc3VwcG9ydHMtc3VzcGVuZD4KCTxzdXBwb3J0cy1maW5kLXJlbW90ZT5mYWxzZTwvc3VwcG9ydHMtZmluZC1yZW1vdGU+Cgk8c3VwcG9ydHMtYXVkaW8tZ3VpZGU+dHJ1ZTwvc3VwcG9ydHMtYXVkaW8tZ3VpZGU+Cgk8c3VwcG9ydHMtcnZhPnRydWU8L3N1cHBvcnRzLXJ2YT4KCTxoYXMtaGFuZHMtZnJlZS12b2ljZS1yZW1vdGU+ZmFsc2U8L2hhcy1oYW5kcy1mcmVlLXZvaWNlLXJlbW90ZT4KCTxkZXZlbG9wZXItZW5hYmxlZD5mYWxzZTwvZGV2ZWxvcGVyLWVuYWJsZWQ+Cgk8a2V5ZWQtZGV2ZWxvcGVyLWlkIC8+Cgk8c2VhcmNoLWVuYWJsZWQ+dHJ1ZTwvc2VhcmNoLWVuYWJsZWQ+Cgk8c2VhcmNoLWNoYW5uZWxzLWVuYWJsZWQ+dHJ1ZTwvc2VhcmNoLWNoYW5uZWxzLWVuYWJsZWQ+Cgk8dm9pY2Utc2VhcmNoLWVuYWJsZWQ+dHJ1ZTwvdm9pY2Utc2VhcmNoLWVuYWJsZWQ+Cgk8c3VwcG9ydHMtcHJpdmF0ZS1saXN0ZW5pbmc+dHJ1ZTwvc3VwcG9ydHMtcHJpdmF0ZS1saXN0ZW5pbmc+Cgk8c3VwcG9ydHMtcHJpdmF0ZS1saXN0ZW5pbmctZHR2PnRydWU8L3N1cHBvcnRzLXByaXZhdGUtbGlzdGVuaW5nLWR0dj4KCTxzdXBwb3J0cy13YXJtLXN0YW5kYnk+dHJ1ZTwvc3VwcG9ydHMtd2FybS1zdGFuZGJ5PgoJPGhlYWRwaG9uZXMtY29ubmVjdGVkPmZhbHNlPC9oZWFkcGhvbmVzLWNvbm5lY3RlZD4KCTxzdXBwb3J0cy1hdWRpby1zZXR0aW5ncz5mYWxzZTwvc3VwcG9ydHMtYXVkaW8tc2V0dGluZ3M+Cgk8ZXhwZXJ0LXBxLWVuYWJsZWQ+MS4wPC9leHBlcnQtcHEtZW5hYmxlZD4KCTxzdXBwb3J0cy1lY3MtdGV4dGVkaXQ+dHJ1ZTwvc3VwcG9ydHMtZWNzLXRleHRlZGl0PgoJPHN1cHBvcnRzLWVjcy1taWNyb3Bob25lPnRydWU8L3N1cHBvcnRzLWVjcy1taWNyb3Bob25lPgoJPHN1cHBvcnRzLXdha2Utb24td2xhbj50cnVlPC9zdXBwb3J0cy13YWtlLW9uLXdsYW4+Cgk8c3VwcG9ydHMtYWlycGxheT50cnVlPC9zdXBwb3J0cy1haXJwbGF5PgoJPGhhcy1wbGF5LW9uLXJva3U+dHJ1ZTwvaGFzLXBsYXktb24tcm9rdT4KCTxoYXMtbW9iaWxlLXNjcmVlbnNhdmVyPmZhbHNlPC9oYXMtbW9iaWxlLXNjcmVlbnNhdmVyPgoJPHN1cHBvcnQtdXJsPmhpc2Vuc2UtdXNhLmNvbS9zdXBwb3J0PC9zdXBwb3J0LXVybD4KCTxncmFuZGNlbnRyYWwtdmVyc2lvbj4xMC40LjQ1PC9ncmFuZGNlbnRyYWwtdmVyc2lvbj4KCTxzdXBwb3J0cy10cmM+dHJ1ZTwvc3VwcG9ydHMtdHJjPgoJPHRyYy12ZXJzaW9uPjMuMDwvdHJjLXZlcnNpb24+Cgk8dHJjLWNoYW5uZWwtdmVyc2lvbj45LjMuMTA8L3RyYy1jaGFubmVsLXZlcnNpb24+Cgk8YXYtc3luYy1jYWxpYnJhdGlvbi1lbmFibGVkPjMuMDwvYXYtc3luYy1jYWxpYnJhdGlvbi1lbmFibGVkPgo8L2RldmljZS1pbmZvPgo=",
<   "content-type":"text/xml; charset=\"utf-8\"",
<   "response":"query-device-info",
<   "response-id":"2",
<   "status":"200",
<   "status-msg":"OK"
< }

// Query Media Player Response
< {
<   "content-data":"PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiID8+CjxwbGF5ZXIgc3RhdGU9ImNsb3NlIiBlcnJvcj0iZmFsc2UiIC8+Cg==",
<   "content-type":"text/xml; charset=\"utf-8\"",
<   "response":"query-media-player",
<   "response-id":"3",
<   "status":"200",
<   "status-msg":"OK"
< }
```

Here you can see how requests and responses can be interleaved and matched back up by the `request-id/response-id` fields. This uses the duplex nature of the websocket connection.

The other funny thing you can see is that some of these messages look exactly like the ECP commands from earlier. Lets take a look at the `query-device-info` response. There's a big block of base64 encoded data in the `content-data` field. Let's decode that and see what it looks like.

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<device-info>
	<udn>28001240-0000-1000-8000-80cbbc98790a</udn>
	<virtual-device-id>S0A3619GN8UY</virtual-device-id>
	<serial-number>X01900SGN8UY</serial-number>
	<device-id>S0A3619GN8UY</device-id>
	<advertising-id>9eebf151-e519-574b-8de2-9e085390c41d</advertising-id>
	<vendor-name>Hisense</vendor-name>
	<model-name>6Series-50</model-name>
	<model-number>G218X</model-number>
	<model-region>US</model-region>
	<is-tv>true</is-tv>
	<is-stick>false</is-stick>
	<screen-size>50</screen-size>
	<panel-id>7</panel-id>
	<mobile-has-live-tv>true</mobile-has-live-tv>
	<ui-resolution>1080p</ui-resolution>
	<tuner-type>ATSC</tuner-type>
	<supports-ethernet>true</supports-ethernet>
	<wifi-mac>80:cb:bc:98:79:0a</wifi-mac>
	<wifi-driver>realtek</wifi-driver>
	<has-wifi-5G-support>true</has-wifi-5G-support>
	<ethernet-mac>a0:62:fb:78:29:ee</ethernet-mac>
	<network-type>ethernet</network-type>
	<friendly-device-name>Hisense•Roku TV - X01900SGN8UY</friendly-device-name>
	<friendly-model-name>Hisense•Roku TV</friendly-model-name>
	<default-device-name>Hisense•Roku TV - X01900SGN8UY</default-device-name>
	<user-device-name />
	<user-device-location />
	<build-number>CHD.50E04176A</build-number>
	<software-version>12.5.0</software-version>
	<software-build>4176</software-build>
	<lightning-base-build-number />
	<ui-build-number>CHD.50E04176A</ui-build-number>
	<ui-software-version>12.5.0</ui-software-version>
	<ui-software-build>4176</ui-software-build>
	<secure-device>true</secure-device>
	<language>en</language>
	<country>US</country>
	<locale>en_US</locale>
	<time-zone-auto>true</time-zone-auto>
	<time-zone>US/Eastern</time-zone>
	<time-zone-name>United States/Eastern</time-zone-name>
	<time-zone-tz>America/New_York</time-zone-tz>
	<time-zone-offset>-300</time-zone-offset>
	<clock-format>12-hour</clock-format>
	<uptime>2934985</uptime>
	<power-mode>PowerOn</power-mode>
	<supports-suspend>true</supports-suspend>
	<supports-find-remote>false</supports-find-remote>
	<supports-audio-guide>true</supports-audio-guide>
	<supports-rva>true</supports-rva>
	<has-hands-free-voice-remote>false</has-hands-free-voice-remote>
	<developer-enabled>false</developer-enabled>
	<keyed-developer-id />
	<search-enabled>true</search-enabled>
	<search-channels-enabled>true</search-channels-enabled>
	<voice-search-enabled>true</voice-search-enabled>
	<supports-private-listening>true</supports-private-listening>
	<supports-private-listening-dtv>true</supports-private-listening-dtv>
	<supports-warm-standby>true</supports-warm-standby>
	<headphones-connected>false</headphones-connected>
	<supports-audio-settings>false</supports-audio-settings>
	<expert-pq-enabled>1.0</expert-pq-enabled>
	<supports-ecs-textedit>true</supports-ecs-textedit>
	<supports-ecs-microphone>true</supports-ecs-microphone>
	<supports-wake-on-wlan>true</supports-wake-on-wlan>
	<supports-airplay>true</supports-airplay>
	<has-play-on-roku>true</has-play-on-roku>
	<has-mobile-screensaver>false</has-mobile-screensaver>
	<support-url>hisense-usa.com/support</support-url>
	<grandcentral-version>10.4.45</grandcentral-version>
	<supports-trc>true</supports-trc>
	<trc-version>3.0</trc-version>
	<trc-channel-version>9.3.10</trc-channel-version>
	<av-sync-calibration-enabled>3.0</av-sync-calibration-enabled>
</device-info>
```

Hey! That's exactly what we got from `curl http://$ROKU_IP:8060/query/device-info`! Okay so we can see that parts of the ECP API are a transliteration of the ECP API over HTTP to a Websockets API.

But what are all these other messages? Well it seems like there is an authorization challenge that the app needs to respond to before the device will accept any commands. So it seems that this is not just an undocumented API but a _private_ API that Roku wants to prevent third-party developers from using.

Thankfully for us, this authorization step is not very secure and others have already reverse engineered it. After some googling I was able to find [RPListening](https://github.com/runz0rd/RPListening) and [roku-audio-receiver](https://github.com/alin23/roku-audio-receiver). These two projects have implemented this authorization handshake in Java and Python respectively.

So in these codebases we are looking for a function that handles the creation of the `param-response` field in the authentication request.

This is pretty straightforward in the `roku-audio-receiver` project.

```python
KEY = "95E610D0-7C29-44EF-FB0F-97F1FCE4C297"

def char_transform(var1, var2):
    if ord("0") <= var1 <= ord("9"):
        var3 = var1 - 48
    elif ord("A") <= var1 <= ord("F"):
        var3 = var1 - 65 + 10
    else:
        var3 = -1

    if var3 < 0:
        return chr(var1)

    var2 = 15 - var3 + var2 & 15
    if var2 < 10:
        var2 += 48
    else:
        var2 = var2 + 65 - 10

    return chr(var2)

AUTH_KEY = "".join(char_transform(ord(c), 9) for c in KEY).encode()

def auth_key(s: str) -> str:
    return b64encode(sha1(s.encode() + RokuAudio.AUTH_KEY).digest()).decode()
```

Hmm well this is kinda crazy and I am not sure how they were able to discover this authentication key, but it's simple enough to replicate in swift.

Ok, so lets ask why Roku would do this. Well there are are obviously some performance benefits to using a single persistent connection instead of a bunch of HTTP requests, but there is also a latency cost because the first message after app launch needs to perform the whole websocket authorization dance.

I think it's for a few other reasons. First of all I'm sure Roku likes gating it's core API so that it can later turn off or limit the standard ECP API without affecting the official clients.

More interestingly, a websocket connection allows a reliable and ordered message delivery. With a http-request-per-command model, each request can fail or succeed independent of any other request. This means that when a user tries to type out "Harry Potter" on their keyboard, some of the letters could get dropped or sent out of order. That's not a problem with the websocket connection because the websocket connection guarantees that the `a` in "Harry Potter" will get sent before the `r` (or the connection will fail altogether).

The websocket connection can also be used like a pub-sub system to get updates on the device's state, but I don't have a good use for this feature at this time, so I won't go into it.

### Getting Connected

Okay so laying it all out here's what we need to do to connect to a Roku TV over the ECP API

1. Connect to the websocket endpoint with the `ecp-2` protocol specifier
2. Wait for the first message from the device which will be the auth challenge.
3. Encode the auth response using the secret key `95E610D0-7C29-44EF-FB0F-97F1FCE4C297`.
4. Send any future commands over the websocket connection.

I use this ECP API for all button presses and keyboard entry - basically any command that changes the state of the TV. I use the standard ECP API for any device information queries because it's simpler and doesn't require the authorization handshake.

## Navigating the Local Network

So before Roam can connect to the devices, it has know what their IP's are. So users can manually enter them, but that's not a great experience. I want to do my best to discover these devices and present them to the user before the users want to control them. To find Roku devices, Roam uses a combination of SSDP and local network scanning.

SSDP works most of the time, but it can fail. It's a UDP multicast protocol after all. So I setup a full network scan on the device to make this discovery happen quicker and more reliably when the user requests a device refresh or when the app is first opened.

To scan the full local network, Roam needs to make a guess at the local network's DHCP range. Roam does this by getting the device's local IP address and netmask and then estimating the DHCP range from that information. The `Network` framework doesn't provide a way to get detailed device information, so I needed to use the `getifaddrs` function from the BSD sockets API to achieve this. Thankfully, BSD sockets are supported on all apple platforms.

```swift
private func listInterfacesDarwin() -> [Addressed4NetworkInterface] {
    var addrList: UnsafeMutablePointer<ifaddrs>?
    var networkInterfaces: [Addressed4NetworkInterface] = []

    if getifaddrs(&addrList) == 0 {
        var ptr = addrList
        while ptr != nil {
            defer { ptr = ptr?.pointee.ifa_next }
            guard let addr = ptr?.pointee else { continue }

            let name = String(cString: addr.ifa_name)
            let flags = addr.ifa_flags
            let family = addr.ifa_addr?.pointee.sa_family ?? 0

            var host = [CChar](repeating: 0, count: Int(NI_MAXHOST))
            if let ifa_addr = addr.ifa_addr {
                getnameinfo(ifa_addr, socklen_t(ifa_addr.pointee.sa_len),
                            &host, socklen_t(host.count),
                            nil, socklen_t(0), NI_NUMERICHOST)
            }

            var netmask = [CChar](repeating: 0, count: Int(NI_MAXHOST))
            if let ifa_netmask = addr.ifa_netmask {
                getnameinfo(ifa_netmask, socklen_t(ifa_netmask.pointee.sa_len),
                            &netmask, socklen_t(netmask.count),
                            nil, socklen_t(0), NI_NUMERICHOST)
            }
            if family == AF_INET || family == AF_INET6 {
                let addressString = String(cString: host)
                let netmaskString = String(cString: netmask)
                if let address = IP4Address(string: addressString), let netmask = IP4Address(string: netmaskString) {
                    networkInterfaces.append(Addressed4NetworkInterface(name: name, family: Int32(family), address: address, netmask: netmask, flags: flags, nwInterface: nil))
                }
            }
        }
        freeifaddrs(addrList)
    }
    return networkInterfaces
}
```

Here I get the list of interfaces, their addresses and netmask's and some information on the interface's setup (are they IPV4). I then use this information to guess the DHCP range.

Once it has this device information, Roam then tries to open a TCP connection to each IP address in the DHCP range on port 8060 (the ECP port). If the connection is successful, Roam tries to queries for the device's information using `/query/device-info` and adds the device to it's DB if this query succeeds.

This scan is quite slow and expensive but I limit it to only run very infrequently or when the user explicitly requests a device refresh. Additionally, I limit the number of scanned IP's to 1024 total and 37 concurrent to prevent the scan from overwhelming the network or taking a huge amount of time. For a typical network (200 or so IP's), these scans usually finish pretty quickly because the TCP connections are set to time out after 1.2 seconds.

When I first added support for SSDP and WOL, these features worked correctly on macOS and even in the iOS simulator, but failed to work on real iOS devices. After some digging, I found that sending multicast packets requires a [specific capability](https://forums.developer.apple.com/forums/thread/663271), and I would need to request this capability from Apple support to get it enabled for my account. The macOS networking stack doesn't have the same restrictions, so it worked fine there even without the capability.

Additionally, on WatchOS complex networking isn't supported at all. This means that only basic HTTP requests are allowed at all outside of certain restrictive contexts. This means that I can't use the ECP API over Websockets on WatchOS and need to fall back to the plain HTTP API. It also means I can't support WOL or SSDP on WatchOS.

## Private Listening

So the last feature of Roam I haven't discussed much is Headphones mode. As I mentioned previously, Roku TV's supports a headphones mode to stream audio from the TV to the remote application. The official Roku app supports this functionality, but I haven't seen another 3rd party app that supports it. I wanted to support this feature because it's a feature I use a lot and I knew it would set my app apart.

My first step was to setup `tcpdump` on my home router to capture traffic between my phone and the Roku TV. I was able to see some RTP traffic on port 6970 and RTCP traffic on port 5150 using packet type 97. There were also some commands sent over ECP that seemed like RTP initiation.

From here I did some googling and found two projects that had implemented the audio streaming protocol for Roku TV's.

-   [RPListening](https://github.com/alin23/roku-audio-receiver) (Java + FFPlay for audio playback)
-   [roku-audio-receiver](https://github.com/runz0rd/RPListening) (Python + GStreamer for audio playback)

I got the Java project to build and run on my computer, and the audio actually played, but I was never able to get the `roku-audio-receiver` to work because python dependencies suck. From looking these projects, I could tell that the protocol sent some stream initiation packets over RTCP (`NCLI` and `VDLY`) and waited for responses. After this handshake, these programs decoded the packets with the `opus` codec and sent them to the audio output. Additionally, these apps periodically send a RTCP recipient report to the TV to keep the stream alive.

Looking at the naming for the `NCLI` and `VDLY` packets, it was pretty clear that the `NCLI` packet initiated a new stream client and the `VDLY` packet set the audio delay.

Taking this information into my application, I pulled in dependencies for the `opus` codec (SwiftOpus) and RTP decoding (SwiftRTP). I went back-and-forth with the TV trying to get the connection to setup and stay alive. At first there was no connection or sound, then I would get static, then a short-lived connection and finally I got the audio to stream reliably. At the end of the day I tried to keep everything as simple as possible with the following setup.

1.  Create an audio engine an input node
    -   Ensure the input node matches the opus clock speed and has 2 channels
    -   The engine has a builtin output node for playback
1.  Send a `NCLI` packet to the TV to initiate the stream
1.  Send a `VDLY` packet to the TV to set the audio delay.
    -   I set the audio delay really high to 1200ms. Roam doesn't need to care much about latency that much because the TV will be playing the audio in sync with the video after factoring in the delay. This long delay helps handle the output latency change when users put in or remove headphones without refreshing the TV's VDLY.
    -   This delay also gives us a large jitter buffer to handle network latency.
1.  Wait for the TV to send a `NCLI` and `VDLY` response
1.  Send a RTCP recipient report every 5 seconds to keep the stream alive
1.  Decode the RTP packets with the opus codec using the float32 format with 2 channels and a clock rate of 48000.
1.  Convert the audio packets to match the output's audio format with an `AudioConvertor` and schedule the packet on the input node
    -   The correct output audio parameters can be gotten from the `engine.mainMixerNode.outputFormat(forBus: 0)`
    -   Output packets are sent at regular 10ms intervals, so the correct time to schedule a packet can be determined directly from the start time, the sample rate, and the packet number

This final setup honestly seems quite simple after typing it out here but it took a lot of trial and error to get everything working. On top of this there was a good bit of research on the best way to handle streamed audio. Honestly even with this setup including a jitter buffer and a large audio delay, I also am getting the benefit of the fact that all the audio is being streamed over the local network with minimal packet loss. I can't imagine what trouble people running WebRTC stacks must be facing to get reliable, low-latency and cross-internet audio streaming.

I have gotten some user reports that Headphones Mode doesn't work with their TV. I have tried debugging what's going on but I can't replicate well enough to fix it. Every time I'm in a house with a new Roku TV I test it to see if it works, and I haven't found any issues yet.

## Debugging

After all the work on private listening, I am seeing highly reliable streaming on all the devices I have tested, but I have still received some user reports saying that the feature doesn't work on their TV. It's possible that this is the fault of the TV, but I still wanted to setup a way to collect remote debug logs from the user's device to help diagnose the issue.

With my first couple user bug reports, I walked them through how to open the MacOS Console app and send me the logs. This was a pretty painful process for both me and the user, so I wanted to setup a way to collect logs from the app itself. I was already using the builtin `OSLog` framework to log messages, and I found that apple provides a `OSLogEntry` object that can be used to collect these logs. Once they are collected, I send them to a publicly-writable S3 bucket along with some metadata about the users device, TV and app state.

Then I provide the user with the unique ID of their debug log upload so they can include it in their bug report to me.

Funnily enough, I haven't gotten any bug reports since I implemented this feature, but I'm sure the time will come.

## Cross Platform Support

After getting the macOS app working, I expanded the app to support iOS, WatchOS, TVOS and VisionOS. Funnily enough, all of these apps except WatchOS could be supported from within one XCode "Target".

SwiftUI makes cross-platform apps work pretty smoothly. All of the core components are supported across all platforms, but there are a few styles that only have partial platform support. For these API's, I use conditional compilation with `#if/#else` to support the different styles on different platforms.

Here are a few challenges I faced when adding support for each platform

-   VisionOS didn't support restricting the minimum size of the window to match the content size, so I had to add an explicit minimum window size on this platform.
-   The keyboard entry for VisionOS and TVOS is different from iOS. Instead of extending into the window, it replaces the entire window the a keyboard entry view. This required special handling to avoid dismissing the keyboard before the user was done typing.
-   WatchOS and TVOS don't support webp images, so I had to transcode the webp images into png before storing them in the model on these devices. I used `libwebp` via [libwebp-Xcode](https://github.com/SDWebImage/libwebp-Xcode) to accomplish this.
-   The simulator for iOS doesn't support binding to a local network port for UDP operations, so private listening fails in the simulator. This is a bug and I'm tracking it [here](https://openradar.appspot.com/radar?id=5580336264118272)
-   MacOS doesn't really put any restrictions to applications using the network. iOS and WatchOS require users to grant permissions to connect to devices on the local network, and require an additional capability to send multicast packets. This doesn't mean any additional code for these platforms but it does mean that there are additional steps to get the app approved for the app store.
-   The WatchOS app doesn't support [low level networking](https://developer.apple.com/documentation/technotes/tn3135-low-level-networking-on-watchos), so I can't support WOL or SSDP on WatchOS. In theory I could still support headphones mode, but I haven't implemented this capability because the AudioSession API on WatchOS has different requirements.
-   My application was built for MacOS to support scale well with changing screen sizes, so adding support for portrait/landscape orientations came for free.
-   There were a lot of challenges getting keyboard support working on iOS and macOS. Both of these ecosystems have slightly different UI API's (AppKit and UIKit), and they require that the component handling keyboard input be the first responder. This is particularly painful on macOS because the first responder status can be changed when the window loses and regains focus.
-   The iOS -> watchOS data transfer mechanism (to send device metadata) is unreliable by design and it's pretty annoying when the user is waiting on the transfer to occur so they can control their device.
-   The TVOS screen interaction requires requires moving the focus from button to button with the remote. Our application isn't laid out into nice rows or columns, so I need to use [focusSection](<https://developer.apple.com/documentation/musickit/artworkimage/focussection()>) in the SwiftUI layout to ensure that the focus moves as expected.

## Hooking into the Apple Ecosystem

After getting the basic device functionality working, I looked into adding some more advanced features that would be useful for users. Initially, I just wanted to add support for a remote widget so the user could play/pause or mute/unmute their TV without opening Roam. But as I looked into how to support widgets, I found out that the same core functionality (app intents) could be used to support iOS spotlight, Shortcuts and Siri integration!

Intents are basically functions that the apple OS can call when the user requests the action get performed. This request can come from a Siri request, a shortcut invocation or a widget button tap. Apple can also choose to highlight these intents in the spotlight search results on iOS.

I made intents for each button press, as well as an intent to launch an app given an app selection.

While shortcuts don't sound like they are a useful feature for my app, they are actually the easiest way to support a global keyboard shortcut. I added a shortcut for `Cmd+f10` to mute/unmute the TV and another for `Cmd+fn+space` to play/pause. This is great for when a commercial comes on and I want to mute the TV without opening the remote.

Lastly, I integrated the [RequestReviewAction](https://developer.apple.com/documentation/storekit/requestreviewaction) from the StoreKit framework to prompt the user to rate the app on the app store. I avoid prompting the user unless they have been using the app for a good bit and have used the core features a few times. I attribute my nearly 150 ratings to this feature.

## Device Publishing

I've read a lot of stories about the kafkaesque process of publishing an app on the App Store, so I was prepared for problems, and apple did not disappoint. First of all I wanted to name my app "Roam: A better Roku remote", but it got rejected in app review due to it violating the Roku trademark. I tried to point out that there are 20 apps on the iOS app store with very similar names (for example "RoByte: Roku Remote TV App"), but received several rejections. Finally a app reviewer suggested I use "For Roku" in the name to make it clear that it's a 3rd party application and the app was approved.

Since the initial publish, updates have been smooth. The reviewer even accepted my VisionOS application with only a screen recording demonstrating that the app worked on the simulator (I don't have $3500 to spend real hardware). My 15 VisionOS users thank you.

## Gimmicks

I got the idea for this section from the excellent article by [Mihhail Lapushkin](https://papereditor.app/dev#Gimmicks) on his work building the Paper Editor. I'll share some of the things I've added to Roam that are more gimmicky

So pretty early on in my development I received my first support email from a user who was having trouble scrolling through the list of their apps when using a bluetooth mouse. I was able to help them by suggesting they use shift + scroll to scroll horizontally, but really this should be supported with standard scroll because there is no vertical scroll to conflict with.

This was surprisingly difficult to implement because it wasn't just a view modifier. I had to re-implement a lot of the `ScrollView`'s niceties like inertia scrolling. Here's what it looked like in the end

```swift
import SwiftUI
import AppKit

struct CaptureVerticalScrollWheelModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(ScrollWheelHandlerView())
    }

    struct ScrollWheelHandlerView: NSViewRepresentable {
        func makeNSView(context: Context) -> NSView {
            let view = ScrollWheelReceivingView()
            return view
        }

        func updateNSView(_ nsView: NSView, context: Context) {}
    }

    class ScrollWheelReceivingView: NSView {
        private var scrollVelocity: CGFloat = 0
        private var decelerationTimer: Timer?

        override var acceptsFirstResponder: Bool { true }

        override func viewDidMoveToWindow() {
            super.viewDidMoveToWindow()
            window?.makeFirstResponder(self)
        }

        override func scrollWheel(with event: NSEvent) {
            var scrollDist = event.scrollingDeltaX
            if abs(scrollDist) < 0.000001 {
                scrollDist = event.scrollingDeltaY
            }
            if !event.hasPreciseScrollingDeltas {
                scrollDist *= 4
            }

            // Handle legacy mice as event.phase == .none && event.momentumPhase == .none
            if event.phase == .began || event.phase == .changed || (event.phase.rawValue == 0 && event.momentumPhase.rawValue == 0)  {
                handleScroll(with: scrollDist)
                scrollVelocity = scrollDist * 1.4
            } else if event.phase == .ended {
                decelerationTimer = Timer.scheduledTimer(withTimeInterval: 0.009, repeats: true) { [weak self] timer in
                    guard let self = self else { timer.invalidate(); return }
                    self.decelerateScroll()
                }
            } else if event.momentumPhase == .ended {
                decelerationTimer?.invalidate()
                decelerationTimer = nil
            }
        }

        private func handleScroll(with delta: CGFloat) {
            let scrollDist = delta

            guard let scrollView = self.enclosingScrollView else { return }
            let contentView = scrollView.contentView
            let contentSize = contentView.documentRect.size
            let scrollViewSize = scrollView.bounds.size

            let currentPoint = contentView.bounds.origin
            var newX = currentPoint.x - scrollDist

            // Clamp to viewable region
            let maxX = contentSize.width - scrollViewSize.width
            newX = max(newX, 0)
            newX = min(newX, maxX)

            scrollView.contentView.scroll(to: NSPoint(x: newX, y: currentPoint.y))
            scrollView.reflectScrolledClipView(scrollView.contentView)
        }

        private func decelerateScroll() {
            if abs(scrollVelocity) < 0.1 {
                decelerationTimer?.invalidate()
                decelerationTimer = nil
                return
            }

            handleScroll(with: scrollVelocity)
            scrollVelocity *= 0.9
        }
    }
}

extension View {
    func captureVerticalScrollWheel() -> some View {
        self.modifier(CaptureVerticalScrollWheelModifier())
    }
}
```

There's a lot of code here to handle edge cases when the user tries to force horizontal scrolling or if they are using a trackpad.

This was a lot of extra code non-essential feature, but I got an explicit request from a loyal user so I couldn't say no.

I also added a feature to "gift" the Roam app to a friend. This feature shares a link to the app store listing for Roam.

![Gifting Roam](./assets/gift-roam.png)

Credit where credit is due: I also copied this feature from the Paper Editor.

## Ongoing work

So at this point I feel really good about where the app is and I think it's going to be pretty stable from here on out.

I'm going to keep working sporadically on the Headphones mode support - testing streaming on more TV's, trying to reverse engineer the mobile-sas audio streaming protocol.

I'm a bit worried that Roku will close the ECP API or make it inoperable for 3rd party developers. Even today the ECP documentation says

> In addition, ECP commands may not be sent from 3rd-party platforms (for example, mobile applications).

Well that sounds a lot like my app, but I'm going to keep supporting my application as long as I can. Even if that means capturing the ECP traffic from the official Roku app and reverse engineering it to keep Roam working.

Even if they don't shut down the whole ECP API they could shut down the RTP/RTCP audio streaming support, and I haven't been able to reverse engineer the mobile-sas audio streaming protocol yet so I'll keep working on that as well.

Besides this stability work, I'm done as far as I know. I don't have any features that I want to add and I don't have any known reproducible bugs. I'm pretty happy with that. One fun little feature I kind of want to work on is to add a user support chat to the app. I think I can get this to work with `App -> Cloudflare API -> Discord`, but I haven't looked too much into it yet.

Anyway, if this app sounds interesting, please check it out on [github](https://github.com/msdrigg/roam). The code is open source, and I'm always happy to accept big fixes or feature requests or just chat about the app.
