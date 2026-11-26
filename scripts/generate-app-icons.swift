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
func color(_ rgb: UInt32) -> CGColor {
    let components = [16, 8, 0].map { CGFloat((rgb >> $0) & 0xFF) / 255 }
    return CGColor(colorSpace: colorSpace, components: components + [1])!
}

let background = color(0xEFF4FA)

enum IconMotif {
    case binary, code, design, work, study, read, game, sport, cook, travel, sleep
}

struct DesktopIconVariant {
    let id: String
    let tileColor: UInt32
    let badge: (motif: IconMotif, color: UInt32)?

    init(_ id: String, _ tileColor: UInt32, badge: (IconMotif, UInt32)? = nil) {
        self.id = id
        self.tileColor = tileColor
        self.badge = badge
    }
}

let desktopVariants = [
    DesktopIconVariant("red", 0xF7ABAE),
    DesktopIconVariant("black", 0x15161B),
    DesktopIconVariant("light", 0xDEE9FF),
    DesktopIconVariant("dark", 0x232B4B),
    DesktopIconVariant("binary", 0xC9E6DC, badge: (.binary, 0x226951)),
    DesktopIconVariant("ermine", 0xFFFCF5),
    DesktopIconVariant("coding", 0xCFE3FA, badge: (.code, 0x1E4D94)),
    DesktopIconVariant("design", 0xF0DDF7, badge: (.design, 0x85439C)),
    DesktopIconVariant("work", 0xE2E7EE, badge: (.work, 0x455873)),
    DesktopIconVariant("study", 0xDFEDCA, badge: (.study, 0x547331)),
    DesktopIconVariant("read", 0xF5E5CB, badge: (.read, 0x8A5B2D)),
    DesktopIconVariant("game", 0xDFDBF8, badge: (.game, 0x5E47AA)),
    DesktopIconVariant("sport", 0xF9E6B0, badge: (.sport, 0x9B5C0E)),
    DesktopIconVariant("cook", 0xF8DCCF, badge: (.cook, 0xAA4D3E)),
    DesktopIconVariant("travel", 0xD2EDF1, badge: (.travel, 0x21697D)),
    DesktopIconVariant("sleep", 0xCBD2ED, badge: (.sleep, 0x414581)),
]

func drawBadge(_ motif: IconMotif, tint: CGColor, in tile: CGRect, context: CGContext) {
    let diameter = tile.width * 0.27
    let disk = CGRect(x: tile.minX + tile.width * 0.63, y: tile.minY + tile.height * 0.63,
                      width: diameter, height: diameter)
    context.setFillColor(tint)
    context.fillEllipse(in: disk)

    context.saveGState()
    let unit = diameter * 0.7 / 24
    context.translateBy(x: disk.midX - 12 * unit, y: disk.midY - 12 * unit)
    context.scaleBy(x: unit, y: unit)
    context.setStrokeColor(color(0xFFFFFF))
    context.setFillColor(color(0xFFFFFF))
    context.setLineWidth(2.2)
    context.setLineCap(.round)
    context.setLineJoin(.round)

    func line(_ points: (CGFloat, CGFloat)...) {
        context.addLines(between: points.map { CGPoint(x: $0.0, y: $0.1) })
    }

    func outline(_ x: CGFloat, _ y: CGFloat, _ width: CGFloat, _ height: CGFloat, radius: CGFloat) {
        let rect = CGRect(x: x, y: y, width: width, height: height)
        context.addPath(CGPath(roundedRect: rect, cornerWidth: radius, cornerHeight: radius, transform: nil))
    }

    switch motif {
    case .binary:
        outline(4, 5, 7, 14, radius: 3.5)
        line((14, 16), (17, 19), (17, 5))
        line((14, 5), (20, 5))
    case .code:
        line((7, 16), (3, 12), (7, 8))
        line((17, 16), (21, 12), (17, 8))
        line((14, 19), (10, 5))
    case .design:
        line((5, 5), (7, 14), (16, 20), (20, 16), (14, 7), (5, 5), (11, 11))
    case .work:
        outline(3, 5, 18, 12, radius: 2)
        line((9, 17), (9, 20), (15, 20), (15, 17))
        line((3, 12), (21, 12))
    case .study:
        line((2, 14), (12, 19), (22, 14), (12, 9), (2, 14))
        line((6, 12), (6, 7), (12, 5), (18, 7), (18, 12))
    case .read:
        line((12, 16), (4, 19), (4, 7), (12, 4), (20, 7), (20, 19), (12, 16), (12, 4))
    case .game:
        outline(2, 6, 20, 12, radius: 5)
        line((5.5, 12), (11.5, 12))
        line((8.5, 9), (8.5, 15))
        context.addEllipse(in: CGRect(x: 16, y: 11.5, width: 1, height: 1))
    case .sport:
        line((3, 8), (3, 16))
        line((7, 5), (7, 19))
        line((7, 12), (17, 12))
        line((17, 5), (17, 19))
        line((21, 8), (21, 16))
    case .cook:
        line((5, 20), (5, 14), (11, 14), (11, 20))
        line((8, 20), (8, 4))
        line((19, 4), (19, 20), (15, 11), (19, 11))
    case .travel:
        line((3, 13), (21, 20), (16, 4), (12, 10), (3, 13))
        line((12, 10), (21, 20))
    case .sleep:
        context.move(to: CGPoint(x: 20, y: 8))
        context.addCurve(to: CGPoint(x: 12, y: 21), control1: CGPoint(x: 8, y: 4), control2: CGPoint(x: 7, y: 16))
        context.addCurve(to: CGPoint(x: 20, y: 8), control1: CGPoint(x: -3, y: 20), control2: CGPoint(x: 5, y: -5))
        context.closePath()
    }
    context.drawPath(using: motif == .sleep ? .fill : .stroke)
    context.restoreGState()
}

func png(size: Int, shape: Shape, contentScale: CGFloat = 1, monochrome: Bool = false,
         variant: DesktopIconVariant? = nil) throws -> Data {
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
        context.setFillColor(variant.map { color($0.tileColor) } ?? background)
        context.fill(tile)
    }
    if shape != .background {
        if let badge = variant?.badge {
            // Leave room for the motif above and to the right of the emblem.
            let inset = tile.width * 0.08
            let offset = -tile.width * 0.04
            context.draw(master, in: tile.insetBy(dx: inset, dy: inset).offsetBy(dx: offset, dy: offset))
            drawBadge(badge.motif, tint: color(badge.color), in: tile, context: context)
        } else {
            let inset = tile.width * (1 - contentScale) / 2
            context.draw(master, in: tile.insetBy(dx: inset, dy: inset))
        }
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

for variant in desktopVariants {
    let artwork = try png(size: 512, shape: .square, variant: variant)
    let buildPath = "\(desktop)/build/app-icons/\(variant.id)"
    add("\(buildPath).png", artwork)
    add("\(buildPath)-mac.png", try png(size: 1024, shape: .mac, variant: variant))
    add("\(buildPath)-round.png", try png(size: 512, shape: .rounded, variant: variant))
    add("\(desktop)/src/renderer/domains/settings/assets/app-icons/\(variant.id).png", artwork)
}

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
