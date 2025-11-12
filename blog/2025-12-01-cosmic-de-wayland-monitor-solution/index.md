---
slug: cosmic-de-wayland-monitor-positiond
title: Using
authors: msdrigg
tags:
    - linux
---

This blog post is the story of me creating [cosmic-monitor-positiond](https://github.com/msdrigg/cosmic-monitor-positiond) and the things I learned along the way.

## Background: What is this all about?

I recently updated my linux desktop from Pop!_OS 22.04 (which was released over 3 years ago) to the latest (beta) Pop!_OS 24.04. This release comes with an entirely new custom wayland-based desktop environment called `cosmic-epoch`. Overall, I have loved the cosmic desktop environment better than gnome and I
am excited that the system 76 team is working on something so ambitious.

But, I have noticed one particularly annoying problem: my persistent monitor configuration is not actually very persistent. I have 2 monitors side by side and about half of time when the system wakes up from idle, the monitors are positioned backwards (the left monitor is configured to be on the right). While it is an easy fix: just open settings and re-arange the screens; it happens multiple times a day and really gets on my nerves.

## Attempt 1: `systemd` to the rescue

So `cosmic-epoch` is fully open source on Github, so I was hopeful that I would be able to find some people with the same problem as me and maybe a work-around. Lucky me, someone else had the same problem [#2102](https://github.com/pop-os/cosmic-epoch/issues/2102). But unlucky me, it's from 3 months ago with no comments or interactions.

<!-- truncate -->

Ok, so my next solution was to setup a simple systemd unit to run after wakeup and have it position with the builtin utility `cosmic-randr`. I looked through the systemctl discussions for people trying to run scripts after wakeup and found a useful item `sleep.target`. This target triggers when the system sleeps and un-triggers when the system wakes back up, so I could run my script after wakeup with this setup (pulled from [thinkfan-wakeup.service](https://sources.debian.org/src/thinkfan/2.0.0-1/rcscripts/systemd/thinkfan-wakeup.service))

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
ExecStart=%h/.local/bin/cosmic-monitor-hack.sh

[Install]
WantedBy=sleep.target
```

And `cosmic-monitor-hack.sh` is a simple script that lists outputs and runs `cosmic-randr position` when the monitors are both online.

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

So I set this up and ran it, but it never triggered even after my computer went to sleep and woke back up several times. Weird.

Lets look at the `sleep.target` logs

```
user@pop-os:~$ journalctl -u sleep.target -n10
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

What happened on October 4 to stop the computer from sleeping? Thinking back, I remember around that time I changed the system setting for `Automatic Suspend` to `Never` because suspend was causing unrelated problems. Ok that makes sense. So when my computer idles after 15 minutes, it doesn't actually go to sleep. It's in some other idle state with screen off, but not "Asleep" in the systemd sense.

## So what is happening when my computer goes to sleep?

Okay so it seems like systemd doesn't operate at the level we need to monitor for sleep-wake events. We need to hook into whatever system cosmic-de uses to turn the monitors off after 15 minutes. Again, we are thankful to our system76 overlords for making `cosmic-epoch` open source. I found [cosmic-idle](https://github.com/pop-os/cosmic-idle/blob/master/src/main.rs), which is the service that manages the screensaver and suspend state during idle. This has exactly the kind of idle/wakeup monitoring I'm looking for, and it's all in `main.rs`!

So this is a rust crate, which I am familiar with, but the main loop is managed by [calloop](https://docs.rs/calloop/latest/calloop/) which I am not familiar with.

After some review, I see that `calloop` is a callback-based event loop. This single-threaded event-loop paradigm is more common in UI programming where the main thread manages the rendering. So all tasks that interact with graphics need to be spawned on the main loop. My rust programming so far has been restricted to backend work where `tokio` and async/await are the assumed way to handle concurrent tasks. I read up on calloop and it seemd pretty simple to copy the `cosmic-idle` setup to listen for the same notifications and then trigger `cosmic-randr` to re-position as needed.

Okay so looking a bit closer, I see that the idle notification events are coming from Wayland.

```rust
// cosmic-idle src/main.rs
//
// Comments have been added and code has been re-ordered for clarity
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

This checks out because Wayland manages the graphical environment. So if the computer is idling and turning the screens off without fully suspending, it makes sense that it's a Wayland thing.

I don't actually need to care about these details to replicate this implementation, but I did look a little deeper and found out that this `WaylandSource` is a wrapper around the `wayland_client` crate which uses unix domain sockets to communicate with the wayland server. It then sends these events to the `calloop` event loop. The only event we want to listen to is [idle-notify](https://wayland.app/protocols/ext-idle-notify-v1), which triggers on resume (which we want) and idle (which we don't care about).

Okay so this is enough to get me really close in my initial implementation. I can copy the setup from here into my own repo to get started.

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

And I created a systemd unit file that starts this program on every login so my screen position is always being monitored.

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

Now finally this worked great! After some simple debugging, the program hooked hooked into wayland events, woke itself up on resume and reconfigured the monitors as expected!

## Making it More Complicated

So what does every simple working solution need? More complexity! And I know several ways we can add that:

1. Detect monitor plug-in events *(just in case the user turns on their monitor after the system has already woken up)*
2. Stored Configuration *(so the at-least-one other person with this problem can have this work for their setup)*
3. Switching from calling `cosmic-randr` as a shell command to binding on it's internal API *(no user-discernable benfits)*

**UDev Monitor Hotplug Detection**

So lets get started with the most interesting of these problems: detecting monitor plug-in events. I was not familiar with how I could detect a monitor plug-in event, so I returned to the trusty source code for [cosmic-epoch github](https://github.com/pop-os/cosmic-epoch). I knew they must be detecting monitor plugin on their settings page for editing displays, so I looked there: [github.com/pop-os/cosmic-settings/blob/master/cosmic-settings/src/pages/display/mod.rs](https://github.com/pop-os/cosmic-settings/blob/9709a2a9265150fec429c04282840641d2aef324/cosmic-settings/src/pages/display/mod.rs#L307). And booyah, we can see here that they use `udev` to detect screen hotplug events by monitoring for events in the `drm` subsystem.

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

Now depending on the `udev` crate requires users have `libudev-dev` installed on their system to build it. So I gated this behind an `autodetect` feature so users who can't (or don't want to) install `libudev-dev` can still build the project.

**Configuration Management**

The next step was to setup configuration. I initially started with `kdl` serialization format because `cosmic-randr` used this export format by default, but after a brief consideration, I decided to go with toml.

Toml is very human readable and it's pretty common in the rust ecosystem (it's what cargo uses for dependency management). It also supports comments so I can make the file self-documenting by adding a descriptive comment on installation.

When I setup configuration, I also decided to support more configuration options than just monitor position. I noticed that `cosmic-randr` also supports choosing a primary monitor, applying scaling/transformations, and setting refresh rate and adaptive sync. I ensured that my serialized monitor format captured all these variables taht they would be applied to the configuration if they are present in the save file. This means that someone with a cusom refresh rate will also be able to save this setting and ensure it is applied on wakeup.

Now for ease-of-use, I wrote a `save` subcommand so users can call `cosmic-monitor-positiond save` to capture their current configuration in the savefile. This simplifies the user workflow greatly into only 2 user workflows.

1. Most users can just call `./install.sh` and the system will 1) build, 2) install, 3) capture and save their current configuration, and 4) run in the background continually re-applying it whenever their system wakes up from idle or when a monitor is plugged in.
2. Some users who decide to update their configuration later (maybe they get a new monitor) will just need to manually setup the configuration they desire in system settings and then call `cosmic-monitor-positiond save` to save it.

Now notice that my program is reading *and* editing the `state.toml` save file. When this edit happens, I want to keep comments/whitespace/formatting looking nice so it is still very human readble. To do this, I found the `toml_edit` crate. This crate is used by the `cargo add` command to edit `Cargo.toml` so it can add dependencies without breaking any formatting or comments in the existing file. I like this behavior, so I integrated this crate into my project. It's api is a bit weirder than the more standard `toml` crate, but it's not a big enough deal to make it a problem.

**Calling cosmic-randr manually**

So for a final piece of unnecessary over-engineering, I decided I didn't want to shell-out to `cosmic-randr` cli anymore. Since I was reading over [the source](https://github.com/pop-os/cosmic-randr) for `cosmic-randr`, I saw that it contained 3 modules: a core library, a cli that calls the library (this is what gets installed in the system), and a shell crate that calls the cli.

In the repository readme, the shell crate is recommended for use by rust developers, so I initially thought "Excellent, just what I need!" But after reading it's source, it was immediately clear that this crate could only be used to list the current monitor configuration and not to make any changes at all. So I could pull in this dependency and skip manual `cosmic-randr` output parsing, but I would still have to call `cosmic-randr position` manually...

Well this didn't sound like a great plan. Why do all that when I could bind to the core `cosmic-randr` library like the actual cli does? Now we're talking! So I took a look how the cli manages configuration, and it is pretty simple to create a `cosmic-randr` connection (which is another wrapper around `wayland-client`), send configuration messages to this connection, and receive responses back.

This implementation was pretty simple and it looks like this:

```rust
async fn apply_monitor_config(
    context: &mut Context,
    event_queue: &mut EventQueue<Context>,
    message_rx: &mut Receiver<Message>,
    monitor: &MonitorConfig,
) -> Result<(), Box<dyn std::error::Error>> {
    let mut config = context.create_output_config();
    let head_config = HeadConfiguration {
        pos: monitor.pos,
        size: monitor.size,
        refresh: monitor.refresh_mhz.map(|r| r as f32 / 1000.0),
        adaptive_sync: monitor.adaptive_sync.clone(),
        scale: monitor.scale,
        transform: monitor.transform.map(convert_shell_transform_to_wl),
    };
    log::trace!(
        "Applying configuration for {}: {:?}",
        monitor.name,
        head_config
    );
    config.enable_head(&monitor.name, Some(head_config))?;

    config.apply();

    receive_config_messages(context, event_queue, message_rx).await?;

    // Handle primary flag separately after applying the config
    if monitor.primary == Some(true) {
        context.set_xwayland_primary(Some(&monitor.name))?;
    }

    Ok(())
}

async fn receive_config_messages(
    context: &mut Context,
    event_queue: &mut EventQueue<Context>,
    message_rx: &mut Receiver<Message>,
) -> Result<(), Box<dyn std::error::Error>> {
    loop {
        while let Ok(message) = message_rx.try_recv() {
            match message {
                Message::ConfigurationCancelled => return Err("configuration cancelled".into()),
                Message::ConfigurationFailed => return Err("configuration failed".into()),
                Message::ConfigurationSucceeded => return Ok(()),
                _ => {}
            }
        }

        context.dispatch(event_queue).await?;
    }
}
```

Now some of the no-fun among you might say "well why would you switch from a publicly released cli tool to an internal library with no stability gaurantees?" and to those people I would respond: "because I wanted to".

**Better Async Management**

Some more astute readers might notice that these configuration functions are async functions, and I already have a non-async/await event loop setup. How am I calling and managing these async functions without async executor? Well, I had to bring in tokio for this.

:::info

Technically calloop can run async tasks as an `executor`, but I wasn't confident that it was going to play nicely with `tokio::time::sleep` and `tokio::select`, so I decided against using it for this.

:::

So the architecture is now:

1. `calloop` receives wayland and udev events
2. `tokio` saves and loads configuration from disk and applies it to wayland

This might seem like a lot for such a small project and it is, but it is still very manageable. The main gist of the architecture is that the `calloop` event loop runs on the main thread and I create a secondary single-threaded `tokio::runtime` on a different thread. Then I send `monitor-reconfigure` commands from calloop to tokio on an `mpsc`.

The communication is actually really-straightforward and super simple due to rust's concurrency saftey! I can setup this with one single `mpsc` channel. The `tokio` loop waits for events on this channel asynchronously and the `calloop` loop can synchronously send events to the channel from an entirely different thread!

In fact, here's my entire main tokio async task.

```rust
async fn apply_monitor_config_async(
    mut reposition_rx: tokio::sync::mpsc::UnboundedReceiver<()>,
) -> Result<(), String> {
    let mut attempt_counter = 0;
    let timer = tokio::time::sleep(Duration::from_secs(0));
    tokio::pin!(timer);

    loop {
        tokio::select! {
            // Listen for reposition requests coming from calloop
            _ = reposition_rx.recv() => {
                while let Ok(_) = reposition_rx.try_recv() {
                    // Drain any additional reposition requests
                }
                attempt_counter = 0;
                timer.as_mut().reset(tokio::time::Instant::now());
            }
            // Timer to manage multiple-configuration-retries
            _ = &mut timer => {
                attempt_counter += 1;
                if attempt_counter > MAX_ATTEMPTS {
                    log::warn!("Maximum attempts ({}) reached, not re-trying reposition for now", MAX_ATTEMPTS);
                    timer.as_mut().reset(tokio::time::Instant::now() + FOREVER_FROM_NOW);
                }
                log::trace!("Reposition attempt #{}/{}", attempt_counter, MAX_ATTEMPTS);

                match apply_monitor_config_once().await {
                    Ok(_) => {
                        log::info!("Monitor configuration applied successfully after {} attempt(s)", attempt_counter);
                        attempt_counter = 0; // Reset counter after success
                        timer.as_mut().reset(tokio::time::Instant::now() + FOREVER_FROM_NOW);
                        continue;
                    }
                    Err(e) => {
                        log::warn!("Attempt {} failed: {}", attempt_counter, e);
                        if attempt_counter >= MAX_ATTEMPTS {
                            return Err(format!("Maximum attempts ({}) reached without success", MAX_ATTEMPTS));
                        }

                        // Schedule next attempt
                        let delay = get_backoff_delay(attempt_counter.max(1) - 1);
                        // timer = tokio::time::sleep(delay);
                        timer.as_mut().reset(tokio::time::Instant::now() + delay);
                    }
                }
        }
        // Stop gracefully if we get a ctrl-c signal
        _ = tokio::signal::ctrl_c() => {
                log::trace!("Ctrl-C received, exiting monitor repositioning task");
                return Ok(());
            }
        }
    }
}
```

As you can see I also am implementing signal handling and exponential backoff at the same time.

And now to send events to tokio from calloop, here's the code

```rust
impl IdleState {
    // Note that this function is not async and the `reposition_handler` is a `mpsc::UnboundedSender` that can be sent between threads.
    fn trigger_reposition(&mut self) {
        if let Err(err) = self.reposition_handler.send(()) {
            // Tokio has exited, we should exit too
            log::error!("Failed to send reposition request, shutting down: {}", err);
            self.loop_signal.stop();
        }
    }
}
```

This pattern is something I came up by myself for this project, but it isn't unheard of. The `cosmic-settings` gui is also a rust package that uses both `tokio` and `calloop`. The only real difference is it doesn't have them talking to each other in the same way.

## Final Result

So the end result of this project is a fully-featured daemon that can manage the screen configuration on `cosmic-epoch` desktops. It works great and runs with very low resource usage (typically 1-2mb memory and near-zero cpu usage), so it's not a burden to have running in the background all the time especially on full desktop systems.
