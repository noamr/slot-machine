// This is a service worker that simulates a server that generates responses based on the route

/**
 *
 * @param {FetchEvent} event
 */
function handleEvent(event) {
    /**
     * @type {Request}
     */
    const request = event.request;
    const header = request.headers.get("views");
    if (!header)
        return;
    event.respondWith((async () => {
        const views = header.split(";");
        let str = "";
        for (const view of views) {
            const [name, kvs] = view.split(":");
            const params = Object.fromEntries(kvs.split(",").map(kv => kv.split("=")));
            str += `<template view=${name}>Hello ${params.page}</template>`
        }
        return new Response(str, {headers: {'Content-Type': 'text/html'}});
    })());
}
addEventListener("fetch", handleEvent);