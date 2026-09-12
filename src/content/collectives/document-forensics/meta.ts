import type { CollectiveMeta } from "../types";

export const meta: CollectiveMeta = {
	slug: "document-forensics",
	title: "Document forensics and legacy archive extraction",
	why: "When dealing with orphaned help manuals, offline web archives, email backups, and proprietary tablet notebooks, cloud tools often fail or leak sensitive records. Unpack Windows Compiled HTML Help CHM files, extract Outlook MSG emails to standard EML, convert GoodNotes notebooks to PDF, and unpack WebArchive files locally with zero network leakage.",
	toolIds: [
		"document/chm-to-zip",
		"document/mhtml-to-html",
		"document/webarchive-to-html",
		"document/msg-to-eml",
		"document/goodnotes-to-pdf",
		"document/bibtex-to-markdown",
		"document/nfo-to-html",
		"document/org-to-markdown",
		"image/dcm-to-png",
		"document/enex-to-markdown",
	],
};
