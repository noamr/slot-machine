# slot-machine

Using `<slot>` to declarative generate dynamic content

- The slot has a `match` attribute with a URL pattern and a name
- When navigating, slots with a `match` attribute that matches the new URL intercept the navigation
- Instead of clearing the page and navigating, the new URL is fetched, with some headers
- The document in the response is parsed, and content of `<template slot="...">` elements matching the slots is copied into the slot.