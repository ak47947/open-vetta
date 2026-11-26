export const WINDOWS_RELEASE_TARGETS = Object.freeze(["inno", "msi", "zip"]);

export const WINDOWS_SUPPLEMENTAL_EXTENSIONS = Object.freeze([".msi", ".zip"]);

export const WINDOWS_RELEASE_ARCHS = Object.freeze(["x64", "arm64"]);

/** electron-builder 的 productName 决定产物名，必须与 prepare-pack 保持一致。 */
export const WINDOWS_PRODUCT_NAME = "Atrix";

/** 改名过渡期：历史构建目录里可能还留着旧产品名的产物。 */
export const WINDOWS_LEGACY_PRODUCT_NAMES = Object.freeze(["Vetta"]);

export function windowsSupplementalArtifactNames(version, arch = "x64", productName = WINDOWS_PRODUCT_NAME) {
	return WINDOWS_SUPPLEMENTAL_EXTENSIONS.map((extension) => `${productName}-${version}-win-${arch}${extension}`);
}
