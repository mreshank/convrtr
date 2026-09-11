export interface XwdHeader {
	headerSize: number;
	fileVersion: number;
	pixmapFormat: number; // 0 = XYBitmap, 1 = XYPixmap, 2 = ZPixmap
	pixmapDepth: number;
	pixmapWidth: number;
	pixmapHeight: number;
	xOffset: number;
	byteOrder: number; // 0 = LSBFirst, 1 = MSBFirst
	bitmapUnit: number;
	bitmapBitOrder: number; // 0 = LSBFirst, 1 = MSBFirst
	bitmapPad: number;
	bitsPerPixel: number;
	bytesPerLine: number;
	visualClass: number; // 0 = StaticGray, 1 = GrayScale, 2 = StaticColor, 3 = PseudoColor, 4 = TrueColor, 5 = DirectColor
	redMask: number;
	greenMask: number;
	blueMask: number;
	bitsPerRgb: number;
	colormapEntries: number;
	ncolors: number;
	windowWidth: number;
	windowHeight: number;
	windowX: number;
	windowY: number;
	windowBorderWidth: number;
	windowName: string;
}

export interface XwdColor {
	pixel: number;
	r: number;
	g: number;
	b: number;
}
