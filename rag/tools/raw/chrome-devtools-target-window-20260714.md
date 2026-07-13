---
source: https://chromedevtools.github.io/devtools-protocol/tot/Target/
acquired_at: 2026-07-14
acquisition: MarkItDown
confidence: high
note: Chrome DevTools Protocol tip-of-tree。取得時点のTarget domain全文。
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

## Target Domain

Supports additional targets discovery and allows to attach to them.

### Methods

[Target.activateTarget](#method-activateTarget)

[Target.attachToTarget](#method-attachToTarget)

[Target.closeTarget](#method-closeTarget)

[Target.createBrowserContext](#method-createBrowserContext)

[Target.createTarget](#method-createTarget)

[Target.detachFromTarget](#method-detachFromTarget)

[Target.disposeBrowserContext](#method-disposeBrowserContext)

[Target.getBrowserContexts](#method-getBrowserContexts)

[Target.getTargets](#method-getTargets)

[Target.setAutoAttach](#method-setAutoAttach)

[Target.setDiscoverTargets](#method-setDiscoverTargets)

[Target.sendMessageToTarget](#method-sendMessageToTarget)
Deprecated

[Target.attachToBrowserTarget](#method-attachToBrowserTarget)
Experimental

[Target.autoAttachRelated](#method-autoAttachRelated)
Experimental

[Target.exposeDevToolsProtocol](#method-exposeDevToolsProtocol)
Experimental

[Target.getDevToolsTarget](#method-getDevToolsTarget)
Experimental

[Target.getTargetInfo](#method-getTargetInfo)
Experimental

[Target.openDevTools](#method-openDevTools)
Experimental

[Target.setRemoteLocations](#method-setRemoteLocations)
Experimental

### Events

[Target.receivedMessageFromTarget](#event-receivedMessageFromTarget)

[Target.targetCrashed](#event-targetCrashed)

[Target.targetCreated](#event-targetCreated)

[Target.targetDestroyed](#event-targetDestroyed)

[Target.targetInfoChanged](#event-targetInfoChanged)

[Target.attachedToTarget](#event-attachedToTarget)
Experimental

[Target.detachedFromTarget](#event-detachedFromTarget)
Experimental

### Types

[Target.SessionID](#type-SessionID)

[Target.TargetID](#type-TargetID)

[Target.TargetInfo](#type-TargetInfo)

[Target.FilterEntry](#type-FilterEntry)
Experimental

[Target.RemoteLocation](#type-RemoteLocation)
Experimental

[Target.TargetFilter](#type-TargetFilter)
Experimental

[Target.WindowState](#type-WindowState)
Experimental

### Methods

#### Target.activateTarget [#](#method-activateTarget "Double click to copy markdown-formatted URL")

Activates (focuses) the target.

##### parameters

targetId
:   [TargetID](/devtools-protocol/tot/Target/#type-TargetID)

#### Target.attachToTarget [#](#method-attachToTarget "Double click to copy markdown-formatted URL")

Attaches to the target with given id.

##### parameters

targetId
:   [TargetID](/devtools-protocol/tot/Target/#type-TargetID)

flatten
:   boolean

    Enables "flat" access to the session via specifying sessionId attribute in the commands.
    We plan to make this the default, deprecate non-flattened mode,
    and eventually retire it. See crbug.com/991325.

##### Return Object

sessionId
:   [SessionID](/devtools-protocol/tot/Target/#type-SessionID)

    Id assigned to the session.

#### Target.closeTarget [#](#method-closeTarget "Double click to copy markdown-formatted URL")

Closes the target. If the target is a page that gets closed too.

##### parameters

targetId
:   [TargetID](/devtools-protocol/tot/Target/#type-TargetID)

##### Return Object

success
:   boolean

    Always set to true. If an error occurs, the response indicates protocol error.

    Deprecated

#### Target.createBrowserContext [#](#method-createBrowserContext "Double click to copy markdown-formatted URL")

Creates a new empty BrowserContext. Similar to an incognito profile but you can have more than
one.

##### parameters

disposeOnDetach
:   boolean

    If specified, disposes this context when debugging session disconnects.

    Experimental

proxyServer
:   string

    Proxy server, similar to the one passed to --proxy-server

    Experimental

proxyBypassList
:   string

    Proxy bypass list, similar to the one passed to --proxy-bypass-list

    Experimental

originsWithUniversalNetworkAccess
:   array[ string ]

    An optional list of origins to grant unlimited cross-origin access to.
    Parts of the URL other than those constituting origin are ignored.

    Experimental

##### Return Object

browserContextId
:   [Browser.BrowserContextID](/devtools-protocol/tot/Browser/#type-BrowserContextID)

    The id of the context created.

#### Target.createTarget [#](#method-createTarget "Double click to copy markdown-formatted URL")

Creates a new page.

##### parameters

url
:   string

    The initial URL the page will be navigated to. An empty string indicates about:blank.

left
:   integer

    Frame left origin in DIP (requires newWindow to be true or headless shell).

    Experimental

top
:   integer

    Frame top origin in DIP (requires newWindow to be true or headless shell).

    Experimental

width
:   integer

    Frame width in DIP (requires newWindow to be true or headless shell).

height
:   integer

    Frame height in DIP (requires newWindow to be true or headless shell).

windowState
:   [WindowState](/devtools-protocol/tot/Target/#type-WindowState)

    Frame window state (requires newWindow to be true or headless shell).
    Default is normal.

browserContextId
:   [Browser.BrowserContextID](/devtools-protocol/tot/Browser/#type-BrowserContextID)

    The browser context to create the page in.

    Experimental

enableBeginFrameControl
:   boolean

    Whether BeginFrames for this target will be controlled via DevTools (headless shell only,
    not supported on MacOS yet, false by default).

    Experimental

newWindow
:   boolean

    Whether to create a new Window or Tab (false by default, not supported by headless shell).

background
:   boolean

    Whether to create the target in background or foreground (false by default, not supported
    by headless shell).

forTab
:   boolean

    Whether to create the target of type "tab".

    Experimental

hidden
:   boolean

    Whether to create a hidden target. The hidden target is observable via protocol, but not
    present in the tab UI strip. Cannot be created with `forTab: true`, `newWindow: true` or
    `background: false`. The life-time of the tab is limited to the life-time of the session.

    Experimental

focus
:   boolean

    If specified, determines whether the new target should be focused.
    By default, the focus behavior depends on the `background` parameter:

    * If `background` is false (default) and `focus` is omitted, the new target is focused and the browser window is brought to the foreground.
    * If `background` is false and `focus` is false, the target is opened but the browser window's focus remains unchanged (e.g., if the window was in the background, it stays there).
    * If `background` is true, setting `focus` to true is not supported and will result in an error.

    Experimental

##### Return Object

targetId
:   [TargetID](/devtools-protocol/tot/Target/#type-TargetID)

    The id of the page opened.

#### Target.detachFromTarget [#](#method-detachFromTarget "Double click to copy markdown-formatted URL")

Detaches session with given id.

##### parameters

sessionId
:   [SessionID](/devtools-protocol/tot/Target/#type-SessionID)

    Session to detach.

targetId
:   [TargetID](/devtools-protocol/tot/Target/#type-TargetID)

    Deprecated.

    Deprecated

#### Target.disposeBrowserContext [#](#method-disposeBrowserContext "Double click to copy markdown-formatted URL")

Deletes a BrowserContext. All the belonging pages will be closed without calling their
beforeunload hooks.

##### parameters

browserContextId
:   [Browser.BrowserContextID](/devtools-protocol/tot/Browser/#type-BrowserContextID)

#### Target.getBrowserContexts [#](#method-getBrowserContexts "Double click to copy markdown-formatted URL")

Returns all browser contexts created with `Target.createBrowserContext` method.

##### Return Object

browserContextIds
:   array[ [Browser.BrowserContextID](/devtools-protocol/tot/Browser/#type-BrowserContextID) ]

    An array of browser context ids.

defaultBrowserContextId
:   [Browser.BrowserContextID](/devtools-protocol/tot/Browser/#type-BrowserContextID)

    The id of the default browser context if available.

    Experimental

#### Target.getTargets [#](#method-getTargets "Double click to copy markdown-formatted URL")

Retrieves a list of available targets.

##### parameters

filter
:   [TargetFilter](/devtools-protocol/tot/Target/#type-TargetFilter)

    Only targets matching filter will be reported. If filter is not specified
    and target discovery is currently enabled, a filter used for target discovery
    is used for consistency.

    Experimental

##### Return Object

targetInfos
:   array[ [TargetInfo](/devtools-protocol/tot/Target/#type-TargetInfo) ]

    The list of targets.

#### Target.setAutoAttach [#](#method-setAutoAttach "Double click to copy markdown-formatted URL")

Controls whether to automatically attach to new targets which are considered
to be directly related to this one (for example, iframes or workers).
When turned on, attaches to all existing related targets as well. When turned off,
automatically detaches from all currently attached targets.
This also clears all targets added by `autoAttachRelated` from the list of targets to watch
for creation of related targets.
You might want to call this recursively for auto-attached targets to attach
to all available targets.

##### parameters

autoAttach
:   boolean

    Whether to auto-attach to related targets.

waitForDebuggerOnStart
:   boolean

    Whether to pause new targets when attaching to them. Use `Runtime.runIfWaitingForDebugger`
    to run paused targets.

flatten
:   boolean

    Enables "flat" access to the session via specifying sessionId attribute in the commands.
    We plan to make this the default, deprecate non-flattened mode,
    and eventually retire it. See crbug.com/991325.

    Experimental

filter
:   [TargetFilter](/devtools-protocol/tot/Target/#type-TargetFilter)

    Only targets matching filter will be attached.

    Experimental

#### Target.setDiscoverTargets [#](#method-setDiscoverTargets "Double click to copy markdown-formatted URL")

Controls whether to discover available targets and notify via
`targetCreated/targetInfoChanged/targetDestroyed` events.

##### parameters

discover
:   boolean

    Whether to discover available targets.

filter
:   [TargetFilter](/devtools-protocol/tot/Target/#type-TargetFilter)

    Only targets matching filter will be attached. If `discover` is false,
    `filter` must be omitted or empty.

    Experimental

#### Target.sendMessageToTarget Deprecated [#](#method-sendMessageToTarget "Double click to copy markdown-formatted URL")

Sends protocol message over session with given id.
Consider using flat mode instead; see commands attachToTarget, setAutoAttach,
and crbug.com/991325.

##### parameters

message
:   string

sessionId
:   [SessionID](/devtools-protocol/tot/Target/#type-SessionID)

    Identifier of the session.

targetId
:   [TargetID](/devtools-protocol/tot/Target/#type-TargetID)

    Deprecated.

    Deprecated

#### Target.attachToBrowserTarget Experimental [#](#method-attachToBrowserTarget "Double click to copy markdown-formatted URL")

Attaches to the browser target, only uses flat sessionId mode.

##### Return Object

sessionId
:   [SessionID](/devtools-protocol/tot/Target/#type-SessionID)

    Id assigned to the session.

#### Target.autoAttachRelated Experimental [#](#method-autoAttachRelated "Double click to copy markdown-formatted URL")

Adds the specified target to the list of targets that will be monitored for any related target
creation (such as child frames, child workers and new versions of service worker) and reported
through `attachedToTarget`. The specified target is also auto-attached.
This cancels the effect of any previous `setAutoAttach` and is also cancelled by subsequent
`setAutoAttach`. Only available at the Browser target.

##### parameters

targetId
:   [TargetID](/devtools-protocol/tot/Target/#type-TargetID)

waitForDebuggerOnStart
:   boolean

    Whether to pause new targets when attaching to them. Use `Runtime.runIfWaitingForDebugger`
    to run paused targets.

filter
:   [TargetFilter](/devtools-protocol/tot/Target/#type-TargetFilter)

    Only targets matching filter will be attached.

    Experimental

#### Target.exposeDevToolsProtocol Experimental [#](#method-exposeDevToolsProtocol "Double click to copy markdown-formatted URL")

Inject object to the target's main frame that provides a communication
channel with browser target.

Injected object will be available as `window[bindingName]`.

The object has the following API:

* `binding.send(json)` - a method to send messages over the remote debugging protocol
* `binding.onmessage = json => handleMessage(json)` - a callback that will be called for the protocol notifications and command responses.

##### parameters

targetId
:   [TargetID](/devtools-protocol/tot/Target/#type-TargetID)

bindingName
:   string

    Binding name, 'cdp' if not specified.

inheritPermissions
:   boolean

    If true, inherits the current root session's permissions (default: false).

#### Target.getDevToolsTarget Experimental [#](#method-getDevToolsTarget "Double click to copy markdown-formatted URL")

Gets the targetId of the DevTools page target opened for the given target
(if any).

##### parameters

targetId
:   [TargetID](/devtools-protocol/tot/Target/#type-TargetID)

    Page or tab target ID.

##### Return Object

targetId
:   [TargetID](/devtools-protocol/tot/Target/#type-TargetID)

    The targetId of DevTools page target if exists.

#### Target.getTargetInfo Experimental [#](#method-getTargetInfo "Double click to copy markdown-formatted URL")

Returns information about a target.

##### parameters

targetId
:   [TargetID](/devtools-protocol/tot/Target/#type-TargetID)

##### Return Object

targetInfo
:   [TargetInfo](/devtools-protocol/tot/Target/#type-TargetInfo)

#### Target.openDevTools Experimental [#](#method-openDevTools "Double click to copy markdown-formatted URL")

Opens a DevTools window for the target.

##### parameters

targetId
:   [TargetID](/devtools-protocol/tot/Target/#type-TargetID)

    This can be the page or tab target ID.

panelId
:   string

    The id of the panel we want DevTools to open initially. Currently
    supported panels are elements, console, network, sources, resources,
    timeline, chrome-recorder, heap-profiler, lighthouse, and security.

##### Return Object

targetId
:   [TargetID](/devtools-protocol/tot/Target/#type-TargetID)

    The targetId of DevTools page target.

#### Target.setRemoteLocations Experimental [#](#method-setRemoteLocations "Double click to copy markdown-formatted URL")

Enables target discovery for the specified locations, when `setDiscoverTargets` was set to
`true`.

##### parameters

locations
:   array[ [RemoteLocation](/devtools-protocol/tot/Target/#type-RemoteLocation) ]

    List of remote locations.

### Events

#### Target.receivedMessageFromTarget [#](#event-receivedMessageFromTarget "Double click to copy markdown-formatted URL")

Notifies about a new protocol message received from the session (as reported in
`attachedToTarget` event).

##### parameters

sessionId
:   [SessionID](/devtools-protocol/tot/Target/#type-SessionID)

    Identifier of a session which sends a message.

message
:   string

targetId
:   [TargetID](/devtools-protocol/tot/Target/#type-TargetID)

    Deprecated.

    Deprecated

#### Target.targetCrashed [#](#event-targetCrashed "Double click to copy markdown-formatted URL")

Issued when a target has crashed.

##### parameters

targetId
:   [TargetID](/devtools-protocol/tot/Target/#type-TargetID)

status
:   string

    Termination status type.

errorCode
:   integer

    Termination error code.

#### Target.targetCreated [#](#event-targetCreated "Double click to copy markdown-formatted URL")

Issued when a possible inspection target is created.

##### parameters

targetInfo
:   [TargetInfo](/devtools-protocol/tot/Target/#type-TargetInfo)

#### Target.targetDestroyed [#](#event-targetDestroyed "Double click to copy markdown-formatted URL")

Issued when a target is destroyed.

##### parameters

targetId
:   [TargetID](/devtools-protocol/tot/Target/#type-TargetID)

#### Target.targetInfoChanged [#](#event-targetInfoChanged "Double click to copy markdown-formatted URL")

Issued when some information about a target has changed. This only happens between
`targetCreated` and `targetDestroyed`.

##### parameters

targetInfo
:   [TargetInfo](/devtools-protocol/tot/Target/#type-TargetInfo)

#### Target.attachedToTarget Experimental [#](#event-attachedToTarget "Double click to copy markdown-formatted URL")

Issued when attached to target because of auto-attach or `attachToTarget` command.

##### parameters

sessionId
:   [SessionID](/devtools-protocol/tot/Target/#type-SessionID)

    Identifier assigned to the session used to send/receive messages.

targetInfo
:   [TargetInfo](/devtools-protocol/tot/Target/#type-TargetInfo)

waitingForDebugger
:   boolean

#### Target.detachedFromTarget Experimental [#](#event-detachedFromTarget "Double click to copy markdown-formatted URL")

Issued when detached from target for any reason (including `detachFromTarget` command). Can be
issued multiple times per target if multiple sessions have been attached to it.

##### parameters

sessionId
:   [SessionID](/devtools-protocol/tot/Target/#type-SessionID)

    Detached session identifier.

targetId
:   [TargetID](/devtools-protocol/tot/Target/#type-TargetID)

    Deprecated.

    Deprecated

### Types

#### Target.SessionID [#](#type-SessionID "Double click to copy markdown-formatted URL")

Unique identifier of attached debugging session.

Type: **string**
#### Target.TargetID [#](#type-TargetID "Double click to copy markdown-formatted URL")

Type: **string**

#### Target.TargetInfo [#](#type-TargetInfo "Double click to copy markdown-formatted URL")

Type: **object**

##### properties

targetId
:   [TargetID](/devtools-protocol/tot/Target/#type-TargetID)

type
:   string

    List of types: [https://source.chromium.org/chromium/chromium/src/+/main:content/browser/devtools/devtools\_agent\_host\_impl.cc?ss=chromium&q=f:devtools%20-f:out%20%22::kTypeTab%5B%5D%22](https://source.chromium.org/chromium/chromium/src/%2B/main%3Acontent/browser/devtools/devtools_agent_host_impl.cc?ss=chromium&q=f:devtools%20-f:out%20%22::kTypeTab%5B%5D%22)

title
:   string

url
:   string

attached
:   boolean

    Whether the target has an attached client.

parentId
:   [TargetID](/devtools-protocol/tot/Target/#type-TargetID)

    Id of the parent target, if any. For example, "iframe" target may have a "page" parent.

openerId
:   [TargetID](/devtools-protocol/tot/Target/#type-TargetID)

    Opener target Id

canAccessOpener
:   boolean

    Whether the target has access to the originating window.

    Experimental

openerFrameId
:   [Page.FrameId](/devtools-protocol/tot/Page/#type-FrameId)

    Frame id of originating window (is only set if target has an opener).

    Experimental

parentFrameId
:   [Page.FrameId](/devtools-protocol/tot/Page/#type-FrameId)

    Id of the parent frame, present for "iframe" and "worker" targets. For nested workers,
    this is the "ancestor" frame that created the first worker in the nested chain.

    Experimental

browserContextId
:   [Browser.BrowserContextID](/devtools-protocol/tot/Browser/#type-BrowserContextID)Experimental

subtype
:   string

    Provides additional details for specific target types. For example, for
    the type of "page", this may be set to "prerender".

    Experimental

embedderData
:   object

    Embedder-specific target metadata. This is only set for targets of
    type "tab".

    Experimental

#### Target.FilterEntry Experimental [#](#type-FilterEntry "Double click to copy markdown-formatted URL")

A filter used by target query/discovery/auto-attach operations.

Type: **object**

##### properties

exclude
:   boolean

    If set, causes exclusion of matching targets from the list.

type
:   string

    If not present, matches any type.

#### Target.RemoteLocation Experimental [#](#type-RemoteLocation "Double click to copy markdown-formatted URL")

Type: **object**

##### properties

host
:   string

port
:   integer

#### Target.TargetFilter Experimental [#](#type-TargetFilter "Double click to copy markdown-formatted URL")

The entries in TargetFilter are matched sequentially against targets and
the first entry that matches determines if the target is included or not,
depending on the value of `exclude` field in the entry.
If filter is not specified, the one assumed is
[{type: "browser", exclude: true}, {type: "tab", exclude: true}, {}]
(i.e. include everything but `browser` and `tab`).

Type: **array**

#### Target.WindowState Experimental [#](#type-WindowState "Double click to copy markdown-formatted URL")

The state of the target window.

Allowed Values: `normal`, `minimized`, `maximized`, `fullscreen`

Type: **string**
