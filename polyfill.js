"use strict";
(async () => {
    for (const r of await navigator.serviceWorker.getRegistrations())
        await r.unregister();
    await navigator.serviceWorker.register("sw.js", {
        scope: "."
    });

    console.log("Service worker registered");

    const original_html = new WeakMap();

    function getMatchingViews(url) {
        const views = document.querySelectorAll("view[match][name]");
        const matching_views = new Map();
        for (const view of views) {
            let pattern = null;
            try {
                pattern = new URLPattern(view.getAttribute("match"), location.href);
            } catch (e) {
                console.error(e);
            }
            if (pattern)
                matching_views.set(view, new_result);
        };
        return matching_views;
    }

    async function updateViewsFromFetch(url) {
        const response = await fetch(url, {
            headers: {
                views: Array.from(matching_views).map(([element, result]) => {
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
            console.log("Response: " + chunk);
            temp_doc.write(chunk);
            if (done)
                break;
        }
        processAll(temp_doc);
    }
    async function updateViews(url) {
        const matching_views = getMatchingViews(url);
        const responseToState = updateViewsFromFetch(url).then(() => "ready").catch(() => "error");
        const intermediateState = await Promise.race([responseToState, new Promise<string>(resolve => setTimeout(
            () => resolve("loading"), 500
        ))]);

        for (const [view] of matching_views)
            view.dataset.state = intermediateState;
        }

        const finalState = await responseToState;
        for (const [view] of matching_views)
            view.dataset.state = finalState;
        }
    }
    window.navigation.addEventListener("navigate", (navigateEvent) => {
        const to_url = new URL(navigateEvent.destination.url, location.href);
        const matching_views = getMatchingViews(to_url);
        if (!matching_views.size)
            return;
        navigateEvent.intercept({
            async handler() {
                await updateViews(to_url);
            }
        });
    });

    function processTemplate(template) {
        const viewName = template.getAttribute("view");
        const view = document.querySelector(`view[match][name=${viewName}]`);
        if (!view)
            return;
        if (!original_html.has(view)) {
            original_html.set(view, view.innerHTML);
        }
        view.innerHTML = "";
        view.appendChild(template.content);
        view.dataset.state = "ready";
    }
    new MutationObserver((records) => {
        for (const r of records) {
            for (const node of [...r.addedNodes, ...r.removedNodes]) {
                if (node.nodeType === Node.ELEMENT_NODE && node.matches("template[view]")) {
                    processTemplate(node);
                }
            }
        }
    }).observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    function processAll(doc) {
        const templates = doc.querySelectorAll("template[view]");
        for (const template of templates) {
            processTemplate(template);
        }
    }
    processAll(document);
    updateViews(new URL(location.href));
})();