---
source: https://chromedevtools.github.io/devtools-protocol/tot/Browser/
acquired_at: 2026-07-14
acquisition: MarkItDown
confidence: high
note: Chrome DevTools Protocol tip-of-tree。取得時点のBrowser domain全文。
---

[Home](/devtools-protocol/)
x

Versions

[latest (tip-of-tree)](/devtools-protocol/tot)
[v8-inspector (node)](/devtools-protocol/v8)
[stable (1.3)](/devtools-protocol/1-3)

Domains

[Accessibility](/devtools-protocol/tot/Accessibility)
[Animation](/devtools-protocol/tot/Animation)
[Audits](/devtools-protocol/tot/Audits)
[Autofill](/devtools-protocol/tot/Autofill)
[BackgroundService](/devtools-protocol/tot/BackgroundService)
[BluetoothEmulation](/devtools-protocol/tot/BluetoothEmulation)
[Browser](/devtools-protocol/tot/Browser)
[CacheStorage](/devtools-protocol/tot/CacheStorage)
[Cast](/devtools-protocol/tot/Cast)
[Console](/devtools-protocol/tot/Console)
[CrashReportContext](/devtools-protocol/tot/CrashReportContext)
[CSS](/devtools-protocol/tot/CSS)
[Debugger](/devtools-protocol/tot/Debugger)
[DeviceAccess](/devtools-protocol/tot/DeviceAccess)
[DeviceOrientation](/devtools-protocol/tot/DeviceOrientation)
[DOM](/devtools-protocol/tot/DOM)
[DOMDebugger](/devtools-protocol/tot/DOMDebugger)
[DOMSnapshot](/devtools-protocol/tot/DOMSnapshot)
[DOMStorage](/devtools-protocol/tot/DOMStorage)
[Emulation](/devtools-protocol/tot/Emulation)
[EventBreakpoints](/devtools-protocol/tot/EventBreakpoints)
[Extensions](/devtools-protocol/tot/Extensions)
[FedCm](/devtools-protocol/tot/FedCm)
[Fetch](/devtools-protocol/tot/Fetch)
[FileSystem](/devtools-protocol/tot/FileSystem)
[HeadlessExperimental](/devtools-protocol/tot/HeadlessExperimental)
[HeapProfiler](/devtools-protocol/tot/HeapProfiler)
[IndexedDB](/devtools-protocol/tot/IndexedDB)
[Input](/devtools-protocol/tot/Input)
[Inspector](/devtools-protocol/tot/Inspector)
[IO](/devtools-protocol/tot/IO)
[LayerTree](/devtools-protocol/tot/LayerTree)
[Log](/devtools-protocol/tot/Log)
[Media](/devtools-protocol/tot/Media)
[Memory](/devtools-protocol/tot/Memory)
[Network](/devtools-protocol/tot/Network)
[Overlay](/devtools-protocol/tot/Overlay)
[Page](/devtools-protocol/tot/Page)
[Performance](/devtools-protocol/tot/Performance)
[PerformanceTimeline](/devtools-protocol/tot/PerformanceTimeline)
[Preload](/devtools-protocol/tot/Preload)
[Profiler](/devtools-protocol/tot/Profiler)
[PWA](/devtools-protocol/tot/PWA)
[Runtime](/devtools-protocol/tot/Runtime)
[Schema](/devtools-protocol/tot/Schema)
[Security](/devtools-protocol/tot/Security)
[ServiceWorker](/devtools-protocol/tot/ServiceWorker)
[SmartCardEmulation](/devtools-protocol/tot/SmartCardEmulation)
[Storage](/devtools-protocol/tot/Storage)
[SystemInfo](/devtools-protocol/tot/SystemInfo)
[Target](/devtools-protocol/tot/Target)
[Tethering](/devtools-protocol/tot/Tethering)
[Tracing](/devtools-protocol/tot/Tracing)
[WebAudio](/devtools-protocol/tot/WebAudio)
[WebAuthn](/devtools-protocol/tot/WebAuthn)
[WebMCP](/devtools-protocol/tot/WebMCP)

# Chrome DevTools Protocol

Navigation

## Browser Domain

The Browser domain defines methods and events for browser managing.

### Methods

[Browser.addPrivacySandboxCoordinatorKeyConfig](#method-addPrivacySandboxCoordinatorKeyConfig)

[Browser.addPrivacySandboxEnrollmentOverride](#method-addPrivacySandboxEnrollmentOverride)

[Browser.close](#method-close)

[Browser.getVersion](#method-getVersion)

[Browser.resetPermissions](#method-resetPermissions)

[Browser.cancelDownload](#method-cancelDownload)
Experimental

[Browser.crash](#method-crash)
Experimental

[Browser.crashGpuProcess](#method-crashGpuProcess)
Experimental

[Browser.executeBrowserCommand](#method-executeBrowserCommand)
Experimental

[Browser.getBrowserCommandLine](#method-getBrowserCommandLine)
Experimental

[Browser.getHistogram](#method-getHistogram)
Experimental

[Browser.getHistograms](#method-getHistograms)
Experimental

[Browser.getWindowBounds](#method-getWindowBounds)
Experimental

[Browser.getWindowForTarget](#method-getWindowForTarget)
Experimental

[Browser.setContentsSize](#method-setContentsSize)
Experimental

[Browser.setDockTile](#method-setDockTile)
Experimental

[Browser.setDownloadBehavior](#method-setDownloadBehavior)
Experimental

[Browser.setPermission](#method-setPermission)
Experimental

[Browser.setWindowBounds](#method-setWindowBounds)
Experimental

[Browser.grantPermissions](#method-grantPermissions)
ExperimentalDeprecated

### Events

[Browser.downloadProgress](#event-downloadProgress)
Experimental

[Browser.downloadWillBegin](#event-downloadWillBegin)
Experimental

### Types

[Browser.Bounds](#type-Bounds)
Experimental

[Browser.BrowserCommandId](#type-BrowserCommandId)
Experimental

[Browser.BrowserContextID](#type-BrowserContextID)
Experimental

[Browser.Bucket](#type-Bucket)
Experimental

[Browser.Histogram](#type-Histogram)
Experimental

[Browser.PermissionDescriptor](#type-PermissionDescriptor)
Experimental

[Browser.PermissionSetting](#type-PermissionSetting)
Experimental

[Browser.PermissionType](#type-PermissionType)
Experimental

[Browser.PrivacySandboxAPI](#type-PrivacySandboxAPI)
Experimental

[Browser.WindowID](#type-WindowID)
Experimental

[Browser.WindowState](#type-WindowState)
Experimental

### Methods

#### Browser.addPrivacySandboxCoordinatorKeyConfig [#](#method-addPrivacySandboxCoordinatorKeyConfig "Double click to copy markdown-formatted URL")

Configures encryption keys used with a given privacy sandbox API to talk
to a trusted coordinator. Since this is intended for test automation only,
coordinatorOrigin must be a .test domain. No existing coordinator
configuration for the origin may exist.

##### parameters

api
:   [PrivacySandboxAPI](/devtools-protocol/tot/Browser/#type-PrivacySandboxAPI)

coordinatorOrigin
:   string

keyConfig
:   string

browserContextId
:   [BrowserContextID](/devtools-protocol/tot/Browser/#type-BrowserContextID)

    BrowserContext to perform the action in. When omitted, default browser
    context is used.

#### Browser.addPrivacySandboxEnrollmentOverride [#](#method-addPrivacySandboxEnrollmentOverride "Double click to copy markdown-formatted URL")

Allows a site to use privacy sandbox features that require enrollment
without the site actually being enrolled. Only supported on page targets.

##### parameters

url
:   string

#### Browser.close [#](#method-close "Double click to copy markdown-formatted URL")

Close browser gracefully.

#### Browser.getVersion [#](#method-getVersion "Double click to copy markdown-formatted URL")

Returns version information.

##### Return Object

protocolVersion
:   string

    Protocol version.

product
:   string

    Product name.

revision
:   string

    Product revision.

userAgent
:   string

    User-Agent.

jsVersion
:   string

    V8 version.

#### Browser.resetPermissions [#](#method-resetPermissions "Double click to copy markdown-formatted URL")

Reset all permission management for all origins.

##### parameters

browserContextId
:   [BrowserContextID](/devtools-protocol/tot/Browser/#type-BrowserContextID)

    BrowserContext to reset permissions. When omitted, default browser context is used.

#### Browser.cancelDownload Experimental [#](#method-cancelDownload "Double click to copy markdown-formatted URL")

Cancel a download if in progress

##### parameters

guid
:   string

    Global unique identifier of the download.

browserContextId
:   [BrowserContextID](/devtools-protocol/tot/Browser/#type-BrowserContextID)

    BrowserContext to perform the action in. When omitted, default browser context is used.

#### Browser.crash Experimental [#](#method-crash "Double click to copy markdown-formatted URL")

Crashes browser on the main thread.

#### Browser.crashGpuProcess Experimental [#](#method-crashGpuProcess "Double click to copy markdown-formatted URL")

Crashes GPU process.

#### Browser.executeBrowserCommand Experimental [#](#method-executeBrowserCommand "Double click to copy markdown-formatted URL")

Invoke custom browser commands used by telemetry.

##### parameters

commandId
:   [BrowserCommandId](/devtools-protocol/tot/Browser/#type-BrowserCommandId)

#### Browser.getBrowserCommandLine Experimental [#](#method-getBrowserCommandLine "Double click to copy markdown-formatted URL")

Returns the command line switches for the browser process if, and only if
--enable-automation is on the commandline.

##### Return Object

arguments
:   array[ string ]

    Commandline parameters

#### Browser.getHistogram Experimental [#](#method-getHistogram "Double click to copy markdown-formatted URL")

Get a Chrome histogram by name.

##### parameters

name
:   string

    Requested histogram name.

delta
:   boolean

    If true, retrieve delta since last delta call.

##### Return Object

histogram
:   [Histogram](/devtools-protocol/tot/Browser/#type-Histogram)

    Histogram.

#### Browser.getHistograms Experimental [#](#method-getHistograms "Double click to copy markdown-formatted URL")

Get Chrome histograms.

##### parameters

query
:   string

    Requested substring in name. Only histograms which have query as a
    substring in their name are extracted. An empty or absent query returns
    all histograms.

delta
:   boolean

    If true, retrieve delta since last delta call.

##### Return Object

histograms
:   array[ [Histogram](/devtools-protocol/tot/Browser/#type-Histogram) ]

    Histograms.

#### Browser.getWindowBounds Experimental [#](#method-getWindowBounds "Double click to copy markdown-formatted URL")

Get position and size of the browser window.

##### parameters

windowId
:   [WindowID](/devtools-protocol/tot/Browser/#type-WindowID)

    Browser window id.

##### Return Object

bounds
:   [Bounds](/devtools-protocol/tot/Browser/#type-Bounds)

    Bounds information of the window. When window state is 'minimized', the restored window
    position and size are returned.

#### Browser.getWindowForTarget Experimental [#](#method-getWindowForTarget "Double click to copy markdown-formatted URL")

Get the browser window that contains the devtools target.

##### parameters

targetId
:   [Target.TargetID](/devtools-protocol/tot/Target/#type-TargetID)

    Devtools agent host id. If called as a part of the session, associated targetId is used.

##### Return Object

windowId
:   [WindowID](/devtools-protocol/tot/Browser/#type-WindowID)

    Browser window id.

bounds
:   [Bounds](/devtools-protocol/tot/Browser/#type-Bounds)

    Bounds information of the window. When window state is 'minimized', the restored window
    position and size are returned.

#### Browser.setContentsSize Experimental [#](#method-setContentsSize "Double click to copy markdown-formatted URL")

Set size of the browser contents resizing browser window as necessary.

##### parameters

windowId
:   [WindowID](/devtools-protocol/tot/Browser/#type-WindowID)

    Browser window id.

width
:   integer

    The window contents width in DIP. Assumes current width if omitted.
    Must be specified if 'height' is omitted.

height
:   integer

    The window contents height in DIP. Assumes current height if omitted.
    Must be specified if 'width' is omitted.

#### Browser.setDockTile Experimental [#](#method-setDockTile "Double click to copy markdown-formatted URL")

Set dock tile details, platform-specific.

##### parameters

badgeLabel
:   string

image
:   string

    Png encoded image. (Encoded as a base64 string when passed over JSON)

#### Browser.setDownloadBehavior Experimental [#](#method-setDownloadBehavior "Double click to copy markdown-formatted URL")

Set the behavior when downloading a file.

##### parameters

behavior
:   string

    Whether to allow all or deny all download requests, or use default Chrome behavior if
    available (otherwise deny). |allowAndName| allows download and names files according to
    their download guids.

    Allowed Values: `deny`, `allow`, `allowAndName`, `default`

browserContextId
:   [BrowserContextID](/devtools-protocol/tot/Browser/#type-BrowserContextID)

    BrowserContext to set download behavior. When omitted, default browser context is used.

downloadPath
:   string

    The default path to save downloaded files to. This is required if behavior is set to 'allow'
    or 'allowAndName'.

eventsEnabled
:   boolean

    Whether to emit download events (defaults to false).

#### Browser.setPermission Experimental [#](#method-setPermission "Double click to copy markdown-formatted URL")

Set permission settings for given embedding and embedded origins.

##### parameters

permission
:   [PermissionDescriptor](/devtools-protocol/tot/Browser/#type-PermissionDescriptor)

    Descriptor of permission to override.

setting
:   [PermissionSetting](/devtools-protocol/tot/Browser/#type-PermissionSetting)

    Setting of the permission.

origin
:   string

    Embedding origin the permission applies to, all origins if not specified.

embeddedOrigin
:   string

    Embedded origin the permission applies to. It is ignored unless the embedding origin is
    present and valid. If the embedding origin is provided but the embedded origin isn't, the
    embedding origin is used as the embedded origin.

browserContextId
:   [BrowserContextID](/devtools-protocol/tot/Browser/#type-BrowserContextID)

    Context to override. When omitted, default browser context is used.

#### Browser.setWindowBounds Experimental [#](#method-setWindowBounds "Double click to copy markdown-formatted URL")

Set position and/or size of the browser window.

##### parameters

windowId
:   [WindowID](/devtools-protocol/tot/Browser/#type-WindowID)

    Browser window id.

bounds
:   [Bounds](/devtools-protocol/tot/Browser/#type-Bounds)

    New window bounds. The 'minimized', 'maximized' and 'fullscreen' states cannot be combined
    with 'left', 'top', 'width' or 'height'. Leaves unspecified fields unchanged.

#### Browser.grantPermissions ExperimentalDeprecated [#](#method-grantPermissions "Double click to copy markdown-formatted URL")

Grant specific permissions to the given origin and reject all others. Deprecated. Use
setPermission instead.

##### parameters

permissions
:   array[ [PermissionType](/devtools-protocol/tot/Browser/#type-PermissionType) ]

origin
:   string

    Origin the permission applies to, all origins if not specified.

browserContextId
:   [BrowserContextID](/devtools-protocol/tot/Browser/#type-BrowserContextID)

    BrowserContext to override permissions. When omitted, default browser context is used.

### Events

#### Browser.downloadProgress Experimental [#](#event-downloadProgress "Double click to copy markdown-formatted URL")

Fired when download makes progress. Last call has |done| == true.

##### parameters

guid
:   string

    Global unique identifier of the download.

totalBytes
:   number

    Total expected bytes to download.

receivedBytes
:   number

    Total bytes received.

state
:   string

    Download status.

    Allowed Values: `inProgress`, `completed`, `canceled`

filePath
:   string

    If download is "completed", provides the path of the downloaded file.
    Depending on the platform, it is not guaranteed to be set, nor the file
    is guaranteed to exist.

    Experimental

#### Browser.downloadWillBegin Experimental [#](#event-downloadWillBegin "Double click to copy markdown-formatted URL")

Fired when page is about to start a download.

##### parameters

frameId
:   [Page.FrameId](/devtools-protocol/tot/Page/#type-FrameId)

    Id of the frame that caused the download to begin.

guid
:   string

    Global unique identifier of the download.

url
:   string

    URL of the resource being downloaded.

suggestedFilename
:   string

    Suggested file name of the resource (the actual name of the file saved on disk may differ).

### Types

#### Browser.Bounds Experimental [#](#type-Bounds "Double click to copy markdown-formatted URL")

Browser window bounds information

Type: **object**

##### properties

left
:   integer

    The offset from the left edge of the screen to the window in pixels.

top
:   integer

    The offset from the top edge of the screen to the window in pixels.

width
:   integer

    The window width in pixels.

height
:   integer

    The window height in pixels.

windowState
:   [WindowState](/devtools-protocol/tot/Browser/#type-WindowState)

    The window state. Default to normal.

#### Browser.BrowserCommandId Experimental [#](#type-BrowserCommandId "Double click to copy markdown-formatted URL")

Browser command ids used by executeBrowserCommand.

Allowed Values: `openTabSearch`, `closeTabSearch`, `openGlic`

Type: **string**
#### Browser.BrowserContextID Experimental [#](#type-BrowserContextID "Double click to copy markdown-formatted URL")

Type: **string**

#### Browser.Bucket Experimental [#](#type-Bucket "Double click to copy markdown-formatted URL")

Chrome histogram bucket.

Type: **object**

##### properties

low
:   integer

    Minimum value (inclusive).

high
:   integer

    Maximum value (exclusive).

count
:   integer

    Number of samples.

#### Browser.Histogram Experimental [#](#type-Histogram "Double click to copy markdown-formatted URL")

Chrome histogram.

Type: **object**

##### properties

name
:   string

    Name.

sum
:   integer

    Sum of sample values.

count
:   integer

    Total number of samples.

buckets
:   array[ [Bucket](/devtools-protocol/tot/Browser/#type-Bucket) ]

    Buckets.

#### Browser.PermissionDescriptor Experimental [#](#type-PermissionDescriptor "Double click to copy markdown-formatted URL")

Definition of PermissionDescriptor defined in the Permissions API:
<https://w3c.github.io/permissions/#dom-permissiondescriptor>.

Type: **object**

##### properties

name
:   string

    Name of permission.
    See <https://cs.chromium.org/chromium/src/third_party/blink/renderer/modules/permissions/permission_descriptor.idl> for valid permission names.

sysex
:   boolean

    For "midi" permission, may also specify sysex control.

userVisibleOnly
:   boolean

    For "push" permission, may specify userVisibleOnly.
    Note that userVisibleOnly = true is the only currently supported type.

allowWithoutSanitization
:   boolean

    For "clipboard" permission, may specify allowWithoutSanitization.

allowWithoutGesture
:   boolean

    For "fullscreen" permission, must specify allowWithoutGesture:true.

panTiltZoom
:   boolean

    For "camera" permission, may specify panTiltZoom.

#### Browser.PermissionSetting Experimental [#](#type-PermissionSetting "Double click to copy markdown-formatted URL")

Allowed Values: `granted`, `denied`, `prompt`

Type: **string**

#### Browser.PermissionType Experimental [#](#type-PermissionType "Double click to copy markdown-formatted URL")

Allowed Values: `ar`, `audioCapture`, `automaticFullscreen`, `backgroundFetch`, `backgroundSync`, `cameraPanTiltZoom`, `capturedSurfaceControl`, `clipboardReadWrite`, `clipboardSanitizedWrite`, `displayCapture`, `durableStorage`, `geolocation`, `handTracking`, `idleDetection`, `keyboardLock`, `localFonts`, `localNetwork`, `localNetworkAccess`, `loopbackNetwork`, `midi`, `midiSysex`, `nfc`, `notifications`, `paymentHandler`, `periodicBackgroundSync`, `pointerLock`, `protectedMediaIdentifier`, `sensors`, `smartCard`, `speakerSelection`, `storageAccess`, `topLevelStorageAccess`, `videoCapture`, `vr`, `wakeLockScreen`, `wakeLockSystem`, `webAppInstallation`, `webPrinting`, `windowManagement`

Type: **string**

#### Browser.PrivacySandboxAPI Experimental [#](#type-PrivacySandboxAPI "Double click to copy markdown-formatted URL")

Allowed Values: `BiddingAndAuctionServices`, `TrustedKeyValue`

Type: **string**

#### Browser.WindowID Experimental [#](#type-WindowID "Double click to copy markdown-formatted URL")

Type: **integer**

#### Browser.WindowState Experimental [#](#type-WindowState "Double click to copy markdown-formatted URL")

The state of the browser window.

Allowed Values: `normal`, `minimized`, `maximized`, `fullscreen`

Type: **string**
