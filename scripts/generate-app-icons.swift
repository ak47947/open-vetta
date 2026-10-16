// Regenerate checked-in application icons on macOS without third-party dependencies.
// Usage: swift scripts/generate-app-icons.swift [--output-root <directory>]
import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

enum IconError: Error, CustomStringConvertible {
    case invalid(String)
    var description: String {
        switch self { case .invalid(let message): return message }
    }
}

enum Shape { case square, rounded, mac, circle, transparent, background }

let repository = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent()
let arguments = Array(CommandLine.arguments.dropFirst())
let outputRoot: URL
if arguments.isEmpty {
    outputRoot = repository
} else if arguments.count == 2, arguments[0] == "--output-root" {
    outputRoot = URL(fileURLWithPath: arguments[1], isDirectory: true)
} else {
    throw IconError.invalid("Usage: swift scripts/generate-app-icons.swift [--output-root <directory>]")
}

let sourceURL = repository.appendingPathComponent("docs/assets/atrix-icon-master.png")
guard let source = CGImageSourceCreateWithURL(sourceURL as CFURL, nil),
      let master = CGImageSourceCreateImageAtIndex(source, 0, nil),
      master.width == master.height, master.width >= 1024 else {
    throw IconError.invalid("The icon master must be a square PNG of at least 1024 pixels.")
}
let colorSpace = CGColorSpace(name: CGColorSpace.sRGB)!
let background = CGColor(colorSpace: colorSpace, components: [239.0 / 255, 244.0 / 255, 250.0 / 255, 1])!

func png(size: Int, shape: Shape, contentScale: CGFloat = 1, monochrome: Bool = false) throws -> Data {
    let opaque = shape == .square || shape == .background
    let alpha = opaque ? CGImageAlphaInfo.noneSkipLast : CGImageAlphaInfo.premultipliedLast
    guard let context = CGContext(data: nil, width: size, height: size, bitsPerComponent: 8,
                                  bytesPerRow: size * 4, space: colorSpace, bitmapInfo: alpha.rawValue) else {
        throw IconError.invalid("Cannot allocate a \(size)-pixel icon.")
    }
    context.interpolationQuality = .high
    let bounds = CGRect(x: 0, y: 0, width: size, height: size)
    // macOS supplies no icon mask: match the inset tile used by native Dock icons.
    let tile = shape == .mac ? bounds.insetBy(dx: CGFloat(size) * 0.1, dy: CGFloat(size) * 0.1) : bounds
    if shape == .rounded || shape == .mac {
        context.addPath(CGPath(roundedRect: tile, cornerWidth: tile.width * 0.22,
                               cornerHeight: tile.height * 0.22, transform: nil))
        context.clip()
    } else if shape == .circle {
        context.addEllipse(in: tile)
        context.clip()
    }
    if shape != .transparent {
        context.setFillColor(background)
        context.fill(tile)
    }
    if shape != .background {
        let inset = tile.width * (1 - contentScale) / 2
        context.draw(master, in: tile.insetBy(dx: inset, dy: inset))
        if monochrome {
            context.setBlendMode(.sourceIn)
            context.setFillColor(CGColor(gray: 1, alpha: 1))
            context.fill(bounds)
        }
    }
    guard let image = context.makeImage() else { throw IconError.invalid("Cannot render icon.") }
    let data = NSMutableData()
    guard let destination = CGImageDestinationCreateWithData(data, UTType.png.identifier as CFString, 1, nil) else {
        throw IconError.invalid("Cannot create PNG encoder.")
    }
    CGImageDestinationAddImage(destination, image, nil)
    guard CGImageDestinationFinalize(destination) else { throw IconError.invalid("Cannot encode PNG.") }
    return data as Data
}

func uint16LE(_ value: Int) -> Data {
    var value = UInt16(value).littleEndian
    return withUnsafeBytes(of: &value) { Data($0) }
}

func uint32(_ value: Int, bigEndian: Bool = false) -> Data {
    var value = bigEndian ? UInt32(value).bigEndian : UInt32(value).littleEndian
    return withUnsafeBytes(of: &value) { Data($0) }
}

func windowsIcon() throws -> Data {
    let sizes = [16, 24, 32, 48, 64, 128, 256]
    let images = try sizes.map { try png(size: $0, shape: .rounded) }
    var directory = uint16LE(0) + uint16LE(1) + uint16LE(sizes.count)
    var offset = 6 + sizes.count * 16
    for (size, image) in zip(sizes, images) {
        // ICO stores 256 as zero; modern Windows accepts PNG frames at every size.
        directory.append(contentsOf: [UInt8(size % 256), UInt8(size % 256), 0, 0])
        directory.append(uint16LE(1) + uint16LE(32) + uint32(image.count) + uint32(offset))
        offset += image.count
    }
    return directory + images.reduce(into: Data()) { $0.append($1) }
}

func macIcon() throws -> Data {
    let representations = [("icp4", 16), ("icp5", 32), ("icp6", 64), ("ic07", 128),
                           ("ic08", 256), ("ic09", 512), ("ic10", 1024)]
    var elements = Data()
    for (type, size) in representations {
        let image = try png(size: size, shape: .mac)
        elements.append(Data(type.utf8) + uint32(image.count + 8, bigEndian: true) + image)
    }
    return Data("icns".utf8) + uint32(elements.count + 8, bigEndian: true) + elements
}

var outputs: [(String, Data)] = []
func add(_ path: String, _ data: Data) { outputs.append((path, data)) }

let desktop = "apps/desktop"
let appIcon = try png(size: 1024, shape: .rounded)
add("\(desktop)/build/icon.png", appIcon)
add("\(desktop)/build/icon-dock.png", try png(size: 1024, shape: .mac))
add("\(desktop)/build/icon.ico", try windowsIcon())
add("\(desktop)/build/icon.icns", try macIcon())
add("\(desktop)/src/renderer/public/icon.png", try png(size: 256, shape: .rounded))

// iOS applies its own mask and rejects an alpha channel, even if every pixel is opaque.
add("apps/mobile/client-apple/Vetta/Resources/Assets.xcassets/AppIcon.appiconset/AppIcon.png",
    try png(size: 1024, shape: .square))

let android = "apps/mobile/client-android"
let launcherResources = "\(android)/androidApp/src/main/res"
let sharedResources = "\(android)/shared/src/androidMain/res"
for (density, launcherSize, adaptiveSize, statusSize) in [
    ("mdpi", 48, 108, 24), ("hdpi", 72, 162, 36), ("xhdpi", 96, 216, 48),
    ("xxhdpi", 144, 324, 72), ("xxxhdpi", 192, 432, 96),
] {
    let mipmap = "\(launcherResources)/mipmap-\(density)"
    add("\(mipmap)/ic_launcher.png", try png(size: launcherSize, shape: .rounded))
    add("\(mipmap)/ic_launcher_round.png", try png(size: launcherSize, shape: .circle))
    add("\(mipmap)/ic_launcher_background.png", try png(size: adaptiveSize, shape: .background))
    // The visible adaptive-icon viewport is 72dp of a 108dp layer. Keep the same
    // logo scale as the legacy icon and stay inside Android's 66dp safe zone.
    add("\(mipmap)/ic_launcher_foreground.png",
        try png(size: adaptiveSize, shape: .transparent, contentScale: 2.0 / 3))
    add("\(sharedResources)/drawable-\(density)/ic_stat_vetta.png",
        try png(size: statusSize, shape: .transparent, monochrome: true))
}

// This also serves as apple-touch-icon; the site applies its own CSS corner masks.
add("apps/docs-site/public/images/atrix-app-icon.png", try png(size: 384, shape: .square))
add("apps/docs-site/public/favicon.png", try png(size: 64, shape: .rounded))

// Finish rendering before touching any checked-in output.
for (path, data) in outputs {
    let url = outputRoot.appendingPathComponent(path)
    try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
    try data.write(to: url, options: .atomic)
}
print("Generated \(outputs.count) application icon assets from docs/assets/atrix-icon-master.png")
