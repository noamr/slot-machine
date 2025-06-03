"use strict";
(async () => {
    for (const r of await navigator.serviceWorker.getRegistrations())
        await r.unregister();
    await navigator.serviceWorker.register("sw.js", {
        scope: "/"
    });

    const original_html = new WeakMap();

    function getMatchingSlots(url) {
        const slots = document.querySelectorAll("slot[match][name]");
        const matching_slots = new Map();
        for (const slot of slots) {
            let pattern = null;
            try {
                pattern = new URLPattern(slot.getAttribute("match"), location.href);
            } catch (e) {
                console.error(e);
            }
            if (!pattern)
                continue;
            const new_result = pattern.exec(url);
            if (!new_result) {
                slot.innerHTML = "";
                continue;
            }
            if (original_html.has(slot)) {
                slot.innerHTML = original_html.get(slot);
                slot.dataset.state = "stale";
            }
            matching_slots.set(slot, new_result);
        };
        return matching_slots;
    }
    async function updateSlots(url) {
        const matching_slots = getMatchingSlots(url);
        try {
            const response = await fetch(url, {
                headers: {
                    slots: Array.from(matching_slots).map(([element, result]) => {
                        const name = element.getAttribute("name");
                        const groups = {
                            ...result.pathname.groups,
                            ...result.search.groups
                        };
                        const values = Object.entries(groups).flatMap(([name2, value]) => {
                            return typeof value === "undefined" ? [] : [`${name2}=${value}`];
                        }).join(",");
                        return [name, values].join(":");
                    }).join(";")
                }
            });
            if (!response.ok)
                throw new Error("TODO: maybe support non-OK status");
            if (!response.body)
                return;
            const temp_doc = document.implementation.createHTMLDocument();
            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            while (true) {
                const {
                    value,
                    done
                } = await reader.read();
                const chunk = decoder.decode(value, {
                    stream: !done
                });
                temp_doc.write(chunk);
                if (done)
                    break;
            }
            processAll(temp_doc);
        } catch (e) {
            for (const [slot] of matching_slots)
                slot.dataset.state = "error";
        }
    }
    window.navigation.addEventListener("navigate", (navigateEvent) => {
        const to_url = new URL(navigateEvent.destination.url, location.href);
        const matching_slots = getMatchingSlots(to_url);
        if (!matching_slots.size)
            return;
        navigateEvent.intercept({
            async handler() {
                await updateSlots(to_url);
            }
        });
    });

    function processTemplate(template) {
        const slotName = template.getAttribute("slot");
        const slot = document.querySelector(`slot[match][name=${slotName}]`);
        if (!slot)
            return;
        if (!original_html.has(slot)) {
            original_html.set(slot, slot.innerHTML);
        }
        slot.innerHTML = "";
        slot.appendChild(template.content);
        slot.dataset.state = "ready";
    }
    new MutationObserver((records) => {
        for (const r of records) {
            for (const node of [...r.addedNodes, ...r.removedNodes]) {
                if (node.nodeType === Node.ELEMENT_NODE && node.matches("template[slot]")) {
                    processTemplate(node);
                }
            }
        }
    }).observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    function processAll(doc) {
        const templates = doc.querySelectorAll("template[slot]");
        for (const template of templates) {
            processTemplate(template);
        }
    }
    processAll(document);
    updateSlots(new URL(location.href));
})();