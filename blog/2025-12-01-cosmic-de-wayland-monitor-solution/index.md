---
slug: cosmic-de-wayland-monitor-positiond
title: Using
authors: msdrigg
tags:
    - linux
draft: true
---

This blog post is the story of me creating [cosmic-monitor-positiond](https://github.com/msdrigg/cosmic-monitor-positiond) and the things I learned along the way.

## Background: The Goal

I recently updated my linux desktop from Pop!_OS 22.04 (which was released over 3 years ago) to the latest (beta) Pop!_OS 24.04. Overall, I have loved the new homegrown cosmic desktop environment better than gnome and I
am excited that the system 76 team is working on something so ambitious.

But, I have noticed one particularly annoying problem that also plagued me in the last Pop!_OS version: my persistent monitor configuration is not actually very persistent. I have 2 monitors side by side and about half of time the system wakes up from idle, the monitors wake up positioned backwards (the left monitor is configured to be on the right). It's an easy fix: just open settings and re-arange them back; but it happens multiple times a day and really gets on my nerves.

## Attempt 1

So `cosmic-de` (codename: `cosmic-epoch`) is fully open source on Github, so I was hopeful that I would be able to find some people with the same problem as me online. Lucky me, someone else had the same problem [#2102](https://github.com/pop-os/cosmic-epoch/issues/2102). But unlucky me, it's from 3 months ago with no comments or interactions.

Ok, so my next solution was to setup a simple systemd unit to run after wakeup and have it position with the builtin `cosmic randr`. I looked through the systemctl discussions for people trying to run scripts after wakeup and found a useful item `sleep.target`. This target triggers when the system sleeps and un-triggers when the system wakes back up, so I could run my script after wakeup with this setup (pulled from [thinkfan-wakeup.service](https://sources.debian.org/src/thinkfan/2.0.0-1/rcscripts/systemd/thinkfan-wakeup.service))

```ini
# cosmic-monitor-hack.service
[Unit]
Description=Re-position monitors after wakeup
After=suspend.target
After=suspend-then-hibernate.target
After=hybrid-sleep.target
After=hibernate.target

[Service]
Type=oneshot
ExecStart=/home/scottdriggers/.local/bin/cosmic-monitor-hack.sh

[Install]
WantedBy=sleep.target
```

```sh
# cosmic-monitor-hack.sh
for i in {1..10}; do
    outputs=$(cosmic-randr list --kdl)

    # Check if both monitors are connected and enabled
    if echo "$outputs" | grep -q 'output "HDMI-A-1" enabled=#true' && \
       echo "$outputs" | grep -q 'output "DP-1" enabled=#true'; then
        echo "Both monitors detected. Applying configuration..."

        cosmic-randr position HDMI-A-1 0 0
        cosmic-randr position DP-1 2560 0

        echo "Monitor configuration applied successfully."
        exit 0
    fi

    echo "Waiting for both monitors to be detected (attempt $i/10)..."
    sleep 1
done

echo "Timeout: Not all monitors detected after 10 seconds."
exit 1
```

So I set this up and ran it, but it never triggered even after my computer went to sleep and woke back up. Weird.

Lets look at the `sleep.target` logs

```
scottdriggers@pop-os:~$ journalctl -u sleep.target -n10
Sep 30 23:21:44 pop-os systemd[1]: Reached target sleep.target - Sleep.
Sep 30 23:21:58 pop-os systemd[1]: Stopped target sleep.target - Sleep.
-- Boot 661d8e2b4e52449aad1490403c320a9b --
Oct 01 19:51:59 pop-os systemd[1]: Reached target sleep.target - Sleep.
Oct 01 19:52:14 pop-os systemd[1]: Stopped target sleep.target - Sleep.
-- Boot ad239475ca8a439583e546039bcb507d --
Oct 02 19:49:56 pop-os systemd[1]: Reached target sleep.target - Sleep.
Oct 03 08:02:14 pop-os systemd[1]: Stopped target sleep.target - Sleep.
-- Boot 3311d18726374de9832c4906b3a8fc21 --
Oct 03 19:59:14 pop-os systemd[1]: Reached target sleep.target - Sleep.
Oct 04 11:44:33 pop-os systemd[1]: Stopped target sleep.target - Sleep.
Oct 04 11:45:03 pop-os systemd[1]: Reached target sleep.target - Sleep.
Oct 04 11:45:20 pop-os systemd[1]: Stopped target sleep.target - Sleep.
```

So sleep hasn't triggered since October 4 (over a month ago). Very weird.

What happened on October 4 to stop the computer from sleeping? Thinking back, I remember around that time I turned the system setting for `Automatic Suspend` to `Never` because suspend was causing unrelated problems. Ok that makes sense. So when my computer idles after 15 minutes, it doesn't actually go to sleep. It's in some other idle state with screens off, but not "Asleep" in the systemd sense.

## How does Cosmic-DE manage idle/wakeup then?

Okay so it seems like systemd doesn't operate at the level we need to monitor for sleep-wake events. We need to hook into whatever system cosmic-de uses to trigger idle/wakeup. Again, we are thankful to our system76 overlords for making cosmic de open source. I found [cosmic-idle](https://github.com/pop-os/cosmic-idle/blob/master/src/main.rs), which is the service that manages screensaver during idle. This has exactly the kind of idle/wakeup monitoring I'm looking for, and it's all in `main.rs`!

So there are a few things I don't need to care about here, but it appers that the main loop is managed by [calloop](https://docs.rs/calloop/latest/calloop/) which is a callback-based event loop.

This event-loop paradigm is more common in UI programming where the main thread manages the graphics and rendering and all tasks that interact with graphics need to be spawned on the main loop. My rust programming so far has mostly been restricted to backend work where `tokio` and async/await are the assumed way to handle concurrent tasks. I read up on calloop and it seemd pretty simple to copy the `cosmic-idle` setup to listen for the same notifications and then trigger `cosmic-randr` to re-position as needed.

Okay so looking a bit closer, I see that the idle notification events are coming from Wayland (comments and code ordering are my own)

```rust
fn main() {
    //... more code up here
    // Calloop event loop
    let mut event_loop: EventLoop<State> = EventLoop::try_new().unwrap();

    // Wayland connection
    let connection = Connection::connect_to_env().unwrap();
    let (globals, event_queue) = registry_queue_init::<State>(&connection).unwrap();
    let qh = event_queue.handle();
    WaylandSource::new(connection, event_queue)
        .insert(event_loop.handle())
        .unwrap();

    //... more code down here
}

// Event handler
impl Dispatch<ext_idle_notification_v1::ExtIdleNotificationV1, ()> for State {
    fn event(
        state: &mut Self,
        notification: &ext_idle_notification_v1::ExtIdleNotificationV1,
        event: ext_idle_notification_v1::Event,
        _: &(),
        _: &Connection,
        _qh: &QueueHandle<Self>,
    ) {
        let is_idle = match event {
            ext_idle_notification_v1::Event::Idled => true,
            ext_idle_notification_v1::Event::Resumed => false,
            _ => unreachable!(),
        };
        if state
            .screen_off_idle_notification
            .as_ref()
            .map(|x| &x.notification)
            == Some(notification)
        {
            state.update_screen_off_idle(is_idle);
        } else if state
            .suspend_idle_notification
            .as_ref()
            .map(|x| &x.notification)
            == Some(notification)
        {
            state.update_suspend_idle(is_idle);
        }
    }
}
```

This matches my priors here because Wayland manages the graphical environment, so if the computer is idling without fully sleeping, it makes sense that it's a Wayland thing.

I don't actually need to care about these details to replicate this implementation, but this `WaylandSource` is a wrapper around the `wayland_client` crate which uses the wayland unix socket to communicate with the wayland display server, and sends events to the `calloop` event loop.

Okay so this is enough to get me really close in my initial implementation. I copy the setup from here into my own repo

```rust
fn main() {
    // Setup Wayland connection for idle monitoring
    let connection = Connection::connect_to_env()?;
    let (globals, event_queue) = registry_queue_init::<IdleMonitorState>(&connection)?;
    let qh = event_queue.handle();

    // Bind to idle/wakup Wayland events
    let idle_notifier = globals
        .bind::<ext_idle_notifier_v1::ExtIdleNotifierV1, _, _>(&qh, 1..=1, ())
        .expect("ext-idle-notifier-v1 not available");

    let seat = globals
        .bind::<wl_seat::WlSeat, _, _>(&qh, 1..=1, ())
        .expect("wl_seat not available");

    // Create event loop
    let mut event_loop: EventLoop<IdleMonitorState> = EventLoop::try_new()?;

    let mut state = IdleMonitorState {
        idle_notifier,
        seat,
        idle_notification: None,
        reposition_handler: reposition_tx,
        loop_signal: event_loop.get_signal().clone(),
    };

    // Create initial idle notification
    state.recreate_notification(&qh);

    // Setup Wayland event source
    WaylandSource::new(connection, event_queue).insert(event_loop.handle())?;

    log::info!("Entering monitor mode, waiting for resume events...");
}

impl IdleMonitorState {
    fn handle_idle(&mut self) {
        log::trace!("System idle detected, doing nothing...");
    }

    fn handle_resume(&mut self) {
        log::info!("System resumed from idle, triggering monitor reposition");
        self.trigger_reposition();
    }
}

impl Dispatch<wl_registry::WlRegistry, GlobalListContents> for IdleMonitorState {
    fn event(
        _state: &mut Self,
        _: &wl_registry::WlRegistry,
        _event: wl_registry::Event,
        _: &GlobalListContents,
        _: &Connection,
        _: &QueueHandle<Self>,
    ) {
    }
}

impl Dispatch<ext_idle_notification_v1::ExtIdleNotificationV1, ()> for IdleMonitorState {
    fn event(
        state: &mut Self,
        _notification: &ext_idle_notification_v1::ExtIdleNotificationV1,
        event: ext_idle_notification_v1::Event,
        _: &(),
        _: &Connection,
        _qh: &QueueHandle<Self>,
    ) {
        match event {
            ext_idle_notification_v1::Event::Idled => {
                state.handle_idle();
            }
            ext_idle_notification_v1::Event::Resumed => {
                state.handle_resume();
            }
            _ => {}
        }
    }
}
```

And I created a systemd unit file that starts this daemon on every login. This way my monitor will keep itself alive for the duration of my desktop session.

```ini
[Unit]
Description=COSMIC Monitor Positioning Daemon
Documentation=https://github.com/pop-os/cosmic-comp
After=graphical-session.target
PartOf=graphical-session.target

[Service]
Type=simple
ExecStart=%h/.local/bin/cosmic-monitor-positiond monitor
Restart=always
RestartSec=5
Environment=RUST_LOG=info

[Install]
WantedBy=graphical-session.target
```

Now finally this worked great! Basically on first try after some simple debugging, the program hooked hooked into the wayland protocols and woke itself up on resume.

## Making it More Complicated

So what does every working solution need? More complexity! And I know several ways we can add that:

1. Better async handling (retry-handling with variable backoff)
2. Detect monitor plug-in events (just in case the user turns on their monitor after the system has already woken up?)
3. Stored Configuration (so all the tens of other people with this problem can have this work on their own systems)
4. Switching from calling `cosmic-randr` as a shell command to binding on it's internal API (no user-discernable benfits)

**UDev Monitor Hotplug Detection**

So lets get started with the most interesting of these problems: detecting monitor plug-in events. I am not familiar with how I would detect a monitor plug-in event, so lets return to our trusty source: [cosmic-de github](https://github.com/pop-os/cosmic-epoch). I know they must be detecting monitor plugin on their settings page for editing displays, so lets look there: [github.com/pop-os/cosmic-settings/blob/master/cosmic-settings/src/pages/display/mod.rs](https://github.com/pop-os/cosmic-settings/blob/9709a2a9265150fec429c04282840641d2aef324/cosmic-settings/src/pages/display/mod.rs#L307). I can see here that they use `udev` and monitor for the `drm` subsystem.

So we can hook this `udev` subsystem into our existing `calloop` event loop as a generic emitter like this

```rust
fn setup_udev_monitor(
    loop_handle: &LoopHandle<'static, IdleMonitorState>,
) -> Result<(), Box<dyn std::error::Error>> {
    let builder = udev::MonitorBuilder::new()?;
    let builder = builder.match_subsystem("drm")?;
    let socket = builder.listen()?;

    let generic =
        calloop::generic::Generic::new(socket, calloop::Interest::READ, calloop::Mode::Level);

    loop_handle.insert_source(generic, |_readiness, socket, state| {
        // Drain all events from the socket
        if socket.iter().next().is_some() {
            // Reposition on hotplug event
            state.trigger_reposition();
        }

        Ok(calloop::PostAction::Continue)
    })?;

    Ok(())
}
```

And we can even gate this behind an `autodetect` feature so users can build our project without having to install `libudev-dev`.

**Configuration Management**

So the next step is to setup configuration

- started with kdl from cosmic_randr, moved to toml with edit_toml because it's more rusty, readable and respects comments
- also started supporting more than just position commands (primary = true, refresh rate, size, transform, scale, adaptive_sync)
- users can manually edit or save with `cosmic-monitor-positiond save` which pulls current config and saves it to the save file

**Better Async Management**

- Adding in tokio because I wasn't confident I could make async futures work with `calloop` and their timers were confusing.
- Now architecture is [calloop system event monitoring] ---mpsc channel---> [tokio config management / applying configuration with backoff]
- Variable backoff if can't find the expected monitors
- Reload config each apply
- Bridging multiple async runtimes with tokio mpsc
- Not unheard of, cosmic-settings uses both tokio and calloop

**Calling cosmic-randr manually**

- [cosmic-randr](https://github.com/pop-os/cosmic-randr) contains a cli, a shell and a library and wants us to use the `shell`. All the `shell` does is call the cli and parse the results, and all the `cli` does is call the library. Why can't we just call the library? (answer, we can)
- Cosmic-randr cli is just a simple rust crate using clap to manage cli flags and binding to the cosmic-randr rust library
- We can bind to that library ourselves and call it the same way `cosmic-randr/cli` does
- Accepting non-semver crate bad compatibilty state...haha




### AFTER_FIX_TEST_FORREAL

-   So sleep is aparently never triggered on my system because I guess I do not have suspend enabled (I have a desktop), I just have screen shutdown enabled
-   So I need to figure out how cosmic handles screen off notifications
-   Found cosmic-idle which does idle detection wakeup and found their wayland-protocls that they use to manage it
-   Built out my own version of cosmic idle that detects wakeup and idle and does the same thing in rust
-   Built simple user installer and set it up
-   Tested and https://github.com/msdrigg/cosmic-monitor-hack working

-   Added save + apply + monitor configuration and ready to go
