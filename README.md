# Dynamic views

A `<view>` element for declarative dynamic content updates

- The `<view>` has a `match` attribute with a URL pattern and a `name`
- When navigating, views with a `match` attribute that matches the new URL intercept the navigation
- Instead of clearing the page and navigating, the document from the new URL is fetched
- The document in the response is parsed, and content of `<template view="...">` elements replaces the current view contents
- The view's original content is the "loading" fallback. visible at start, or when stale (awaiting new content) for N milliseconds.
- The state (stale, ready, error) is reflected in CSS pseudo-classes
- Declarative view transitions (`@view-transition { navigation: auto }`) are triggered for this kind of transition.