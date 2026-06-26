(function () {
    "use strict";

    const API_BASE = "https://oracle-markets-backend.vercel.app";

    const state = {
        data: null,
        section: "messages",
        activeThreadId: null,
        currentFolder: null,
        folderPath: [],
        selectedFilePath: null,
        selectedFile: null,
        messagesReadingOpen: false,
        filesDetailOpen: false,
        employees: {},
        lists: {},
        resourceFile: null
    };


    function indexDirectory(data) {
        const directory = data?.directory || {};
        state.employees = directory.employees || {};
        state.lists = directory.lists || {};
    }

    function resolveParty(id) {
        if (!id) return { id: "", name: "Unknown", role: "", handle: "", icon: null };

        const employee = state.employees[id];
        if (employee) {
            return {
                id,
                name: employee.name,
                role: employee.role || "",
                handle: employee.handle || id,
                icon: employee.icon || null
            };
        }

        const list = state.lists[id];
        if (list) {
            return {
                id,
                name: list.label,
                role: list.description || "",
                handle: id,
                icon: null
            };
        }

        return { id, name: id, role: "", handle: id, icon: null };
    }

    function partyFromUser(user) {
        if (!user) return { name: "Unknown", role: "", handle: "", icon: null };
        return {
            id: user.id || "",
            name: user.name,
            role: user.role || "",
            handle: user.handle || "",
            icon: user.icon || null
        };
    }

    function fillAvatar(container, party) {
        if (!container) return;
        container.replaceChildren();
        container.classList.toggle("portal-avatar--initials", !party?.icon);

        if (party?.icon) {
            const img = document.createElement("img");
            img.src = party.icon;
            img.alt = "";
            container.appendChild(img);
            return;
        }

        container.textContent = initials(party?.name);
    }

    function buildAvatar(party, className) {
        const node = el("div", className);
        fillAvatar(node, party);
        return node;
    }

    function resolveRecipients(ids) {
        const list = Array.isArray(ids) ? ids : (ids ? [ids] : []);
        return list.map((id) => resolveParty(id).name).join(", ");
    }

    function getSessionUser() {
        const session = state.data?.session;
        if (!session) return null;
        if (session.userId) return state.employees[session.userId] || null;
        return session.user || null;
    }

    function getSessionUserId() {
        const session = state.data?.session;
        if (!session) return null;
        return session.userId || session.user?.handle || session.user?.id || null;
    }

    function getMessagesSorted() {
        return (state.data?.messages || [])
            .slice()
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    function initials(name) {
        if (!name) return "--";
        const parts = name.replace(/[^A-Za-z. ]/g, "").split(/[.\s]+/).filter(Boolean);
        if (parts.length === 0) return "--";
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    function formatDate(iso, withTime) {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return iso || "";
        const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
        if (!withTime) return date;
        const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
        return `${date} · ${time}`;
    }

    function relativeDate(iso) {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return "";
        const diffMs = Date.now() - d.getTime();
        const day = 86400000;
        if (diffMs < day && d.getDate() === new Date().getDate()) {
            return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
        }
        const days = Math.floor(diffMs / day);
        if (days < 7 && days >= 0) return `${days || 1}d`;
        return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    }

    const FILE_TYPE_LABELS = {
        pdf: "PDF", csv: "CSV", image: "IMG", log: "LOG", doc: "DOC",
        spreadsheet: "XLS", archive: "ZIP", code: "{ }", folder: "DIR"
    };

    const FOLDER_ICON_SVG = '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z"/></svg>';

    function typeLabel(type) {
        return FILE_TYPE_LABELS[type] || (type ? type.slice(0, 3).toUpperCase() : "FILE");
    }

    function buildFileNameIcon(type) {
        const icon = el("span", "portal-file-name-icon" + (type === "folder" ? " portal-file-name-icon--folder" : ""));
        if (type === "folder") {
            icon.innerHTML = FOLDER_ICON_SVG;
        } else {
            icon.textContent = typeLabel(type);
        }
        return icon;
    }

    function normalizeBody(body) {
        if (typeof body === "string") return body;
        if (Array.isArray(body)) return body.join("\n\n");
        return "";
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function parseInlineMarkdown(text) {
        let html = escapeHtml(text);
        html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
        html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
        html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
            const safe = /^(https?:\/\/|\/|\.\.?\/)/i.test(url.trim());
            return safe
                ? `<a href="${escapeHtml(url.trim())}" rel="noopener noreferrer">${label}</a>`
                : label;
        });
        return html;
    }

    function parseMarkdown(source) {
        const text = normalizeBody(source).replace(/\r\n/g, "\n");
        if (!text.trim()) return "";

        const lines = text.split("\n");
        const blocks = [];
        let i = 0;

        function consumeBlankLines(start) {
            let count = 0;
            let index = start;
            while (index < lines.length && !lines[index].trim()) {
                count += 1;
                index += 1;
            }
            return { count, index };
        }

        function appendBlockGap(blankLines) {
            if (blankLines <= 1 || blocks.length === 0) return;
            for (let gap = 1; gap < blankLines; gap += 1) {
                blocks.push('<div class="portal-md-gap" aria-hidden="true"></div>');
            }
        }

        while (i < lines.length) {
            const blanks = consumeBlankLines(i);
            appendBlockGap(blanks.count);
            i = blanks.index;
            if (i >= lines.length) break;

            const line = lines[i];

            if (line.startsWith("```")) {
                const fence = line.slice(3).trim();
                i += 1;
                const codeLines = [];
                while (i < lines.length && !lines[i].startsWith("```")) {
                    codeLines.push(lines[i]);
                    i += 1;
                }
                if (i < lines.length) i += 1;
                const lang = fence ? ` class="language-${escapeHtml(fence)}"` : "";
                blocks.push(`<pre><code${lang}>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
                continue;
            }

            const heading = line.match(/^(#{1,3})\s+(.*)$/);
            if (heading) {
                const level = heading[1].length + 2;
                blocks.push(`<h${level}>${parseInlineMarkdown(heading[2])}</h${level}>`);
                i += 1;
                continue;
            }

            if (line.startsWith(">")) {
                const quoteLines = [];
                while (i < lines.length && lines[i].startsWith(">")) {
                    quoteLines.push(lines[i].replace(/^>\s?/, ""));
                    i += 1;
                }
                blocks.push(`<blockquote><p>${parseInlineMarkdown(quoteLines.join(" "))}</p></blockquote>`);
                continue;
            }

            if (/^[-*]\s+/.test(line)) {
                const items = [];
                while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
                    items.push(`<li>${parseInlineMarkdown(lines[i].replace(/^[-*]\s+/, ""))}</li>`);
                    i += 1;
                }
                blocks.push(`<ul>${items.join("")}</ul>`);
                continue;
            }

            if (/^\d+\.\s+/.test(line)) {
                const items = [];
                while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
                    items.push(`<li>${parseInlineMarkdown(lines[i].replace(/^\d+\.\s+/, ""))}</li>`);
                    i += 1;
                }
                blocks.push(`<ol>${items.join("")}</ol>`);
                continue;
            }

            const para = [];
            while (i < lines.length && lines[i].trim()) {
                para.push(lines[i]);
                i += 1;
            }
            blocks.push(`<p>${para.map((entry) => parseInlineMarkdown(entry)).join("<br>")}</p>`);
        }

        return blocks.join("");
    }

    function stripMarkdown(source) {
        return normalizeBody(source)
            .replace(/```[\s\S]*?```/g, " ")
            .replace(/`([^`]+)`/g, "$1")
            .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
            .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
            .replace(/^#{1,6}\s+/gm, "")
            .replace(/^>\s?/gm, "")
            .replace(/^[-*]\s+/gm, "")
            .replace(/^\d+\.\s+/gm, "")
            .replace(/[*_~]/g, "")
            .replace(/\s+/g, " ")
            .trim();
    }

    function messagePreview(body) {
        const text = stripMarkdown(body);
        if (text.length <= 160) return text;
        return `${text.slice(0, 157)}…`;
    }

    function renderMarkdownBody(className, body) {
        const node = el("div", className);
        node.classList.add("portal-md");
        node.innerHTML = parseMarkdown(body);
        return node;
    }

    function toast(message) {
        let node = document.querySelector(".portal-toast");
        if (!node) {
            node = el("div", "portal-toast");
            document.body.appendChild(node);
        }
        node.textContent = message;
        requestAnimationFrame(() => node.classList.add("is-visible"));
        clearTimeout(node._timer);
        node._timer = setTimeout(() => node.classList.remove("is-visible"), 2600);
    }

    function showSection(section) {
        state.section = section;
        document.querySelectorAll(".portal-nav-item").forEach((btn) => {
            const active = btn.dataset.section === section;
            btn.classList.toggle("is-active", active);
            if (active) {
                btn.setAttribute("aria-current", "page");
            } else {
                btn.removeAttribute("aria-current");
            }
        });
        document.querySelectorAll(".portal-section").forEach((sec) => {
            sec.hidden = sec.dataset.section !== section;
        });
    }

    const READ_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

    function readCookieKey(userId, messageId) {
        return `${userId}/${messageId}`;
    }

    function escapeRegExp(value) {
        return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    function isMessageRead(userId, messageId) {
        if (!userId || !messageId) return false;
        const key = escapeRegExp(readCookieKey(userId, messageId));
        const match = document.cookie.match(new RegExp(`(?:^|; )${key}=([^;]*)`));
        return Boolean(match && decodeURIComponent(match[1]) === "1");
    }

    function markMessageRead(userId, messageId) {
        if (!userId || !messageId) return;
        const name = readCookieKey(userId, messageId);
        document.cookie = `${name}=1; path=/; max-age=${READ_COOKIE_MAX_AGE}; SameSite=Lax`;
    }

    function applyMessageReadState() {
        const userId = getSessionUserId();
        (state.data?.messages || []).forEach((msg) => {
            msg.unread = !(userId && isMessageRead(userId, msg.id));
        });
    }

    function updateUnreadBadge() {
        const unreadCount = getMessagesSorted().filter((m) => m.unread).length;
        const countEl = document.getElementById("nav-msg-count");
        if (!countEl) return;
        if (unreadCount > 0) {
            countEl.textContent = String(unreadCount);
            countEl.hidden = false;
        } else {
            countEl.hidden = true;
        }
    }

    function renderMessages() {
        const list = document.getElementById("portal-thread-list");
        list.innerHTML = "";
        const messages = getMessagesSorted();

        updateUnreadBadge();

        messages.forEach((msg) => {
            const from = resolveParty(msg.from);
            const li = el("li");
            const btn = el("button", "portal-thread");
            btn.type = "button";
            btn.dataset.id = msg.id;
            if (msg.unread) btn.classList.add("is-unread");

            const top = el("div", "portal-thread-top");
            if (msg.unread) top.appendChild(el("span", "portal-thread-unread"));
            top.appendChild(buildAvatar(from, "portal-thread-avatar"));
            top.appendChild(el("span", "portal-thread-from", from.name));
            top.appendChild(el("span", "portal-thread-date", relativeDate(msg.date)));
            btn.appendChild(top);

            btn.appendChild(el("div", "portal-thread-subject", msg.subject));
            btn.appendChild(el("div", "portal-thread-preview", messagePreview(msg.body)));

            if ((msg.labels && msg.labels.length) || msg.priority === "high") {
                const tags = el("div", "portal-thread-tags");
                if (msg.priority === "high") {
                    tags.appendChild(el("span", "portal-tag portal-tag--priority", "High priority"));
                }
                (msg.labels || []).forEach((label) => tags.appendChild(el("span", "portal-tag", label)));
                btn.appendChild(tags);
            }

            btn.addEventListener("click", () => selectThread(msg.id));
            li.appendChild(btn);
            list.appendChild(li);
        });

        if (messages.length) {
            const stillVisible = messages.some((m) => m.id === state.activeThreadId);
            selectThread(stillVisible ? state.activeThreadId : messages[0].id, { read: !isMobileLayout() });
        }
    }

    function isMobileLayout() {
        return window.matchMedia("(max-width: 820px)").matches;
    }

    function buildMobileBackButton(label, extraClass, onClick) {
        const back = el("button", `portal-mobile-back ${extraClass}`.trim());
        back.type = "button";
        back.innerHTML =
            '<svg class="portal-mobile-back-icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">' +
            '<path fill="currentColor" d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>' +
            `<span>${label}</span>`;
        back.addEventListener("click", onClick);
        return back;
    }

    function syncMessagesLayout() {
        if (!state.data || !state.activeThreadId) return;
        selectThread(state.activeThreadId, { read: state.messagesReadingOpen });
    }

    function syncFilesLayout() {
        if (!state.filesDetailOpen || !state.selectedFile) return;

        const filesEl = document.querySelector(".portal-files");
        if (isMobileLayout()) {
            filesEl?.classList.add("is-file-selected");
        } else {
            filesEl?.classList.remove("is-file-selected");
        }

        const row = document.querySelector(".portal-file-row.is-selected")
            || Array.from(document.querySelectorAll(".portal-file-row")).find((r) => {
                return r.querySelector(".portal-file-name-text")?.textContent === state.selectedFilePath;
            })
            || null;
        selectFile(state.selectedFile, row);
    }

    function selectThread(id, options = {}) {
        const read = options.read !== false;
        state.activeThreadId = id;
        const msg = (state.data.messages || []).find((m) => m.id === id);
        document.querySelectorAll(".portal-thread").forEach((btn) => {
            btn.classList.toggle("is-active", btn.dataset.id === id);
        });

        const view = document.getElementById("portal-thread-view");
        const messagesEl = document.querySelector(".portal-messages");
        view.innerHTML = "";

        if (isMobileLayout() && !read) {
            messagesEl?.classList.remove("is-reading");
            state.messagesReadingOpen = false;
            view.appendChild(el("p", "portal-thread-empty", "Select a message to read it."));
            return;
        }

        if (!msg) {
            messagesEl?.classList.remove("is-reading");
            state.messagesReadingOpen = false;
            view.appendChild(el("p", "portal-thread-empty", "Select a message to read it."));
            return;
        }

        if (isMobileLayout()) {
            messagesEl?.classList.toggle("is-reading", read);
        } else {
            messagesEl?.classList.remove("is-reading");
        }

        state.messagesReadingOpen = read;

        const from = resolveParty(msg.from);

        const userId = getSessionUserId();
        markMessageRead(userId, id);
        msg.unread = false;
        const threadBtn = document.querySelector(`.portal-thread[data-id="${id}"]`);
        if (threadBtn) {
            threadBtn.classList.remove("is-unread");
            const dot = threadBtn.querySelector(".portal-thread-unread");
            if (dot) dot.remove();
        }
        updateUnreadBadge();

        if (isMobileLayout()) {
            view.appendChild(buildMobileBackButton("Back to messages", "portal-thread-back", () => {
                messagesEl?.classList.remove("is-reading");
                state.messagesReadingOpen = false;
            }));
        }

        view.appendChild(el("h2", "portal-msg-subject", msg.subject));

        const head = el("div", "portal-msg-head");
        head.appendChild(buildAvatar(from, "portal-msg-avatar"));
        const meta = el("div", "portal-msg-meta");
        const fromLine = el("div", "portal-msg-from", from.name);
        if (from.role) fromLine.appendChild(el("span", "portal-msg-fromrole", from.role));
        meta.appendChild(fromLine);
        meta.appendChild(el("div", "portal-msg-to", `To: ${resolveRecipients(msg.to)}`));
        meta.appendChild(el("div", "portal-msg-datefull", formatDate(msg.date, true)));
        head.appendChild(meta);
        view.appendChild(head);

        view.appendChild(renderMarkdownBody("portal-msg-body", msg.body));

        appendAttachments(view, msg.attachments);

        if (msg.replies && msg.replies.length) {
            view.appendChild(el("p", "portal-msg-section-label", `Replies (${msg.replies.length})`));
            const wrap = el("div", "portal-replies");
            msg.replies.forEach((reply) => {
                const replyFrom = resolveParty(reply.from);
                const r = el("div", "portal-reply");
                const rhead = el("div", "portal-reply-head");
                rhead.appendChild(buildAvatar(replyFrom, "portal-reply-avatar"));
                rhead.appendChild(el("span", "portal-reply-from", replyFrom.name));
                rhead.appendChild(el("span", "portal-reply-date", formatDate(reply.date, true)));
                r.appendChild(rhead);
                r.appendChild(renderMarkdownBody("portal-reply-body", reply.body));
                appendAttachments(r, reply.attachments);
                wrap.appendChild(r);
            });
            view.appendChild(wrap);
        }

        view.scrollTop = 0;
    }

    function appendAttachments(container, attachments) {
        if (!attachments || !attachments.length) return;
        container.appendChild(el("p", "portal-msg-section-label", `Attachments (${attachments.length})`));
        const wrap = el("div", "portal-attachments");
        attachments.forEach((att) => wrap.appendChild(buildAttachment(att)));
        container.appendChild(wrap);
    }

    function buildAttachment(att) {
        const row = el("div", "portal-attachment");
        row.appendChild(el("div", "portal-attachment-icon", typeLabel(att.type)));
        const info = el("div", "portal-attachment-info");
        info.appendChild(el("div", "portal-attachment-name", att.name));
        info.appendChild(el("div", "portal-attachment-size", att.size || ""));
        row.appendChild(info);
        row.appendChild(buildDownloadButton("portal-download-btn", att, { compact: true }));
        return row;
    }

    function renderTree() {
        const root = state.data.files;
        const container = document.getElementById("portal-tree");
        container.innerHTML = "";
        container.appendChild(buildTreeNode(root, [root.name], true));
        if (!state.currentFolder) {
            openFolder(root, [root.name]);
        }
    }

    function buildTreeNode(node, path, openByDefault) {
        const wrap = el("div", "portal-tree-node");
        const row = el("button", "portal-tree-row");
        row.type = "button";
        row.dataset.path = path.join("/");

        const caret = el("span", "portal-tree-caret");
        caret.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path fill="currentColor" d="M9 6l6 6-6 6z"/></svg>';
        row.appendChild(caret);

        const icon = el("span", "portal-tree-icon");
        icon.innerHTML = FOLDER_ICON_SVG;
        row.appendChild(icon);

        row.appendChild(el("span", "portal-tree-label", node.name));

        if (node.locked) {
            const lock = el("span", "portal-tree-lock");
            lock.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path fill="currentColor" d="M18 8h-1V6A5 5 0 0 0 7 6v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zM9 6a3 3 0 0 1 6 0v2H9V6z"/></svg>';
            row.appendChild(lock);
        }

        wrap.appendChild(row);

        const childFolders = (node.children || []).filter((c) => c.type === "folder");
        const childrenWrap = el("div", "portal-tree-children");
        childrenWrap.hidden = !openByDefault;
        if (openByDefault) row.classList.add("is-open");

        childFolders.forEach((child) => {
            childrenWrap.appendChild(buildTreeNode(child, path.concat(child.name), false));
        });
        if (childFolders.length === 0) {
            caret.style.visibility = "hidden";
        }
        wrap.appendChild(childrenWrap);

        row.addEventListener("click", () => {
            if (childFolders.length) {
                const isOpen = row.classList.toggle("is-open");
                childrenWrap.hidden = !isOpen;
            }
            openFolder(node, path);
        });

        return wrap;
    }

    function findFolderByPath(path) {
        let node = state.data.files;
        for (let i = 1; i < path.length; i++) {
            const next = (node.children || []).find((c) => c.type === "folder" && c.name === path[i]);
            if (!next) break;
            node = next;
        }
        return node;
    }

    function openFolder(node, path) {
        state.currentFolder = node;
        state.folderPath = path;
        clearFileSelection();
        document.querySelectorAll(".portal-tree-row").forEach((row) => {
            row.classList.toggle("is-selected", row.dataset.path === path.join("/"));
        });
        renderBreadcrumb();
        renderFileList();
    }

    function clearFileSelection() {
        state.selectedFilePath = null;
        state.selectedFile = null;
        state.filesDetailOpen = false;
        document.querySelectorAll(".portal-file-row").forEach((r) => r.classList.remove("is-selected"));
        document.querySelector(".portal-files")?.classList.remove("is-file-selected");

        const panel = document.getElementById("portal-file-meta");
        if (!panel) return;
        panel.innerHTML = "";
        panel.appendChild(el("p", "portal-file-meta-empty", "Select a file to view its details."));
    }

    function renderBreadcrumb() {
        const bc = document.getElementById("portal-breadcrumb");
        bc.innerHTML = "";
        state.folderPath.forEach((name, idx) => {
            if (idx > 0) bc.appendChild(el("span", "portal-breadcrumb-sep", "/"));
            const isCurrent = idx === state.folderPath.length - 1;
            const crumb = el("button", "portal-crumb" + (isCurrent ? " is-current" : ""), name);
            crumb.type = "button";
            if (!isCurrent) {
                const targetPath = state.folderPath.slice(0, idx + 1);
                crumb.addEventListener("click", () => {
                    openFolder(findFolderByPath(targetPath), targetPath);
                });
            }
            bc.appendChild(crumb);
        });
    }

    function renderFileList() {
        const container = document.getElementById("portal-file-list");
        container.innerHTML = "";

        const head = el("div", "portal-file-list-head");
        head.appendChild(el("span", null, "Name"));
        head.appendChild(el("span", "is-num", "Size"));
        head.appendChild(el("span", "is-num", "Modified"));
        container.appendChild(head);

        const items = (state.currentFolder.children || []).slice().sort((a, b) => {
            if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
            return a.name.localeCompare(b.name);
        });

        if (items.length === 0) {
            container.appendChild(el("p", "portal-file-empty", "This folder is empty."));
            return;
        }

        items.forEach((item) => {
            const row = el("button", "portal-file-row");
            row.type = "button";

            const nameCell = el("div", "portal-file-name");
            nameCell.appendChild(buildFileNameIcon(item.type));
            nameCell.appendChild(el("span", "portal-file-name-text", item.name));
            if (item.type !== "folder" && item.uuid) {
                const lock = el("span", "portal-file-lock");
                lock.title = "Password protected";
                lock.innerHTML = '<svg viewBox="0 0 24 24" width="11" height="11" aria-hidden="true"><path fill="currentColor" d="M18 8h-1V6A5 5 0 0 0 7 6v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zM9 6a3 3 0 0 1 6 0v2H9V6z"/></svg>';
                nameCell.appendChild(lock);
            }
            row.appendChild(nameCell);

            row.appendChild(el("span", "portal-file-size", item.type === "folder" ? "-" : (item.size || "-")));
            row.appendChild(el("span", "portal-file-modified", item.modified ? formatDate(item.modified) : "-"));

            if (item.type === "folder") {
                row.addEventListener("click", () => {
                    const newPath = state.folderPath.concat(item.name);
                    openFolder(item, newPath);
                    const treeRow = document.querySelector(`.portal-tree-row[data-path="${newPath.join("/")}"]`);
                    if (treeRow && !treeRow.classList.contains("is-open")) treeRow.click();
                });
            } else {
                row.addEventListener("click", () => selectFile(item, row));
            }
            container.appendChild(row);
        });
    }

    function selectFile(file, row) {
        document.querySelectorAll(".portal-file-row").forEach((r) => r.classList.remove("is-selected"));
        if (row) row.classList.add("is-selected");

        const filesEl = document.querySelector(".portal-files");
        if (isMobileLayout()) {
            filesEl?.classList.add("is-file-selected");
        } else {
            filesEl?.classList.remove("is-file-selected");
        }

        state.selectedFile = file;
        state.selectedFilePath = file.name;
        state.filesDetailOpen = true;

        const panel = document.getElementById("portal-file-meta");
        panel.innerHTML = "";

        if (isMobileLayout()) {
            panel.appendChild(buildMobileBackButton("Back to files", "portal-file-back", () => clearFileSelection()));
        }

        panel.appendChild(el("div", "portal-meta-icon", typeLabel(file.type)));
        panel.appendChild(el("h3", "portal-meta-name", file.name));
        if (file.description) panel.appendChild(el("p", "portal-meta-desc", file.description));

        const table = el("dl", "portal-meta-table");
        const addRow = (label, valueNode) => {
            const row2 = el("div", "portal-meta-row");
            row2.appendChild(el("dt", null, label));
            const dd = el("dd");
            if (typeof valueNode === "string") {
                dd.textContent = valueNode;
            } else {
                dd.appendChild(valueNode);
            }
            row2.appendChild(dd);
            table.appendChild(row2);
        };

        addRow("Type", typeLabel(file.type));
        addRow("Size", file.size || "-");
        addRow("Modified", file.modified ? formatDate(file.modified, true) : "-");
        addRow("Owner", file.owner || "-");

        if (file.classification) {
            const cls = el("span", "portal-meta-class portal-meta-class--" + file.classification.toLowerCase().replace(/[^a-z]/g, ""), file.classification);
            addRow("Classification", cls);
        }
        if (file.uuid) {
            addRow("Access", "Password protected");
        } else if (file.url) {
            addRow("Access", "Direct download");
        }
        panel.appendChild(table);

        if (canDownloadResource(file)) {
            panel.appendChild(buildDownloadButton("portal-meta-download", file));
        }
    }

    function renderAnalytics() {
        const a = state.data.analytics;
        const container = document.getElementById("portal-analytics");
        container.innerHTML = "";

        const asOf = document.getElementById("portal-analytics-asof");
        if (asOf && a.asOf) asOf.textContent = `Oracle markets overview · As of ${formatDate(a.asOf, true)}`;

        const flag = document.getElementById("portal-sample-flag");
        if (flag && a.disclaimer) flag.title = a.disclaimer;

        // KPIs
        const kpiGrid = el("div", "portal-kpi-grid");
        (a.kpis || []).forEach((kpi) => {
            const card = el("div", "portal-kpi");
            card.appendChild(el("p", "portal-kpi-label", kpi.label));
            const value = el("div", "portal-kpi-value");
            value.textContent = kpi.value;
            if (kpi.unit) value.appendChild(el("span", "portal-kpi-unit", kpi.unit));
            card.appendChild(value);
            if (kpi.delta) {
                const foot = el("div", "portal-kpi-foot");
                const arrow = kpi.deltaDir === "down" ? "▾" : "▴";
                foot.appendChild(el("span", "portal-kpi-delta portal-kpi-delta--" + (kpi.deltaDir || "up"), `${arrow} ${kpi.delta}`));
                if (kpi.note) foot.appendChild(el("span", "portal-kpi-note", kpi.note));
                card.appendChild(foot);
            }
            kpiGrid.appendChild(card);
        });
        container.appendChild(kpiGrid);

        // Charts row
        const cols = el("div", "portal-analytics-cols");
        cols.appendChild(buildBarChart(a.volumeSeries));
        cols.appendChild(buildSegments(a.categorySplit));
        container.appendChild(cols);

        // Tables row
        const cols2 = el("div", "portal-analytics-cols");
        cols2.appendChild(buildTopMarkets(a.topMarkets));
        cols2.appendChild(buildSystemStatus(a.systemStatus));
        container.appendChild(cols2);
    }

    function buildBarChart(series) {
        const card = el("div", "portal-card");
        card.appendChild(el("h3", "portal-card-title", (series && series.title) || "Volume"));
        const bars = el("div", "portal-bars");
        const points = (series && series.points) || [];
        const max = Math.max(...points.map((p) => p.value), 1);
        points.forEach((p) => {
            const col = el("div", "portal-bar-col");
            col.appendChild(el("span", "portal-bar-value", String(p.value)));
            const track = el("div", "portal-bar-track");
            const fill = el("div", "portal-bar-fill");
            fill.style.height = "0%";
            track.appendChild(fill);
            col.appendChild(track);
            col.appendChild(el("span", "portal-bar-label", p.label));
            bars.appendChild(col);
            requestAnimationFrame(() => {
                fill.style.height = `${Math.round((p.value / max) * 100)}%`;
            });
        });
        card.appendChild(bars);
        return card;
    }

    function buildSegments(split) {
        const card = el("div", "portal-card");
        card.appendChild(el("h3", "portal-card-title", (split && split.title) || "Breakdown"));
        const wrap = el("div", "portal-segments");
        (split && split.segments || []).forEach((seg) => {
            const row = el("div", "portal-segment-row");
            const top = el("div", "portal-segment-top");
            top.appendChild(el("span", "portal-segment-label", seg.label));
            top.appendChild(el("span", "portal-segment-pct", `${seg.pct}%`));
            row.appendChild(top);
            const track = el("div", "portal-segment-track");
            const fill = el("div", "portal-segment-fill");
            fill.style.width = "0%";
            track.appendChild(fill);
            row.appendChild(track);
            wrap.appendChild(row);
            requestAnimationFrame(() => { fill.style.width = `${seg.pct}%`; });
        });
        card.appendChild(wrap);
        return card;
    }

    function buildTopMarkets(rows) {
        const card = el("div", "portal-card");
        card.appendChild(el("h3", "portal-card-title", "Top Markets by Volume"));
        const table = el("table", "portal-table");
        table.innerHTML =
            "<thead><tr><th>Market</th><th class='is-num'>Volume</th><th class='is-num'>Traders</th><th>Status</th></tr></thead>";
        const tbody = el("tbody");
        (rows || []).forEach((r) => {
            const tr = el("tr");
            tr.appendChild(el("td", "portal-table-primary", r.market));
            tr.appendChild(el("td", "is-num", r.volume));
            tr.appendChild(el("td", "is-num", String(r.traders)));
            const statusTd = el("td");
            const cls = (r.status || "").toLowerCase();
            statusTd.appendChild(el("span", "portal-status-pill portal-status-pill--" + cls, r.status));
            tr.appendChild(statusTd);
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        card.appendChild(table);
        return card;
    }

    function buildSystemStatus(rows) {
        const card = el("div", "portal-card");
        card.appendChild(el("h3", "portal-card-title", "System Status"));
        const table = el("table", "portal-table");
        table.innerHTML =
            "<thead><tr><th>Service</th><th>Status</th><th class='is-num'>Uptime</th></tr></thead>";
        const tbody = el("tbody");
        (rows || []).forEach((r) => {
            const tr = el("tr");
            tr.appendChild(el("td", "portal-table-primary", r.service));
            const statusTd = el("td");
            const cls = (r.status || "").toLowerCase();
            const dot = el("span", "portal-status-dot portal-status-dot--" + cls);
            statusTd.appendChild(dot);
            statusTd.appendChild(el("span", "portal-status-pill--" + cls, r.status));
            tr.appendChild(statusTd);
            tr.appendChild(el("td", "is-num", r.uptime));
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        card.appendChild(table);
        return card;
    }

    function renderSession() {
        const s = state.data.session;
        if (!s) return;
        const user = getSessionUser() || {};

        const setText = (id, value) => {
            const node = document.getElementById(id);
            if (node && value != null) node.textContent = value;
        };
        fillAvatar(document.getElementById("portal-user-avatar"), partyFromUser(user));
        setText("portal-user-name", user.name);
        setText("portal-user-role", user.role);
        setText("portal-sidebar-user", user.name);
        setText("portal-sidebar-clearance", user.clearance);
        if (s.environment) setText("portal-env", s.environment);
    }

    function bindSearch() {
        const input = document.getElementById("portal-search-input");
        if (!input) return;
        input.addEventListener("input", () => {
            if (state.section !== "messages") return;
            const q = input.value.trim().toLowerCase();
            document.querySelectorAll(".portal-thread").forEach((btn) => {
                const li = btn.parentElement;
                const text = btn.textContent.toLowerCase();
                li.hidden = q && !text.includes(q);
            });
        });
    }

    const SIDEBAR_KEY = "oracle_portal_sidebar_collapsed";

    function applySidebarCollapsed(collapsed) {
        if (isMobileLayout()) collapsed = false;

        document.body.classList.toggle("portal-sidebar-collapsed", collapsed);

        document.querySelectorAll("[data-portal-sidebar-toggle]").forEach((btn) => {
            btn.setAttribute("aria-expanded", String(!collapsed));
            btn.setAttribute("aria-label", collapsed ? "Expand sidebar" : "Collapse sidebar");
            btn.title = collapsed ? "Expand sidebar" : "Collapse sidebar";
        });
    }

    function bindMobileLayout() {
        const mq = window.matchMedia("(max-width: 820px)");

        const sync = () => {
            if (mq.matches) {
                applySidebarCollapsed(false);
            } else {
                applySidebarCollapsed(localStorage.getItem(SIDEBAR_KEY) === "1");
            }

            syncMessagesLayout();
            syncFilesLayout();
        };

        mq.addEventListener("change", sync);
    }

    function bindSidebar() {
        const toggles = document.querySelectorAll("[data-portal-sidebar-toggle]");
        if (!toggles.length) return;

        applySidebarCollapsed(localStorage.getItem(SIDEBAR_KEY) === "1");

        toggles.forEach((toggle) => {
            toggle.addEventListener("click", (event) => {
                event.preventDefault();
                const collapsed = !document.body.classList.contains("portal-sidebar-collapsed");
                applySidebarCollapsed(collapsed);
                localStorage.setItem(SIDEBAR_KEY, collapsed ? "1" : "0");
            });
        });
    }

    function resourceEls() {
        return {
            modal: document.getElementById("resource-modal"),
            form: document.getElementById("resource-form"),
            fileName: document.getElementById("resource-modal-file"),
            input: document.getElementById("resource-password"),
            status: document.getElementById("resource-status"),
            submit: document.getElementById("resource-submit")
        };
    }

    function setResourceStatus(message, type) {
        const { status } = resourceEls();
        if (!status) return;
        status.textContent = message || "";
        status.classList.remove("is-error", "is-success");
        if (type) status.classList.add(`is-${type}`);
    }

    function shakeResourceModal() {
        const card = resourceEls().modal?.querySelector(".portal-modal-card");
        if (!card) return;
        card.classList.remove("is-shake");
        void card.offsetWidth;
        card.classList.add("is-shake");
        window.setTimeout(() => card.classList.remove("is-shake"), 450);
    }

    function setResourceLoading(loading) {
        const { submit, input } = resourceEls();
        if (submit) {
            submit.disabled = loading;
            submit.classList.toggle("is-loading", loading);
        }
        if (input) input.disabled = loading;
    }

    function openResourceModal(file) {
        const { modal, fileName, input } = resourceEls();
        if (!modal || !file || !file.uuid) {
            toast(`"${file && file.name}" - this file is not available.`);
            return;
        }
        state.resourceFile = file;
        if (fileName) fileName.textContent = file.name || "Protected file";
        resetResourcePasswordField();
        setResourceStatus("");
        setResourceLoading(false);
        modal.querySelector(".portal-modal-card")?.classList.remove("is-shake");
        modal.hidden = false;
        requestAnimationFrame(() => {
            modal.classList.add("is-open");
            if (input) input.focus();
        });
    }

    function resetResourcePasswordField() {
        const input = document.getElementById("resource-password");
        const toggle = document.getElementById("resource-password-toggle");
        if (input) {
            input.type = "password";
            input.value = "";
        }
        if (toggle) {
            toggle.setAttribute("aria-pressed", "false");
            toggle.setAttribute("aria-label", "Show password");
        }
    }

    function closeResourceModal() {
        const { modal } = resourceEls();
        if (!modal) return;
        modal.classList.remove("is-open");
        state.resourceFile = null;
        setResourceLoading(false);
        resetResourcePasswordField();
        window.setTimeout(() => { modal.hidden = true; }, 180);
    }

    function triggerDownload(url) {
        const a = document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    function isProtectedResource(item) {
        return Boolean(item?.uuid);
    }

    function canDownloadResource(item) {
        return isProtectedResource(item) || Boolean(item?.url);
    }

    function downloadResource(item) {
        if (!item) return;
        if (item.uuid) {
            openResourceModal(item);
            return;
        }
        if (item.url) {
            triggerDownload(item.url);
            toast(`"${item.name}" - download started.`);
            return;
        }
        toast(`"${item.name}" - download is not available.`);
    }

    function buildDownloadButton(className, item, { compact = false } = {}) {
        const btn = el("button", className);
        btn.type = "button";
        if (item.uuid) {
            btn.innerHTML = compact
                ? '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M18 8h-1V6A5 5 0 0 0 7 6v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zM9 6a3 3 0 0 1 6 0v2H9V6z"/></svg> Unlock'
                : "Unlock & Download";
            if (!compact) btn.classList.add("portal-meta-download--locked");
            btn.addEventListener("click", () => downloadResource(item));
        } else if (item.url) {
            btn.innerHTML = compact
                ? '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z"/></svg> Download'
                : "Download";
            btn.addEventListener("click", () => downloadResource(item));
        } else {
            btn.textContent = compact ? "Unavailable" : "Download unavailable";
            btn.disabled = true;
        }
        return btn;
    }

    async function submitResource(event) {
        event.preventDefault();
        const { input } = resourceEls();
        const file = state.resourceFile;
        const password = input ? input.value : "";

        if (!file || !file.uuid) {
            setResourceStatus("This file is no longer available.", "error");
            shakeResourceModal();
            return;
        }
        if (!password) {
            setResourceStatus("Enter the file password.", "error");
            shakeResourceModal();
            if (input) input.focus();
            return;
        }

        setResourceLoading(true);
        setResourceStatus("Verifying password…");

        try {
            const res = await fetch(`${API_BASE}/api/resource`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ uuid: file.uuid, password })
            });

            if (res.status === 401 || res.status === 403) {
                setResourceLoading(false);
                setResourceStatus("Incorrect password for this file.", "error");
                shakeResourceModal();
                if (input) {
                    input.value = "";
                    input.focus();
                }
                return;
            }

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const payload = await res.json();
            if (!payload || !payload.url) throw new Error("Malformed response");

            triggerDownload(payload.url);
            const name = file.name;
            closeResourceModal();
            toast(`"${name}" - download started.`);
        } catch (err) {
            setResourceLoading(false);
            setResourceStatus("Unable to reach the file service. Try again.", "error");
            shakeResourceModal();
        }
    }

    function bindResourceModal() {
        const { modal, form } = resourceEls();
        if (!modal) return;

        form?.addEventListener("submit", submitResource);

        const passwordToggle = document.getElementById("resource-password-toggle");
        const passwordInput = document.getElementById("resource-password");
        passwordToggle?.addEventListener("click", () => {
            if (!passwordInput) return;
            const show = passwordInput.type === "password";
            passwordInput.type = show ? "text" : "password";
            passwordToggle.setAttribute("aria-pressed", String(show));
            passwordToggle.setAttribute("aria-label", show ? "Hide password" : "Show password");
        });

        modal.querySelectorAll("[data-resource-close]").forEach((node) => {
            node.addEventListener("click", closeResourceModal);
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && !modal.hidden) closeResourceModal();
        });
    }

    function bindNav() {
        document.querySelectorAll(".portal-nav-item").forEach((btn) => {
            btn.addEventListener("click", () => showSection(btn.dataset.section));
        });
    }

    function start(data) {
        if (!data) return;

        state.data = data;
        state.activeThreadId = null;
        state.currentFolder = null;
        state.folderPath = [];
        state.selectedFilePath = null;
        state.selectedFile = null;
        state.messagesReadingOpen = false;
        state.filesDetailOpen = false;

        indexDirectory(data);
        applyMessageReadState();
        renderSession();
        renderMessages();
        renderTree();
        renderAnalytics();

        const loading = document.getElementById("portal-loading");
        if (loading) loading.hidden = true;

        showSection(state.section);
        document.body.classList.add("portal-page");
    }

    function bootstrap() {
        bindSidebar();
        bindMobileLayout();
        bindNav();
        bindSearch();
        bindResourceModal();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
    } else {
        bootstrap();
    }

    window.OraclePortal = { start };
})();
