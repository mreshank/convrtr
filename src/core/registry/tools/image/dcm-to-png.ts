import type { Tool } from "../../types";

export const dcmToPng: Tool = {
	id: "image/dcm-to-png",
	slug: "dcm-to-png",
	category: "image",
	kind: "extract",
	accept: {
		mime: [
			"application/dicom",
			"application/x-dicom",
			"image/dicom",
			"application/octet-stream",
		],
		ext: ["dcm", "dicom"],
	},
	output: { ext: "png", mime: "image/png" },
	engines: ["extract:dcm-to-png"],
	quality: {
		losslessAvailable: true,
		defaultPreset: "lossless",
		presets: [
			{
				id: "lossless",
				label: "Auto Contrast Lossless PNG",
				explanation:
					"Automatically calculates optimal Window/Level contrast curves from image metadata or voxel dynamic range to produce a crisp, diagnostic-grade 32-bit PNG.",
				params: {},
			},
			{
				id: "bone-window",
				label: "Bone Window (CT W:1500 C:400)",
				explanation:
					"Applies standard computed tomography bone windowing (Window Width 1500, Center 400) for sharp cortical bone visualization.",
				params: { windowCenter: 400, windowWidth: 1500 },
			},
			{
				id: "soft-tissue",
				label: "Soft Tissue Window (CT W:400 C:40)",
				explanation:
					"Applies standard soft tissue windowing (Window Width 400, Center 40) for brain, liver, and abdominal organ differentiation.",
				params: { windowCenter: 40, windowWidth: 400 },
			},
			{
				id: "invert",
				label: "Inverted Grayscale (Film View)",
				explanation:
					"Inverts luminance values to replicate traditional transparent radiographic film sheets.",
				params: { invert: true },
			},
		],
		advanced: [
			{
				control: "toggle",
				key: "invert",
				label: "Invert Monochromacy (Negative Film)",
				group: "Contrast",
				default: false,
			},
			{
				control: "select",
				key: "windowPreset",
				label: "Radiology Window Presets",
				group: "Windowing",
				default: "auto",
				options: [
					{ value: "auto", label: "Auto (Metadata / Dynamic Range)" },
					{ value: "bone", label: "Bone Window (C: 400, W: 1500)" },
					{ value: "soft", label: "Soft Tissue (C: 40, W: 400)" },
					{ value: "lung", label: "Lung Window (C: -600, W: 1500)" },
				],
			},
		],
	},
	seo: {
		title: "DICOM to PNG — Convert Medical Scans (.dcm) to PNG | convrtr",
		h1: "Convert DICOM Medical Imaging (.dcm) to PNG",
		intent:
			"Convert DICOM medical imaging scans (.dcm, .dicom) including CT, MRI, X-ray, and ultrasound into lossless 32-bit RGBA PNG directly in your browser. 100% private in-browser HIPAA-compliant decoder.",
		faq: [
			{
				q: "What is a DICOM (.dcm) file?",
				a: "DICOM (Digital Imaging and Communications in Medicine) is the global standard format for storing and transmitting medical images (such as CT scans, MRI, X-rays, mammography, and ultrasound). DICOM files combine medical image pixel arrays with clinical metadata (patient tags, modality, acquisition parameters, slice position).",
			},
			{
				q: "Why convert DICOM to PNG?",
				a: "Patients and researchers often receive medical scans on CDs or USB drives after an imaging appointment, but consumer operating systems (Windows, macOS, iOS, Android) cannot natively open .dcm files without specialized PACS software. Converting to PNG produces a standard, lossless image that can be viewed, shared with consulting physicians, or archived.",
			},
			{
				q: "Is my medical data kept private and confidential?",
				a: "Yes, completely. convrtr processes your DICOM files 100% locally inside your web browser memory using pure TypeScript. No images, scans, patient IDs, or metadata are ever uploaded to any cloud server or third party, guaranteeing absolute privacy and HIPAA compliance by design.",
			},
			{
				q: "What is Window/Level contrast adjustment?",
				a: "Medical scanners capture high-dynamic-range data (e.g. 12-bit or 16-bit Hounsfield units from -1000 for air to +1000 for dense bone), whereas standard screens display 8-bit color (0 to 255). Windowing compresses a selected slice of voxel values into displayable grayscale, emphasizing either soft tissue, lung parenchyma, or bone structures.",
			},
		],
		related: [
			"image/fits-to-png",
			"image/sgi-to-png",
			"image/ras-to-png",
			"image/tga-to-png",
		],
	},
};
