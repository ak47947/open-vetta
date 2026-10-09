export const WINDOWS_RELEASE_TARGETS = Object.freeze(["inno", "msi", "zip"]);

export const WINDOWS_SUPPLEMENTAL_EXTENSIONS = Object.freeze([".msi", ".zip"]);

export function windowsSupplementalArtifactNames(version, productName = "Atrix") {
	return WINDOWS_SUPPLEMENTAL_EXTENSIONS.map((extension) => `${productName}-${version}-win-x64${extension}`);
}
