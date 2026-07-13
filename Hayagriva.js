{
	"translatorID": "b8a08333-55b2-4b12-b75d-80457b8bcff6",
	"label": "Hayagriva",
	"creator": "minimarimo3 + ChatGPT",
	"target": "yaml",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": false,
	"translatorType": 2,
	"lastUpdated": "2026-03-13 00:00:00"
}

// Hayagriva export translator for Zotero
// References:
// - Zotero translator docs: https://www.zotero.org/support/dev/translators
// - Hayagriva file format: https://github.com/typst/hayagriva/blob/main/docs/file-format.md

function doExport() {
	var seenKeys = Object.create(null);
	var item;
	while ((item = Zotero.nextItem())) {
		if (!item || item.itemType === "note" || item.itemType === "attachment") continue;

		var entry = buildEntry(item);
		var key = makeUniqueCitationKey(generateCitationKey(item), seenKeys);

		Zotero.write(key + ":\n");
		Zotero.write(serializeMapping(entry, 2));
		Zotero.write("\n");
	}
}

function buildEntry(item) {
	var entryType = getHayagrivaType(item);
	var parent = buildParent(item, entryType);
	var creatorData = buildCreators(item, entryType, parent);
	var identifiers = collectSerialNumbers(item);

	var entry = {};
	entry.type = entryType;
	assign(entry, "title", cleanText(item.title));
	assign(entry, "author", creatorData.author);
	assign(entry, "date", normalizeDate(item.date));
	assign(entry, "editor", creatorData.editor);
	assign(entry, "affiliated", creatorData.affiliated);
	assign(entry, "publisher", buildTopLevelPublisher(item, entryType, !!parent));
	assign(entry, "organization", buildOrganization(item, entryType));
	assign(entry, "location", buildTopLevelLocation(item, entryType, !!parent));
	assign(entry, "serial-number", identifiers);
	assign(entry, "language", cleanValue(item.language));
	assign(entry, "edition", shouldKeepTopLevelNumbering(entryType, parent) ? toNumberIfPossible(item.edition) : null);
	assign(entry, "genre", buildGenre(item, entryType));
	assign(entry, "issue", shouldKeepTopLevelNumbering(entryType, parent) ? toNumberIfPossible(item.issue) : null);
	assign(entry, "volume", shouldKeepTopLevelNumbering(entryType, parent) ? toNumberIfPossible(item.volume) : null);
	assign(entry, "volume-total", shouldKeepTopLevelNumbering(entryType, parent) ? toNumberIfPossible(item.numberOfVolumes) : null);
	assign(entry, "chapter", shouldKeepTopLevelNumbering(entryType, parent) ? toNumberIfPossible(item.section) : null);
	assign(entry, "page-range", normalizePageRange(item.pages));
	assign(entry, "page-total", toNumberIfPossible(item.numPages));
	assign(entry, "url", buildUrl(item.url, item.accessDate));
	assign(entry, "archive", cleanValue(item.archive));
	assign(entry, "archive-location", cleanValue(item.archiveLocation));
	assign(entry, "call-number", cleanValue(item.callNumber));
	assign(entry, "runtime", cleanValue(item.runningTime));
	assign(entry, "abstract", cleanText(item.abstractNote));
	assign(entry, "note", buildNote(item));
	assign(entry, "parent", parent);
	return entry;
}

function buildCreators(item, entryType, parent) {
	var authors = [];
	var editors = [];
	var affiliatedByRole = Object.create(null);
	var parentEditors = [];

	var creators = item.creators || [];
	for (var i = 0; i < creators.length; i++) {
		var creator = creators[i];
		var name = formatCreator(creator);
		if (!name) continue;

		if (creator.creatorType === "author") {
			authors.push(name);
			continue;
		}

		if (creator.creatorType === "editor") {
			if (shouldAttachEditorsToParent(item, entryType, parent)) {
				parentEditors.push(name);
			}
			else {
				editors.push(name);
			}
			continue;
		}

		if (creator.creatorType === "bookAuthor") {
			if (!parent) parent = {};
			if (!parent.author) parent.author = [];
			parent.author.push(name);
			continue;
		}

		if (creator.creatorType === "seriesEditor") {
			if (parent) {
				if (!parent.editor) parent.editor = [];
				parent.editor.push(name);
			}
			else {
				editors.push(name);
			}
			continue;
		}

		// Reasonable fallbacks for creator-heavy item types
		if (item.itemType === "interview" && creator.creatorType === "interviewee") {
			authors.push(name);
			continue;
		}
		if ((item.itemType === "presentation" || item.itemType === "podcast") && creator.creatorType === "presenter") {
			authors.push(name);
			continue;
		}

		var role = mapRole(creator.creatorType);
		if (!role) continue;
		if (!affiliatedByRole[role]) affiliatedByRole[role] = [];
		affiliatedByRole[role].push(name);
	}

	if (parent && parentEditors.length) {
		if (!parent.editor) parent.editor = [];
		parent.editor = parent.editor.concat(parentEditors);
	}

	var affiliated = [];
	for (var role in affiliatedByRole) {
		affiliated.push({
			role: role,
			names: affiliatedByRole[role].length === 1 ? affiliatedByRole[role][0] : affiliatedByRole[role]
		});
	}

	return {
		author: authors.length ? authors : null,
		editor: editors.length ? editors : null,
		affiliated: affiliated.length ? affiliated : null
	};
}

function shouldAttachEditorsToParent(item, entryType, parent) {
	if (!parent) return false;
	if (["article", "chapter", "entry", "anthos"].indexOf(entryType) !== -1) return true;
	if (item.itemType === "conferencePaper") return true;
	return false;
}

function buildParent(item, entryType) {
	var parent = {};

	if (["journalArticle", "magazineArticle", "newspaperArticle"].indexOf(item.itemType) !== -1) {
		parent.type = item.itemType === "newspaperArticle" ? "newspaper" : "periodical";
		assign(parent, "title", cleanText(item.publicationTitle));
		assign(parent, "volume", toNumberIfPossible(item.volume));
		assign(parent, "issue", toNumberIfPossible(item.issue));
		return hasContent(parent) ? parent : null;
	}

	if (item.itemType === "bookSection") {
		parent.type = entryType === "anthos" ? "anthology" : "book";
		assign(parent, "title", cleanText(item.bookTitle || item.publicationTitle));
		assign(parent, "volume", toNumberIfPossible(item.volume));
		assign(parent, "volume-total", toNumberIfPossible(item.numberOfVolumes));
		assign(parent, "edition", cleanValue(item.edition));
		assign(parent, "publisher", buildPublisher(item.publisher, item.place));
		return hasContent(parent) ? parent : null;
	}

	if (item.itemType === "encyclopediaArticle" || item.itemType === "dictionaryEntry") {
		parent.type = "reference";
		assign(parent, "title", cleanText(item.encyclopediaTitle || item.dictionaryTitle || item.publicationTitle));
		assign(parent, "volume", toNumberIfPossible(item.volume));
		assign(parent, "edition", cleanValue(item.edition));
		assign(parent, "publisher", buildPublisher(item.publisher, item.place));
		return hasContent(parent) ? parent : null;
	}

	if (item.itemType === "conferencePaper") {
		parent.type = item.publicationTitle ? "proceedings" : "conference";
		assign(parent, "title", cleanText(item.publicationTitle || item.conferenceName));
		assign(parent, "organization", cleanValue(item.proceedingsTitle ? null : item.conferenceName && !item.publicationTitle ? item.publisher : null));
		assign(parent, "publisher", buildPublisher(item.publisher, item.place));
		assign(parent, "volume", toNumberIfPossible(item.volume));
		return hasContent(parent) ? parent : null;
	}

	if (item.itemType === "blogPost") {
		parent.type = "blog";
		assign(parent, "title", cleanText(item.blogTitle || item.websiteTitle || item.publicationTitle));
		return hasContent(parent) ? parent : null;
	}

	if (item.itemType === "webpage") {
		parent.type = "web";
		assign(parent, "title", cleanText(item.websiteTitle || item.publicationTitle));
		return hasContent(parent) ? parent : null;
	}

	if (item.itemType === "forumPost") {
		parent.type = "thread";
		assign(parent, "title", cleanText(item.forumTitle || item.websiteTitle || item.publicationTitle));
		assign(parent, "url", buildUrl(item.url, item.accessDate));
		return hasContent(parent) ? parent : null;
	}

	return null;
}

function getHayagrivaType(item) {
	if (item.itemType === "bookSection") {
		var hasBookAuthor = hasCreatorType(item, "bookAuthor");
		var hasEditor = hasCreatorType(item, "editor") || hasCreatorType(item, "seriesEditor");
		return hasEditor && !hasBookAuthor ? "anthos" : "chapter";
	}

	var map = {
		book: "book",
		journalArticle: "article",
		magazineArticle: "article",
		newspaperArticle: "article",
		thesis: "thesis",
		letter: "misc",
		manuscript: "manuscript",
		interview: "misc",
		film: "video",
		artwork: "artwork",
		webpage: "web",
		conferencePaper: "article",
		report: "report",
		bill: "legislation",
		case: "case",
		hearing: "misc",
		patent: "patent",
		statute: "legislation",
		email: "misc",
		map: "misc",
		blogPost: "article",
		instantMessage: "misc",
		forumPost: "thread",
		audioRecording: "audio",
		podcast: "audio",
		presentation: "misc",
		videoRecording: "video",
		tvBroadcast: "video",
		radioBroadcast: "audio",
		computerProgram: "repository",
		document: "misc",
		encyclopediaArticle: "entry",
		dictionaryEntry: "entry",
		dataset: "misc",
		preprint: "article",
		standard: "report"
	};

	return map[item.itemType] || "misc";
}

function buildTopLevelPublisher(item, entryType, hasParent) {
	if (hasParent) {
		if (["book", "report", "thesis", "manuscript", "patent", "legislation", "case", "misc", "repository", "artwork", "audio", "video", "web"].indexOf(entryType) === -1) {
			return null;
		}
	}

	if (entryType === "report" && !item.publisher && item.institution) return null;
	if (entryType === "thesis" && !item.publisher && item.university) return null;

	return buildPublisher(item.publisher, needsPublisherLocation(entryType, hasParent) ? item.place : null);
}

function needsPublisherLocation(entryType, hasParent) {
	if (hasParent && ["article", "chapter", "entry", "anthos"].indexOf(entryType) !== -1) return false;
	return ["book", "report", "thesis", "manuscript", "patent", "legislation", "case", "repository", "misc"].indexOf(entryType) !== -1;
}

function buildOrganization(item, entryType) {
	if (entryType === "thesis") return cleanValue(item.university || item.institution);
	if (entryType === "report") return cleanValue(item.institution || item.organization);
	if (entryType === "repository") return cleanValue(item.company || item.organization || item.publisher);
	if (entryType === "patent") return cleanValue(item.assignee);
	return cleanValue(item.organization);
}

function buildTopLevelLocation(item, entryType, hasParent) {
	if (!item.place) return null;
	if (needsPublisherLocation(entryType, hasParent)) return null;
	if (["video", "audio", "artwork", "misc", "performance"].indexOf(entryType) !== -1) return cleanValue(item.place);
	return null;
}

function buildGenre(item, entryType) {
	if (entryType === "thesis") return cleanValue(item.thesisType || "thesis");
	if (entryType === "report") return cleanValue(item.reportType);
	if (item.itemType === "webpage") return cleanValue(item.websiteType);
	if (item.itemType === "artwork") return cleanValue(item.artworkMedium || item.type);
	if (item.itemType === "interview") return "interview";
	if (item.itemType === "letter") return "letter";
	if (item.itemType === "presentation") return cleanValue(item.presentationType || "presentation");
	if (item.itemType === "standard") return "standard";
	return null;
}

function buildNote(item) {
	var parts = [];
	var extraNote = stripStructuredExtra(item.extra);
	if (extraNote) parts.push(cleanText(extraNote));
	if (item.medium && item.itemType !== "artwork") parts.push("Medium: " + cleanText(item.medium));
	if (item.libraryCatalog) parts.push("Catalog: " + cleanText(item.libraryCatalog));
	var note = parts.filter(Boolean).join("\n\n");
	return note || null;
}


function shouldKeepTopLevelNumbering(entryType, parent) {
	if (!parent) return true;
	return ["book", "report", "thesis", "manuscript", "case", "legislation", "patent", "repository", "misc", "artwork", "audio", "video", "web"].indexOf(entryType) !== -1;
}

function stripStructuredExtra(extra) {
	if (!extra) return null;
	var lines = String(extra).split(/\r?\n/);
	var kept = [];
	for (var i = 0; i < lines.length; i++) {
		var line = lines[i].trim();
		if (!line) {
			kept.push(lines[i]);
			continue;
		}
		if (/^(DOI|ISBN|ISSN|PMID|PMCID|arXiv|LCCN|MR|Zbl|Version|Version Number|Report Number|Patent Number|Docket Number)\s*:/i.test(line)) continue;
		kept.push(lines[i]);
	}
	var joined = kept.join("\n").trim();
	return joined || null;
}

function buildPublisher(name, location) {
	name = cleanValue(name);
	location = cleanValue(location);
	if (!name) return null;
	if (location) return { name: name, location: location };
	return name;
}

function buildUrl(url, accessDate) {
	url = cleanValue(url);
	if (!url) return null;
	var date = normalizeDate(accessDate);
	if (date) {
		return {
			value: url,
			date: date
		};
	}
	return url;
}

function collectSerialNumbers(item) {
	var serials = {};
	assign(serials, "doi", cleanValue(item.DOI));
	assign(serials, "isbn", cleanValue(item.ISBN));
	assign(serials, "issn", cleanValue(item.ISSN));
	assign(serials, "pmid", cleanValue(item.PMID));
	assign(serials, "pmcid", cleanValue(item.PMCID));

	if (item.itemType === "report") assign(serials, "serial", cleanValue(item.reportNumber));
	if (item.itemType === "patent") assign(serials, "serial", cleanValue(item.patentNumber));
	if (item.itemType === "computerProgram") assign(serials, "version", cleanValue(item.versionNumber || item.version));
	if (item.itemType === "case") assign(serials, "serial", cleanValue(item.docketNumber));

	var extraFields = parseExtraFields(item.extra);
	mergePreferExisting(serials, extraFields);

	return hasContent(serials) ? serials : null;
}

function parseExtraFields(extra) {
	var serials = {};
	if (!extra) return serials;

	var lines = String(extra).split(/\r?\n/);
	for (var i = 0; i < lines.length; i++) {
		var line = lines[i].trim();
		if (!line) continue;
		var m = line.match(/^(DOI|ISBN|ISSN|PMID|PMCID|arXiv|LCCN|MR|Zbl|Version|Version Number|Report Number|Patent Number|Docket Number)\s*:\s*(.+)$/i);
		if (!m) continue;
		var label = m[1].toLowerCase();
		var value = cleanValue(m[2]);
		if (!value) continue;

		if (label === "version" || label === "version number") serials.version = value;
		else if (label === "report number" || label === "patent number" || label === "docket number") serials.serial = value;
		else serials[label] = value;
	}

	return serials;
}

function mapRole(creatorType) {
	var map = {
		translator: "translator",
		contributor: "collaborator",
		interviewee: "collaborator",
		interviewer: "collaborator",
		director: "director",
		scriptwriter: "writer",
		producer: "producer",
		castMember: "cast-member",
		sponsor: "organizer",
		counsel: "collaborator",
		inventor: "holder",
		artist: "illustrator",
		performer: "cast-member",
		composer: "composer",
		wordsBy: "writer",
		cartographer: "illustrator",
		programmer: "writer",
		podcaster: "executive-producer",
		presenter: "cast-member",
		guest: "collaborator",
		host: "collaborator"
	};
	return map[creatorType] || "collaborator";
}

function formatCreator(creator) {
	if (!creator) return null;
	if (creator.fieldMode === 1 && creator.lastName) return cleanValue(creator.lastName);
	if (creator.name) return cleanValue(creator.name);

	var last = cleanValue(creator.lastName);
	var first = cleanValue(creator.firstName);
	if (last && first) return last + ", " + first;
	return last || first || null;
}

function generateCitationKey(item) {
	var parts = [];
	var authorish = getPrimaryKeyPart(item);
	var year = extractYear(item.date);
	var title = slugify(cleanText(item.title) || "untitled");

	if (authorish) parts.push(slugify(authorish));
	if (year) parts.push(year);
	if (title) parts.push(title);

	var key = parts.filter(Boolean).join("_") || "item";
	if (key.length > 40) key = key.slice(0, 40).replace(/_+$/g, "");
	return key || "item";
}

function getPrimaryKeyPart(item) {
	if (item.creators && item.creators.length) {
		for (var i = 0; i < item.creators.length; i++) {
			var creator = item.creators[i];
			if (creator.creatorType === "author" || creator.creatorType === "inventor" || creator.creatorType === "director" || creator.creatorType === "presenter") {
				return creator.lastName || creator.name || creator.firstName;
			}
		}
		var first = item.creators[0];
		if (first) return first.lastName || first.name || first.firstName;
	}
	return item.publisher || item.institution || item.organization || item.university || item.websiteTitle || domainFromUrl(item.url) || "item";
}

function extractYear(date) {
	var iso = normalizeDate(date) || cleanValue(date);
	if (!iso) return null;
	var m = String(iso).match(/^-?\d{4}/);
	return m ? m[0] : null;
}

function makeUniqueCitationKey(base, seenKeys) {
	base = base || "item";
	if (!seenKeys[base]) {
		seenKeys[base] = 1;
		return base;
	}
	seenKeys[base]++;
	var suffix = "_" + seenKeys[base];
	var trimmed = base;
	// if (trimmed.length + suffix.length > 40) {
	// 	trimmed = trimmed.slice(0, 40 - suffix.length).replace(/_+$/g, "");
	// }
	return trimmed + suffix;
}

function slugify(str) {
	str = cleanText(str || "");
	if (!str) return "";
	str = str.replace(/[^\p{L}\p{N}_-]+/gu, "_");
	str = str.replace(/^_+|_+$/g, "");
	return str.toLowerCase();
}

function normalizeDate(value) {
	if (!value) return null;
	var iso = Zotero.Utilities.strToISO(value);
	return iso || cleanValue(value);
}

function normalizePageRange(value) {
	value = cleanValue(value);
	if (!value) return null;
	return value.replace(/--+/g, "-");
}

function toNumberIfPossible(value) {
	if (value === undefined || value === null || value === "") return null;
	if (typeof value === "number") return value;
	var str = String(value).trim();
	if (/^-?\d+$/.test(str)) return parseInt(str, 10);
	return str;
}

function cleanText(str) {
	if (str === undefined || str === null || str === "") return null;
	str = String(str);
	str = str.replace(/<\s*br\s*\/?\s*>/gi, "\n");
	str = str.replace(/<\/p\s*>/gi, "\n");
	str = str.replace(/<[^>]+>/g, "");
	str = str.replace(/\u00A0/g, " ");
	str = str.replace(/[ \t\f\v]+/g, " ");
	str = str.replace(/\n\s+/g, "\n");
	str = str.replace(/\n{3,}/g, "\n\n");
	str = str.trim();
	return str || null;
}

function cleanValue(value) {
	if (value === undefined || value === null || value === "") return null;
	value = String(value).trim();
	return value || null;
}

function domainFromUrl(url) {
	url = cleanValue(url);
	if (!url) return null;
	var m = url.match(/^https?:\/\/([^\/]+)/i);
	if (!m) return null;
	return m[1].replace(/^www\./i, "");
}

function hasCreatorType(item, creatorType) {
	var creators = item.creators || [];
	for (var i = 0; i < creators.length; i++) {
		if (creators[i].creatorType === creatorType) return true;
	}
	return false;
}

function assign(obj, key, value) {
	if (value === undefined || value === null) return;
	if (typeof value === "string" && value === "") return;
	if (Array.isArray(value) && !value.length) return;
	if (isPlainObject(value) && !hasContent(value)) return;
	obj[key] = value;
}

function mergePreferExisting(target, source) {
	for (var key in source) {
		if (target[key] === undefined || target[key] === null || target[key] === "") {
			target[key] = source[key];
		}
	}
}

function hasContent(value) {
	if (value === undefined || value === null) return false;
	if (typeof value === "string") return value !== "";
	if (Array.isArray(value)) return value.length > 0;
	if (isPlainObject(value)) {
		for (var key in value) {
			if (hasContent(value[key])) return true;
		}
		return false;
	}
	return true;
}

function isPlainObject(value) {
	return Object.prototype.toString.call(value) === "[object Object]";
}

function serializeMapping(obj, indent) {
	var lines = [];
	for (var key in obj) {
		serializeField(lines, key, obj[key], indent);
	}
	return lines.join("");
}

function serializeField(lines, key, value, indent) {
	if (!hasContent(value)) return;
	var pad = repeat(" ", indent);

	if (Array.isArray(value)) {
		lines.push(pad + key + ":\n");
		for (var i = 0; i < value.length; i++) {
			serializeListItem(lines, value[i], indent + 2);
		}
		return;
	}

	if (isPlainObject(value)) {
		lines.push(pad + key + ":\n");
		for (var subKey in value) {
			serializeField(lines, subKey, value[subKey], indent + 2);
		}
		return;
	}

	lines.push(pad + key + ": " + yamlScalar(value, key) + "\n");
}

function serializeListItem(lines, value, indent) {
	var pad = repeat(" ", indent);

	if (Array.isArray(value)) {
		lines.push(pad + "-\n");
		for (var i = 0; i < value.length; i++) {
			serializeListItem(lines, value[i], indent + 2);
		}
		return;
	}

	if (isPlainObject(value)) {
		var keys = [];
		for (var key in value) {
			if (hasContent(value[key])) keys.push(key);
		}
		if (!keys.length) return;

		var firstKey = keys[0];
		var firstValue = value[firstKey];
		if (!Array.isArray(firstValue) && !isPlainObject(firstValue)) {
			lines.push(pad + "- " + firstKey + ": " + yamlScalar(firstValue, firstKey) + "\n");
			for (var i = 1; i < keys.length; i++) {
				serializeField(lines, keys[i], value[keys[i]], indent + 2);
			}
		}
		else {
			lines.push(pad + "-\n");
			for (var j = 0; j < keys.length; j++) {
				serializeField(lines, keys[j], value[keys[j]], indent + 2);
			}
		}
		return;
	}

	lines.push(pad + "- " + yamlScalar(value, null) + "\n");
}

function yamlScalar(value, key) {
	if (typeof value === "number") return String(value);
	if (typeof value === "boolean") return value ? "true" : "false";
	return yamlString(value, key);
}

function yamlString(value, key) {
	var str = String(value);

	// Emit a few Hayagriva-friendly scalars in plain style so the output looks
	// closer to the CLI while keeping serial numbers like DOI as strings.
	if (key === "date" && /^-?\d{4}(?:-\d{2}){0,2}$/.test(str)) return str;
	if ((key === "type" || key === "role") && /^[A-Za-z][A-Za-z-]*$/.test(str)) return str;
	if (key === "language" && /^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/.test(str)) return str;
	if (key === "page-range" && /^\d+(?:-\d+)+$/.test(str)) return str;
	if (key === "value" && /^https?:\/\/\S+$/.test(str)) return str;

	return '"' + str
		.replace(/\\/g, "\\\\")
		.replace(/\r/g, "\\r")
		.replace(/\n/g, "\\n")
		.replace(/\t/g, "\\t")
		.replace(/"/g, '\\"') + '"';
}

function repeat(str, times) {
	var out = "";
	for (var i = 0; i < times; i++) out += str;
	return out;
}
