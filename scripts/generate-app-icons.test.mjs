import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function pngInfo(data) {
	expect(data.subarray(0, 8)).toEqual(pngSignature);
	return { width: data.readUInt32BE(16), height: data.readUInt32BE(20), colorType: data[25] };
}

// Decode the generator's 8-bit RGB/RGBA PNGs to verify visible pixels as well as headers.
function pngPixels(path) {
	const data = readFileSync(join(root, path));
	const { width, height, colorType } = pngInfo(data);
	expect(data[24]).toBe(8);
	expect(data[28]).toBe(0);
	const channels = colorType === 6 ? 4 : 3;
	const chunks = [];
	for (let offset = 8; offset < data.length; ) {
		const length = data.readUInt32BE(offset);
		if (data.toString("ascii", offset + 4, offset + 8) === "IDAT") {
			chunks.push(data.subarray(offset + 8, offset + 8 + length));
		}
		offset += length + 12;
	}
	const raw = inflateSync(Buffer.concat(chunks));
	const stride = width * channels;
	const pixels = Buffer.alloc(stride * height);
	function paeth(left, up, upperLeft) {
		const prediction = left + up - upperLeft;
		const a = Math.abs(prediction - left);
		const b = Math.abs(prediction - up);
		const c = Math.abs(prediction - upperLeft);
		return a <= b && a <= c ? left : b <= c ? up : upperLeft;
	}
	for (let y = 0; y < height; y++) {
		const filter = raw[y * (stride + 1)];
		expect(filter).toBeLessThanOrEqual(4);
		for (let x = 0; x < stride; x++) {
			const offset = y * stride + x;
			const left = x >= channels ? pixels[offset - channels] : 0;
			const up = y > 0 ? pixels[offset - stride] : 0;
			const upperLeft = x >= channels && y > 0 ? pixels[offset - stride - channels] : 0;
			const prediction = [0, left, up, Math.floor((left + up) / 2), paeth(left, up, upperLeft)][filter];
			pixels[offset] = (raw[y * (stride + 1) + 1 + x] + prediction) & 255;
		}
	}
	return {
		width,
		height,
		at(x, y) {
			const offset = (y * width + x) * channels;
			return [pixels[offset], pixels[offset + 1], pixels[offset + 2], channels === 4 ? pixels[offset + 3] : 255];
		},
	};
}

function checkOutputs(directory) {
	const read = (path) => readFileSync(join(directory, path));
	const checkPng = (path, size, alpha) => {
		const info = pngInfo(read(path));
		expect(info, path).toEqual({ width: size, height: size, colorType: alpha ? 6 : 2 });
	};
	checkPng("apps/desktop/build/icon.png", 1024, true);
	checkPng("apps/desktop/build/icon-dock.png", 1024, true);
	checkPng("apps/desktop/src/renderer/public/icon.png", 256, true);
	checkPng("apps/mobile/client-apple/Vetta/Resources/Assets.xcassets/AppIcon.appiconset/AppIcon.png", 1024, false);
	checkPng("apps/docs-site/public/images/atrix-app-icon.png", 384, false);
	checkPng("apps/docs-site/public/favicon.png", 64, true);
	const android = "apps/mobile/client-android";
	for (const [density, launcher, adaptive, status] of [
		["mdpi", 48, 108, 24],
		["hdpi", 72, 162, 36],
		["xhdpi", 96, 216, 48],
		["xxhdpi", 144, 324, 72],
		["xxxhdpi", 192, 432, 96],
	]) {
		const mipmap = `${android}/androidApp/src/main/res/mipmap-${density}`;
		checkPng(`${mipmap}/ic_launcher.png`, launcher, true);
		checkPng(`${mipmap}/ic_launcher_round.png`, launcher, true);
		checkPng(`${mipmap}/ic_launcher_background.png`, adaptive, false);
		checkPng(`${mipmap}/ic_launcher_foreground.png`, adaptive, true);
		checkPng(`${android}/shared/src/androidMain/res/drawable-${density}/ic_stat_vetta.png`, status, true);
	}

	const ico = read("apps/desktop/build/icon.ico");
	expect(ico.readUInt16LE(0)).toBe(0);
	expect(ico.readUInt16LE(2)).toBe(1);
	const windowsSizes = [16, 24, 32, 48, 64, 128, 256];
	expect(ico.readUInt16LE(4)).toBe(windowsSizes.length);
	let offset = 6 + windowsSizes.length * 16;
	for (const [index, size] of windowsSizes.entries()) {
		const entry = 6 + index * 16;
		expect(ico[entry] || 256).toBe(size);
		expect(ico[entry + 1] || 256).toBe(size);
		expect(ico.readUInt16LE(entry + 6)).toBe(32);
		expect(ico.readUInt32LE(entry + 12)).toBe(offset);
		const length = ico.readUInt32LE(entry + 8);
		expect(pngInfo(ico.subarray(offset, offset + length))).toMatchObject({ width: size, height: size });
		offset += length;
	}
	expect(offset).toBe(ico.length);

	const icns = read("apps/desktop/build/icon.icns");
	expect(icns.toString("ascii", 0, 4)).toBe("icns");
	expect(icns.readUInt32BE(4)).toBe(icns.length);
	offset = 8;
	for (const [type, size] of [
		["icp4", 16],
		["icp5", 32],
		["icp6", 64],
		["ic07", 128],
		["ic08", 256],
		["ic09", 512],
		["ic10", 1024],
	]) {
		expect(icns.toString("ascii", offset, offset + 4)).toBe(type);
		const length = icns.readUInt32BE(offset + 4);
		expect(pngInfo(icns.subarray(offset + 8, offset + length))).toMatchObject({ width: size, height: size });
		offset += length;
	}
	expect(offset).toBe(icns.length);
}

describe("application icon assets", () => {
	it("ships valid icons for every desktop and mobile platform", () => {
		checkOutputs(root);
	});

	it("preserves the blue emblem, ice background, and platform transparency masks", () => {
		const ios = pngPixels("apps/mobile/client-apple/Vetta/Resources/Assets.xcassets/AppIcon.appiconset/AppIcon.png");
		expect(ios.at(0, 0)).toEqual([239, 244, 250, 255]);
		const [red, green, blue, alpha] = ios.at(512, 256);
		expect(blue).toBeGreaterThan(red * 1.5);
		expect(blue).toBeGreaterThan(green * 1.2);
		expect(alpha).toBe(255);
		const dock = pngPixels("apps/desktop/build/icon-dock.png");
		expect(dock.at(0, 0)[3]).toBe(0);
		expect(dock.at(512, 110)).toEqual([239, 244, 250, 255]);
		const rounded = pngPixels("apps/desktop/build/icon.png");
		expect(rounded.at(0, 0)[3]).toBe(0);
		expect(rounded.at(512, 0)).toEqual([239, 244, 250, 255]);
	});

	it("keeps adaptive foregrounds inside the safe zone and notification pixels white", () => {
		const android = "apps/mobile/client-android";
		const foreground = pngPixels(`${android}/androidApp/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png`);
		const safeStart = (foreground.width * 21) / 108;
		const safeEnd = foreground.width - safeStart;
		let visible = 0;
		for (let y = 0; y < foreground.height; y++) {
			for (let x = 0; x < foreground.width; x++) {
				if (foreground.at(x, y)[3] <= 127) continue;
				visible++;
				expect(x >= safeStart && x < safeEnd && y >= safeStart && y < safeEnd).toBe(true);
			}
		}
		expect(visible).toBeGreaterThan(1000);
		const status = pngPixels(`${android}/shared/src/androidMain/res/drawable-xxxhdpi/ic_stat_vetta.png`);
		visible = 0;
		for (let y = 0; y < status.height; y++) {
			for (let x = 0; x < status.width; x++) {
				const pixel = status.at(x, y);
				if (pixel[3] <= 127) continue;
				visible++;
				expect(pixel.slice(0, 3)).toEqual([255, 255, 255]);
			}
		}
		expect(visible).toBeGreaterThan(100);
		expect(status.at(0, 0)[3]).toBe(0);
	});

	it.skipIf(process.platform !== "darwin")(
		"regenerates all platform icons from the master through the documented command",
		() => {
			const destination = mkdtempSync(join(tmpdir(), "atrix-icons-"));
			try {
				const result = spawnSync(
					"swift",
					[join(root, "scripts/generate-app-icons.swift"), "--output-root", destination],
					{
						encoding: "utf8",
						timeout: 60_000,
					},
				);
				expect(result.error).toBeUndefined();
				expect(result.status, result.stderr).toBe(0);
				checkOutputs(destination);
				// The shipped application and generated outputs must use the same master.
				expect(readFileSync(join(destination, "apps/desktop/build/icon.png"))).toEqual(
					readFileSync(join(root, "apps/desktop/build/icon.png")),
				);
			} finally {
				rmSync(destination, { recursive: true, force: true });
			}
		},
		65_000,
	);
});
