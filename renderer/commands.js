(function () {
  const ZERO_WIDTH = "\u200B";

  function tr(key, params) {
    return window.i18n ? window.i18n.t(key, params) : key;
  }

  function isTextControl(element) {
    return (
      element &&
      (element.tagName === "INPUT" || element.tagName === "TEXTAREA")
    );
  }

  function isContentEditable(element) {
    return !!element && element.isContentEditable;
  }

  function hasClass(node, name) {
    return (
      node &&
      node.nodeType === Node.ELEMENT_NODE &&
      node.classList.contains(name)
    );
  }

  function isWidget(node) {
    return hasClass(node, "cmd") || hasClass(node, "var");
  }

  function nodeText(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    if (node.nodeName === "BR") return "\n";
    if (hasClass(node, "var")) {
      return node.__resolve ? String(node.__resolve() || "") : node.textContent;
    }
    return Array.from(node.childNodes).map(nodeText).join("");
  }

  function expandTemplate(tpl, values) {
    let out = tpl.pattern;
    tpl.params.forEach((param, index) => {
      out = out.split(`{${param}}`).join(values[index] ?? "");
    });
    return out;
  }

  function createTemplateWidget(tpl) {
    const widget = document.createElement("span");
    widget.className = "cmd";
    widget.contentEditable = "false";
    widget.dataset.template = tpl.name;

    const name = document.createElement("span");
    name.className = "cmd-name";
    name.textContent = "/template " + tpl.name;
    widget.appendChild(name);

    tpl.params.forEach((param, index) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.contentEditable = "true";
      chip.spellcheck = false;
      chip.dataset.param = param;
      chip.dataset.index = String(index);
      chip.dataset.placeholder = param;
      widget.appendChild(chip);
    });

    return widget;
  }

  function createAiWidget(target) {
    const widget = document.createElement("span");
    widget.className = "cmd ai-cmd";
    widget.contentEditable = "false";
    widget.dataset.target = target;

    const name = document.createElement("span");
    name.className = "cmd-name";
    name.textContent = `/generate ${target} prompt:\u00A0`;
    widget.appendChild(name);

    const chip = document.createElement("span");
    chip.className = "chip";
    chip.contentEditable = "true";
    chip.spellcheck = false;
    chip.dataset.param = "prompt";
    chip.dataset.placeholder = "prompt";
    chip.title = tr("ai.promptHint");
    widget.appendChild(chip);

    return widget;
  }

  function updateVariableWidget(widget) {
    const name = widget.dataset.variable;
    const value = widget.__resolve ? widget.__resolve() : "";
    const hasValue = String(value || "").trim().length > 0;
    widget.textContent = hasValue ? String(value) : `$${name}`;
    widget.classList.toggle("empty", !hasValue);
    widget.title = `$${name}${hasValue ? `: ${value}` : ""}`;
  }

  function createVariableWidget(name, context) {
    const widget = document.createElement("span");
    widget.className = "var";
    widget.contentEditable = "false";
    widget.dataset.variable = name;
    widget.__resolve = () => window.AppVariables.resolve(name, context);
    updateVariableWidget(widget);
    return widget;
  }

  function createStatusElement() {
    const status = document.createElement("div");
    status.className = "command-status hidden";
    document.body.appendChild(status);
    return status;
  }

  function attach(options) {
    const input = options.input;
    const context = options.context || {};
    const role = options.role || "other";
    const getTemplates =
      typeof options.getTemplates === "function" ? options.getTemplates : () => [];
    const generateAi =
      typeof options.generateAi === "function" ? options.generateAi : null;
    const onChange =
      typeof options.onChange === "function" ? options.onChange : () => {};
    const control = isTextControl(input);
    const editable = isContentEditable(input);

    const menu = options.menu || document.createElement("div");
    if (!options.menu) {
      menu.className = "command-menu floating hidden";
      document.body.appendChild(menu);
    }
    const preview = options.preview || null;
    const status = options.preview ? null : createStatusElement();

    let menuItems = [];
    let menuIndex = 0;
    let generating = false;
    let variableSuffixText = "";

    const selectionRange = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return null;
      const range = sel.getRangeAt(0);
      if (!input.contains(range.startContainer)) return null;
      return range;
    };

    const nodeFromCaret = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return null;
      let node = sel.getRangeAt(0).startContainer;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
      return node;
    };

    const chipFromCaret = () => {
      const node = nodeFromCaret();
      return node && node.closest ? node.closest(".chip") : null;
    };

    const widgetFromCaret = () => {
      const node = nodeFromCaret();
      return node && node.closest ? node.closest(".cmd, .var") : null;
    };

    const setCaret = (container, offset) => {
      input.focus();
      const range = document.createRange();
      range.setStart(container, offset);
      range.collapse(true);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    };

    const caretBefore = (node) => {
      const parent = node.parentNode;
      const prev = node.previousSibling;
      if (prev && prev.nodeType === Node.TEXT_NODE) {
        setCaret(prev, prev.textContent.length);
        return;
      }
      setCaret(parent, Array.prototype.indexOf.call(parent.childNodes, node));
    };

    const caretAfter = (node) => {
      const parent = node.parentNode;
      const next = node.nextSibling;
      if (next && next.nodeType === Node.TEXT_NODE) {
        setCaret(next, 0);
        return;
      }
      setCaret(parent, Array.prototype.indexOf.call(parent.childNodes, node) + 1);
    };

    const caretIn = (node, atEnd, focusEl) => {
      (focusEl || input).focus();
      const range = document.createRange();
      range.selectNodeContents(node);
      range.collapse(!atEnd);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    };

    function controlCursor() {
      if (!control) return 0;
      const start = input.selectionStart;
      return typeof start === "number" ? start : String(input.value || "").length;
    }

    function lineTextBeforeCaret() {
      if (control) {
        const value = String(input.value || "");
        const before = value.slice(0, controlCursor());
        const lineStart = before.lastIndexOf("\n") + 1;
        return before.slice(lineStart);
      }
      if (widgetFromCaret()) return "";
      const range = selectionRange();
      if (!range) return "";
      const start = range.startContainer;
      if (start.nodeType !== Node.TEXT_NODE) return "";
      let text = start.textContent.slice(0, range.startOffset);
      let node = start;
      while (node && node !== input) {
        let prev = node.previousSibling;
        while (prev) {
          if (prev.nodeName === "BR") return text;
          if (isWidget(prev)) return "";
          text = nodeText(prev) + text;
          if (text.includes("\n")) return text;
          prev = prev.previousSibling;
        }
        node = node.parentNode;
      }
      return text;
    }

    function makeRange(startNode, startOffset, endNode, endOffset) {
      const range = document.createRange();
      range.setStart(startNode, startOffset);
      range.setEnd(endNode, endOffset);
      return range;
    }

    function lineRangeBeforeCaret() {
      if (control) return null;
      const range = selectionRange();
      if (!range || range.startContainer.nodeType !== Node.TEXT_NODE) {
        return null;
      }

      const caretNode = range.startContainer;
      let startNode = caretNode;
      let node = caretNode;

      while (node && node !== input) {
        let prev = node.previousSibling;
        while (prev) {
          if (prev.nodeName === "BR" || isWidget(prev)) {
            return makeRange(
              startNode,
              0,
              caretNode,
              range.startOffset
            );
          }
          if (prev.nodeType === Node.TEXT_NODE) {
            if (prev.textContent.includes("\n")) {
              const index = prev.textContent.lastIndexOf("\n") + 1;
              return makeRange(
                prev,
                index,
                caretNode,
                range.startOffset
              );
            }
            startNode = prev;
          } else if (prev.nodeType === Node.ELEMENT_NODE) {
            const walker = document.createTreeWalker(
              prev,
              NodeFilter.SHOW_TEXT,
              null
            );
            const first = walker.nextNode();
            if (first) startNode = first;
          }
          prev = prev.previousSibling;
        }
        node = node.parentNode;
      }

      return makeRange(startNode, 0, caretNode, range.startOffset);
    }

    function positionMenu() {
      if (!menu.classList.contains("floating")) return;
      const rect = input.getBoundingClientRect();
      const width = Math.max(240, Math.min(360, rect.width || 240));
      menu.style.width = `${width}px`;
      menu.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))}px`;
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 240 && rect.top > 240) {
        menu.style.top = `${rect.top - Math.min(220, menu.offsetHeight || 220) - 6}px`;
      } else {
        menu.style.top = `${rect.bottom + 4}px`;
      }
    }

    function hideMenu() {
      menuItems = [];
      menuIndex = 0;
      menu.classList.add("hidden");
      menu.innerHTML = "";
    }

    function showMenu(menuList) {
      if (!menuList.length) {
        hideMenu();
        return;
      }
      menuItems = menuList;
      if (menuIndex >= menuList.length) menuIndex = 0;
      menu.innerHTML = "";
      menuList.forEach((item, index) => {
        const row = document.createElement("div");
        row.className = "cmd-item" + (index === menuIndex ? " active" : "");
        const left = document.createElement("span");
        if (item.icon) {
          const icon = document.createElement("span");
          icon.className = "cmd-icon";
          icon.textContent = item.icon;
          left.appendChild(icon);
        }
        left.appendChild(document.createTextNode(item.label));
        const right = document.createElement("span");
        right.className = "hint";
        right.textContent = item.hint || "";
        row.appendChild(left);
        row.appendChild(right);
        row.addEventListener("mousedown", (event) => {
          event.preventDefault();
          item.apply();
        });
        menu.appendChild(row);
      });
      menu.classList.remove("hidden");
      positionMenu();
    }

    function selectActive() {
      if (menuItems.length) menuItems[menuIndex].apply();
    }

    function replaceControlRange(from, to, text) {
      const value = String(input.value || "");
      const start = Math.max(0, Math.min(from, value.length));
      const end = Math.max(start, Math.min(to, value.length));
      input.value = value.slice(0, start) + text + value.slice(end);
      const caret = start + text.length;
      input.setSelectionRange(caret, caret);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }

    function replaceTextRange(segment, text) {
      if (control) {
        const caret = controlCursor();
        replaceControlRange(caret - segment.length, caret, text);
        return;
      }

      const range = lineRangeBeforeCaret();
      if (!range) return;
      replaceRangeWithText(range, text);
    }

    function buildAiSegments(template, values) {
      const segments = [];
      const pattern = /\$([a-z_][a-z0-9_]*)/gi;
      let lastIndex = 0;
      let match;
      while ((match = pattern.exec(template))) {
        if (match.index > lastIndex) {
          segments.push({ type: "text", value: template.slice(lastIndex, match.index) });
        }
        const name = match[1];
        if (name === "description" || name === "hashtags") {
          segments.push({ type: "text", value: values[name] || "" });
        } else if (window.AppVariables.isKnown(name)) {
          segments.push({ type: "var", name });
        } else {
          segments.push({ type: "text", value: match[0] });
        }
        lastIndex = pattern.lastIndex;
      }
      if (lastIndex < template.length) {
        segments.push({ type: "text", value: template.slice(lastIndex) });
      }
      return segments;
    }

    function buildRichFragment(segments) {
      const fragment = document.createDocumentFragment();
      segments.forEach((part) => {
        if (part.type === "var") {
          fragment.appendChild(createVariableWidget(part.name, context));
          return;
        }
        String(part.value || "")
          .split("\n")
          .forEach((lineText, index) => {
            if (index) fragment.appendChild(document.createElement("br"));
            fragment.appendChild(document.createTextNode(lineText));
          });
      });
      return fragment;
    }

    function replaceRangeWithRich(range, segments) {
      range.deleteContents();
      const fragment = buildRichFragment(segments);
      const marker = document.createTextNode(ZERO_WIDTH);
      fragment.appendChild(marker);
      range.insertNode(fragment);
      setCaret(marker, 0);
    }

    function replaceRangeWithText(range, text) {
      range.deleteContents();
      const fragment = document.createDocumentFragment();
      String(text)
        .split("\n")
        .forEach((lineText, index) => {
          if (index) fragment.appendChild(document.createElement("br"));
          fragment.appendChild(document.createTextNode(lineText));
        });
      const marker = document.createTextNode(ZERO_WIDTH);
      fragment.appendChild(marker);
      range.insertNode(fragment);
      setCaret(marker, 0);
    }

    function insertAiWidget(target) {
      const r = lineRangeBeforeCaret();
      if (!r) return;
      r.deleteContents();
      r.collapse(true);

      hideMenu();

      const widget = createAiWidget(target);
      r.insertNode(widget);
      const spacer = document.createTextNode(ZERO_WIDTH);
      widget.parentNode.insertBefore(spacer, widget.nextSibling);
      const chip = widget.querySelector(".chip");
      if (chip) caretIn(chip, false, chip);

      updatePreview();
      onChange();
    }

    function insertTemplate(tpl) {
      const r = lineRangeBeforeCaret();
      if (!r) return;
      r.deleteContents();
      r.collapse(true);

      hideMenu();

      if (!tpl.params.length) {
        const textNode = document.createTextNode(expandTemplate(tpl, []));
        r.insertNode(textNode);
        setCaret(textNode, textNode.textContent.length);
      } else {
        const widget = createTemplateWidget(tpl);
        r.insertNode(widget);
        const spacer = document.createTextNode(ZERO_WIDTH);
        widget.parentNode.insertBefore(spacer, widget.nextSibling);
        const chip = widget.querySelector(".chip");
        if (chip) caretIn(chip, false, chip);
      }

      updatePreview();
      onChange();
    }

    function focusChip(chip, atEnd) {
      if (!chip) return;
      caretIn(chip, atEnd, chip);
      updatePreview();
    }

    function variableSuffix() {
      const line = lineTextBeforeCaret();
      const match = line.match(/(\$[a-zA-Z0-9_]*)$/);
      return match ? match[1] : "";
    }

    function insertVariable(name) {
      const suffix = variableSuffixText;
      const value = window.AppVariables.resolve(name, context);

      if (control) {
        const caret = controlCursor();
        const insert = role === "template" ? `$${name}` : value || `$${name}`;
        replaceControlRange(caret - suffix.length, caret, insert);
      } else {
        const range = selectionRange();
        if (!range || range.startContainer.nodeType !== Node.TEXT_NODE) return;
        const node = range.startContainer;
        const from = Math.max(0, range.startOffset - suffix.length);
        const r = document.createRange();
        r.setStart(node, from);
        r.setEnd(node, range.startOffset);
        r.deleteContents();
        const widget = createVariableWidget(name, context);
        r.insertNode(widget);
        const spacer = document.createTextNode(ZERO_WIDTH);
        widget.parentNode.insertBefore(spacer, widget.nextSibling);
        setCaret(spacer, 0);
      }

      hideMenu();
      updatePreview();
      onChange();
    }

    function showStatus(message, isError) {
      if (preview) {
        preview.classList.remove("hidden");
        preview.textContent = message;
        preview.classList.toggle("error", !!isError);
        return;
      }
      if (!status) return;
      status.textContent = message;
      status.classList.toggle("error", !!isError);
      status.classList.remove("hidden");
      const rect = input.getBoundingClientRect();
      status.style.left = `${Math.max(8, rect.left)}px`;
      status.style.top = `${rect.bottom + 4}px`;
      status.style.width = `${Math.max(220, rect.width || 220)}px`;
    }

    function hideStatus() {
      if (preview) {
        preview.classList.add("hidden");
        preview.textContent = "";
        preview.classList.remove("error");
      }
      if (status) status.classList.add("hidden");
    }

    async function runAi(brief, target, line) {
      if (generating || !generateAi) return;
      if (!brief.trim()) {
        showStatus(tr("ai.needBrief"), true);
        return;
      }
      if (typeof context.checkAi === "function") {
        const check = context.checkAi(target);
        if (check && !check.ok) {
          showStatus(check.error || tr("ai.notConfigured"), true);
          return;
        }
      }

      generating = true;
      input.dataset.generating = "true";

      const lineRange = control ? null : lineRangeBeforeCaret();
      const lineRangeClone = lineRange ? lineRange.cloneRange() : null;
      const savedStart = control ? controlCursor() : 0;
      const savedEnd = control ? input.selectionEnd : 0;
      const currentLineRange = () =>
        lineRangeClone && lineRangeClone.startContainer.isConnected
          ? lineRangeClone
          : lineRangeBeforeCaret();

      showStatus(tr("ai.generating"), false);

      try {
        const result = await generateAi(brief.trim(), target);
        const richTemplate =
          result && typeof result === "object" ? result.richTemplate : null;
        const text =
          result && typeof result === "object" ? result.text : result;

        let inserted = false;
        if (richTemplate && !control) {
          const range = currentLineRange();
          if (range) {
            replaceRangeWithRich(
              range,
              buildAiSegments(richTemplate, result.richValues || {})
            );
            inserted = true;
          }
        }

        if (!inserted) {
          if (!text || !String(text).trim()) throw new Error(tr("ai.empty"));
          if (control) {
            replaceControlRange(savedStart - line.length, savedEnd, text);
          } else {
            const range = currentLineRange();
            if (range) replaceRangeWithText(range, text);
          }
        }

        hideStatus();
        onChange();
      } catch (err) {
        showStatus(err && err.message ? err.message : String(err), true);
      } finally {
        generating = false;
        delete input.dataset.generating;
      }
    }

    async function runAiWidget(widget) {
      if (generating || !generateAi) return;
      const target = widget.dataset.target || "description";
      const chip = widget.querySelector(".chip");
      const brief = chip ? chip.textContent.trim() : "";
      if (!brief) {
        showStatus(tr("ai.needBrief"), true);
        if (chip) caretIn(chip, false, chip);
        return;
      }
      if (typeof context.checkAi === "function") {
        const check = context.checkAi(target);
        if (check && !check.ok) {
          showStatus(check.error || tr("ai.notConfigured"), true);
          return;
        }
      }

      generating = true;
      input.dataset.generating = "true";
      showStatus(tr("ai.generating"), false);

      try {
        const result = await generateAi(brief, target);
        const richTemplate =
          result && typeof result === "object" ? result.richTemplate : null;
        const text =
          result && typeof result === "object" ? result.text : result;

        if (!widget.isConnected) {
          hideStatus();
          return;
        }

        const parent = widget.parentNode;
        const nextSibling = widget.nextSibling;
        widget.remove();
        const insertRange = document.createRange();
        if (nextSibling && nextSibling.parentNode === parent) {
          insertRange.setStartBefore(nextSibling);
        } else {
          insertRange.setStart(parent, parent.childNodes.length);
        }
        insertRange.collapse(true);

        if (richTemplate) {
          replaceRangeWithRich(
            insertRange,
            buildAiSegments(richTemplate, result.richValues || {})
          );
        } else {
          if (!text || !String(text).trim()) throw new Error(tr("ai.empty"));
          replaceRangeWithText(insertRange, text);
        }

        hideStatus();
        onChange();
      } catch (err) {
        showStatus(err && err.message ? err.message : String(err), true);
      } finally {
        generating = false;
        delete input.dataset.generating;
      }
    }

    function updateMenu() {
      const suffix = variableSuffix();
      variableSuffixText = suffix;
      if (suffix) {
        const query = suffix.slice(1).toLowerCase();
        showMenu(
          window.AppVariables
            .list(role)
            .filter((variable) => variable.name.startsWith(query))
            .map((variable) => ({
              icon: "$",
              label: `$${variable.name}`,
              hint: tr(variable.descriptionKey),
              apply: () => insertVariable(variable.name),
            }))
        );
        return;
      }

      const line = lineTextBeforeCaret();
      if (!line.startsWith("/")) {
        hideMenu();
        return;
      }

      const tokens = line.split(/\s+/);
      const command = tokens[0].toLowerCase();

      if (tokens.length === 1) {
        const query = command.slice(1);
        const commands = [
          { name: "template", hint: tr("command.templateHint") },
          { name: "generate", hint: tr("command.generateHint") },
        ].filter((item) => item.name.startsWith(query));
        showMenu(
          commands.map((item) => ({
            icon: "/",
            label: item.name,
            hint: item.hint,
            apply: () => {
              replaceTextRange(line, `/${item.name} `);
              updateMenu();
              updatePreview();
              onChange();
            },
          }))
        );
        return;
      }

      if (command === "/generate" && tokens.length === 2) {
        const query = tokens[1].toLowerCase();
        showMenu(
          ["title", "description"]
            .filter((target) => target.startsWith(query))
            .map((target) => ({
              icon: "/",
              label: target,
              hint: tr(
                target === "title"
                  ? "command.generateTitleHint"
                  : "command.generateDescriptionHint"
              ),
              apply: () => insertAiWidget(target),
            }))
        );
        return;
      }

      if (command === "/template" && tokens.length === 2) {
        const query = tokens[1].toLowerCase();
        showMenu(
          getTemplates()
            .filter((tpl) => tpl.name.toLowerCase().startsWith(query))
            .map((tpl) => ({
              icon: "#",
              label: tpl.name,
              hint: tpl.pattern,
              apply: () => insertTemplate(tpl),
            }))
        );
        return;
      }

      hideMenu();
    }

    function updatePreview() {
      if (input.dataset.generating) return;

      const activeWidget = widgetFromCaret();
      if (activeWidget && hasClass(activeWidget, "ai-cmd")) {
        const target = activeWidget.dataset.target || "description";
        const chip = activeWidget.querySelector(".chip");
        const prompt = chip ? chip.textContent.trim() : "";
        if (prompt) {
          showStatus(
            tr(
              target === "title"
                ? "command.generatePreviewTitle"
                : "command.generatePreviewDescription",
              { prompt }
            ),
            false
          );
        } else {
          showStatus(tr("ai.needBrief"), false);
        }
        return;
      }

      const line = lineTextBeforeCaret();
      const generateMatch = line.match(
        /^\/generate\s+(title|description)(?:\s+(?:prompt:\s*)?([\s\S]*))?$/i
      );
      if (generateMatch) {
        const prompt = (generateMatch[2] || "").trim();
        if (prompt) {
          showStatus(
            tr(
              generateMatch[1].toLowerCase() === "title"
                ? "command.generatePreviewTitle"
                : "command.generatePreviewDescription",
              { prompt }
            ),
            false
          );
        } else {
          hideStatus();
        }
        return;
      }

      if (!preview) {
        if (status) status.classList.add("hidden");
        return;
      }
      const widget = widgetFromCaret();
      if (!widget || !hasClass(widget, "cmd")) {
        preview.classList.add("hidden");
        preview.textContent = "";
        preview.classList.remove("error");
        return;
      }
      const tpl = getTemplates().find(
        (item) => item.name === widget.dataset.template
      );
      const values = Array.from(widget.querySelectorAll(".chip")).map(
        (chip) => chip.textContent
      );
      preview.classList.remove("hidden");
      preview.classList.remove("error");
      if (!tpl) {
        preview.textContent = "Template not found.";
        return;
      }
      const missing = tpl.params.filter(
        (_param, index) => !(values[index] || "").trim()
      );
      let text = `${tr("command.preview")}: ${expandTemplate(tpl, values)}`;
      if (missing.length) {
        text += ` · ${tr("command.missing")}: ${missing.join(", ")}`;
      }
      preview.textContent = text;
    }

    function chipOffset(chip, range) {
      if (!range || !chip.contains(range.startContainer)) return 0;
      const pre = document.createRange();
      pre.selectNodeContents(chip);
      pre.setEnd(range.startContainer, range.startOffset);
      return pre.toString().length;
    }

    function chipIsEmpty(chip) {
      return chip.textContent.replace(/\u200B/g, "").length === 0;
    }

    function handleChipKey(event, chip) {
      const widget = chip.closest(".cmd");
      if (hasClass(widget, "ai-cmd") && event.key === "Enter") {
        event.preventDefault();
        runAiWidget(widget);
        return true;
      }
      const chips = Array.from(widget.querySelectorAll(".chip"));
      const index = chips.indexOf(chip);
      const range = selectionRange();
      const offset = chipOffset(chip, range);
      const length = chip.textContent.length;
      const direction = event.shiftKey ? -1 : 1;

      if (event.key === "Tab" || event.key === "Enter") {
        event.preventDefault();
        const target = chips[index + direction];
        if (target) focusChip(target, direction < 0);
        else if (direction > 0) caretAfter(widget);
        else caretBefore(widget);
        return true;
      }

      if (event.key === "ArrowLeft" && !event.shiftKey && offset === 0) {
        event.preventDefault();
        const target = chips[index - 1];
        if (target) focusChip(target, true);
        else caretBefore(widget);
        return true;
      }

      if (event.key === "ArrowRight" && !event.shiftKey && offset === length) {
        event.preventDefault();
        const target = chips[index + 1];
        if (target) focusChip(target, false);
        else caretAfter(widget);
        return true;
      }

      if (event.key === "Backspace" && offset === 0 && chipIsEmpty(chip)) {
        event.preventDefault();
        const target = chips[index - 1];
        if (target) focusChip(target, true);
        else caretBefore(widget);
        return true;
      }

      return false;
    }

    function handleKeydown(event) {
      if (!control) {
        const chip = chipFromCaret();
        if (chip && handleChipKey(event, chip)) return;
      }

      const menuOpen = !menu.classList.contains("hidden");

      if (event.key === "Enter") {
        if (menuOpen) {
          event.preventDefault();
          selectActive();
          return;
        }

        const line = lineTextBeforeCaret();
        const generateMatch = line.match(
          /^\/generate\s+(title|description)(?:\s+(?:prompt:\s*)?([\s\S]*))?$/i
        );
        if (generateMatch && generateAi) {
          event.preventDefault();
          runAi(
            generateMatch[2] || "",
            generateMatch[1].toLowerCase(),
            line
          );
          return;
        }

        if (control) return;

        event.preventDefault();
        if (input.dataset.multiline === "true") {
          document.execCommand("insertLineBreak");
          updatePreview();
          onChange();
        }
        return;
      }

      if (!menuOpen) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        menuIndex = (menuIndex + 1) % menuItems.length;
        showMenu(menuItems);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        menuIndex = (menuIndex - 1 + menuItems.length) % menuItems.length;
        showMenu(menuItems);
      } else if (event.key === "Tab") {
        event.preventDefault();
        selectActive();
      } else if (event.key === "Escape") {
        hideMenu();
      }
    }

    function handleInput() {
      updateMenu();
      updatePreview();
      onChange();
    }

    input.addEventListener("input", handleInput);

    input.addEventListener("keydown", handleKeydown);

    input.addEventListener("keyup", () => {
      if (!menu.classList.contains("hidden")) positionMenu();
    });

    input.addEventListener("blur", () => {
      setTimeout(() => {
        hideMenu();
        if (status) status.classList.add("hidden");
      }, 120);
    });

    if (!control) {
      input.addEventListener("paste", (event) => {
        event.preventDefault();
        const clipboard = event.clipboardData || window.clipboardData;
        let text = clipboard ? clipboard.getData("text/plain") : "";
        if (!text) return;
        if (input.dataset.multiline !== "true") {
          text = text.replace(/[\r\n]+/g, " ");
        }
        const max = Number(input.dataset.max || 0);
        if (max) {
          const current = String(input.textContent || "").length;
          text = text.slice(0, Math.max(0, max - current));
        }
        document.execCommand("insertText", false, text);
        updateMenu();
        updatePreview();
        onChange();
      });

      input.addEventListener("beforeinput", (event) => {
        const max = Number(input.dataset.max || 0);
        if (!max || !event.data) return;
        const current = String(input.textContent || "").length;
        if (current + event.data.length > max) event.preventDefault();
      });
    }

    function refreshVariables() {
      input.querySelectorAll(".var").forEach(updateVariableWidget);
    }

    return {
      updateMenu,
      updatePreview,
      hideMenu,
      refreshVariables,
      runAi,
    };
  }

  window.AppCommands = { attach };
})();
