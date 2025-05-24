---
slug: dissecting-apples-url-compression-private-framework
title: Dissecting Apples URL Compression Private Framework
authors: msdrigg
tags:
    - projects
    - ios
draft: true
---

:::warning
Work in progress
:::

-   Explain the options to generate these codes:
    -   Use MacOS-only cli application to generate locally
    -   Call app store connect API with a token to generate the codes
-   Explain the URLCompression framework
    -   Little-to-no reverse engineering
    -   Only a couple of tweets from a few dudes
    -   No documentation
    -   Reverse engineering the framework in Ghidra :/
-   Explain my newfound interest due to apple pay using app clip codes
    -   Why aren't they recognized on the device?
        -   Could they be using v2 or just not using an encoded URL?
    -   No apple pay docs on the codes. Could I somehow use the URLCompression framework to reverse engineer these codes to see what URL they were hitting?
    -   Unfortunately no in-browser app clip code generation or scanning. The whole code SVG is sent over the wire to the device

<!-- truncate -->

# Code Structure

-   Data Color 0, 1, 2
-   2 -> Empty
-   1 -> Dark
-   0 -> Bright
