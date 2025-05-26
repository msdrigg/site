---
slug: 0xdead10cc-crash-caused-by-swiftdata-modelcontainer
title: Dealing with 0xdead10cc's in SwiftData
authors: msdrigg
tags:
    - projects
    - ios
draft: true
---

I'm writing today about another tricky crash I investigated in my [Roku remote app](https://apps.apple.com/us/app/roam-a-better-remote-for-roku/id6469834197). Unlike the [previous post](/blog/2025-05-25-silent-sigpipe-crash-caused-by-bsd-socket%20copy.md) in my troubleshooting journey, the iOS crash reporter actually caught this crash. What made this crash trickier was the fact that the XCode crash viewer obfucse

```
Over the past few months I have been working on diagnosing and fixing as many of the crashes I can in my Roku remote app ([Roam](https://apps.apple.com/us/app/roam-a-better-remote-for-roku/id6469834197)).

The app has been mostly stable for about a year now, so the majority of core logic crashes have already been fixed, leaving only unpredictable and obfuscated bugs.

I wanted to write here about some particularly interesting issues I've addressed that might be interesting to others troubleshooting iOS or macOS crashes.

I'm going to write this up in a series of blog posts over the next couple weeks. Checkout [/blog](/blog) for updates.
```

<!-- truncate -->

## Crash Two: 0xdead10cc

```
Relevant posts

SwiftData 0xdead10cc with cloudKit… | Apple Developer Forums
0xdead10cc prevention | Apple Developer Forums
Notes - ensure that all swift data resources (the model container, and also other SwiftData objects such as model context(s) and models associated with the container) will cause the lock to be dropped

Figure out how to know that the kill is coming...

applicationDidEnterBackground(_:) | Apple Developer Documentation
sceneDidEnterBackground(_:) | Apple Developer Documentation
applicationWillResignActive(_:) | Apple Developer Documentation
sceneWillResignActive(_:) | Apple Developer Documentation
Investigate the following functions to get more bg time

For app: beginBackgroundTask(withName:expirationHandler:) | Apple Developer Documentation
For app extension: beginActivity(options:reason:) | Apple Developer Documentation

Basically what I need to do is to make sure that we track if the app is entering from the bg and fail, all calls to create data handler if we are. The only case this does not cover is possibly saving messages from background notification alert. To handle this we might need to special case something and use begin background task. Or we can just not save the message until the user opens in fg.

Other than that, maybe we can call begin bg task always?? When using swiftdata? Idk if this is reasonable tho
```

Fix (Background assertion): https://github.com/msdrigg/Roam/blob/cc671154e61d36747502db2b83029d5975170f74/Shared/Utils/QBackgroundExecution.swift
Fix (Add Background assertion to key code paths): https://github.com/msdrigg/Roam/commit/b7013adab0ea5c9cd2c77c754f4a060e3c6d4080

## Crash Three: Model Container Creation

-   SwiftData's `ModelContainer` can crash upon startup for a variety of reasons, mostly due to it's handling of migrations.
-   None of these crashes provide any kind of error messaging associated with them, and all are only distinguishable looking at the log messages previously, so my `loggedFatalError` handler has been extremely helpful here. I would get better error messaging if I used something like crashlytics or another non-apple crash reporter, but I like staying very native.
-   The only error returned in any crash scenario is this: `SwiftDataError(_error: SwiftData.SwiftDataError._Error.loadIssueModelContainer, _explanation: nil)`

1. Crash due to no free space (so the migration to the latest model state fails). This is more common than you would think, and it is non-recoverable, but we shouldn't clear the users data here. Instead we should show them a warning message about why we couldn't continue
    - No logs captured due to space issue, but I can detect this by checking for available space on the device
2. Crash due to no migration path found. This is always a developer bug and it's caused by the developer corrupting a previous schema after deploying. This is not recoverable, and the only viable path forward is to kill the user's sqlite SwiftData database and re-create it. This will lead to full data loss, but there is no other way forward for the user. In our case, the TV is typically easily re-discovered with minimal interruption to the user.
    - Logs error: `<NSPersistentStoreCoordinator: 0x60000309a500>: Attempting recovery from error encountered during addPersistentStore: 0x600001091740 Error Domain=NSCocoaErrorDomain Code=134504 \"Cannot use staged migration with an unknown model version.\" UserInfo={NSLocalizedDescription=Cannot use staged migration with an unknown model version.}`
    - I also might be able to load the schema from the disk and compare it against all pre-existing schema versions to see if this error is occurring.
3. Crash due to multiple migrators attempting to open and migrate the database. This can occur when the Widgets app extension process and the main app process both open up and attempt to perform a migration at the same time. This is recoverable and preventable with an exclusive `.swift-data-migration.lock` lockfile.
    - Logs error: `Unresolved error loading container Error Domain=NSCocoaErrorDomain Code=134110 UserInfo={NSUnderlyingError=0x302232ca0 {Error Domain=NSCocoaErrorDomain Code=134100 UserInfo={metadata=<private>, reason=The model used to open the store is incompatible with the one used to create the store}}, reason=Failed to open the store}`
    - Preventable so it doesn't need to be detected

## Extra Tidbit: Fun Crash Helper

```swift
public func loggedFatalError(_ message: @autoclosure () -> String = String(), file: StaticString = #file, line: UInt = #line) -> Never {
    let message = message()

    let group = DispatchGroup()
    group.enter()

    var didComplete = false

    Task {
        await sendBackendError(message, file: file, line: line)

        didComplete = true
        group.leave()
    }

    _ = group.wait(timeout: .now() + 15.0)

    if didComplete {
        Log.lifecycle.warning("Error logged to backend before fatal error: \(message, privacy: .public)")
    } else {
        Log.lifecycle.warning("Backend logging timed out after 5 seconds")
    }

    fatalError(message, file: file, line: line)
}

public func sendBackendError(_ message: String, file: StaticString = #file, line: UInt = #line) async {
    let sendingMessage = ":ninja:\nFatal error logged: \(message)\n\nFile: \(file)\nLine: \(line)\n\nThis is likely a bug in the app."

    do {
        _ = try await sendMessageDirect(message: sendingMessage, attachment: nil).get()

        do {
            Log.backend.notice("Getting diagnostics to export")
            let entries = try getLogEntries()
            let encoder = JSONEncoder()
            encoder.dateEncodingStrategy = .iso8601
            encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
            let codedEntries: Data = try encoder.encode(entries)
            let hash = fastHashData(data: codedEntries)
            let upload = AttachmentUpload(filename: "log-entries.json", dataHash: hash, dataSize: Int64(codedEntries.count), contentType: "application/json", id: UUID().uuidString)
            _ = try await sendMessageDirect(message: ":ninja:", attachment: upload, attachmentData: codedEntries).get()
            Log.backend.notice("Sent attachment to share diagnostics \(String(describing: upload), privacy: .public)")
        } catch {
            Log.backend.warning("Error sending diagnostics on command-share: \(error, privacy: .public)")
            _ = try await sendMessageDirect(message: ":ninja:\nError sending diagnostics on command-share\n\(error)", attachment: nil).get()
        }
    } catch {
        Log.lifecycle.warning("Error sending fatal log to backend: \(error, privacy: .public)")
    }
}
```
